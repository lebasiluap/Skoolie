import { useEffect } from 'react'
import { useNavigation } from 'expo-router'

const MODE_ROUTES = ['mcq', 'flashcards', 'cases']

// Keeps a practice mode screen sitting directly on top of the hub ('index').
//
// The hub and dashboard navigate to modes with router.push, and switching tabs
// doesn't pop the previous mode — so opening MCQs, leaving, then opening
// Flashcards produced a stack of [index, mcq, flashcards], making "back" land on
// MCQs instead of the hub. On focus we collapse any *other* mode below the
// current one, so the stack is always [index, <currentMode>]. Routes that aren't
// modes (e.g. 'bookmarks') are left intact, preserving the bookmarks → mcq → back
// flow.
export function useCollapsePracticeStack() {
  const navigation = useNavigation<any>()
  useEffect(() => {
    const collapse = () => {
      const st = navigation.getState?.()
      if (!st?.routes) return
      const meIdx = st.index
      const me = st.routes[meIdx]
      if (!me || !MODE_ROUTES.includes(me.name)) return
      const lowerHasMode = st.routes
        .slice(0, meIdx)
        .some((r: any) => MODE_ROUTES.includes(r.name))
      if (lowerHasMode) {
        navigation.reset({ index: 1, routes: [{ name: 'index' }, { name: me.name, params: me.params }] })
      }
    }
    collapse()
    const unsub = navigation.addListener('focus', collapse)
    return unsub
  }, [navigation])
}
