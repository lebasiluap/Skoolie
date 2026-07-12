import { createClient } from '@supabase/supabase-js'
import { AppState } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

const SUPABASE_URL = 'https://bqhiwlpmrejvjdljxspy.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxaGl3bHBtcmVqdmpkbGp4c3B5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzODEzMjIsImV4cCI6MjA5Njk1NzMyMn0.DvuXJ3yGAvGqBA9ZzZLuZktKkTPFpBYrTgOMhlEUBuA'

// React Native's fetch has NO timeout. supabase-js serializes all auth work
// behind an internal lock, so a single hung request (typically the token
// refresh fired on cold start when the stored session has expired) holds that
// lock forever — and every subsequent sign-in queues behind it ("Signing in…"
// until the app is killed; observed with Google AND Apple after long
// dormancy). Bounding every request the client makes guarantees the lock is
// always released. 30s is generous enough for slow uploads (avatars) while
// still ending any genuine hang.
const NETWORK_TIMEOUT_MS = 30_000

const timedFetch: typeof fetch = (input: any, init: any = {}) => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), NETWORK_TIMEOUT_MS)
  // Chain a caller-supplied signal so explicit aborts still work.
  const upstream: AbortSignal | undefined = init?.signal
  if (upstream) {
    if (upstream.aborted) controller.abort()
    else upstream.addEventListener('abort', () => controller.abort(), { once: true })
  }
  return fetch(input, { ...init, signal: controller.signal })
    .finally(() => clearTimeout(timer))
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: { fetch: timedFetch },
})

// Supabase's recommended RN pattern: run the token-refresh timer only while
// the app is foregrounded. Sessions still persist across restarts either way
// (an expired access token is refreshed on next launch); this just prevents a
// momentarily-stale token right after a long background stint.
AppState.addEventListener('change', state => {
  if (state === 'active') supabase.auth.startAutoRefresh()
  else supabase.auth.stopAutoRefresh()
})
