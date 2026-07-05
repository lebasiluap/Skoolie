import { useEffect, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/hooks/useTheme'
import { Button } from '@/components/ui/Button'
import { PasswordInput } from '@/components/ui/PasswordInput'

// Fully in-app password reset via email OTP (no deep link, no website):
//   1. resetPasswordForEmail(email) → emails a 6-digit code
//   2. verifyOtp({ email, token, type: 'recovery' }) → establishes a session
//   3. updateUser({ password }) → sets the new password
export default function ForgotPasswordScreen() {
  const C = useTheme()
  const insets = useSafeAreaInsets()
  const [step, setStep] = useState<'request' | 'verify'>('request')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  // Inline messaging (matches login) — no raw technical strings.
  const [formError, setFormError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  // Resend cooldown — prevents spam-tapping five emails into a rate limit.
  const [cooldown, setCooldown] = useState(0)
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  function friendly(msg: string): string {
    if (/security purposes|only request this/i.test(msg)) {
      const secs = msg.match(/after (\d+) seconds/)?.[1]
      return secs
        ? `Codes can only be sent once a minute — try again in ${secs} seconds.`
        : 'Codes can only be sent once a minute — give it a moment and try again.'
    }
    if (/rate limit/i.test(msg)) return 'Too many requests — wait a little while before requesting another code.'
    if (/network|fetch/i.test(msg)) return 'Connection problem — check your internet and try again.'
    if (/expired|invalid/i.test(msg)) return 'That code is invalid or has expired — request a new one.'
    return 'Something went wrong. Please try again.'
  }

  async function sendCode() {
    if (!email.trim()) { setFormError('Enter your email first.'); return }
    setFormError(null); setNotice(null)
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim())
    setLoading(false)
    if (error) setFormError(friendly(error.message))
    else { setCooldown(60); setStep('verify') }
  }

  async function resendCode() {
    if (cooldown > 0) return
    setFormError(null); setNotice(null)
    setCooldown(60)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim())
    if (error) { setFormError(friendly(error.message)); setCooldown(0) }
    else setNotice('New code sent — check your email.')
  }

  async function submitNewPassword() {
    if (code.trim().length < 6) { setFormError('Enter the code from your email.'); return }
    if (!password || !confirm) { setFormError('Enter and confirm your new password.'); return }
    if (password.length < 6) { setFormError('Password must be at least 6 characters.'); return }
    if (password !== confirm) { setFormError('Passwords do not match.'); return }
    setFormError(null); setNotice(null)

    setLoading(true)
    // Verify the email code — this signs the user in with a recovery session.
    // (RootNavigator deliberately leaves this screen alone while that happens.)
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: 'recovery',
    })
    if (verifyError) {
      setLoading(false)
      setFormError(friendly(verifyError.message))
      return
    }
    // Now authenticated → set the new password.
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (updateError) { setFormError(friendly(updateError.message)); return }

    Alert.alert('Password changed', 'Your password has been updated.', [
      { text: 'Continue', onPress: () => router.replace('/(app)/dashboard') },
    ])
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[s.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 40 }]}>
        <TouchableOpacity
          onPress={() => (step === 'verify' ? setStep('request') : router.back())}
          style={[s.backBtn, { backgroundColor: C.surface2 }]}
          accessibilityRole="button"
          accessibilityLabel={step === 'verify' ? 'Back to email entry' : 'Back to sign in'}
        >
          <Text style={[{ color: C.textSoft, fontSize: 18, fontFamily: 'Nunito_700Bold' }]}>←</Text>
        </TouchableOpacity>

        <Text style={[s.title, { color: C.text }]}>Reset password</Text>
        <Text style={[s.sub, { color: C.textFaint }]}>
          {step === 'request'
            ? "Enter your email and we'll send you a reset code."
            : `Enter the code sent to ${email}, then choose a new password.`}
        </Text>

        {step === 'request' ? (
          <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border, ...C.shadow }]}>
            <TextInput
              style={[s.input, { backgroundColor: C.surface2, borderColor: C.border, color: C.text }]}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={C.textFaint}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              textContentType="username"
              returnKeyType="go"
              onSubmitEditing={sendCode}
            />
            {formError && (
              <View style={[s.msgBox, { backgroundColor: C.redTint, borderColor: C.red }]} accessibilityRole="alert">
                <Text style={[s.msgText, { color: C.red }]}>{formError}</Text>
              </View>
            )}
            <Button label="Send code" onPress={sendCode} loading={loading} fullWidth style={{ marginTop: 16 }} />
            <TouchableOpacity
              onPress={() => (email.trim() ? setStep('verify') : setFormError('Enter your email first.'))}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              style={{ marginTop: 14, alignItems: 'center' }}
            >
              <Text style={[{ color: C.teal, fontFamily: 'Nunito_700Bold', fontSize: 14 }]}>Already have a code?</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border, ...C.shadow }]}>
            <Text style={[s.label, { color: C.textSoft }]}>Code from your email</Text>
            <TextInput
              style={[s.input, { backgroundColor: C.surface2, borderColor: C.border, color: C.text, letterSpacing: 6, textAlign: 'center', fontSize: 20 }]}
              value={code}
              onChangeText={setCode}
              placeholder="------"
              placeholderTextColor={C.textFaint}
              keyboardType="number-pad"
              maxLength={10}
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
            />

            <Text style={[s.label, { color: C.textSoft, marginTop: 16 }]}>New password</Text>
            <PasswordInput
              inputStyle={[s.input, { backgroundColor: C.surface2, borderColor: C.border, color: C.text }]}
              value={password}
              onChangeText={setPassword}
              placeholder="At least 6 characters"
              placeholderTextColor={C.textFaint}
              autoComplete="new-password"
              textContentType="newPassword"
            />

            <Text style={[s.label, { color: C.textSoft, marginTop: 16 }]}>Confirm new password</Text>
            <PasswordInput
              inputStyle={[s.input, { backgroundColor: C.surface2, borderColor: C.border, color: C.text }]}
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Re-enter new password"
              placeholderTextColor={C.textFaint}
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="go"
              onSubmitEditing={submitNewPassword}
            />

            {formError && (
              <View style={[s.msgBox, { backgroundColor: C.redTint, borderColor: C.red }]} accessibilityRole="alert">
                <Text style={[s.msgText, { color: C.red }]}>{formError}</Text>
              </View>
            )}
            {notice && (
              <View style={[s.msgBox, { backgroundColor: C.tealTint, borderColor: C.teal }]}>
                <Text style={[s.msgText, { color: C.tealDeep }]}>{notice}</Text>
              </View>
            )}

            <Button label="Change password" onPress={submitNewPassword} loading={loading} fullWidth style={{ marginTop: 20 }} />
            <TouchableOpacity
              onPress={resendCode}
              disabled={cooldown > 0}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              style={{ marginTop: 14, alignItems: 'center' }}
            >
              <Text style={[{ color: cooldown > 0 ? C.textFaint : C.teal, fontFamily: 'Nunito_700Bold', fontSize: 14 }]}>
                {cooldown > 0 ? `Resend code (${cooldown}s)` : 'Resend code'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  backBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  title: { fontSize: 28, fontFamily: 'Nunito_900Black', letterSpacing: -0.5, marginBottom: 8 },
  sub: { fontSize: 14, fontFamily: 'Nunito_600SemiBold', marginBottom: 28, lineHeight: 20 },
  card: { borderRadius: 24, borderWidth: 1, padding: 24 },
  label: { fontSize: 13, fontFamily: 'Nunito_700Bold', marginBottom: 7 },
  input: { borderRadius: 14, borderWidth: 1.5, padding: 14, fontSize: 15, fontFamily: 'Nunito_600SemiBold' },
  msgBox: { borderRadius: 12, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 14, marginTop: 14 },
  msgText: { fontSize: 13.5, fontFamily: 'Nunito_700Bold', lineHeight: 19 },
})
