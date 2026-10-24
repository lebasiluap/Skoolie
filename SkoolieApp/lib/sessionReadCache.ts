// Metadata only: never cache question answers or use this to authorize content.
export function createSessionReadCache(ttlMs = 30_000, limit = 24) {
  const values = new Map<string, { data: unknown; at: number }>()
  const pending = new Map<string, Promise<unknown>>()
  let generation = 0
  return {
    peek<T>(key: string): T | undefined { return values.get(key)?.data as T | undefined },
    get<T>(key: string, read: () => Promise<T>): Promise<T> {
      const cached = values.get(key)
      if (cached && Date.now() - cached.at < ttlMs) return Promise.resolve(cached.data as T)
      const inFlight = pending.get(key)
      if (inFlight) return inFlight as Promise<T>
      const gen = generation
      const task = Promise.resolve().then(read).then(data => {
        if (gen === generation) {
          values.delete(key)
          values.set(key, { data, at: Date.now() })
          if (values.size > limit) values.delete(values.keys().next().value!)
        }
        return data
      }).finally(() => { if (pending.get(key) === task) pending.delete(key) })
      pending.set(key, task)
      return task
    },
    clear() { generation++; values.clear(); pending.clear() },
  }
}
