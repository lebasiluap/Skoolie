import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CaseStudyClient from './CaseStudyClient'
import TopicSelectorClient from '@/components/TopicSelectorClient'
import type { CaseStudy, Profession } from '@/types'

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
    .select('profession, study_year, show_question_tags')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/onboarding')

  const params = await searchParams
  const { topic, category, subtopic, difficulty, region, random } = params
  const isRandom = random === '1'

  // ── No topic + not random → show topic selector ─────────────────────────────
  if (!topic && !isRandom) {
    const { data: allRows } = await supabase
      .from('case_studies')
      .select('topic, category, subtopic')
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

    const countMap = new Map<string, number>()
    for (const row of allRows) {
      if (!row.topic) continue
      const key = `${row.topic}|||${row.category ?? ''}|||${row.subtopic ?? ''}`
      countMap.set(key, (countMap.get(key) ?? 0) + 1)
    }
    const topicData = Array.from(countMap.entries()).map(([key, count]) => {
      const [t, c, s] = key.split('|||')
      return { topic: t, category: c || null, subtopic: s || null, count }
    })

    return (
      <TopicSelectorClient
        topicRows={topicData}
        mode="case_study"
        totalAvailable={allRows.length}
        region={region}
      />
    )
  }

  // ── Fetch cases ─────────────────────────────────────────────────────────────
  let query = supabase
    .from('case_studies')
    .select('*')
    .contains('professions', [profile.profession as Profession])

  if (topic) query = query.eq('topic', topic)
  if (category) query = query.eq('category', category)
  if (subtopic) query = query.eq('subtopic', subtopic)
  if (difficulty && difficulty !== 'all') query = query.eq('difficulty', difficulty)

  // Region filter
  if (region === 'universal') query = query.eq('region', 'universal')
  else if (region === 'ghana') query = query.eq('region', 'ghana')

  // Year filter
  if (profile.study_year) {
    query = query.contains('year_level', [profile.study_year])
  }

  const { data: cases } = await query

  if (!cases || cases.length === 0) {
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

  const shuffled = [...cases]
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
