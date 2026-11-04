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
  if (id && !UUID_RE.test(id)) return <p role="alert">Invalid question ID.</p>
  const { data, error } = await supabase.rpc('admin_question_catalog', {
    p_filters: { topic, type, course, difficulty, subtopic, q, id, page: Math.min(page, 20000) },
  })
  if (error || !data) return <p role="alert">Questions could not be loaded. Please reload and retry. No content was changed.</p>

  return (
    <QuestionsClient
      questions={data.questions ?? []}
      total={data.total ?? 0}
      page={page}
      perPage={perPage}
      topics={data.topics ?? []}
      courses={data.courses ?? []}
      filters={{ topic, type, course, difficulty, subtopic, q, id }}
    />
  )
}
