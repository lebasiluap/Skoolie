import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MCQClient from './MCQClient'
import type { Question, Profession } from '@/types'

export default async function MCQPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('profession, xp, level')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/onboarding')

  // Fetch questions for this profession (or general)
  const { data: questions } = await supabase
    .from('questions')
    .select('*')
    .contains('professions', [profile.profession as Profession])
    .eq('question_type', 'mcq')
    .limit(10)

  if (!questions || questions.length === 0) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <p className="text-gray-400">No questions available yet. Check back soon!</p>
      </div>
    )
  }

  return <MCQClient questions={questions as Question[]} userId={user.id} profession={profile.profession} />
}
