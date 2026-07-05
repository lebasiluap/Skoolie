import { useRef, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as WebBrowser from 'expo-web-browser'
import * as Linking from 'expo-linking'
import { Ionicons } from '@expo/vector-icons'
import Svg, { Path } from 'react-native-svg'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/hooks/useTheme'
import { Button } from '@/components/ui/Button'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { AppleSignInButton } from '@/components/ui/AppleSignInButton'

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

const EMAIL_RE = /^\S+@\S+\.\S+$/

export default function SignupScreen() {
  const C = useTheme()
  const insets = useSafeAreaInsets()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  // Inline error (matches login) — never raw technical strings.
  const [formError, setFormError] = useState<string | null>(null)
  // Post-signup "confirm your email" state — replaces the old dead-end Alert.
  const [awaitingConfirm, setAwaitingConfirm] = useState(false)
  const lastNameRef = useRef<TextInput>(null)
  const emailRef = useRef<TextInput>(null)
  const passwordFocusHack = useRef<TextInput>(null)

  function friendlyAuthError(msg: string): string {
    if (/already registered|already exists/i.test(msg)) return 'An account with this email already exists — try signing in instead.'
    if (/invalid.*email|email.*invalid/i.test(msg)) return 'That email address doesn’t look right — double-check it.'
    if (/rate limit/i.test(msg)) return 'Too many attempts — wait a moment and try again.'
    if (/network|fetch/i.test(msg)) return 'Connection problem — check your internet and try again.'
    return 'Something went wrong creating your account. Please try again.'
  }

  async function handleSignup() {
    // Last name is optional — plenty of people go by one name.
    const cleanName = `${firstName.trim()} ${lastName.trim()}`.trim().replace(/\s+/g, ' ')
    const cleanEmail = email.trim()
    if (!firstName.trim()) { setFormError('Please enter your first name.'); return }
    if (!cleanEmail || !password) { setFormError('Please fill in all fields.'); return }
    if (!EMAIL_RE.test(cleanEmail)) { setFormError('That email address doesn’t look right — double-check it.'); return }
    if (password.length < 6) { setFormError('Password must be at least 6 characters.'); return }
    setFormError(null)
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: { data: { full_name: cleanName } },
    })
    setLoading(false)
    if (error) {
      setFormError(friendlyAuthError(error.message))
      return
    }
    if (data.session) {
      // Email confirmations disabled — already signed in; RootNavigator routes
      // to onboarding. No alert needed (and "check your email" would be a lie).
      return
    }
    if (data.user && data.user.identities?.length === 0) {
      // Supabase obfuscation: existing email + confirmations enabled returns
      // "success" with no identities. Don't send the user hunting for an email
      // that will never arrive.
      setFormError('An account with this email may already exist — try signing in, or reset your password.')
      return
    }
    setAwaitingConfirm(true)
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true)
    setFormError(null)
    // try/finally: the button must never be left stuck on "Opening…".
    try {
      // No leading slash — skoolie://auth/callback (2 slashes), not skoolie:///auth/callback (3)
      const redirectTo = Linking.createURL('auth/callback')
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
          // Always show Google's account chooser — the browser session caches
          // the last account and would otherwise silently reuse it.
          queryParams: { prompt: 'select_account' },
        },
      })
      if (error) { setFormError(friendlyAuthError(error.message)); return }
      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)
        if (result.type === 'success') {
          const url = result.url
          if (url.includes('access_token=')) {
            const fragment = url.split('#')[1] || ''
            const p = Object.fromEntries(new URLSearchParams(fragment))
            if (p.access_token && p.refresh_token) {
              const { error: sessionError } = await supabase.auth.setSession({
                access_token: p.access_token,
                refresh_token: p.refresh_token,
              })
              if (sessionError) setFormError(friendlyAuthError(sessionError.message))
            } else {
              setFormError('Google sign-in didn’t complete. Please try again.')
            }
          } else if (url.split('#')[0].includes('code=')) {
            const { error: sessionError } = await supabase.auth.exchangeCodeForSession(url)
            if (sessionError) setFormError(friendlyAuthError(sessionError.message))
          }
        }
      }
    } catch (e: any) {
      setFormError(friendlyAuthError(String(e?.message ?? e)))
    } finally {
      setGoogleLoading(false)
    }
  }

  function backToLogin() {
    if (router.canGoBack()) router.back()
    else router.replace('/(auth)/login')
  }

  // ── Post-signup: confirm-your-email state (not a dead end) ────────────────
  if (awaitingConfirm) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <View style={[s.scroll, { flex: 1, justifyContent: 'center', paddingBottom: insets.bottom + 40 }]}>
          <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border, alignItems: 'center', ...C.shadow }]}>
            <View style={[s.mailCircle, { backgroundColor: C.tealTint }]}>
              <Ionicons name="mail-unread-outline" size={34} color={C.teal} />
            </View>
            <Text style={[s.title, { textAlign: 'center', color: C.text, marginBottom: 8 }]}>Confirm your email</Text>
            <Text style={[s.confirmBody, { color: C.textSoft }]}>
              We sent a confirmation link to{'\n'}
              <Text style={{ fontFamily: 'Nunito_800ExtraBold', color: C.text }}>{email.trim()}</Text>
              {'\n\n'}Open it (it may launch your browser), then come back and sign in.
            </Text>
            <Button label="Go to sign in" onPress={() => router.replace('/(auth)/login')} fullWidth style={{ marginTop: 20 }} />
            <TouchableOpacity
              onPress={() => setAwaitingConfirm(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              style={{ marginTop: 16 }}
            >
              <Text style={[s.link, { color: C.teal }]}>Wrong email? Go back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[s.scroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled">
        <TouchableOpacity
          onPress={backToLogin}
          style={[s.backBtn, { backgroundColor: C.surface2 }]}
          accessibilityRole="button"
          accessibilityLabel="Back to sign in"
        >
          <Text style={[s.backArrow, { color: C.textSoft }]}>←</Text>
        </TouchableOpacity>

        <Text style={[s.title, { color: C.text }]}>Create account</Text>
        <Text style={[s.sub, { color: C.textFaint }]}>Join thousands of healthcare students</Text>

        <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border, ...C.shadow }]}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={[s.field, { flex: 1 }]}>
              <Text style={[s.fieldLabel, { color: C.textSoft }]}>First name</Text>
              <TextInput
                style={[s.input, { backgroundColor: C.surface2, borderColor: C.border, color: C.text }]}
                value={firstName}
                onChangeText={t => { setFirstName(t); if (formError) setFormError(null) }}
                placeholder="Your first name"
                placeholderTextColor={C.textFaint}
                autoCapitalize="words"
                maxLength={40}
                returnKeyType="next"
                onSubmitEditing={() => lastNameRef.current?.focus()}
              />
            </View>
            <View style={[s.field, { flex: 1 }]}>
              <Text style={[s.fieldLabel, { color: C.textSoft }]}>Last name <Text style={{ color: C.textFaint }}>· optional</Text></Text>
              <TextInput
                ref={lastNameRef}
                style={[s.input, { backgroundColor: C.surface2, borderColor: C.border, color: C.text }]}
                value={lastName}
                onChangeText={t => { setLastName(t); if (formError) setFormError(null) }}
                placeholder="Your last name"
                placeholderTextColor={C.textFaint}
                autoCapitalize="words"
                maxLength={40}
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
              />
            </View>
          </View>
          <View style={s.field}>
            <Text style={[s.fieldLabel, { color: C.textSoft }]}>Email</Text>
            <TextInput
              ref={emailRef}
              style={[s.input, { backgroundColor: C.surface2, borderColor: C.border, color: C.text }]}
              value={email}
              onChangeText={t => { setEmail(t); if (formError) setFormError(null) }}
              placeholder="you@example.com"
              placeholderTextColor={C.textFaint}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
              onSubmitEditing={() => passwordFocusHack.current?.focus()}
            />
          </View>
          <View style={s.field}>
            <Text style={[s.fieldLabel, { color: C.textSoft }]}>Password</Text>
            <PasswordInput
              ref={passwordFocusHack}
              inputStyle={[s.input, { backgroundColor: C.surface2, borderColor: C.border, color: C.text }]}
              value={password}
              onChangeText={t => { setPassword(t); if (formError) setFormError(null) }}
              placeholder="At least 6 characters"
              placeholderTextColor={C.textFaint}
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="go"
              onSubmitEditing={handleSignup}
            />
          </View>

          {formError && (
            <View style={[s.errorBox, { backgroundColor: C.redTint, borderColor: C.red }]} accessibilityRole="alert">
              <Text style={[s.errorText, { color: C.red }]}>{formError}</Text>
            </View>
          )}

          <Button label="Create account" onPress={handleSignup} loading={loading} fullWidth />

          <Text style={[s.terms, { color: C.textFaint }]}>
            By creating an account you agree to our{' '}
            <Text style={{ color: C.teal }} onPress={() => router.push({ pathname: '/legal', params: { doc: 'terms' } } as any)}>Terms</Text>
            {' '}and{' '}
            <Text style={{ color: C.teal }} onPress={() => router.push({ pathname: '/legal', params: { doc: 'privacy' } } as any)}>Privacy Policy</Text>.
          </Text>
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
          accessibilityRole="button"
          style={[s.googleBtn, { backgroundColor: C.surface, borderColor: C.border, ...C.shadow }]}
        >
          <GoogleG />
          <Text style={[s.googleText, { color: C.text }]}>
            {googleLoading ? 'Opening…' : 'Continue with Google'}
          </Text>
        </TouchableOpacity>

        {/* Apple — native button, iOS only (guideline 4.8) */}
        <AppleSignInButton
          disabled={loading || googleLoading}
          onError={msg => { if (msg) setFormError(msg) }}
        />

        <View style={[s.footer, { marginTop: 24 }]}>
          <Text style={[s.footerText, { color: C.textFaint }]}>Already have an account? </Text>
          <TouchableOpacity
            onPress={backToLogin}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 12 }}
            accessibilityRole="button"
          >
            <Text style={[s.link, { color: C.teal }]}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: 24 },
  backBtn: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  backArrow: { fontSize: 18, fontFamily: 'Nunito_700Bold' },
  title: { fontSize: 28, fontFamily: 'Nunito_900Black', letterSpacing: -0.5, marginBottom: 6 },
  sub: { fontSize: 14, fontFamily: 'Nunito_600SemiBold', marginBottom: 28 },
  card: { borderRadius: 24, borderWidth: 1, padding: 24, marginBottom: 20 },
  field: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontFamily: 'Nunito_700Bold', marginBottom: 7 },
  input: { borderRadius: 14, borderWidth: 1.5, padding: 14, fontSize: 15, fontFamily: 'Nunito_600SemiBold' },
  errorBox: { borderRadius: 12, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 16 },
  errorText: { fontSize: 13.5, fontFamily: 'Nunito_700Bold', lineHeight: 19 },
  terms: { fontSize: 12, fontFamily: 'Nunito_600SemiBold', lineHeight: 17, textAlign: 'center', marginTop: 14 },
  mailCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  confirmBody: { fontSize: 14.5, fontFamily: 'Nunito_600SemiBold', lineHeight: 22, textAlign: 'center' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 13, fontFamily: 'Nunito_600SemiBold' },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
    borderRadius: 16, borderWidth: 1.5, paddingVertical: 16,
  },
  googleText: { fontSize: 15, fontFamily: 'Nunito_800ExtraBold' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { fontSize: 14, fontFamily: 'Nunito_600SemiBold' },
  link: { fontSize: 14, fontFamily: 'Nunito_700Bold' },
})
