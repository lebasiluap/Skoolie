/**
 * Sign in with Apple button (App Store guideline 4.8 — required alongside the
 * Google option). Custom-styled to match the app's design system (Apple's HIG
 * permits custom buttons that keep the  logo and standard wording — their
 * native component is locked to the system font and clashed with Nunito).
 *
 * Renders nothing on Android, on iOS builds without the native module
 * (stale dev client), or while availability is being checked.
 */
import { useEffect, useState } from 'react'
import { Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/hooks/useTheme'
import { appleAuthAvailable, signInWithApple } from '@/lib/appleAuth'

interface Props {
  /** Receives a user-facing error message, or nothing on cancel. */
  onError: (message?: string) => void
  /** Disable taps while another auth flow is in flight. */
  disabled?: boolean
}

export function AppleSignInButton({ onError, disabled }: Props) {
  const C = useTheme()
  const [available, setAvailable] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    appleAuthAvailable().then(setAvailable)
  }, [])

  if (!available) return null

  async function handlePress() {
    if (busy || disabled) return
    setBusy(true)
    try {
      const res = await signInWithApple()
      if (!res.ok && res.error) onError(res.error)
      // success → session lands → RootNavigator routes to onboarding/dashboard
    } finally {
      setBusy(false)
    }
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled || busy}
      activeOpacity={0.8}
      accessibilityRole="button"
      style={[s.btn, {
        backgroundColor: C.surface,
        borderColor: C.border,
        opacity: disabled || busy ? 0.6 : 1,
        ...C.shadow,
      }]}
    >
      <Ionicons name="logo-apple" size={22} color={C.text} style={{ marginTop: -2 }} />
      <Text style={[s.label, { color: C.text }]}>
        {busy ? 'Signing in…' : 'Continue with Apple'}
      </Text>
    </TouchableOpacity>
  )
}

// Mirrors the Google button (googleBtn/googleText in login & signup) exactly.
const s = StyleSheet.create({
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
    borderRadius: 16, borderWidth: 1.5, paddingVertical: 16, marginTop: 12,
  },
  label: { fontSize: 15, fontFamily: 'Nunito_800ExtraBold' },
})
