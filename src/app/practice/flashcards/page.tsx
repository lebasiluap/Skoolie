export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import FlashcardClient from './FlashcardClient'
import TopicSelectorClient from '@/components/TopicSelectorClient'
import type { Question, Profession } from '@/types'

interface PageProps {
  searchParams: Promise<{
    topic?: string
    category?: string
    subtopic?: string
    difficulty?: string
    limit?: string
    region?: string
    random?: string
    cognitive_type?: string
    high_yield?: string
    all_years?: string
  }>
}

export default async function FlashcardsPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('profession, allow_repeat_questions, show_question_tags, study_year, access_key')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/onboarding')

  const params = await searchParams
  const { topic, category, subtopic, difficulty, limit: limitStr, region, random,
          cognitive_type, high_yield, all_years } = params
  const limit = Math.min(parseInt(limitStr ?? '20', 10) || 20, 60)
  const isRandom = random === '1'

  // ── No topic + not random → show topic selector ───────────────────────────
  if (!topic && !isRandom) {
    const { data: rows } = await supabase
      .rpc('get_question_counts', {
        p_profession: profile.profession,
        p_question_type: 'flashcard',
        p_access_key: profile.access_key ?? null,
      })

    if (!rows || rows.length === 0) {
      return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
          <p className="text-4xl mb-4">🃏</p>
          <p className="text-[#101010] font-semibold mb-1">No flashcards yet</p>
          <p className="text-gray-400 text-sm">Flashcards are coming soon — check back shortly!</p>
        </div>
      )
    }

    const topicData = rows.map((r: { topic: string; category: string | null; subtopic: string | null; cnt: number }) => ({
      topic: r.topic,
      category: r.category,
      subtopic: r.subtopic,
      count: Number(r.cnt),
    }))
    const totalAvailable = topicData.reduce((sum: number, r: { count: number }) => sum + r.count, 0)

    return (
      <TopicSelectorClient
        topicRows={topicData}
        mode="flashcard"
        totalAvailable={totalAvailable}
        region={region}
        hasYearFilter={!!profile.study_year}
        profession={profile.profession}
        accessKey={profile.access_key ?? null}
      />
    )
  }

  // ── Fetch flashcards ──────────────────────────────────────────────────────
  let query = supabase
    .from('questions')
    .select('*')
    .contains('professions', [profile.profession as Profession])
    .eq('question_type', 'flashcard')

  if (topic) query = query.eq('topic', topic)
  if (category) query = query.eq('category', category)
  if (subtopic) query = query.eq('subtopic', subtopic)
  if (difficulty && difficulty !== 'all') query = query.eq('difficulty', difficulty)

  // Cognitive type filter
  if (cognitive_type && cognitive_type !== 'all') query = query.eq('cognitive_type', cognitive_type)

  // High yield filter
  if (high_yield === 'true') query = query.eq('high_yield', true)

  // Region filter
  if (region === 'universal') query = query.eq('region', 'universal')
  else if (region === 'ghana') query = query.eq('region', 'ghana')

  // Access key filter
  if (profile.access_key) {
    query = query.or(`access_key.is.null,access_key.eq.${profile.access_key}`)
  } else {
    query = query.is('access_key', null)
  }

  // Year filter — skip if user toggled "All Years"
  if (profile.study_year && all_years !== '1') {
    query = query.contains('year_level', [profile.study_year])
  }

  // No-repeat exclusion
  const allowRepeat = profile.allow_repeat_questions ?? true
  if (!allowRepeat) {
    const { data: historyRows } = await supabase
      .from('user_question_history')
      .select('question_id')
      .eq('user_id', user.id)
      .eq('question_type', 'flashcard')

    const excludeIds = historyRows?.map(r => r.question_id) ?? []
    if (excludeIds.length > 0) {
      const { count } = await supabase
        .from('questions')
        .select('id', { count: 'exact', head: true })
        .contains('professions', [profile.profession as Profession])
        .eq('question_type', 'flashcard')
        .not('id', 'in', `(${excludeIds.join(',')})`)

      if ((count ?? 0) > 0) {
        query = query.not('id', 'in', `(${excludeIds.join(',')})`)
      }
    }
  }

  query = query.limit(limit)

  const [{ data: questions }, { data: bookmarkRows }] = await Promise.all([
    query,
    supabase.from('bookmarks').select('question_id').eq('user_id', user.id),
  ])

  if (!questions || questions.length === 0) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <p className="text-4xl mb-4">🔍</p>
        <p className="text-[#101010] font-semibold mb-1">No flashcards found</p>
        <p className="text-gray-400 text-sm mb-6">Try a different topic or difficulty.</p>
        <a href="/practice/flashcards" className="px-6 py-3 rounded-full bg-[#0D9488] text-white font-semibold text-sm">
          ← Back to topics
        </a>
      </div>
    )
  }

  const shuffled = [...questions]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  // Build "new set" + back URLs — same filters + random=1 skips the topic selector
  const newSetParams = new URLSearchParams()
  if (topic) newSetParams.set('topic', topic)
  if (category) newSetParams.set('category', category)
  if (subtopic) newSetParams.set('subtopic', subtopic)
  if (difficulty && difficulty !== 'all') newSetParams.set('difficulty', difficulty)
  if (cognitive_type && cognitive_type !== 'all') newSetParams.set('cognitive_type', cognitive_type)
  if (high_yield === 'true') newSetParams.set('high_yield', 'true')
  if (all_years === '1') newSetParams.set('all_years', '1')
  newSetParams.set('limit', String(limit))
  newSetParams.set('random', '1')
  const newSetUrl = `/practice/flashcards?${newSetParams.toString()}`

  // Back URL: if a topic was selected go to that selector page, else just topic selector root
  const backParams = new URLSearchParams()
  if (topic) backParams.set('topic', topic)
  if (category) backParams.set('category', category)
  const backUrl = topic
    ? `/practice/flashcards?${backParams.toString()}`
    : '/practice/flashcards'

  return (
    <FlashcardClient
      questions={shuffled as Question[]}
      userId={user.id}
      bookmarkedIds={(bookmarkRows ?? []).map(b => b.question_id)}
      showTags={profile.show_question_tags ?? true}
      backUrl={backUrl}
      newSetUrl={newSetUrl}
    />
  )
}
