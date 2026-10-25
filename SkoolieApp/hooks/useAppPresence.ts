import { useEffect } from 'react'
import { AppState, Platform } from 'react-native'
import { requireOptionalNativeModule } from 'expo-modules-core'
import { supabase } from '@/lib/supabase'
import { clearClientMetrics, drainClientMetrics } from '@/lib/clientMetrics'
import { readWithDeadline } from '@/lib/readWithDeadline'
import { useBetaActivity } from '@/hooks/useBetaActivity'

export function useAppPresence(userId: string | undefined) {
  useBetaActivity(userId)
  useEffect(() => {
    clearClientMetrics()
    if (!userId) return
    let busy = false, stopped = false
    let request: AbortController | undefined
    const beat = async () => {
      if (stopped || busy || AppState.currentState !== 'active') return
      busy = true
      request = new AbortController()
      // Native binary build, not app.json's stale remote-version default.
      const application = requireOptionalNativeModule<{ nativeApplicationVersion?: string; nativeBuildVersion?: string }>('ExpoApplication')
      try {
        await readWithDeadline(signal => supabase.rpc('record_app_presence', {
          p_platform: Platform.OS, p_version: application?.nativeApplicationVersion ?? 'unknown',
          p_build: application?.nativeBuildVersion ?? 'unknown', p_metrics: drainClientMetrics(),
        }).abortSignal(signal), 5000, request.signal)
      } catch { /* Non-critical: never hold up sign-in or retry in a tight loop. */ }
      finally { busy = false }
    }
    const first = setTimeout(() => void beat(), 2500)
    const timer = setInterval(() => void beat(), 60000)
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') void beat()
      else request?.abort()
    })
    return () => { stopped = true; clearTimeout(first); clearInterval(timer); subscription.remove(); request?.abort(); clearClientMetrics() }
  }, [userId])
}
