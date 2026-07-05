import { useEffect } from 'react'
import { Text, TextInput } from 'react-native'
import { Stack, router, useSegments } from 'expo-router'

// Accessibility: honor the OS font-size setting but cap scaling at 1.4x so
// hero numerals, chips, and week grids scale up without breaking layouts.
// (Uncapped, several screens become unusable at the largest settings.)
;(Text as any).defaultProps = { ...(Text as any).defaultProps, maxFontSizeMultiplier: 1.4 }
;(TextInput as any).defaultProps = { ...(TextInput as any).defaultProps, maxFontSizeMultiplier: 1.4 }
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useFonts } from 'expo-font'
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  Nunito_900Black,
} from '@expo-google-fonts/nunito'
import { AuthProvider, useAuth } from '@/hooks/useAuth'
import { ThemeProvider, useThemeMode } from '@/contexts/ThemeContext'
import { ToastHost } from '@/components/ui/ToastHost'
import { CelebrationHost } from '@/components/ui/CelebrationHost'

function RootNavigator() {
  const { session, profile, loading } = useAuth()
  const { isDark } = useThemeMode()
  const segments = useSegments()

  useEffect(() => {
    if (loading) return
    const inAuth = segments[0] === '(auth)'
    const inApp = segments[0] === '(app)'

    if (!session) {
      if (!inAuth) router.replace('/(auth)/login')
    } else if (!profile) {
      router.replace('/(auth)/onboarding')
    } else {
      if (inAuth) router.replace('/(app)/dashboard')
    }
  }, [session, profile, loading])

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
        <Stack.Screen name="users" options={{ presentation: 'card' }} />
      </Stack>
    </>
  )
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Nunito_900Black,
  })

  if (!fontsLoaded) return null

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <RootNavigator />
            <ToastHost />
            <CelebrationHost />
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
