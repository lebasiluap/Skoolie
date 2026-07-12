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
    id?: string
    page?: string
  }>
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function AdminQuestionsPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const params = await searchParams
  const { topic, type, course, difficulty, subtopic, q, id } = params
  const parsedPage = parseInt(params.page ?? '1', 10)
  const page = Number.isFinite(parsedPage) ? Math.max(1, parsedPage) : 1
  const perPage = 50
  const from = (page - 1) * perPage
  const to = from + perPage - 1

  // Build filtered query — apply .range() LAST so count is always accurate
  let query = supabase
    .from('questions')
    .select('id, topic, category, subtopic, question_type, difficulty, question_text, correct_answer, access_key, high_yield, region', { count: 'exact' })
    .order('topic', { ascending: true })
    .order('subtopic', { ascending: true })

  if (id && UUID_RE.test(id)) query = query.eq('id', id)
  if (topic) query = query.eq('topic', topic)
  if (type) query = query.eq('question_type', type)
  if (course) query = query.eq('category', course)
  if (difficulty) query = query.eq('difficulty', difficulty)
  if (subtopic) query = query.ilike('subtopic', `%${subtopic}%`)
  if (q) query = query.ilike('question_text', `%${q}%`)

  // Apply pagination last
  query = query.range(from, to)

  const [{ data: questions, count }, { data: topicRows }, { data: catRows }] = await Promise.all([
    query,
    // Distinct values via RPCs — a plain select caps at 1000 rows and
    // silently truncates the dropdowns (the "course filter doesn't work" bug).
    supabase.rpc('get_distinct_topics'),
    supabase.rpc('get_distinct_categories'),
  ])

  const topics = (topicRows ?? []).map((r: { topic: string }) => r.topic).filter(Boolean)
  const courses = (catRows ?? []).map((r: { category: string }) => r.category).filter(Boolean)

  return (
    <QuestionsClient
      questions={questions ?? []}
      total={count ?? 0}
      page={page}
      perPage={perPage}
      topics={topics}
      courses={courses}
      filters={{ topic, type, course, difficulty, subtopic, q, id }}
    />
  )
}
