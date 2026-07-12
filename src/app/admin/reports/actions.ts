'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== 'lebasiluap@gmail.com') {
    throw new Error('Unauthorized')
  }
  return supabase
}

/** Resolve or dismiss a report. status ∈ 'resolved' | 'dismissed'. */
export async function setReportStatus(id: string, status: 'resolved' | 'dismissed', note?: string) {
  const supabase = await assertAdmin()
  await supabase
    .from('question_reports')
    .update({
      status,
      resolution_note: note?.trim() ? note.trim().slice(0, 500) : null,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', id)
  revalidatePath('/admin/reports')
}

/** Re-open a resolved/dismissed report. */
export async function reopenReport(id: string) {
  const supabase = await assertAdmin()
  await supabase
    .from('question_reports')
    .update({ status: 'open', resolution_note: null, resolved_at: null })
    .eq('id', id)
  revalidatePath('/admin/reports')
}

/** Bulk-resolve every open report for a given question/case (e.g. after fixing it). */
export async function resolveAllForItem(questionId: string | null, caseId: string | null) {
  const supabase = await assertAdmin()
  let q = supabase
    .from('question_reports')
    .update({ status: 'resolved', resolved_at: new Date().toISOString(), resolution_note: 'Bulk-resolved' })
    .eq('status', 'open')
  q = questionId ? q.eq('question_id', questionId) : q.eq('case_id', caseId as string)
  await q
  revalidatePath('/admin/reports')
}
