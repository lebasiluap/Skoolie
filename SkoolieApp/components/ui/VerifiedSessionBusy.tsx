import { ActivityIndicator, Text, View } from 'react-native'
import { useTheme } from '@/hooks/useTheme'

export function VerifiedSessionBusy({ saving }: { saving: boolean }) {
  const C = useTheme()
  return <View accessibilityLiveRegion="polite" style={{ flex: 1, backgroundColor: C.bg,
    alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }}>
    <ActivityIndicator size="large" color={C.teal} />
    <Text style={{ color: C.text, fontFamily: 'Nunito_800ExtraBold', fontSize: 18, textAlign: 'center' }}>
      {saving ? 'Confirming your progress…' : 'Preparing your verified session…'}
    </Text>
    <Text style={{ color: C.textSoft, fontFamily: 'Nunito_600SemiBold', textAlign: 'center', maxWidth: 420 }}>
      {saving ? 'Keep this screen open until your result is confirmed.' : 'Checking that every question is still available.'}
    </Text>
  </View>
}
