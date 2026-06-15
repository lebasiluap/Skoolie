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
  }>
}

export default async function FlashcardsPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('profession, allow_repeat_questions, show_question_tags, study_year')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/onboarding')

  const params = await searchParams
  const { topic, category, subtopic, difficulty, limit: limitStr, region, random } = params
  const limit = Math.min(parseInt(limitStr ?? '20', 10) || 20, 60)
  const isRandom = random === '1'

  // ── No topic + not random → show topic selector ───────────────────────────
  if (!topic && !isRandom) {
    const { data: allRows } = await supabase
      .from('questions')
      .select('topic, category, subtopic')
      .contains('professions', [profile.profession as Profession])
      .eq('question_type', 'flashcard')

    if (!allRows || allRows.length === 0) {
      return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
          <p className="text-4xl mb-4">🃏</p>
          <p className="text-[#101010] font-semibold mb-1">No flashcards yet</p>
          <p className="text-gray-400 text-sm">Flashcards are coming soon — check back shortly!</p>
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
        mode="flashcard"
        totalAvailable={allRows.length}
        region={region}
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

  // Region filter
  if (region === 'universal') query = query.eq('region', 'universal')
  else if (region === 'ghana') query = query.eq('region', 'ghana')

  // Year filter
  if (profile.study_year) {
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

  return (
    <FlashcardClient
      questions={shuffled as Question[]}
      userId={user.id}
      bookmarkedIds={(bookmarkRows ?? []).map(b => b.question_id)}
      showTags={profile.show_question_tags ?? true}
    />
  )
}
