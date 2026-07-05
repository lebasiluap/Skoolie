import { useEffect } from 'react'
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import * as Linking from 'expo-linking'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/hooks/useTheme'

export default function AuthCallbackScreen() {
  const C = useTheme()
  const params = useLocalSearchParams<{ type?: string }>()
  // Warm-start deep links (app already running) arrive as URL events, not the
  // initial URL — useURL() covers both, getInitialURL() is the cold-start fallback.
  const eventUrl = Linking.useURL()

  useEffect(() => {
    // Safety net: whatever happens, never leave the user on this spinner.
    const bail = setTimeout(() => router.replace('/(auth)/login'), 8000)

    async function handleCallback() {
      try {
        // Get the full URL that opened this screen (event URL wins — it's live)
        const url = eventUrl ?? (await Linking.getInitialURL())
        if (!url) {
          // Warm start / no deep link captured — RootNavigator will route based
          // on whatever session state exists once we leave this screen.
          router.replace('/(auth)/login')
          return
        }

        // Tokens are in the URL fragment (#)
        const fragment = url.split('#')[1] ?? ''
        const fragmentParams = new URLSearchParams(fragment)
        const accessToken = fragmentParams.get('access_token')
        const refreshToken = fragmentParams.get('refresh_token')

        // type can also appear in the fragment or as a query param
        const typeFromFragment = fragmentParams.get('type')
        const typeFromQuery = params.type
        const type = typeFromFragment ?? typeFromQuery

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (error) {
            console.error('Callback setSession error:', error.message)
            router.replace('/(auth)/login')
            return
          }
        }

        if (type === 'recovery') {
          router.replace('/(auth)/update-password')
        } else {
          router.replace('/(app)/dashboard')
        }
      } catch (err) {
        console.error('Auth callback error:', err)
        router.replace('/(auth)/login')
      }
    }

    handleCallback().finally(() => clearTimeout(bail))
    return () => clearTimeout(bail)
  }, [eventUrl])

  return (
    <View style={[s.container, { backgroundColor: C.bg }]}>
      <ActivityIndicator size="large" color={C.teal} />
      <Text style={[s.text, { color: C.textFaint }]}>Signing you in…</Text>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  text: { fontSize: 15, fontFamily: 'Nunito_600SemiBold' },
})
