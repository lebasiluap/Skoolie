import { useEffect } from 'react'
import { Appearance, Text, TextInput, View, TouchableOpacity } from 'react-native'
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
// Direct imports avoid bundling every unused italic/weight from the barrel.
import { Nunito_400Regular } from '@expo-google-fonts/nunito/400Regular'
import { Nunito_600SemiBold } from '@expo-google-fonts/nunito/600SemiBold'
import { Nunito_700Bold } from '@expo-google-fonts/nunito/700Bold'
import { Nunito_800ExtraBold } from '@expo-google-fonts/nunito/800ExtraBold'
import { Nunito_900Black } from '@expo-google-fonts/nunito/900Black'
import { AuthProvider, useAuth } from '@/hooks/useAuth'
import { ThemeProvider, useThemeMode } from '@/contexts/ThemeContext'
import { ToastHost } from '@/components/ui/ToastHost'
import { CelebrationHost } from '@/components/ui/CelebrationHost'
import { useTheme } from '@/hooks/useTheme'

function RootNavigator() {
  const { session, profile, loading, profileChecked, sessionRecovery, retrySession } = useAuth()
  const C=useTheme()
  const { isDark } = useThemeMode()
  const segments = useSegments()

  useEffect(() => {
    if (loading||sessionRecovery) return
    // Legal docs are readable by anyone, signed in or not — never redirect away.
    if (segments[0] === 'legal') return
    const inAuth = segments[0] === '(auth)'
    const authScreen = (segments as string[])[1] as string | undefined
    // Screens that manage their own session transitions. Password recovery
    // creates a session mid-flow (verifyOtp) — redirecting the moment it lands
    // would yank the user away before they can set the new password.
    const selfRouting = (inAuth && (authScreen === 'forgot-password' || authScreen === 'update-password' || authScreen === 'callback'))
      // OAuth deep link (skoolie://auth/callback) — must not be redirected away
      // while it exchanges the URL tokens for a session
      || (segments[0] === 'auth' && (segments as string[])[1] === 'callback')

    // OAuth deep link (skoolie://auth/callback) arrives BEFORE a session
    // exists — it must never be redirected away while exchanging tokens.
    const isOauthCallback = segments[0] === 'auth' && (segments as string[])[1] === 'callback'
    if (!session) {
      // Onboarding lives in (auth) but REQUIRES a session — signing out from
      // it must land back on login, not leave the form sitting there.
      if ((!inAuth || authScreen === 'onboarding') && !isOauthCallback) router.replace('/(auth)/login')
    } else if (selfRouting) {
      // let the screen finish its own flow
    } else if (!profile) {
      // Only route to onboarding once a fetch has CONFIRMED the profile is
      // missing — "fetch failed" must never look like "new user".
      if (profileChecked && authScreen !== 'onboarding') router.replace('/(auth)/onboarding')
    } else {
      if (inAuth) router.replace('/(app)/dashboard')
    }
  }, [session, profile, loading, profileChecked, sessionRecovery, segments])

  // Text/layout remeasure naturally. Remounting the navigator on fontScale
  // discarded active decks and looked like a random refresh after interruption.

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
        <Stack.Screen name="legal" options={{ presentation: 'modal' }} />
        <Stack.Screen name="users" options={{ presentation: 'card' }} />
      </Stack>
      {sessionRecovery&&<View style={{position:'absolute',top:0,bottom:0,left:0,right:0,backgroundColor:C.bg,justifyContent:'center',padding:28,alignItems:'center'}}>
        <Text style={{fontFamily:'Nunito_800ExtraBold',fontSize:22,color:C.text}}>Couldn’t reconnect</Text>
        <Text style={{fontFamily:'Nunito_600SemiBold',fontSize:16,color:C.textSoft,textAlign:'center',marginVertical:18}}>Check your connection and try again. We couldn’t confirm your saved sign-in; this does not mean you signed out.</Text>
        <TouchableOpacity accessibilityRole="button" onPress={retrySession} style={{backgroundColor:C.teal,padding:16,borderRadius:16,minHeight:48}}>
          <Text style={{color:C.onTeal,fontFamily:'Nunito_800ExtraBold'}}>Try again</Text>
        </TouchableOpacity>
      </View>}
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
