import { createClient } from '@/lib/supabase/server'
import QuestionsClient from './QuestionsClient'

interface PageProps {
  searchParams: Promise<{ topic?: string; type?: string; subtopic?: string; q?: string; page?: string }>
}

export default async function AdminQuestionsPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const params = await searchParams
  const { topic, type, subtopic, q, page: pageStr } = params
  const page = Math.max(1, parseInt(pageStr ?? '1', 10))
  const perPage = 50
  const from = (page - 1) * perPage
  const to = from + perPage - 1

  // Build query
  let query = supabase
    .from('questions')
    .select('id, topic, category, subtopic, question_type, difficulty, question_text, correct_answer, access_key, high_yield, region', { count: 'exact' })
    .order('topic', { ascending: true })
    .order('subtopic', { ascending: true })
    .range(from, to)

  if (topic) query = query.eq('topic', topic)
  if (type) query = query.eq('question_type', type)
  if (subtopic) query = query.eq('subtopic', subtopic)
  if (q) query = query.ilike('question_text', `%${q}%`)

  const { data: questions, count } = await query

  // Distinct topics via DB function — bypasses Supabase row limit entirely
  const { data: topicRows } = await supabase.rpc('get_distinct_topics')
  const topics = (topicRows ?? []).map((r: { topic: string }) => r.topic).filter(Boolean)

  return (
    <QuestionsClient
      questions={questions ?? []}
      total={count ?? 0}
      page={page}
      perPage={perPage}
      topics={topics}
      filters={{ topic, type, subtopic, q }}
    />
  )
}
