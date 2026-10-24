import { useEffect, useRef, useState } from 'react'
import { Alert } from 'react-native'
import { randomUUID } from 'expo-crypto'
import { supabase } from '@/lib/supabase'
import { createVerifiedSession, type CanonicalAnswer, type RewardReceipt, type VerifiedMode } from '@/lib/verifiedSession'

/** One issued session per deck. No score input, legacy fallback or Auth changes. */
export function useVerifiedPractice(userId: string | undefined) {
  const client = useRef<ReturnType<typeof createVerifiedSession> | null>(null)
  const generation = useRef(0)
  const owner = useRef(userId)
  owner.current = userId
  const [receipt, setReceipt] = useState<RewardReceipt | null>(null)
  const [saving, setSaving] = useState(false)
  const [starting, setStarting] = useState(false)
  const beginLock = useRef(false)
  const finishLock = useRef(false)
  useEffect(() => () => { generation.current++; client.current = null }, [userId])

  async function prepare(mode: VerifiedMode, ids: string[], enabled = true) {
    if (beginLock.current || finishLock.current) return null
    const gen = ++generation.current
    const uid = owner.current
    if (!enabled) {
      client.current = null
      setReceipt(null)
      return [] // explicitly legacy; caller retains its own payload
    }
    if (!uid) return null
    beginLock.current = true
    setStarting(true)
    try {
      const session = createVerifiedSession((name, args) => supabase.rpc(name, args), {
        requestId: randomUUID(), mode, itemIds: ids,
      })
      // Retry a lost response with the SAME request UUID, never a second issuance.
      const issued = await session.begin().catch(() => session.begin())
      if (gen !== generation.current || uid !== owner.current) return null
      client.current = session
      setReceipt(null)
      return issued.items
    } catch {
      if (gen === generation.current) Alert.alert('Session could not start',
        'Check your connection and try again. Unavailable or quarantined questions cannot be used. No reward was recorded.')
      return null
    } finally {
      beginLock.current = false
      if (gen === generation.current) setStarting(false)
    }
  }

  function answer(id: string, value: CanonicalAnswer) {
    try {
      if (!client.current) throw new Error('No issued session')
      client.current.answer(id, value)
      return true
    }
    catch {
      Alert.alert('Answer already submitted', 'The saved answer cannot be changed. Retry saving with your original answer.')
      return false
    }
  }
  async function complete(retry: () => void): Promise<RewardReceipt | null> {
    if (!client.current || finishLock.current) return null
    const session = client.current
    const gen = generation.current
    finishLock.current = true
    setSaving(true)
    try {
      const result = await session.finish()
      if (gen !== generation.current) return null
      setReceipt(result)
      return result
    } catch {
      if (gen === generation.current) Alert.alert('Progress not confirmed',
        'Your answers are kept on this screen. Retry to confirm the same session safely, without a second reward. If content is no longer available, it cannot be credited.',
        [{ text: 'Stay here', style: 'cancel' }, { text: 'Retry save', onPress: retry }])
      return null
    } finally {
      finishLock.current = false
      if (gen === generation.current) setSaving(false)
    }
  }
  return { prepare, answer, complete, receipt, saving, starting, active: () => client.current !== null }
}
