import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { AppState } from 'react-native'
import { useAuth } from '@/hooks/useAuth'
import { usePracticeData } from './PracticeDataContext'
import { supabase } from '@/lib/supabase'
import { readWithDeadline } from '@/lib/readWithDeadline'
import { createSessionReadCache } from '@/lib/sessionReadCache'
import { computeAnalytics, type Analytics, type HistRow, type SessRow, type QMeta } from '@/lib/analytics'
import { onProgressSaved } from '@/lib/progressEvents'

type ProgressData = {
  peekAnalytics(): Analytics | undefined
  analytics(): Promise<Analytics>
  peekLeague(): any[] | undefined
  league(): Promise<any[]>
  standing(): Promise<any[]>
  invalidate(): void
}
const Context=createContext<ProgressData|null>(null)

/** Memory-only, identity-scoped summaries. Never authorizes or caches a deck. */
export function ProgressDataProvider({children}:{children:ReactNode}) {
  const {user,profile}=useAuth()
  const practice=usePracticeData()
  const uid=user?.id,profession=profile?.profession,accessKey=profile?.access_key??null
  // A credited session changes XP; never keep the previous session's summaries.
  const cache=useMemo(()=>createSessionReadCache(30_000),[uid,profession,accessKey,profile?.country,profile?.xp])
  const value=useMemo<ProgressData>(()=>{
    const read=async <T,>(query:(signal:AbortSignal)=>PromiseLike<{data:T|null;error:unknown}>)=>{
      if(!uid||!profession)throw new Error('Profile not ready')
      const result=await readWithDeadline(query)
      if(result.error)throw result.error
      if(result.data===null)throw new Error('Missing progress response')
      return result.data
    }
    return {
      invalidate:()=>cache.clear(),
      peekAnalytics:()=>cache.peek<Analytics>('analytics'),
      peekLeague:()=>cache.peek<any[]>('league'),
      league:()=>cache.get('league',()=>read<any[]>(signal=>supabase.rpc('get_weekly_league').abortSignal(signal))),
      standing:()=>cache.get('standing',()=>read<any[]>(signal=>supabase.rpc('get_leaderboard',{p_limit:200}).abortSignal(signal))),
      analytics:()=>cache.get('analytics',async()=>{
        const [hist,sess,mcq,fc]=await Promise.all([
          read<HistRow[]>(signal=>supabase.from('user_question_history').select('question_id, topic, category, subtopic, difficulty, question_type, was_correct, answered_at').eq('user_id',uid!).order('answered_at',{ascending:false}).limit(5000).abortSignal(signal)),
          read<SessRow[]>(signal=>supabase.from('quiz_sessions').select('score, question_ids, xp_earned, started_at, mode, topic').eq('user_id',uid!).order('started_at',{ascending:false}).limit(500).abortSignal(signal)),
          practice.getTopics('mcq'),practice.getTopics('flashcard'),
        ])
        const totals:Record<string,number>={}
        for(const row of [...mcq,...fc])totals[row.topic]=(totals[row.topic]??0)+row.count
        const ids=[...new Set(sess.flatMap(s=>s.question_ids??[]))].filter(id=>id&&!id.includes(':')).slice(0,1000)
        const meta:QMeta={}
        if(ids.length){
          const rows=await read<any[]>(signal=>supabase.rpc('get_question_meta',{p_ids:ids}).abortSignal(signal))
          for(const q of rows)meta[q.id]={topic:q.topic,subtopic:q.subtopic,category:q.category}
        }
        return computeAnalytics(hist,sess,meta,totals)
      }),
    }
  },[cache,uid,profession,practice])
  useEffect(()=>{
    if(!uid||!profession)return
    // Give sign-in and the first screen priority; no auth callback is blocked.
    const warm=()=>{void Promise.allSettled([value.league(),value.analytics(),value.standing()])}
    const timer=setTimeout(warm,1000)
    const unsubscribe=onProgressSaved(()=>{cache.clear();warm()})
    const subscription=AppState.addEventListener('change',state=>{if(state==='active')warm()})
    return()=>{clearTimeout(timer);subscription.remove();unsubscribe();cache.clear()}
  },[value,cache,uid,profession])
  return <Context.Provider value={value}>{children}</Context.Provider>
}
export function useProgressData(){
  const value=useContext(Context)
  if(!value)throw new Error('ProgressDataProvider is required')
  return value
}
