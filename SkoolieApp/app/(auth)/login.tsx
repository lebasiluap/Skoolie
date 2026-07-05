import { useEffect, useRef, useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, StyleSheet
} from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as WebBrowser from 'expo-web-browser'
import * as Linking from 'expo-linking'
import Svg, { Path, G, Circle } from 'react-native-svg'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/hooks/useTheme'
import { Button } from '@/components/ui/Button'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { AppleSignInButton } from '@/components/ui/AppleSignInButton'
import { CappyHead } from '@/components/mascots/CappyHead'
import { MascotAnimator } from '@/components/mascots/MascotAnimator'

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

export default function LoginScreen() {
  const C = useTheme()
  const insets = useSafeAreaInsets()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  // Inline error instead of native Alerts — calmer, in-context, and never shows
  // raw technical messages to the user.
  const [formError, setFormError] = useState<string | null>(null)
  // "Email not confirmed" recovery: offer to resend the confirmation email
  // right here — otherwise an unconfirmed user with a lost/expired link has
  // no discoverable way back in.
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null)
  const [resendNotice, setResendNotice] = useState<string | null>(null)
  const [resendCooldown, setResendCooldown] = useState(0)
  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCooldown])
  const passwordRef = useRef<TextInput>(null)

  function friendlyAuthError(msg: string): string {
    if (/invalid login credentials/i.test(msg)) return 'Incorrect email or password. Try again or reset your password.'
    if (/email not confirmed/i.test(msg)) return 'Please confirm your email first — check your inbox for the link.'
    if (/security purposes|only request this/i.test(msg)) return 'Emails can only be sent once a minute — give it a moment and try again.'
    if (/rate limit/i.test(msg)) return 'Too many attempts — wait a moment and try again.'
    if (/network|fetch/i.test(msg)) return 'Connection problem — check your internet and try again.'
    return 'Something went wrong signing you in. Please try again.'
  }

  async function handleLogin() {
    if (!email.trim() || !password) { setFormError('Enter your email and password.'); return }
    setFormError(null)
    setUnconfirmedEmail(null)
    setResendNotice(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setLoading(false)
    if (error) {
      setFormError(friendlyAuthError(error.message))
      if (/email not confirmed/i.test(error.message)) setUnconfirmedEmail(email.trim())
    }
  }

  async function resendConfirmation() {
    if (!unconfirmedEmail || resendCooldown > 0) return
    setResendCooldown(60)   // matches the server's per-user email interval
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: unconfirmedEmail,
      options: { emailRedirectTo: 'https://skoolieapp.com/confirmed' },
    })
    if (error) {
      setResendCooldown(0)
      setFormError(friendlyAuthError(error.message))
    } else {
      setFormError(null)
      setResendNotice('Confirmation email sent — check your inbox, then sign in.')
    }
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true)
    setFormError(null)
    // try/finally: if the browser is killed mid-flow or any step throws, the
    // button must never be left permanently stuck on "Opening…".
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
      if (error) {
        setFormError(friendlyAuthError(error.message))
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
            if (p.access_token && p.refresh_token) {
              const { error: sessionError } = await supabase.auth.setSession({
                access_token: p.access_token,
                refresh_token: p.refresh_token,
              })
              if (sessionError) setFormError(friendlyAuthError(sessionError.message))
            } else {
              // Never mint a session that can't refresh (missing refresh token
              // silently logs the user out when the access token expires).
              setFormError('Google sign-in didn’t complete. Please try again.')
            }
          } else if (url.split('#')[0].includes('code=')) {
            // PKCE flow (future-proof)
            const { error: sessionError } = await supabase.auth.exchangeCodeForSession(url)
            if (sessionError) setFormError(friendlyAuthError(sessionError.message))
          }
        }
        // cancel / dismiss: user backed out — no error, no message
      }
    } catch (e: any) {
      setFormError(friendlyAuthError(String(e?.message ?? e)))
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={s.brand}>
          <MascotAnimator expr="wave">
            <CappyHead size={72} expr="idle" />
          </MascotAnimator>
          <Text style={[s.appName, { color: C.text }]}>Skoolie</Text>
        </View>

        {/* Heading */}
        <Text style={[s.title, { color: C.text }]}>Welcome back</Text>
        <Text style={[s.subtitle, { color: C.textSoft }]}>Sign in to keep your streak alive 🔥</Text>

        {/* Email */}
        <Text style={[s.fieldLabel, { color: C.textFaint }]}>EMAIL ADDRESS</Text>
        <TextInput
          style={[s.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text }]}
          value={email}
          onChangeText={t => { setEmail(t); if (formError) setFormError(null); setUnconfirmedEmail(null); setResendNotice(null) }}
          placeholder="you@email.com"
          placeholderTextColor={C.textFaint}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          textContentType="username"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />

        {/* Password row */}
        <View style={s.passwordHeader}>
          <Text style={[s.fieldLabel, { color: C.textFaint }]}>PASSWORD</Text>
          <TouchableOpacity
            onPress={() => router.push('/(auth)/forgot-password')}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
          >
            <Text style={[s.forgotLink, { color: C.teal }]}>Forgot?</Text>
          </TouchableOpacity>
        </View>
        <PasswordInput
          ref={passwordRef}
          containerStyle={{ marginBottom: 20 }}
          inputStyle={[s.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text, marginBottom: 0 }]}
          value={password}
          onChangeText={t => { setPassword(t); if (formError) setFormError(null) }}
          placeholder="Enter password"
          placeholderTextColor={C.textFaint}
          autoComplete="password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={handleLogin}
        />

        {/* Inline error */}
        {formError && (
          <View style={[s.errorBox, { backgroundColor: C.redTint, borderColor: C.red }]} accessibilityRole="alert">
            <Text style={[s.errorText, { color: C.red }]}>{formError}</Text>
          </View>
        )}
        {resendNotice && (
          <View style={[s.errorBox, { backgroundColor: C.tealTint, borderColor: C.teal }]}>
            <Text style={[s.errorText, { color: C.tealDeep }]}>{resendNotice}</Text>
          </View>
        )}
        {unconfirmedEmail && !resendNotice && (
          <TouchableOpacity
            onPress={resendConfirmation}
            disabled={resendCooldown > 0}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            style={{ marginTop: 10, alignItems: 'center' }}
          >
            <Text style={[s.forgotLink, { color: resendCooldown > 0 ? C.textFaint : C.teal }]}>
              {resendCooldown > 0 ? `Resend confirmation email (${resendCooldown}s)` : 'Resend confirmation email'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Sign in */}
        <View style={{ marginTop: 24 }}>
          <Button label="Sign in" onPress={handleLogin} loading={loading} fullWidth />
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
          disabled={googleLoading || loading}
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

        {/* Footer */}
        <View style={s.footer}>
          <Text style={[s.footerText, { color: C.textFaint }]}>Don't have an account? </Text>
          <TouchableOpacity
            onPress={() => router.push('/(auth)/signup')}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 12 }}
            accessibilityRole="button"
          >
            <Text style={[s.footerLink, { color: C.teal }]}>Sign up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: 24, justifyContent: 'center' , width: '100%', maxWidth: 480, alignSelf: 'center' },

  brand: { alignItems: 'center', marginBottom: 28 },
  appName: { fontSize: 26, fontFamily: 'Nunito_900Black', letterSpacing: -0.5, marginTop: 10 },

  title: { fontSize: 28, fontFamily: 'Nunito_900Black', letterSpacing: -0.4, marginBottom: 6 },
  subtitle: { fontSize: 15, fontFamily: 'Nunito_600SemiBold', marginBottom: 28 },

  fieldLabel: { fontSize: 11, fontFamily: 'Nunito_800ExtraBold', letterSpacing: 0.6, marginBottom: 8 },
  input: {
    borderRadius: 16, borderWidth: 1.5, paddingHorizontal: 16, paddingVertical: 15,
    fontSize: 15, fontFamily: 'Nunito_600SemiBold', marginBottom: 20,
  },

  passwordHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
  },
  forgotLink: { fontSize: 13, fontFamily: 'Nunito_700Bold' },
  errorBox: { borderRadius: 12, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 14, marginTop: 4 },
  errorText: { fontSize: 13.5, fontFamily: 'Nunito_700Bold', lineHeight: 19 },

  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 13, fontFamily: 'Nunito_600SemiBold' },

  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
    borderRadius: 16, borderWidth: 1.5, paddingVertical: 16,
  },
  googleText: { fontSize: 15, fontFamily: 'Nunito_800ExtraBold' },

  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 28 },
  footerText: { fontSize: 14, fontFamily: 'Nunito_600SemiBold' },
  footerLink: { fontSize: 14, fontFamily: 'Nunito_700Bold' },
})
