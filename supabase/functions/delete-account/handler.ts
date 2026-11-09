type Identity = { provider: string; provider_id?: string; identity_data?: { sub?: string } }
export type DeletionUser = { id: string; identities?: Identity[] }
export interface DeletionDependencies {
  authenticate: (authorization: string) => Promise<DeletionUser | null>
  revokeApple: (code: string, subject: string) => Promise<void>
  removeUploads: (uid: string) => Promise<void>
  removeReports: (uid: string) => Promise<void>
  deleteUser: (uid: string) => Promise<void>
}
const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
export function createDeletionHandler(deps: DeletionDependencies) {
  return async (req: Request): Promise<Response> => {
    const reply = (status: number, body: object) => new Response(JSON.stringify(body), { status, headers })
    if (req.method !== 'POST') return reply(405, { error: 'METHOD_NOT_ALLOWED' })
    const auth = req.headers.get('Authorization') ?? ''
    if (!/^Bearer \S+$/.test(auth)) return reply(401, { error: 'UNAUTHENTICATED' })
    // The body never selects the account. Only the verified JWT does.
    let user: DeletionUser | null
    try { user = await deps.authenticate(auth) } catch { return reply(401, { error: 'UNAUTHENTICATED' }) }
    if (!user) return reply(401, { error: 'UNAUTHENTICATED' })
    let body
    try {
      const raw = await req.text()
      if (raw.length > 8192) return reply(413, { error: 'REQUEST_TOO_LARGE' })
      body = JSON.parse(raw)
    } catch { return reply(400, { error: 'INVALID_REQUEST' }) }
    if (!body || body.confirm !== 'DELETE') return reply(400, { error: 'CONFIRMATION_REQUIRED' })
    const apple = user.identities?.find(identity => identity.provider === 'apple')
    let manualAppleRevocation = false
    if (apple) {
      if (body.manual_apple_revoke === true) {
        // Apple TN3194 permits this fallback when the original tokens are
        // unavailable. The client must explicitly explain the manual step.
        manualAppleRevocation = true
      } else {
        const subject = apple.identity_data?.sub ?? apple.provider_id
        if (typeof body.apple_authorization_code !== 'string' || !body.apple_authorization_code || !subject) {
          return reply(409, { error: 'APPLE_REAUTH_REQUIRED' })
        }
        try { await deps.revokeApple(body.apple_authorization_code, subject) }
        catch { return reply(502, { error: 'APPLE_REVOCATION_FAILED' }) }
      }
    }
    try {
      // Uploads must be removed through Storage API, not by deleting metadata.
      // Failure leaves the account present so retry/support remains possible.
      await deps.removeUploads(user.id)
      await deps.removeReports(user.id)
      await deps.deleteUser(user.id)
      return reply(200, { deleted: true, manual_apple_revocation: manualAppleRevocation })
    } catch { return reply(503, { error: 'DELETION_INCOMPLETE' }) }
  }
}
