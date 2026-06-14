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

  // Fetch questions + user bookmarks in parallel
  const [{ data: questions }, { data: bookmarkRows }] = await Promise.all([
    supabase
      .from('questions')
      .select('*')
      .contains('professions', [profile.profession as Profession])
      .eq('question_type', 'mcq')
      .limit(10),
    supabase
      .from('bookmarks')
      .select('question_id')
      .eq('user_id', user.id),
  ])

  if (!questions || questions.length === 0) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <p className="text-gray-400">No questions available yet. Check back soon!</p>
      </div>
    )
  }

  const bookmarkedIds = (bookmarkRows ?? []).map(b => b.question_id)

  return (
    <MCQClient
      questions={questions as Question[]}
      userId={user.id}
      profession={profile.profession}
      bookmarkedIds={bookmarkedIds}
    />
  )
}
