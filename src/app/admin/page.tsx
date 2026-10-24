import { createClient } from '@/lib/supabase/server'
import AdminDashboardClient from './AdminDashboardClient'
import { validDays, type BetaMetrics } from './metrics'

export const dynamic = 'force-dynamic'

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const days = validDays((await searchParams).days)
  const supabase = await createClient()
  let metrics: BetaMetrics | null = null
  let message: string | null = null
  try {
    const { data, error } = await supabase.rpc('admin_beta_metrics', { p_days: days }).abortSignal(AbortSignal.timeout(12000))
    metrics = error ? null : data as BetaMetrics | null
    message = error ? 'Analytics could not be loaded. Please retry.' : null
  } catch {
    message = 'Analytics timed out or the connection was interrupted. Please retry.'
  }
  return <AdminDashboardClient initialData={metrics} initialError={message} days={days} />
}
