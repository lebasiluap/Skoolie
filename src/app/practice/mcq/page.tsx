import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MCQClient from './MCQClient'
import TopicSelectorClient from '@/components/TopicSelectorClient'
import type { Question, Profession } from '@/types'

interface PageProps {
  searchParams: Promise<{
    topic?: string
    subtopic?: string
    difficulty?: string
    limit?: string
  }>
}

export default async function MCQPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('profession, xp, level')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/onboarding')

  const params = await searchParams
  const { topic, subtopic, difficulty, limit: limitStr } = params
  const limit = Math.min(parseInt(limitStr ?? '10', 10) || 10, 50)

  // ── No topic selected → show topic selector ───────────────────────────────
  if (!topic) {
    const { data: allRows } = await supabase
      .from('questions')
      .select('topic, subtopic')
      .contains('professions', [profile.profession as Profession])
      .eq('question_type', 'mcq')

    const countMap: Record<string, Record<string, number>> = {}
    for (const row of allRows ?? []) {
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
        mode="mcq"
        totalAvailable={allRows?.length ?? 0}
      />
    )
  }

  // ── Topic selected → fetch filtered questions ─────────────────────────────
  let query = supabase
    .from('questions')
    .select('*')
    .contains('professions', [profile.profession as Profession])
    .eq('question_type', 'mcq')
    .eq('topic', topic)

  if (subtopic) query = query.eq('subtopic', subtopic)
  if (difficulty && difficulty !== 'all') query = query.eq('difficulty', difficulty)

  query = query.limit(limit)

  const [{ data: questions }, { data: bookmarkRows }] = await Promise.all([
    query,
    supabase.from('bookmarks').select('question_id').eq('user_id', user.id),
  ])

  if (!questions || questions.length === 0) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <p className="text-4xl mb-4">🔍</p>
        <p className="text-[#101010] font-semibold mb-1">No questions found</p>
        <p className="text-gray-400 text-sm mb-6">Try a different topic or difficulty.</p>
        <a
          href="/practice/mcq"
          className="px-6 py-3 rounded-full bg-[#0D9488] text-white font-semibold text-sm"
        >
          ← Back to topics
        </a>
      </div>
    )
  }

  // Shuffle (Fisher-Yates)
  const shuffled = [...questions]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  const bookmarkedIds = (bookmarkRows ?? []).map(b => b.question_id)

  return (
    <MCQClient
      questions={shuffled as Question[]}
      userId={user.id}
      profession={profile.profession}
      bookmarkedIds={bookmarkedIds}
    />
  )
}
