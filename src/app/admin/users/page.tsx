import { createClient } from '@/lib/supabase/server'
import UsersClient from './UsersClient'

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage() {
  const supabase = await createClient()

  // Per-user attempt stats come from an admin RPC (exact sums of times_seen —
  // a raw history read caps at 1000 rows and undercounts as usage grows).
  const [{ data: profiles }, { data: stats }] = await Promise.all([
    supabase.from('user_profiles').select('*').order('created_at', { ascending: false }),
    supabase.rpc('admin_user_stats'),
  ])

  interface StatRow { user_id: string; attempts: number; correct: number; mcq: number; flashcard: number; cases: number; last_active: string }
  const statsById: Record<string, StatRow> = {}
  for (const r of (stats ?? []) as StatRow[]) statsById[r.user_id] = r

  return <UsersClient profiles={profiles ?? []} statsById={statsById} />
}
