import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react'
import { AppState } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { readWithDeadline } from '@/lib/readWithDeadline'
import { createStreakSnapshotStore, nextUtcMidnightDelay } from '@/lib/streakSnapshot'
import { onProgressSaved } from '@/lib/progressEvents'

const Context = createContext<ReturnType<typeof createStreakSnapshotStore> | null>(null)

export function StreakProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const uid = user?.id
  const store = useMemo(() => createStreakSnapshotStore(async () => {
    if (!uid) throw new Error('Not signed in')
    const result = await readWithDeadline(signal => supabase.rpc('get_study_streak').abortSignal(signal), 3000)
    if (result.error) throw result.error
    return result.data
  }), [uid])
  useEffect(() => {
    if (!uid) return
    let stopped = false
    const retries: ReturnType<typeof setTimeout>[] = []
    const initial = async (attempt = 0) => {
      await store.refresh()
      if (!stopped && !store.getSnapshot() && attempt < 2) {
        retries.push(setTimeout(() => { if (!stopped) void initial(attempt + 1) }, attempt === 0 ? 2000 : 5000))
      }
    }
    void initial()
    let timer: ReturnType<typeof setTimeout>
    const schedule = () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        if (AppState.currentState === 'active') void store.refresh(true)
        schedule()
      }, nextUtcMidnightDelay())
    }
    schedule()
    const progress = onProgressSaved(() => { void store.refresh(true) })
    let wasBackground = AppState.currentState === 'background'
    const foreground = AppState.addEventListener('change', state => {
      if (state === 'background') wasBackground = true
      if (state === 'active') {
        const dayChanged = store.getSnapshot()?.today !== new Date().toISOString().slice(0, 10)
        if (wasBackground || dayChanged) void store.refresh(wasBackground)
        wasBackground = false
        schedule()
      }
    })
    return () => { stopped = true; retries.forEach(clearTimeout); clearTimeout(timer); progress(); foreground.remove() }
  }, [store, uid])
  // Cleanup does not permanently dispose a memoized store: React StrictMode
  // replays effects. Old identity stores have no remaining UI subscribers.
  return <Context.Provider value={store}>{children}</Context.Provider>
}

export function useStreakSnapshot() {
  const store = useContext(Context)
  if (!store) throw new Error('StreakProvider is required')
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
  useFocusEffect(useCallback(() => { void store.refresh() }, [store]))
  return snapshot
}
