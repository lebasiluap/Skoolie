import { createClient } from 'npm:@supabase/supabase-js@2.49.8'
import { createRemoteJWKSet, importPKCS8, jwtVerify, SignJWT } from 'npm:jose@5.9.6'
import { createDeletionHandler } from './handler.ts'

const url = Deno.env.get('SUPABASE_URL')!
const clientId = 'com.skoolie.app'
const appleKeys = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'), { timeoutDuration: 5000 })

async function applePost(endpoint: string, body: URLSearchParams, budget: AbortSignal) {
  const response = await fetch(`https://appleid.apple.com/auth/${endpoint}`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body, signal: AbortSignal.any([budget, AbortSignal.timeout(5000)]),
  })
  if (!response.ok) throw Error('Apple request failed')
  return response
}

Deno.serve(req => {
 const budget = AbortSignal.timeout(22000)
 const service = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
   auth: { persistSession: false, autoRefreshToken: false },
   global: { fetch: (input, init = {}) => fetch(input, { ...init,
     signal: AbortSignal.any([budget, AbortSignal.timeout(5000), ...(init.signal ? [init.signal] : [])]),
   }) },
 })
 return createDeletionHandler({
  async authenticate(authorization) {
    // Network verification, not decoding a caller-controlled JWT locally.
    const { data, error } = await service.auth.getUser(authorization.slice(7))
    if (error) return null
    return data.user
  },
  async revokeApple(code, subject) {
    const pem = Deno.env.get('APPLE_SIGN_IN_PRIVATE_KEY')?.replace(/\\n/g, '\n')
    const kid = Deno.env.get('APPLE_SIGN_IN_KEY_ID')
    const team = Deno.env.get('APPLE_SIGN_IN_TEAM_ID')
    if (!pem || !kid || !team) throw Error('Apple revocation is not configured')
    const key = await importPKCS8(pem, 'ES256')
    const secret = await new SignJWT({}).setProtectedHeader({ alg: 'ES256', kid })
      .setIssuer(team).setAudience('https://appleid.apple.com').setSubject(clientId)
      .setIssuedAt().setExpirationTime('5m').sign(key)
    const tokenResponse = await applePost('token', new URLSearchParams({
      client_id: clientId, client_secret: secret, code, grant_type: 'authorization_code',
    }), budget)
    const tokens = await tokenResponse.json()
    if (typeof tokens.id_token !== 'string') throw Error('Missing Apple identity')
    const verified = await jwtVerify(tokens.id_token, appleKeys, {
      issuer: 'https://appleid.apple.com', audience: clientId, algorithms: ['RS256'],
    })
    if (verified.payload.sub !== subject) throw Error('Apple account mismatch')
    const token = tokens.refresh_token ?? tokens.access_token
    if (typeof token !== 'string' || !token) throw Error('Missing revocation token')
    await applePost('revoke', new URLSearchParams({
      client_id: clientId, client_secret: secret, token,
      token_type_hint: tokens.refresh_token ? 'refresh_token' : 'access_token',
    }), budget)
    // Codes/tokens/keys are never logged or returned to the caller.
  },
  async removeUploads(uid) {
    // Current uploader creates only uid/avatar.ext. List from offset zero on
    // each pass because successfully removed objects shift the next page.
    for (let page = 0; page < 20; page++) {
      const { data, error } = await service.storage.from('avatars').list(uid, { limit: 100 })
      if (error) throw error
      if (!data?.length) return
      if (data.some(object => !object.id || object.name.includes('/'))) throw Error('Unexpected upload layout')
      const result = await service.storage.from('avatars').remove(data.map(object => `${uid}/${object.name}`))
      if (result.error) throw result.error
    }
    throw Error('Too many uploads; retry deletion')
  },
  async removeReports(uid) {
    // Reports can contain identifying free text; SET NULL alone is insufficient.
    const { error } = await service.from('question_reports').delete().eq('user_id', uid)
    if (error) throw error
  },
  async deleteUser(uid) {
    const { error } = await service.auth.admin.deleteUser(uid)
    if (error && error.code !== 'user_not_found') throw error
  },
 })(req)
})
