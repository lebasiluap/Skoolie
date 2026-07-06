/**
 * Focus-session store — hides app chrome (tab bar) during an active
 * question run so the session is immersive and mid-quiz tab-escapes
 * aren't invited.
 *
 * Ref-counted per hook instance AND gated on navigation focus:
 * - Ref-counting means one screen clearing its flag can never stomp
 *   another screen's active session.
 * - The useIsFocused gate means a run screen left mounted in the
 *   stack (expo-router keeps history mounted) releases the chrome
 *   the moment the user navigates away — the tab bar can never get
 *   stuck hidden.
 * - Unmount always releases as a final guarantee.
 *
 * Module-level store (not context) because the practice screens keep
 * the run/topics/results phases inside one route — segment-based
 * hiding can't see that.
 */
import { useEffect, useRef, useSyncExternalStore } from 'react'
import { useIsFocused } from '@react-navigation/native'

const owners = new Set<number>()
let nextId = 1
const subs = new Set<() => void>()

function setOwner(id: number, on: boolean) {
  const before = owners.size > 0
  if (on) owners.add(id)
  else owners.delete(id)
  if ((owners.size > 0) !== before) subs.forEach(fn => fn())
}

export function useFocusSession(): boolean {
  return useSyncExternalStore(
    cb => { subs.add(cb); return () => { subs.delete(cb) } },
    () => owners.size > 0,
  )
}

/** Declarative: focus mode tracks `on` while this screen has navigation
 *  focus, and is force-released on blur or unmount. */
export function useFocusSessionWhile(on: boolean) {
  const idRef = useRef(0)
  if (idRef.current === 0) idRef.current = nextId++
  const isFocused = useIsFocused()
  const active = on && isFocused

  useEffect(() => { setOwner(idRef.current, active) }, [active])
  useEffect(() => {
    const id = idRef.current
    return () => setOwner(id, false)
  }, [])
}
