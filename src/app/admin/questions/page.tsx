import { createClient } from '@/lib/supabase/server'
import QuestionsClient from './QuestionsClient'

// Force dynamic so search/filter params always hit the server fresh
export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{
    topic?: string
    type?: string
    course?: string
    difficulty?: string
    subtopic?: string
    q?: string
    page?: string
  }>
}

export default async function AdminQuestionsPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const params = await searchParams
  const { topic, type, course, difficulty, subtopic, q, page: pageStr } = params
  const page = Math.max(1, parseInt(pageStr ?? '1', 10))
  const perPage = 50
  const from = (page - 1) * perPage
  const to = from + perPage - 1

  // Build filtered query — apply .range() LAST so count is always accurate
  let query = supabase
    .from('questions')
    .select('id, topic, category, subtopic, question_type, difficulty, question_text, correct_answer, access_key, high_yield, region', { count: 'exact' })
    .order('topic', { ascending: true })
    .order('subtopic', { ascending: true })

  if (topic) query = query.eq('topic', topic)
  if (type) query = query.eq('question_type', type)
  if (course) query = query.eq('category', course)
  if (difficulty) query = query.eq('difficulty', difficulty)
  if (subtopic) query = query.ilike('subtopic', `%${subtopic}%`)
  if (q) query = query.ilike('question_text', `%${q}%`)

  // Apply pagination last
  query = query.range(from, to)

  const { data: questions, count } = await query

  // Distinct topics via RPC (bypasses 1000-row Supabase limit)
  const { data: topicRows } = await supabase.rpc('get_distinct_topics')
  const topics = (topicRows ?? []).map((r: { topic: string }) => r.topic).filter(Boolean)

  // Distinct courses/categories
  const { data: courseRows } = await supabase
    .from('questions')
    .select('category')
    .not('category', 'is', null)
    .order('category')

  const courses = [...new Set((courseRows ?? []).map((r: any) => r.category).filter(Boolean))] as string[]

  return (
    <QuestionsClient
      questions={questions ?? []}
      total={count ?? 0}
      page={page}
      perPage={perPage}
      topics={topics}
      courses={courses}
      filters={{ topic, type, course, difficulty, subtopic, q }}
    />
  )
}
