import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CaseStudyClient from './CaseStudyClient'
import TopicSelectorClient from '@/components/TopicSelectorClient'
import type { CaseStudy, Profession } from '@/types'

interface PageProps {
  searchParams: Promise<{
    topic?: string
    subtopic?: string
    difficulty?: string
  }>
}

export default async function CasesPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('profession')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/onboarding')

  const params = await searchParams
  const { topic, subtopic, difficulty } = params

  // ── No topic selected → show topic selector ─────────────────────────────────
  if (!topic) {
    const { data: allRows } = await supabase
      .from('case_studies')
      .select('topic, subtopic')
      .contains('professions', [profile.profession as Profession])

    if (!allRows || allRows.length === 0) {
      return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
          <p className="text-4xl mb-4">🩺</p>
          <p className="text-[#101010] font-semibold mb-1">No case studies yet</p>
          <p className="text-gray-400 text-sm">Case studies are coming soon — check back shortly!</p>
        </div>
      )
    }

    const countMap: Record<string, Record<string, number>> = {}
    for (const row of allRows) {
      if (!row.topic) continue
      if (!countMap[row.topic]) countMap[row.topic] = {}
      const sub = row.subtopic ?? '__all__'
      countMap[row.topic][sub] = (countMap[row.topic][sub] ?? 0) + 1
    }

    const topicData = Object.entries(countMap).flatMap(([t, subs]) =>
      Object.entries(subs).map(([s, count]) => ({
        topic: t,
        subtopic: s === '__all__' ? null : s,
        count,
      }))
    )

    return (
      <TopicSelectorClient
        topicRows={topicData}
        mode="case_study"
        totalAvailable={allRows.length}
      />
    )
  }

  // ── Topic selected → fetch cases ────────────────────────────────────────────
  let query = supabase
    .from('case_studies')
    .select('*')
    .contains('professions', [profile.profession as Profession])
    .eq('topic', topic)

  if (subtopic) query = query.eq('subtopic', subtopic)
  if (difficulty && difficulty !== 'all') query = query.eq('difficulty', difficulty)

  const { data: cases } = await query

  if (!cases || cases.length === 0) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <p className="text-4xl mb-4">🔍</p>
        <p className="text-[#101010] font-semibold mb-1">No cases found</p>
        <p className="text-gray-400 text-sm mb-6">Try a different topic or difficulty.</p>
        <a
          href="/practice/cases"
          className="px-6 py-3 rounded-full bg-[#0D9488] text-white font-semibold text-sm"
        >
          ← Back to topics
        </a>
      </div>
    )
  }

  // Shuffle
  const shuffled = [...cases]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  return (
    <CaseStudyClient
      cases={shuffled as CaseStudy[]}
      userId={user.id}
    />
  )
}
