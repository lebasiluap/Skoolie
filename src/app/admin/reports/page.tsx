import { createClient } from '@/lib/supabase/server'
import ReportsClient from './ReportsClient'

export const dynamic = 'force-dynamic'

export default async function AdminReportsPage() {
  const supabase = await createClient()

  const [{ data: reports, error: reportError }, { data: profiles }] = await Promise.all([
    supabase.rpc('admin_report_queue'),
    supabase.from('user_profiles').select('id, full_name, email'),
  ])

  if(reportError) return <p role="alert">Reports could not be loaded. Please retry; no reports have been removed or resolved.</p>

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
