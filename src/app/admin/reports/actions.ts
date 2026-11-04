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
  const { data, error } = await supabase.rpc('admin_set_report_status', {
    p_id: id, p_status: status, p_note: note?.trim().slice(0, 500) || null,
  }).abortSignal(AbortSignal.timeout(15_000))
  if (error) throw new Error(error.message)
  if (data !== 1) throw new Error('Report was not updated. Reload and retry.')
  revalidatePath('/admin/reports')
}

/** Re-open a resolved/dismissed report. */
export async function reopenReport(id: string) {
  const supabase = await assertAdmin()
  const { data, error } = await supabase.rpc('admin_set_report_status', { p_id: id, p_status: 'open' }).abortSignal(AbortSignal.timeout(15_000))
  if (error) throw new Error(error.message)
  if (data !== 1) throw new Error('Report was not reopened. Reload and retry.')
  revalidatePath('/admin/reports')
}

/** Bulk-resolve every open report for a given question/case (e.g. after fixing it). */
export async function resolveAllForItem(questionId: string | null, caseId: string | null) {
  const supabase = await assertAdmin()
  if (!!questionId === !!caseId) throw new Error('Choose exactly one question or case.')
  const { data, error } = await supabase.rpc('admin_set_report_status', {
    p_status: 'resolved', p_question_id: questionId, p_case_id: caseId, p_note: 'Bulk-resolved',
  }).abortSignal(AbortSignal.timeout(15_000))
  if (error) throw new Error(error.message)
  if (!(data > 0)) throw new Error('No open reports were updated. Reload and retry.')
  revalidatePath('/admin/reports')
}
