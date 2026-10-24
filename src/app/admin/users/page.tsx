import { createClient } from '@/lib/supabase/server'
import UsersClient from './UsersClient'

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage() {
  const supabase = await createClient()

  // Per-user attempt stats come from an admin RPC (exact sums of times_seen —
  // a raw history read caps at 1000 rows and undercounts as usage grows).
  const [{ data: profiles }, { data: stats }, { data: activity }] = await Promise.all([
    // Do not serialize private notification tokens or unrelated profile fields.
    supabase.from('user_profiles').select('id,full_name,email,profession,study_year,level,xp,current_streak,longest_streak,last_active_date,last_seen_at,created_at,access_key').order('created_at', { ascending: false }),
    supabase.rpc('admin_user_stats'),
    supabase.rpc('admin_app_activity').abortSignal(AbortSignal.timeout(5000)),
  ])

  interface StatRow { user_id: string; attempts: number; correct: number; mcq: number; flashcard: number; cases: number; last_active: string }
  const statsById: Record<string, StatRow> = {}
  for (const r of (stats ?? []) as StatRow[]) statsById[r.user_id] = r

  const signins = new Map<string, string | null>((activity?.people ?? []).map((p: {id:string;last_sign_in_at:string|null}) => [p.id,p.last_sign_in_at]))
  return <UsersClient profiles={(profiles ?? []).map(p=>({...p,last_sign_in_at:signins.get(p.id)??null}))} statsById={statsById} />
}
