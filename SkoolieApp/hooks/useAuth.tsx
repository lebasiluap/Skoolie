import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { UserProfile } from '@/types'
import { diffProfiles, emitCelebrations } from '@/lib/celebrations'
import { setSoundEnabled } from '@/lib/sounds'
import { setHapticsEnabled } from '@/lib/haptics'
import { readWithDeadline } from '@/lib/readWithDeadline'
import { useAppPresence } from './useAppPresence'

interface AuthContextType {
  session: Session | null
  user: User | null
  profile: UserProfile | null
  loading: boolean
  /** True only after a profile fetch has SUCCEEDED at least once. Routing must
   *  not treat "profile is null" as "needs onboarding" until this is true —
   *  a failed fetch on a flaky network would otherwise send an existing user
   *  back through onboarding. */
  profileChecked: boolean
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  profileChecked: false,
  refreshProfile: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileChecked, setProfileChecked] = useState(false)
  // Last snapshot used for celebration diffs (kept outside React state so
  // the diff runs exactly once per fetched profile)
  const prevProfileRef = useRef<UserProfile | null>(null)
  // Bumped on sign-out: an in-flight profile fetch from the previous session
  // must not resurrect a profile (which would flash onboarding/dashboard).
  const authGenRef = useRef(0)
  const identityRef = useRef<string | null>(null)
  const pendingProfile = useRef<{ uid: string; gen: number; promise: Promise<void> } | null>(null)
  useAppPresence(session?.user.id)

  function loadProfile(userId: string): Promise<void> {
    const gen = authGenRef.current
    if (identityRef.current !== userId) return Promise.resolve()
    const pending = pendingProfile.current
    if (pending?.uid === userId && pending.gen === gen) return pending.promise
    const promise = fetchProfile(userId, gen).finally(() => {
      if (pendingProfile.current?.promise === promise) pendingProfile.current = null
    })
    pendingProfile.current = { uid: userId, gen, promise }
    return promise
  }

  async function fetchProfile(userId: string, gen: number, isRetry = false): Promise<void> {
    // maybeSingle: "no row" is a clean null, while network/server failures are
    // errors — the distinction protects existing users from being routed into
    // onboarding (and having their row overwritten) by a flaky connection.
    let reply
    try { reply = await readWithDeadline(signal => supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .abortSignal(signal).maybeSingle(), 8000)
    } catch { reply = { data: null, error: { message: 'Profile request timed out or disconnected' } } }
    if (gen !== authGenRef.current || identityRef.current !== userId) return
    const { data, error } = reply
    if (error) {
      if (!isRetry) {
        await new Promise(r => setTimeout(r, 1500))
        if (gen !== authGenRef.current || identityRef.current !== userId) return
        return fetchProfile(userId, gen, true)
      }
      console.warn('profile load failed — keeping last known profile', error.message)
      return   // keep previous profile (or null + profileChecked=false on first load)
    }
    if (gen !== authGenRef.current) return   // signed out while fetching — discard
    setProfileChecked(true)
    // Sync the sound/haptics preference gates at the single profile choke point
    setSoundEnabled(data?.sound_enabled !== false)
    setHapticsEnabled(data?.haptics_enabled !== false)
    // Every profile write flows through here — diff snapshots to catch
    // level-ups, tier promotions, and freeze events worth celebrating.
    // The diff MUST live outside the setState updater: React may invoke
    // updater functions more than once, which double-fired celebrations.
    // prevProfileRef is advanced BEFORE emitting so overlapping loads
    // can't diff against the same stale snapshot.
    const prev = prevProfileRef.current
    prevProfileRef.current = data ?? null
    if (prev && data && prev.id === data.id) emitCelebrations(diffProfiles(prev, data))
    setProfile(data ?? null)
  }

  async function refreshProfile() {
    if (session?.user) await loadProfile(session.user.id)
  }

  useEffect(() => {
    let disposed = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const acceptSession = (next: Session | null, forceProfile = false) => {
      if (disposed) return
      const uid = next?.user.id ?? null
      const changed = uid !== identityRef.current
      setSession(next)
      if (changed) {
        authGenRef.current++
        identityRef.current = uid
        prevProfileRef.current = null
        setProfile(null)
        setProfileChecked(false)
      }
      if (!uid) { setLoading(false); return }
      // Token refresh / duplicate SIGNED_IN events must not reload the whole
      // app. Only a new identity or an actual USER_UPDATED needs this read.
      if (!changed && !forceProfile) return
      if (timer) clearTimeout(timer)
      const gen = authGenRef.current
      if (changed) setLoading(true)
      timer = setTimeout(() => {
        if (disposed || gen !== authGenRef.current) return
        void loadProfile(uid).finally(() => {
          if (!disposed && gen === authGenRef.current) setLoading(false)
        })
      }, 0)
    }

    // On sign-in the profile is fetched asynchronously after the session arrives.
    // Hold `loading` true until it resolves, so the router doesn't momentarily treat
    // the not-yet-loaded profile as "missing" and flash the onboarding (course
    // selection) screen before the dashboard.
    // CRITICAL: never await supabase calls INSIDE this callback — supabase-js
    // holds an internal auth lock while dispatching the event, and a query
    // issued under it can deadlock. Symptom: Apple/Google sign-in succeeded
    // but the UI hung on "Signing in…" until an app restart. setTimeout(0)
    // defers the profile fetch until after the lock is released.
    let receivedEvent = false
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, next) => {
      receivedEvent = true
      acceptSession(next, event === 'USER_UPDATED')
    })
    // Fallback only: INITIAL_SESSION normally supplies this. A late fallback
    // must never overwrite a newer sign-in/sign-out event.
    void supabase.auth.getSession().then(({ data }) => {
      if (!receivedEvent) acceptSession(data.session)
    }).catch(() => { if (!disposed && !receivedEvent) setLoading(false) })

    return () => { disposed = true; if (timer) clearTimeout(timer); authGenRef.current++; identityRef.current = null; subscription.unsubscribe() }
  }, [])

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, profile, loading, profileChecked, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
