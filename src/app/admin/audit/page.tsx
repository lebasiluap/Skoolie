import { createClient } from '@/lib/supabase/server'
import AuditClient from './AuditClient'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ acc?: string; ans?: string; att?: string; rate?: string }>
}

export default async function AdminAuditPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const p = await searchParams

  const minAcc = clamp(parseFloat(p.acc ?? '0.65'), 0, 1, 0.65)
  const minAnswers = clampInt(parseInt(p.ans ?? '20', 10), 1, 500, 20)
  const minAttempts = clampInt(parseInt(p.att ?? '2', 10), 1, 50, 2)
  const wrongRate = clamp(parseFloat(p.rate ?? '0.5'), 0, 1, 0.5)

  const { data, error } = await supabase.rpc('admin_miskey_audit', {
    p_min_acc: minAcc,
    p_min_answers: minAnswers,
    p_min_attempts: minAttempts,
    p_wrong_rate: wrongRate,
  })

  return (
    <AuditClient
      rows={(data ?? []) as never[]}
      error={error?.message ?? null}
      params={{ minAcc, minAnswers, minAttempts, wrongRate }}
    />
  )
}

function clamp(v: number, lo: number, hi: number, fallback: number) {
  return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback
}
function clampInt(v: number, lo: number, hi: number, fallback: number) {
  return Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : fallback
}
