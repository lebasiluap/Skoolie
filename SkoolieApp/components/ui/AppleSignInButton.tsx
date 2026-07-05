/**
 * Native Sign in with Apple button (App Store guideline 4.8 — required
 * alongside the Google option). Renders Apple's own button component so
 * review can't fault the styling; theme-aware black/white variants.
 *
 * Renders nothing on Android, on iOS builds without the native module
 * (stale dev client), or while availability is being checked.
 */
import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { useThemeMode } from '@/contexts/ThemeContext'
import { getAppleModule, appleAuthAvailable, signInWithApple } from '@/lib/appleAuth'

interface Props {
  /** Receives a user-facing error message, or nothing on cancel. */
  onError: (message?: string) => void
  /** Disable taps while another auth flow is in flight. */
  disabled?: boolean
}

export function AppleSignInButton({ onError, disabled }: Props) {
  const { isDark } = useThemeMode()
  const [available, setAvailable] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    appleAuthAvailable().then(setAvailable)
  }, [])

  const Apple = getAppleModule()
  if (!available || !Apple) return null

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
    <View style={{ marginTop: 12, opacity: disabled || busy ? 0.6 : 1 }}>
      <Apple.AppleAuthenticationButton
        buttonType={Apple.AppleAuthenticationButtonType.CONTINUE}
        buttonStyle={isDark
          ? Apple.AppleAuthenticationButtonStyle.WHITE
          : Apple.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={16}
        style={{ width: '100%', height: 54 }}
        onPress={handlePress}
      />
    </View>
  )
}
