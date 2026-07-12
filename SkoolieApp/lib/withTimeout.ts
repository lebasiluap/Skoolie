/**
 * Bounded awaiting for auth-critical promises.
 *
 * Why this exists: supabase-js serializes ALL auth work behind an internal
 * lock. On a cold start after a long dormancy the stored session is expired,
 * so the client fires a token refresh — and React Native's fetch has NO
 * timeout, so on a flaky/waking network that request can hang indefinitely,
 * holding the auth lock. Any sign-in tapped afterwards queues behind the dead
 * lock forever ("Signing in…" until the app is killed). Observed on both
 * Google and Apple sign-in, July 2026.
 *
 * Defense is layered: lib/supabase.ts bounds every network call the client
 * makes (so the lock always frees), and the auth UI flows wrap their awaits
 * in withTimeout so the user always gets an answer.
 */
export class TimeoutError extends Error {
  constructor(ms: number) {
    super(`Timed out after ${ms}ms`)
    this.name = 'TimeoutError'
  }
}

/** The user-facing copy every auth screen shows on a timeout. */
export const AUTH_TIMEOUT_MESSAGE =
  'This is taking longer than it should — check your connection and try again.'

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError(ms)), ms)
    promise.then(
      v => { clearTimeout(timer); resolve(v) },
      e => { clearTimeout(timer); reject(e) },
    )
  })
}
