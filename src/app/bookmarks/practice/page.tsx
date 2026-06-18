import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MCQClient from '@/app/practice/mcq/MCQClient'
import FlashcardClient from '@/app/practice/flashcards/FlashcardClient'
import type { Question, Profession } from '@/types'

interface PageProps {
  searchParams: Promise<{ type?: string }>
}

export default async function BookmarksPracticePage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('profession, xp, level, show_question_tags, access_key')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/onboarding')

  const params = await searchParams
  const type = params.type === 'flashcard' ? 'flashcard' : 'mcq'

  // Fetch bookmarked question IDs
  const { data: bookmarkRows } = await supabase
    .from('bookmarks')
    .select('question_id')
    .eq('user_id', user.id)

  const allBookmarkedIds = (bookmarkRows ?? []).map(b => b.question_id)

  if (allBookmarkedIds.length === 0) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <p className="text-4xl mb-4">🔖</p>
        <p className="text-[#101010] font-semibold mb-1">No bookmarks yet</p>
        <p className="text-gray-400 text-sm mb-6">Bookmark questions while practising to review them here.</p>
        <a href="/bookmarks" className="px-6 py-3 rounded-full bg-[#0D9488] text-white font-semibold text-sm">
          ← Back to bookmarks
        </a>
      </div>
    )
  }

  // Fetch the bookmarked questions of the requested type
  const { data: questions } = await supabase
    .from('questions')
    .select('*')
    .in('id', allBookmarkedIds)
    .eq('question_type', type)
    .contains('professions', [profile.profession as Profession])

  if (!questions || questions.length === 0) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <p className="text-4xl mb-4">🔍</p>
        <p className="text-[#101010] font-semibold mb-1">
          No bookmarked {type === 'flashcard' ? 'flashcards' : 'MCQs'} found
        </p>
        <p className="text-gray-400 text-sm mb-6">
          Bookmark some {type === 'flashcard' ? 'flashcards' : 'MCQ questions'} while practising.
        </p>
        <a href="/bookmarks" className="px-6 py-3 rounded-full bg-[#0D9488] text-white font-semibold text-sm">
          ← Back to bookmarks
        </a>
      </div>
    )
  }

  // Shuffle
  const shuffled = [...questions]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  const backUrl = '/bookmarks'
  const newSetUrl = `/bookmarks/practice?type=${type}`

  if (type === 'flashcard') {
    return (
      <FlashcardClient
        questions={shuffled as Question[]}
        userId={user.id}
        bookmarkedIds={allBookmarkedIds}
        showTags={profile.show_question_tags ?? true}
        backUrl={backUrl}
        newSetUrl={newSetUrl}
      />
    )
  }

  return (
    <MCQClient
      questions={shuffled as Question[]}
      userId={user.id}
      profession={profile.profession}
      bookmarkedIds={allBookmarkedIds}
      showTags={profile.show_question_tags ?? true}
      backUrl={backUrl}
      newSetUrl={newSetUrl}
    />
  )
}
