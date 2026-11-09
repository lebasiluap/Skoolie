import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from '../../../SkoolieApp/node_modules/typescript/lib/typescript.js'
import { createDeletionHandler } from './handler.ts'

function fixture({ mismatch = false, missing = false, tokenInvalid = false } = {}) {
  const calls = []; let handler
  const service = {
    auth: {
      getUser: async () => ({ data: { user: { id: 'owner', identities: [{ provider: 'apple', identity_data: { sub: 'owner-apple' } }] } } }),
      admin: { deleteUser: async uid => { calls.push(['delete', uid]); return { error: missing ? { code: 'user_not_found' } : null } } },
    },
    storage: { from: () => ({ list: async () => ({ data: [] }), remove: async () => ({}) }) },
    from: () => ({ delete: () => ({ eq: async () => ({}) }) }),
  }
  class JWT {
    setProtectedHeader() { return this } setIssuer() { return this } setAudience() { return this }
    setSubject() { return this } setIssuedAt() { return this } setExpirationTime() { return this }
    async sign() { return 'private-client-secret' }
  }
  const mods = {
    'npm:@supabase/supabase-js@2.49.8': { createClient: () => service },
    'npm:jose@5.9.6': { createRemoteJWKSet: () => 'apple-public-keys', importPKCS8: async () => 'key', SignJWT: JWT,
      jwtVerify: async (token, keys, options) => {
        assert.equal(token, 'signed-identity'); assert.equal(keys, 'apple-public-keys')
        assert.equal(options.issuer, 'https://appleid.apple.com'); assert.equal(options.audience, 'com.skoolie.app')
        assert.deepEqual(options.algorithms, ['RS256'])
        if (tokenInvalid) throw Error('invalid signature')
        return { payload: { sub: mismatch ? 'different-apple-owner' : 'owner-apple' } }
      } },
    './handler.ts': { createDeletionHandler },
  }
  const code = ts.transpileModule(readFileSync(new URL('./index.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const fetch = async (url, init) => {
    calls.push([url, new URLSearchParams(init.body).get('token_type_hint')])
    assert.ok(init.signal)
    return url.endsWith('/token')
      ? new Response(JSON.stringify({ id_token: 'signed-identity', refresh_token: 'refresh' }))
      : new Response('{}')
  }
  new Function('require', 'exports', 'Deno', 'fetch', code)(name => mods[name], {}, {
    env: { get: key => key === 'SUPABASE_URL' ? 'https://example.test' : 'configured-secret' },
    serve: fn => { handler = fn },
  }, fetch)
  const send = () => handler(new Request('https://example.test/delete-account', {
    method: 'POST', headers: { Authorization: 'Bearer verified' },
    body: JSON.stringify({ confirm: 'DELETE', apple_authorization_code: 'fresh-code' }),
  }))
  return { calls, send }
}
test('actual adapter exchanges code, verifies identity, revokes refresh token then deletes', async () => {
  const f = fixture()
  assert.equal((await f.send()).status, 200)
  assert.deepEqual(f.calls, [['https://appleid.apple.com/auth/token', null], ['https://appleid.apple.com/auth/revoke', 'refresh_token'], ['delete', 'owner']])
})
test('invalid signature and wrong Apple subject never revoke or delete', async () => {
  for (const options of [{ mismatch: true }, { tokenInvalid: true }]) {
    const f = fixture(options)
    assert.equal((await f.send()).status, 502)
    assert.equal(f.calls.length, 1)
  }
})
test('already-deleted admin result is success for concurrent completed requests', async () => {
  const f = fixture({ missing: true })
  assert.equal((await f.send()).status, 200)
})
test('Apple audience matches configured native bundle identifier', () => {
  const app = JSON.parse(readFileSync(new URL('../../../SkoolieApp/app.json', import.meta.url), 'utf8'))
  assert.equal(app.expo.ios.bundleIdentifier, 'com.skoolie.app')
})
