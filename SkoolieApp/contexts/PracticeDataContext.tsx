import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { AppState } from 'react-native'
import { useAuth } from '@/hooks/useAuth'
import { useFilters } from '@/contexts/FiltersContext'
import { supabase } from '@/lib/supabase'
import { readWithDeadline } from '@/lib/readWithDeadline'
import { createSessionReadCache } from '@/lib/sessionReadCache'
import type { TopicRow } from '@/types'

type Mode = 'mcq' | 'flashcard' | 'case_study'
type TopicFilters = { difficulty?: string; cognitiveType?: string; highYield?: boolean }
export type PracticeCounts = { mcq: number; flashcard: number; case_study: number }
type PracticeData = {
  peekTopics: (mode: Mode, filters?: TopicFilters) => TopicRow[] | undefined
  getTopics: (mode: Mode, filters?: TopicFilters) => Promise<TopicRow[]>
  peekHub: (region?: string | null) => PracticeCounts | undefined
  getHub: (region?: string | null) => Promise<PracticeCounts>
}
const Context = createContext<PracticeData | null>(null)

export function PracticeDataProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth()
  const { mcqFilter, fcFilter, caseFilter, qSet } = useFilters()
  const uid = user?.id, profession = profile?.profession, country = profile?.country
  const accessKey = profile?.access_key ?? null
  // A different identity or content scope ALWAYS gets a fresh, memory-only cache.
  const cache = useMemo(() => createSessionReadCache(), [uid, profession, country, accessKey])
  const data = useMemo<PracticeData>(() => {
    const args = (mode: Mode, filters: TopicFilters = {}) => ({
      p_profession: profession!, p_question_type: mode, p_access_key: accessKey,
      p_difficulty: filters.difficulty && filters.difficulty !== 'all' ? filters.difficulty : null,
      p_cognitive_type: filters.cognitiveType && filters.cognitiveType !== 'all' ? filters.cognitiveType : null,
      p_high_yield: filters.highYield ? true : null,
    })
    const key = (mode: Mode, filters?: TopicFilters) => JSON.stringify(['topics', args(mode, filters)])
    return {
      peekTopics: (mode, filters) => cache.peek(key(mode, filters)),
      getTopics: (mode, filters) => cache.get(key(mode, filters), async () => {
        if (!uid || !profession) throw new Error('Profile not ready')
        const params = args(mode, filters)
        const replies = mode === 'case_study'
          ? await Promise.all([
            readWithDeadline(signal => supabase.rpc('get_case_study_counts', {
              p_profession: profession, p_access_key: accessKey, p_difficulty: params.p_difficulty,
            }).abortSignal(signal)),
            readWithDeadline(signal => supabase.rpc('get_question_counts', {
              p_profession: profession, p_question_type: mode, p_access_key: accessKey,
            }).abortSignal(signal)),
          ])
          : [await readWithDeadline(signal => supabase.rpc('get_question_counts', params).abortSignal(signal))]
        for (const reply of replies) if (reply.error) throw reply.error
        return replies.flatMap(reply => reply.data ?? []).map((r: any) => ({
          topic: r.topic, category: r.category, subtopic: r.subtopic, count: Number(r.cnt),
        }))
      }),
      peekHub: region => cache.peek(JSON.stringify(['hub', region ?? null])),
      getHub: region => cache.get(JSON.stringify(['hub', region ?? null]), async () => {
        if (!uid || !profession) throw new Error('Profile not ready')
        const { data: result, error } = await readWithDeadline(signal => supabase.rpc('get_practice_counts', {
          p_profession: profession, p_region: region ?? null, p_access_key: accessKey,
        }).abortSignal(signal))
        if (error) throw error
        const row = Array.isArray(result) ? result[0] : result
        if (!row) throw new Error('Missing practice counts')
        return { mcq: Number(row.mcq), flashcard: Number(row.flashcard), case_study: Number(row.case_study) }
      }),
    }
  }, [cache, uid, profession, accessKey])

  useEffect(() => {
    if (!uid || !profession) return
    let active = true
    const region = qSet === 'Global' ? 'universal' : qSet === 'Regional' ? (country?.trim().toLowerCase() === 'ghana' ? 'ghana' : null) : null
    const warm = async () => {
      // Start after authentication, never inside an auth-state callback or lock.
      await Promise.allSettled([data.getHub(region), data.getTopics('mcq', mcqFilter)])
      if (active) await Promise.allSettled([
        data.getTopics('flashcard', { difficulty: fcFilter.difficulty }),
        data.getTopics('case_study', { difficulty: caseFilter.difficulty }),
      ])
    }
    void warm()
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void warm() })
    return () => { active = false; subscription.remove() }
  }, [uid, profession, country, data, qSet, mcqFilter.cognitiveType, mcqFilter.highYield, mcqFilter.difficulty, fcFilter.difficulty, caseFilter.difficulty])
  useEffect(() => () => cache.clear(), [cache])
  return <Context.Provider value={data}>{children}</Context.Provider>
}

export function usePracticeData() {
  const value = useContext(Context)
  if (!value) throw new Error('PracticeDataProvider is required')
  return value
}
