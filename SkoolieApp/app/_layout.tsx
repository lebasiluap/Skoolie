import { useEffect } from 'react'
import { Appearance, Text, TextInput, View } from 'react-native'
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
  const { session, profile, loading, profileChecked } = useAuth()
  const { isDark } = useThemeMode()
  const segments = useSegments()

  useEffect(() => {
    if (loading) return
    // Legal docs are readable by anyone, signed in or not — never redirect away.
    if (segments[0] === 'legal') return
    const inAuth = segments[0] === '(auth)'
    const authScreen = (segments as string[])[1] as string | undefined
    // Screens that manage their own session transitions. Password recovery
    // creates a session mid-flow (verifyOtp) — redirecting the moment it lands
    // would yank the user away before they can set the new password.
    const selfRouting = inAuth && (authScreen === 'forgot-password' || authScreen === 'update-password' || authScreen === 'callback')

    if (!session) {
      if (!inAuth) router.replace('/(auth)/login')
    } else if (selfRouting) {
      // let the screen finish its own flow
    } else if (!profile) {
      // Only route to onboarding once a fetch has CONFIRMED the profile is
      // missing — "fetch failed" must never look like "new user".
      if (profileChecked && authScreen !== 'onboarding') router.replace('/(auth)/onboarding')
    } else {
      if (inAuth) router.replace('/(app)/dashboard')
    }
  }, [session, profile, loading, profileChecked, segments])

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
        <Stack.Screen name="legal" options={{ presentation: 'modal' }} />
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

  if (!fontsLoaded) {
    // Theme-matched placeholder instead of a white/black flash while fonts load.
    const dark = Appearance.getColorScheme() === 'dark'
    return <View style={{ flex: 1, backgroundColor: dark ? '#0C1211' : '#EEF2F1' }} />
  }

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
