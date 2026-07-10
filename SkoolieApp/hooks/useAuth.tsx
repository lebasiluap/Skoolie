import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { UserProfile } from '@/types'
import { diffProfiles, emitCelebrations } from '@/lib/celebrations'
import { setSoundEnabled } from '@/lib/sounds'
import { setHapticsEnabled } from '@/lib/haptics'

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

  async function loadProfile(userId: string, isRetry = false): Promise<void> {
    const gen = authGenRef.current
    // maybeSingle: "no row" is a clean null, while network/server failures are
    // errors — the distinction protects existing users from being routed into
    // onboarding (and having their row overwritten) by a flaky connection.
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    if (error) {
      if (!isRetry) {
        await new Promise(r => setTimeout(r, 1500))
        return loadProfile(userId, true)
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
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      if (session?.user) await loadProfile(session.user.id)
      setLoading(false)
    })

    // On sign-in the profile is fetched asynchronously after the session arrives.
    // Hold `loading` true until it resolves, so the router doesn't momentarily treat
    // the not-yet-loaded profile as "missing" and flash the onboarding (course
    // selection) screen before the dashboard.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      if (session?.user) {
        setLoading(true)
        await loadProfile(session.user.id)
        setLoading(false)
      } else {
        authGenRef.current++
        prevProfileRef.current = null
        setProfile(null)
        setProfileChecked(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, profile, loading, profileChecked, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
