/**
 * Focus-session store — hides app chrome (tab bar) during an active
 * question run so the session is immersive and mid-quiz tab-escapes
 * aren't invited. Screens flip it on while their internal `screen`
 * state is an active run ('quiz' / 'case' / 'run'), and it always
 * clears on unmount so a crashy exit can never strand the app
 * without a tab bar.
 *
 * Module-level store (not context) because the practice screens keep
 * the run/topics/results phases inside one route — segment-based
 * hiding can't see that.
 */
import { useEffect, useSyncExternalStore } from 'react'

let active = false
const subs = new Set<() => void>()

export function setFocusSession(on: boolean) {
  if (active === on) return
  active = on
  subs.forEach(fn => fn())
}

export function useFocusSession(): boolean {
  return useSyncExternalStore(
    cb => { subs.add(cb); return () => { subs.delete(cb) } },
    () => active,
  )
}

/** Declarative: focus mode tracks `on`, and is force-cleared on unmount. */
export function useFocusSessionWhile(on: boolean) {
  useEffect(() => { setFocusSession(on) }, [on])
  useEffect(() => () => setFocusSession(false), [])
}
