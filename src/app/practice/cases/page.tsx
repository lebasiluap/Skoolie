export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CaseStudyClient from './CaseStudyClient'
import TopicSelectorClient from '@/components/TopicSelectorClient'
import MCQClient from '../mcq/MCQClient'
import type { CaseStudy, Question, Profession } from '@/types'

interface PageProps {
  searchParams: Promise<{
    topic?: string
    category?: string
    subtopic?: string
    difficulty?: string
    region?: string
    random?: string
  }>
}

export default async function CasesPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('profession, study_year, show_question_tags, access_key')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/onboarding')

  const params = await searchParams
  const { topic, category, subtopic, difficulty, region, random } = params
  const isRandom = random === '1'

  // ── No topic + not random → show topic selector ─────────────────────────────
  if (!topic && !isRandom) {
    const [{ data: richRows }, { data: mcqRows }] = await Promise.all([
      supabase.rpc('get_case_study_counts', { p_profession: profile.profession, p_access_key: profile.access_key ?? null }),
      supabase.rpc('get_question_counts', { p_profession: profile.profession, p_question_type: 'case_study', p_access_key: profile.access_key ?? null }),
    ])

    const allRows = [...(richRows ?? []), ...(mcqRows ?? [])]

    if (allRows.length === 0) {
      return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
          <p className="text-4xl mb-4">🩺</p>
          <p className="text-[#101010] font-semibold mb-1">No case studies yet</p>
          <p className="text-gray-400 text-sm">Case studies are coming soon — check back shortly!</p>
        </div>
      )
    }

    const topicData = allRows.map((r: { topic: string; category: string | null; subtopic: string | null; cnt: number }) => ({
      topic: r.topic,
      category: r.category,
      subtopic: r.subtopic,
      count: Number(r.cnt),
    }))
    const totalAvailable = topicData.reduce((sum: number, r: { count: number }) => sum + r.count, 0)

    return (
      <TopicSelectorClient
        topicRows={topicData}
        mode="case_study"
        totalAvailable={totalAvailable}
        region={region}
      />
    )
  }

  // ── Fetch cases — try rich case_studies table first ─────────────────────────
  let richQuery = supabase
    .from('case_studies')
    .select('*')
    .contains('professions', [profile.profession as Profession])

  if (topic) richQuery = richQuery.eq('topic', topic)
  if (category) richQuery = richQuery.eq('category', category)
  if (subtopic) richQuery = richQuery.eq('subtopic', subtopic)
  if (difficulty && difficulty !== 'all') richQuery = richQuery.eq('difficulty', difficulty)
  if (region === 'universal') richQuery = richQuery.eq('region', 'universal')
  else if (region === 'ghana') richQuery = richQuery.eq('region', 'ghana')
  if (profile.study_year) richQuery = richQuery.contains('year_level', [profile.study_year])
  if (profile.access_key) {
    richQuery = richQuery.or(`access_key.is.null,access_key.eq.${profile.access_key}`)
  } else {
    richQuery = richQuery.is('access_key', null)
  }

  const { data: richCases } = await richQuery

  if (richCases && richCases.length > 0) {
    const shuffled = [...richCases]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return (
      <CaseStudyClient
        cases={shuffled as CaseStudy[]}
        userId={user.id}
        showTags={profile.show_question_tags ?? true}
      />
    )
  }

  // ── Fallback: clinical scenario MCQs from questions table (CNS / Respiratory) ─
  let mcqQuery = supabase
    .from('questions')
    .select('*')
    .contains('professions', [profile.profession as Profession])
    .eq('question_type', 'case_study')
    .limit(50)

  if (topic) mcqQuery = mcqQuery.eq('topic', topic)
  if (category) mcqQuery = mcqQuery.eq('category', category)
  if (subtopic) mcqQuery = mcqQuery.eq('subtopic', subtopic)
  if (difficulty && difficulty !== 'all') mcqQuery = mcqQuery.eq('difficulty', difficulty)
  if (region === 'universal') mcqQuery = mcqQuery.eq('region', 'universal')
  else if (region === 'ghana') mcqQuery = mcqQuery.eq('region', 'ghana')
  if (profile.study_year) mcqQuery = mcqQuery.contains('year_level', [profile.study_year])
  if (profile.access_key) {
    mcqQuery = mcqQuery.or(`access_key.is.null,access_key.eq.${profile.access_key}`)
  } else {
    mcqQuery = mcqQuery.is('access_key', null)
  }

  const [{ data: caseQuestions }, { data: bookmarkRows }] = await Promise.all([
    mcqQuery,
    supabase.from('bookmarks').select('question_id').eq('user_id', user.id),
  ])

  if (!caseQuestions || caseQuestions.length === 0) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <p className="text-4xl mb-4">🔍</p>
        <p className="text-[#101010] font-semibold mb-1">No cases found</p>
        <p className="text-gray-400 text-sm mb-6">Try a different topic or difficulty.</p>
        <a href="/practice/cases" className="px-6 py-3 rounded-full bg-[#0D9488] text-white font-semibold text-sm">
          ← Back to topics
        </a>
      </div>
    )
  }

  const shuffled = [...caseQuestions]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  return (
    <MCQClient
      questions={shuffled as Question[]}
      userId={user.id}
      profession={profile.profession}
      bookmarkedIds={(bookmarkRows ?? []).map(b => b.question_id)}
      showTags={profile.show_question_tags ?? true}
      backUrl="/practice/cases"
    />
  )
}
