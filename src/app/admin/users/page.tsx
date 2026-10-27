import { createClient } from '@/lib/supabase/server'
import UsersClient from './UsersClient'

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage() {
  const supabase = await createClient()

  // Per-user attempt stats come from an admin RPC (exact sums of times_seen —
  // a raw history read caps at 1000 rows and undercounts as usage grows).
  const [{ data: profiles, error: rosterError }, { data: stats, error: statsError }] = await Promise.all([
    // The admin-only RPC includes Auth accounts that have not created a profile.
    supabase.rpc('admin_registered_users').abortSignal(AbortSignal.timeout(5000)),
    supabase.rpc('admin_user_stats').abortSignal(AbortSignal.timeout(5000)),
  ])

  interface StatRow { user_id: string; attempts: number; correct: number; mcq: number; flashcard: number; cases: number; last_active: string }
  const statsById: Record<string, StatRow> = {}
  for (const r of (stats ?? []) as StatRow[]) statsById[r.user_id] = r

  return <UsersClient profiles={profiles ?? []} statsById={statsById}
    loadError={rosterError ? 'Registered accounts could not be loaded. Please retry.' : null}
    statsUnavailable={!!statsError} />
}
