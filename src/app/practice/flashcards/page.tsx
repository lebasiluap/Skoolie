import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import FlashcardClient from './FlashcardClient'
import type { Question, Profession } from '@/types'

export default async function FlashcardsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('profession')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/onboarding')

  const { data: questions } = await supabase
    .from('questions')
    .select('*')
    .contains('professions', [profile.profession as Profession])
    .eq('question_type', 'flashcard')
    .limit(20)

  if (!questions || questions.length === 0) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <p className="text-2xl mb-4">🃏</p>
        <p className="text-gray-400 text-sm">No flashcards available yet.</p>
      </div>
    )
  }

  return <FlashcardClient questions={questions as Question[]} userId={user.id} />
}
