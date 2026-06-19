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
    // Check if there are bookmarks of the other type to offer a helpful redirect
    const otherType = type === 'flashcard' ? 'mcq' : 'flashcard'
    const { data: otherQuestions } = await supabase
      .from('questions')
      .select('id')
      .in('id', allBookmarkedIds)
      .eq('question_type', otherType)
      .limit(1)
    const hasOtherType = (otherQuestions?.length ?? 0) > 0

    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔖</div>
        <p style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>
          No bookmarked {type === 'flashcard' ? 'flashcards' : 'MCQs'} yet
        </p>
        <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--text-faint)', fontWeight: 600 }}>
          Bookmark some {type === 'flashcard' ? 'flashcard' : 'MCQ'} questions while practising to see them here.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 280 }}>
          {hasOtherType && (
            <a href={`/bookmarks/practice?type=${otherType}`}
              style={{ display: 'block', padding: '13px 24px', borderRadius: 999, background: 'var(--teal)', color: 'var(--on-teal)', fontSize: 14, fontWeight: 800, textDecoration: 'none' }}>
              Practice bookmarked {otherType === 'flashcard' ? 'flashcards' : 'MCQs'} →
            </a>
          )}
          <a href="/bookmarks"
            style={{ display: 'block', padding: '13px 24px', borderRadius: 999, background: 'var(--surface-2)', color: 'var(--text-soft)', fontSize: 14, fontWeight: 800, textDecoration: 'none', border: '1px solid var(--border)' }}>
            ← Back to bookmarks
          </a>
        </div>
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
