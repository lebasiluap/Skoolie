import { createClient } from '@/lib/supabase/server'
import ReportsClient from './ReportsClient'

export const dynamic = 'force-dynamic'

export default async function AdminReportsPage() {
  const supabase = await createClient()

  const [{ data: reports }, { data: profiles }] = await Promise.all([
    supabase
      .from('question_reports')
      .select(`
        id, user_id, question_id, case_id, question_type, reason, note,
        status, resolution_note, created_at, resolved_at,
        questions ( id, topic, subtopic, difficulty, question_type, question_text, options, correct_answer, explanation ),
        case_studies ( id, title, topic, difficulty, clinical_vignette )
      `)
      .order('created_at', { ascending: false })
      .limit(1000),
    supabase.from('user_profiles').select('id, full_name, email'),
  ])

  const emailById: Record<string, { name: string; email: string }> = {}
  for (const p of profiles ?? []) {
    emailById[p.id] = { name: p.full_name ?? '—', email: p.email ?? '—' }
  }

  // Open first, then newest first
  const rank = (s: string) => (s === 'open' ? 0 : s === 'resolved' ? 1 : 2)
  const sorted = [...(reports ?? [])].sort((a, b) => {
    const r = rank(a.status) - rank(b.status)
    if (r !== 0) return r
    return (b.created_at ?? '').localeCompare(a.created_at ?? '')
  })

  return <ReportsClient reports={sorted as never[]} reporters={emailById} />
}
