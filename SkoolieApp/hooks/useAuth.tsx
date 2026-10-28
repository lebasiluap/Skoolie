import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { UserProfile } from '@/types'
import { diffProfiles, emitCelebrations } from '@/lib/celebrations'
import { setSoundEnabled } from '@/lib/sounds'
import { setHapticsEnabled } from '@/lib/haptics'
import { readWithDeadline } from '@/lib/readWithDeadline'
import { useAppPresence } from './useAppPresence'
import { AppState } from 'react-native'
import { createSessionBootstrap } from '@/lib/sessionBootstrap'

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
  sessionRecovery: boolean
  retrySession: () => void
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  profileChecked: false,
  sessionRecovery:false,
  retrySession:()=>{},
  refreshProfile: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileChecked, setProfileChecked] = useState(false)
  const [sessionRecovery,setSessionRecovery]=useState(false)
  const retrySessionRef=useRef<()=>void>(()=>{})
  // Last snapshot used for celebration diffs (kept outside React state so
  // the diff runs exactly once per fetched profile)
  const prevProfileRef = useRef<UserProfile | null>(null)
  // Bumped on sign-out: an in-flight profile fetch from the previous session
  // must not resurrect a profile (which would flash onboarding/dashboard).
  const authGenRef = useRef(0)
  const identityRef = useRef<string | null>(null)
  const pendingProfile = useRef<{ uid: string; gen: number; promise: Promise<void> } | null>(null)
  const streakReadRef = useRef(0)
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
    // Non-blocking: streak telemetry must never delay sign-in/profile hydration.
    if (data) {
      const read = ++streakReadRef.current
      void readWithDeadline(signal => supabase.rpc('get_study_streak').abortSignal(signal),2500).then(({ data: streak, error: streakError }) => {
        if (streakError || !streak || gen !== authGenRef.current || identityRef.current !== userId || read !== streakReadRef.current) return
        setProfile(prev => prev?.id === userId ? { ...prev, current_streak: streak.current_streak,
          longest_streak: streak.longest_streak, last_active_date: streak.last_active_date,
          streak_freezes: streak.streak_freezes, frozen_dates: streak.frozen_dates } : prev)
      }).catch(() => { /* Keep last known profile; never affect Auth. */ })
    }
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
    let needsRecovery=false
    const bootstrap=createSessionBootstrap<Session>(
      ()=>readWithDeadline(()=>supabase.auth.getSession(),12000),
      next=>{needsRecovery=false;setSessionRecovery(false);acceptSession(next)},
      ()=>{if(!disposed){needsRecovery=true;setSessionRecovery(true);setLoading(false)}},
    )
    retrySessionRef.current=()=>{if(!disposed)void bootstrap.recover()}
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, next) => {
      receivedEvent = true
      if(event==='INITIAL_SESSION'&&!next){
        // The SDK also emits INITIAL_SESSION(null) on a temporary read/refresh
        // failure. Re-read outside its auth lock and inspect the actual error.
        setTimeout(()=>{if(!disposed)void bootstrap.recover()},0)
        return
      }
      if(!next&&event!=='SIGNED_OUT')return
      bootstrap.invalidate();needsRecovery=false;setSessionRecovery(false)
      acceptSession(next, event === 'USER_UPDATED')
    })
    // Fallback only: INITIAL_SESSION normally supplies this. A late fallback
    // must never overwrite a newer sign-in/sign-out event.
    const fallback=setTimeout(()=>{if(!receivedEvent&&!disposed)void bootstrap.recover()},0)
    const foreground=AppState.addEventListener('change',state=>{
      if(state==='active'&&needsRecovery)void bootstrap.recover()
    })

    return () => { disposed = true;clearTimeout(fallback);bootstrap.invalidate();foreground.remove();retrySessionRef.current=()=>{}; if (timer) clearTimeout(timer); authGenRef.current++; identityRef.current = null; subscription.unsubscribe() }
  }, [])

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, profile, loading, profileChecked, refreshProfile, sessionRecovery, retrySession:()=>retrySessionRef.current() }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
