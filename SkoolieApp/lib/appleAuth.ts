/**
 * Sign in with Apple — native flow, no browser round-trip.
 *
 *   1. AppleAuthentication.signInAsync() → Face ID sheet → identity token
 *   2. supabase.auth.signInWithIdToken({ provider: 'apple' }) → session
 *
 * Security: we generate a random nonce, send its SHA-256 to Apple, and hand
 * the raw nonce to Supabase so it can verify the token was minted for THIS
 * sign-in (blocks token replay).
 *
 * Apple only shares the user's name on the VERY FIRST authorization — we
 * capture it then and write it to user metadata so onboarding doesn't
 * create a nameless profile.
 *
 * expo-apple-authentication is NATIVE — same requireOptionalNativeModule
 * probe as haptics/sounds/notifications: on a binary without it (stale dev
 * client, or Android) the button simply never renders.
 */
import { Platform } from 'react-native'
import { supabase } from '@/lib/supabase'

type AppleModule = typeof import('expo-apple-authentication')
let _apple: AppleModule | null | undefined

export function getAppleModule(): AppleModule | null {
  if (_apple !== undefined) return _apple
  if (Platform.OS !== 'ios') {
    _apple = null
    return null
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const core = require('expo-modules-core')
    if (!core.requireOptionalNativeModule?.('ExpoAppleAuthentication')) {
      _apple = null
      return null
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _apple = require('expo-apple-authentication') as AppleModule
  } catch {
    _apple = null
  }
  return _apple
}

/** Whether the Sign in with Apple button should render (iOS + module + OS support). */
export async function appleAuthAvailable(): Promise<boolean> {
  const Apple = getAppleModule()
  if (!Apple) return false
  try {
    return await Apple.isAvailableAsync()
  } catch {
    return false
  }
}

export type AppleSignInResult =
  | { ok: true }
  | { ok: false; error?: string }   // no error string = user canceled (stay silent)

export async function signInWithApple(): Promise<AppleSignInResult> {
  const Apple = getAppleModule()
  if (!Apple) return { ok: false, error: 'Apple sign-in isn’t available on this device.' }
  try {
    // Nonce: random → SHA-256 to Apple, raw to Supabase for verification.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Crypto = require('expo-crypto') as typeof import('expo-crypto')
    const rawNonce = Crypto.randomUUID()
    const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce)

    const cred = await Apple.signInAsync({
      requestedScopes: [
        Apple.AppleAuthenticationScope.FULL_NAME,
        Apple.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    })
    if (!cred.identityToken) {
      return { ok: false, error: 'Apple sign-in didn’t complete. Please try again.' }
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: cred.identityToken,
      nonce: rawNonce,
    })
    if (error) {
      return { ok: false, error: 'Something went wrong signing you in with Apple. Please try again.' }
    }

    // First-authorization-only name — persist it before it's gone forever.
    // Awaited so onboarding (which reads user_metadata) can never race it.
    const given = cred.fullName?.givenName ?? ''
    const family = cred.fullName?.familyName ?? ''
    const fullName = `${given} ${family}`.trim()
    if (fullName) {
      try { await supabase.auth.updateUser({ data: { full_name: fullName } }) } catch {}
    }

    return { ok: true }
  } catch (e: any) {
    if (e?.code === 'ERR_REQUEST_CANCELED') return { ok: false }   // user backed out — not an error
    return { ok: false, error: 'Apple sign-in didn’t complete. Please try again.' }
  }
}
