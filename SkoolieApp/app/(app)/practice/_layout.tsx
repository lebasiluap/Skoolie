import { Stack } from 'expo-router'
import { useTheme } from '@/hooks/useTheme'

// Anchor the stack on the hub. Without this, deep links from other tabs
// (e.g. dashboard → Today's Challenge) initialized this stack with ONLY the
// sub-screen — no hub beneath it — so the Practice tab button alternated
// between pushing the hub and revealing the sub-screen (the toggle bug).
// With the anchor, deep navigation always builds [hub, sub-screen]: tab taps
// pop to the hub and stay there.
export const unstable_settings = { initialRouteName: 'index' }

export default function PracticeLayout() {
  const C = useTheme()
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: C.bg },
        animation: 'slide_from_right',
        animationDuration: 280,
        gestureEnabled: true,
      }}
    />
  )
}
