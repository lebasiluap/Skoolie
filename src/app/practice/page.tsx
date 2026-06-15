import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PracticeLanding from './PracticeLanding'
import BottomNav from '@/components/BottomNav'
import type { Profession } from '@/types'

export default async function PracticePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('profession, study_year')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/onboarding')

  // Fetch counts per mode filtered by profession + year
  const yearFilter = profile.study_year as string | null

  const mcqQ = supabase.from('questions').select('id', { count: 'exact', head: true })
    .contains('professions', [profile.profession as Profession])
    .eq('question_type', 'mcq')
  const flashQ = supabase.from('questions').select('id', { count: 'exact', head: true })
    .contains('professions', [profile.profession as Profession])
    .eq('question_type', 'flashcard')
  const caseQ = supabase.from('case_studies').select('id', { count: 'exact', head: true })
    .contains('professions', [profile.profession as Profession])

  const [
    { count: mcqCount },
    { count: flashcardCount },
    { count: caseCount },
  ] = await Promise.all([
    yearFilter ? mcqQ.contains('year_level', [yearFilter]) : mcqQ,
    yearFilter ? flashQ.contains('year_level', [yearFilter]) : flashQ,
    yearFilter ? caseQ.contains('year_level', [yearFilter]) : caseQ,
  ])

  return (
    <div>
      <PracticeLanding
        mcqCount={mcqCount ?? 0}
        flashcardCount={flashcardCount ?? 0}
        caseCount={caseCount ?? 0}
        studyYear={profile.study_year ?? null}
        profession={profile.profession}
      />
      <BottomNav />
    </div>
  )
}
