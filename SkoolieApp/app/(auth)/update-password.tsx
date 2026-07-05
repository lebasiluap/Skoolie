import { useState } from 'react'
import { View, Text, TextInput, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/hooks/useTheme'
import { Button } from '@/components/ui/Button'
import { PasswordInput } from '@/components/ui/PasswordInput'

// NOTE: Reachable only via legacy deep links (auth/callback with type=recovery).
// The primary reset flow is fully in-app OTP (forgot-password.tsx). Kept as a
// safe landing for any old recovery links still in inboxes.
export default function UpdatePasswordScreen() {
  const C = useTheme()
  const insets = useSafeAreaInsets()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  async function handleUpdatePassword() {
    if (!password || !confirm) { setFormError('Please fill in both fields.'); return }
    if (password.length < 6) { setFormError('Password must be at least 6 characters.'); return }
    if (password !== confirm) { setFormError('Passwords do not match.'); return }
    setFormError(null)

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      setFormError(/network|fetch/i.test(error.message)
        ? 'Connection problem — check your internet and try again.'
        : 'Couldn\u2019t update your password. Please try again.')
    } else {
      Alert.alert('Password updated', 'Your password has been changed.', [
        { text: 'OK', onPress: () => router.replace('/(app)/dashboard') },
      ])
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[s.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 40 }]}>
        <Text style={[s.title, { color: C.text }]}>Set new password</Text>
        <Text style={[s.sub, { color: C.textFaint }]}>Choose a strong password for your account.</Text>

        <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border, ...C.shadow }]}>
          <Text style={[s.fieldLabel, { color: C.textSoft }]}>New password</Text>
          <PasswordInput
            containerStyle={{ marginBottom: 16 }}
            inputStyle={[s.input, { backgroundColor: C.surface2, borderColor: C.border, color: C.text, marginBottom: 0 }]}
            value={password}
            onChangeText={setPassword}
            placeholder="At least 6 characters"
            placeholderTextColor={C.textFaint}
            autoComplete="new-password"
            textContentType="newPassword"
          />

          <Text style={[s.fieldLabel, { color: C.textSoft, marginTop: 4 }]}>Confirm password</Text>
          <PasswordInput
            containerStyle={{ marginBottom: 16 }}
            inputStyle={[s.input, { backgroundColor: C.surface2, borderColor: C.border, color: C.text, marginBottom: 0 }]}
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Re-enter new password"
            placeholderTextColor={C.textFaint}
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="go"
            onSubmitEditing={handleUpdatePassword}
          />

          {formError && (
            <View style={[s.msgBox, { backgroundColor: C.redTint, borderColor: C.red }]} accessibilityRole="alert">
              <Text style={[s.msgText, { color: C.red }]}>{formError}</Text>
            </View>
          )}

          <Button
            label="Set new password"
            onPress={handleUpdatePassword}
            loading={loading}
            fullWidth
            style={{ marginTop: 16 }}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  title: { fontSize: 28, fontFamily: 'Nunito_900Black', letterSpacing: -0.5, marginBottom: 8 },
  sub: { fontSize: 14, fontFamily: 'Nunito_600SemiBold', marginBottom: 28, lineHeight: 20 },
  card: { borderRadius: 24, borderWidth: 1, padding: 24 },
  fieldLabel: { fontSize: 13, fontFamily: 'Nunito_700Bold', marginBottom: 7 },
  input: { borderRadius: 14, borderWidth: 1.5, padding: 14, fontSize: 15, fontFamily: 'Nunito_600SemiBold', marginBottom: 16 },
  msgBox: { borderRadius: 12, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 14 },
  msgText: { fontSize: 13.5, fontFamily: 'Nunito_700Bold', lineHeight: 19 },
})
