import { Stack } from 'expo-router'
import { useTheme } from '@/hooks/useTheme'

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
