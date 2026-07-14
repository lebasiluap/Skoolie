import { Redirect } from 'expo-router'
import { ActivityIndicator, View } from 'react-native'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'

// Cold-start gate. This used to redirect straight to the login page while the
// saved session was still being restored from AsyncStorage — every returning
// user saw the login screen for ~1–3s before the router yanked them to the
// dashboard. Now we hold a theme-matched splash until auth state is KNOWN,
// then route once, to the right place.
export default function Index() {
  const { session, profile, loading, profileChecked } = useAuth()
  const C = useTheme()

  // Session restore (and, for signed-in users, the first profile fetch) is in
  // flight — show a quiet splash instead of flashing the wrong screen.
  if (loading || (session && !profile && !profileChecked)) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.teal} />
      </View>
    )
  }

  if (!session) return <Redirect href="/(auth)/login" />
  if (!profile) return <Redirect href="/(auth)/onboarding" />
  return <Redirect href="/(app)/dashboard" />
}
