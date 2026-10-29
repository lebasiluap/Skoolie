import { useEffect } from 'react'
import { AppState, Platform } from 'react-native'
import { randomUUID } from 'expo-crypto'
import { requireOptionalNativeModule } from 'expo-modules-core'
import { supabase } from '@/lib/supabase'
import { readWithDeadline } from '@/lib/readWithDeadline'
import { betaDetailsAllowed, createBetaCollector, onBetaAction } from '@/lib/betaInteraction'

/** Best-effort foreground telemetry; never blocks Auth, practice or rewards. */
export function useBetaActivity(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return
    let id: string | null = null
    let stopped = false
    let queue = Promise.resolve()
    const begun = new Set<string>()
    let collector: ReturnType<typeof createBetaCollector> | null = null
    let sequence = 0
    let detailsStarted = false
    const prepareDetails = () => {
      if (!betaDetailsAllowed()) { detailsStarted=false;return false }
      if (!detailsStarted) { collector=createBetaCollector();detailsStarted=true }
      return true
    }
    const unsubscribe = onBetaAction((kind, screen) => { if (id && AppState.currentState === 'active' && prepareDetails()) collector?.action(kind, screen) })
    const application = requireOptionalNativeModule<{ nativeApplicationVersion?: string; nativeBuildVersion?: string }>('ExpoApplication')
    const send = (sessionId: string, event: 'start' | 'beat' | 'end') => {
      const detail = prepareDetails() ? collector?.take() : null
      const seq = ++sequence
      queue = queue.then(async () => {
        if (stopped && event !== 'end') return
        try {
          const call = async (kind: 'start' | 'beat' | 'end') => {
            const response = await readWithDeadline(signal => supabase.rpc('record_beta_activity', {
              p_session_id: sessionId, p_event: kind, p_platform: Platform.OS,
              p_version: application?.nativeApplicationVersion ?? 'unknown',
              p_build: application?.nativeBuildVersion ?? 'unknown',
            }).abortSignal(signal), 2500)
            if (response.error) throw new Error('Telemetry unavailable')
          }
          if (!begun.has(sessionId)) {
            if (event === 'end') return
            await call('start'); begun.add(sessionId)
          }
          if (event !== 'start') await call(event)
          if (detail && !stopped) {
            // One small batch per heartbeat, never one request per click. No retries
            // or offline accumulation that could later inflate testing time.
            try {
              await readWithDeadline(signal => supabase.rpc('record_beta_interactions', {
                p_session_id: sessionId, p_sequence: seq, p_data: detail,
              }).abortSignal(signal), 2500)
            } catch { /* additive telemetry must not affect existing timing */ }
          }
          if (event === 'end') begun.delete(sessionId)
        } catch { /* Missing/offline telemetry is not a failed sign-in. */ }
      })
    }
    const start = () => {
      if (id || stopped) return
      id = randomUUID()
      collector = createBetaCollector(); sequence = 0; detailsStarted=false
      send(id, 'start')
    }
    const end = () => { if (id) { send(id, 'end'); id = null; collector = null } }
    const first = setTimeout(() => { if (AppState.currentState === 'active') start() }, 3000)
    const timer = setInterval(() => {
      if (stopped || AppState.currentState !== 'active') return
      if (!id) start()
      else send(id, 'beat')
    }, 30000)
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') start(); else end() })
    return () => { stopped = true; clearTimeout(first); clearInterval(timer); subscription.remove(); unsubscribe(); end() }
  }, [userId])
}
