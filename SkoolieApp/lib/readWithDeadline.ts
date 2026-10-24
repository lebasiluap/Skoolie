/** Bounds a read even when it is waiting before fetch (for example on auth).
 * Cancelling a screen request never changes or signs out the shared session. */
export function readWithDeadline<T>(
  read: (signal: AbortSignal) => PromiseLike<T>,
  timeoutMs = 12_000,
  upstream?: AbortSignal,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const controller = new AbortController()
    let settled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const finish = (done: () => void) => {
      if (settled) return
      settled = true
      if (timer) clearTimeout(timer)
      upstream?.removeEventListener('abort', cancel)
      done()
    }
    const cancel = () => {
      finish(() => reject(new Error('Read cancelled')))
      controller.abort()
    }
    if (upstream?.aborted) { cancel(); return }
    upstream?.addEventListener('abort', cancel, { once: true })
    timer = setTimeout(() => {
      finish(() => reject(new Error('Read timed out')))
      controller.abort()
    }, timeoutMs)
    Promise.resolve().then(() => read(controller.signal)).then(
      value => finish(() => resolve(value)),
      error => finish(() => reject(error)),
    )
  })
}
