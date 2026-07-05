import { useState } from 'react'
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

  function prettyError(msg: string): { title: string; body: string } {
    if (/rate limit/i.test(msg)) {
      return { title: 'Please wait a moment', body: 'Too many requests. Wait a little while before requesting another code.' }
    }
    return { title: 'Error', body: msg }
  }

  async function sendCode() {
    if (!email.trim()) return Alert.alert('Enter your email')
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim())
    setLoading(false)
    if (error) {
      const e = prettyError(error.message)
      Alert.alert(e.title, e.body)
    } else {
      setStep('verify')
    }
  }

  async function resendCode() {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim())
    if (error) {
      const e = prettyError(error.message)
      Alert.alert(e.title, e.body)
    } else {
      Alert.alert('Code sent', 'We sent you a new code.')
    }
  }

  async function submitNewPassword() {
    if (!code.trim()) return Alert.alert('Enter the code', 'Check your email for the 6-digit code.')
    if (!password || !confirm) return Alert.alert('Missing fields', 'Enter and confirm your new password.')
    if (password.length < 6) return Alert.alert('Weak password', 'Password must be at least 6 characters.')
    if (password !== confirm) return Alert.alert('Mismatch', 'Passwords do not match.')

    setLoading(true)
    // Verify the email code — this signs the user in with a recovery session.
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: 'recovery',
    })
    if (verifyError) {
      setLoading(false)
      return Alert.alert('Invalid or expired code', verifyError.message)
    }
    // Now authenticated → set the new password.
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (updateError) return Alert.alert('Error', updateError.message)

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
        >
          <Text style={[{ color: C.textSoft, fontSize: 18, fontFamily: 'Nunito_700Bold' }]}>←</Text>
        </TouchableOpacity>

        <Text style={[s.title, { color: C.text }]}>Reset password</Text>
        <Text style={[s.sub, { color: C.textFaint }]}>
          {step === 'request'
            ? "Enter your email and we'll send you a 6-digit code."
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
            />
            <Button label="Send code" onPress={sendCode} loading={loading} fullWidth style={{ marginTop: 16 }} />
            <TouchableOpacity
              onPress={() => (email.trim() ? setStep('verify') : Alert.alert('Enter your email first'))}
              style={{ marginTop: 14, alignItems: 'center' }}
            >
              <Text style={[{ color: C.teal, fontFamily: 'Nunito_700Bold', fontSize: 14 }]}>Already have a code?</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border, ...C.shadow }]}>
            <Text style={[s.label, { color: C.textSoft }]}>6-digit code</Text>
            <TextInput
              style={[s.input, { backgroundColor: C.surface2, borderColor: C.border, color: C.text, letterSpacing: 6, textAlign: 'center', fontSize: 20 }]}
              value={code}
              onChangeText={setCode}
              placeholder="------"
              placeholderTextColor={C.textFaint}
              keyboardType="number-pad"
              maxLength={6}
              autoComplete="one-time-code"
            />

            <Text style={[s.label, { color: C.textSoft, marginTop: 16 }]}>New password</Text>
            <PasswordInput
              inputStyle={[s.input, { backgroundColor: C.surface2, borderColor: C.border, color: C.text }]}
              value={password}
              onChangeText={setPassword}
              placeholder="At least 6 characters"
              placeholderTextColor={C.textFaint}
              autoComplete="new-password"
            />

            <Text style={[s.label, { color: C.textSoft, marginTop: 16 }]}>Confirm new password</Text>
            <PasswordInput
              inputStyle={[s.input, { backgroundColor: C.surface2, borderColor: C.border, color: C.text }]}
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Re-enter new password"
              placeholderTextColor={C.textFaint}
              autoComplete="new-password"
            />

            <Button label="Change password" onPress={submitNewPassword} loading={loading} fullWidth style={{ marginTop: 20 }} />
            <TouchableOpacity onPress={resendCode} style={{ marginTop: 14, alignItems: 'center' }}>
              <Text style={[{ color: C.teal, fontFamily: 'Nunito_700Bold', fontSize: 14 }]}>Resend code</Text>
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
})
