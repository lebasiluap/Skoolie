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
  const timedLock = useRef(false)
  const issuedId = useRef<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  useEffect(() => () => { generation.current++; client.current = null; issuedId.current = null }, [userId])

  async function prepare(mode: VerifiedMode, ids: string[], enabled = true, policy?: 'daily_challenge' | number | {barrage:boolean;slot:number}) {
    if (beginLock.current || finishLock.current || timedLock.current) return null
    const gen = ++generation.current
    const uid = owner.current
    if (!enabled) {
      client.current = null
      issuedId.current = null
      setReceipt(null)
      return [] // explicitly legacy; caller retains its own payload
    }
    if (!uid) return null
    beginLock.current = true
    setStarting(true)
    try {
      const session = createVerifiedSession((name, args) => {
        if (name === 'begin_verified_session' && typeof policy === 'object') return supabase.rpc('begin_verified_rapid_session', {...args,p_barrage:policy.barrage,p_slot:policy.slot})
        if (name === 'begin_verified_session' && typeof policy === 'number') return supabase.rpc('begin_verified_timed_session', {...args,p_seconds:policy})
        return supabase.rpc(policy === 'daily_challenge' && name === 'begin_verified_session' ? 'begin_verified_daily_challenge' : name, args)
      }, {
        requestId: randomUUID(), mode, itemIds: ids,
      })
      // Retry a lost response with the SAME request UUID, never a second issuance.
      const issued = await session.begin().catch(() => session.begin())
      if (gen !== generation.current || uid !== owner.current) return null
      client.current = session
      issuedId.current = issued.session_id
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
  async function openTimed(id: string): Promise<number | null> {
    if (!issuedId.current) return null
    const {data,error}=await supabase.rpc('open_verified_timed_item',{p_session_id:issuedId.current,p_item_id:id})
    if(error||data?.item_id!==id||typeof data.remaining_seconds!=='number') return null
    return data.remaining_seconds
  }
  async function answerTimed(id: string, value: string | null, retry?: () => void): Promise<{answer: string | null; bonus_total?:number} | null> {
    if (!issuedId.current || !client.current || timedLock.current) return null
    timedLock.current=true;setSubmitting(true)
    const gen=generation.current,sessionId=issuedId.current,session=client.current
    try {
      const call=()=>supabase.rpc('answer_verified_timed_item',{p_session_id:sessionId,p_item_id:id,p_answer:value})
      let response=await call()
      if(response.error)response=await call() // exact replay after a lost response
      const {data,error}=response
      if(error||data?.item_id!==id||(data.answer!==null&&!/^[A-F]$/.test(data.answer)))throw new Error('Answer unconfirmed')
      if(gen!==generation.current)return null
      session.answer(id,data.answer)
      return {answer:data.answer,bonus_total:typeof data.bonus_total==='number'?data.bonus_total:undefined}
    } catch {
      if(gen===generation.current)Alert.alert('Answer not confirmed','Check your connection and retry. The server keeps the original deadline and cannot award a late answer.',retry?[{text:'Retry',onPress:retry}]:undefined)
      return null
    } finally { timedLock.current=false;if(gen===generation.current)setSubmitting(false) }
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
  return { prepare, answer, openTimed, answerTimed, complete, receipt, saving, starting, submitting, active: () => client.current !== null }
}
