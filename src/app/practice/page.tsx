import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PracticeLanding from './PracticeLanding'
import type { Profession } from '@/types'

export default async function PracticePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('profession, study_year, access_key')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/onboarding')

  // Fetch counts per mode filtered by profession + year + access_key
  const yearFilter = profile.study_year as string | null
  const accessKey = profile.access_key as string | null

  let mcqQ = supabase.from('questions').select('id', { count: 'exact', head: true })
    .contains('professions', [profile.profession as Profession])
    .eq('question_type', 'mcq')
  if (accessKey) mcqQ = mcqQ.or(`access_key.is.null,access_key.eq.${accessKey}`)
  else mcqQ = mcqQ.is('access_key', null)

  let flashQ = supabase.from('questions').select('id', { count: 'exact', head: true })
    .contains('professions', [profile.profession as Profession])
    .eq('question_type', 'flashcard')
  if (accessKey) flashQ = flashQ.or(`access_key.is.null,access_key.eq.${accessKey}`)
  else flashQ = flashQ.is('access_key', null)

  let caseRichQ = supabase.from('case_studies').select('id', { count: 'exact', head: true })
    .contains('professions', [profile.profession as Profession])
  if (accessKey) caseRichQ = caseRichQ.or(`access_key.is.null,access_key.eq.${accessKey}`)
  else caseRichQ = caseRichQ.is('access_key', null)

  let caseMcqQ = supabase.from('questions').select('id', { count: 'exact', head: true })
    .contains('professions', [profile.profession as Profession])
    .eq('question_type', 'case_study')
  if (accessKey) caseMcqQ = caseMcqQ.or(`access_key.is.null,access_key.eq.${accessKey}`)
  else caseMcqQ = caseMcqQ.is('access_key', null)

  const [
    { count: mcqCount },
    { count: flashcardCount },
    { count: richCaseCount },
    { count: mcqCaseCount },
  ] = await Promise.all([
    yearFilter ? mcqQ.contains('year_level', [yearFilter]) : mcqQ,
    yearFilter ? flashQ.contains('year_level', [yearFilter]) : flashQ,
    yearFilter ? caseRichQ.contains('year_level', [yearFilter]) : caseRichQ,
    yearFilter ? caseMcqQ.contains('year_level', [yearFilter]) : caseMcqQ,
  ])
  const caseCount = (richCaseCount ?? 0) + (mcqCaseCount ?? 0)

  return (
    <PracticeLanding
      mcqCount={mcqCount ?? 0}
      flashcardCount={flashcardCount ?? 0}
      caseCount={caseCount ?? 0}
      studyYear={profile.study_year ?? null}
      profession={profile.profession}
    />
  )
}
