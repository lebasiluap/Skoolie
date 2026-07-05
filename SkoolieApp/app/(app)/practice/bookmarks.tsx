import { Redirect } from 'expo-router'
// Bookmarks content lives at /(app)/bookmarks (outside the practice stack)
// so the Practice tab is not highlighted when viewing bookmarks.
export default function BookmarksPracticeRedirect() {
  return <Redirect href="/(app)/bookmarks" />
}
