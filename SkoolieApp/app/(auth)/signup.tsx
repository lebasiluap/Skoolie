import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, StyleSheet, Alert } from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as WebBrowser from 'expo-web-browser'
import * as Linking from 'expo-linking'
import Svg, { Path } from 'react-native-svg'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/hooks/useTheme'
import { Button } from '@/components/ui/Button'
import { PasswordInput } from '@/components/ui/PasswordInput'

WebBrowser.maybeCompleteAuthSession()

// Google "G" logo in brand colours
function GoogleG() {
  return (
    <Svg width={20} height={20} viewBox="0 0 48 48">
      <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </Svg>
  )
}

export default function SignupScreen() {
  const C = useTheme()
  const insets = useSafeAreaInsets()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  async function handleGoogleLogin() {
    setGoogleLoading(true)
    // No leading slash — skoolie://auth/callback (2 slashes), not skoolie:///auth/callback (3)
    const redirectTo = Linking.createURL('auth/callback')
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true, // we open the browser ourselves via WebBrowser
      },
    })
    if (error) {
      setGoogleLoading(false)
      Alert.alert('Google sign-in failed', error.message)
      return
    }
    if (data?.url) {
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)
      if (result.type === 'success') {
        const url = result.url
        if (url.includes('access_token=')) {
          // Implicit flow: parse tokens from URL fragment
          const fragment = url.split('#')[1] || ''
          const p = Object.fromEntries(new URLSearchParams(fragment))
          if (p.access_token) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: p.access_token,
              refresh_token: p.refresh_token || '',
            })
            if (sessionError) Alert.alert('Sign-in error', sessionError.message)
          }
        } else if (url.split('#')[0].includes('code=')) {
          // PKCE flow (future-proof)
          const { error: sessionError } = await supabase.auth.exchangeCodeForSession(url)
          if (sessionError) Alert.alert('Sign-in error', sessionError.message)
        }
      }
    }
    setGoogleLoading(false)
  }

  async function handleSignup() {
    if (!name || !email || !password) return Alert.alert('Missing fields', 'Please fill in all fields.')
    if (password.length < 6) return Alert.alert('Weak password', 'Password must be at least 6 characters.')
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: name.trim() } },
    })
    setLoading(false)
    if (error) Alert.alert('Sign up failed', error.message)
    else Alert.alert('Check your email', 'We sent you a confirmation link.')
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[s.scroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => router.back()} style={[s.backBtn, { backgroundColor: C.surface2 }]}>
          <Text style={[s.backArrow, { color: C.textSoft }]}>←</Text>
        </TouchableOpacity>

        <Text style={[s.title, { color: C.text }]}>Create account</Text>
        <Text style={[s.sub, { color: C.textFaint }]}>Join thousands of healthcare students</Text>

        <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border, ...C.shadow }]}>
          {[
            { label: 'Full name', value: name, set: setName, placeholder: 'Your name', type: 'default' as const },
            { label: 'Email', value: email, set: setEmail, placeholder: 'you@example.com', type: 'email-address' as const },
            { label: 'Password', value: password, set: setPassword, placeholder: '••••••••', type: 'default' as const, secure: true },
          ].map(f => (
            <View key={f.label} style={s.field}>
              <Text style={[s.fieldLabel, { color: C.textSoft }]}>{f.label}</Text>
              {f.secure ? (
                <PasswordInput
                  inputStyle={[s.input, { backgroundColor: C.surface2, borderColor: C.border, color: C.text }]}
                  value={f.value}
                  onChangeText={f.set}
                  placeholder={f.placeholder}
                  placeholderTextColor={C.textFaint}
                  autoCapitalize="none"
                  autoComplete="new-password"
                />
              ) : (
                <TextInput
                  style={[s.input, { backgroundColor: C.surface2, borderColor: C.border, color: C.text }]}
                  value={f.value}
                  onChangeText={f.set}
                  placeholder={f.placeholder}
                  placeholderTextColor={C.textFaint}
                  keyboardType={f.type}
                  autoCapitalize={f.type === 'email-address' ? 'none' : 'words'}
                />
              )}
            </View>
          ))}
          <Button label="Create account" onPress={handleSignup} loading={loading} fullWidth />
        </View>

        {/* Divider */}
        <View style={s.divider}>
          <View style={[s.dividerLine, { backgroundColor: C.border }]} />
          <Text style={[s.dividerText, { color: C.textFaint }]}>or</Text>
          <View style={[s.dividerLine, { backgroundColor: C.border }]} />
        </View>

        {/* Google */}
        <TouchableOpacity
          onPress={handleGoogleLogin}
          disabled={googleLoading}
          activeOpacity={0.8}
          style={[s.googleBtn, { backgroundColor: C.surface, borderColor: C.border, ...C.shadow }]}
        >
          <GoogleG />
          <Text style={[s.googleText, { color: C.text }]}>
            {googleLoading ? 'Opening…' : 'Continue with Google'}
          </Text>
        </TouchableOpacity>

        <View style={[s.footer, { marginTop: 24 }]}>
          <Text style={[s.footerText, { color: C.textFaint }]}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text style={[s.link, { color: C.teal }]}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: 24 },
  backBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  backArrow: { fontSize: 18, fontFamily: 'Nunito_700Bold' },
  title: { fontSize: 28, fontFamily: 'Nunito_900Black', letterSpacing: -0.5, marginBottom: 6 },
  sub: { fontSize: 14, fontFamily: 'Nunito_600SemiBold', marginBottom: 28 },
  card: { borderRadius: 24, borderWidth: 1, padding: 24, marginBottom: 20 },
  field: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontFamily: 'Nunito_700Bold', marginBottom: 7 },
  input: { borderRadius: 14, borderWidth: 1.5, padding: 14, fontSize: 15, fontFamily: 'Nunito_600SemiBold' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 13, fontFamily: 'Nunito_600SemiBold' },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
    borderRadius: 16, borderWidth: 1.5, paddingVertical: 16,
  },
  googleText: { fontSize: 15, fontFamily: 'Nunito_800ExtraBold' },
  footer: { flexDirection: 'row', justifyContent: 'center' },
  footerText: { fontSize: 14, fontFamily: 'Nunito_600SemiBold' },
  link: { fontSize: 14, fontFamily: 'Nunito_700Bold' },
})
