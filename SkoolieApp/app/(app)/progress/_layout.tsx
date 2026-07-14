import { Stack } from 'expo-router'
import { useTheme } from '@/hooks/useTheme'

// Same anchor as the practice stack: the dashboard deep-links straight to
// /progress/analytics, and without an initial route the Progress tab button
// had the same push/reveal toggle hazard.
export const unstable_settings = { initialRouteName: 'index' }

export default function ProgressLayout() {
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
