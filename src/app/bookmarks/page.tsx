import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import BottomNav from '@/components/BottomNav'

export default async function BookmarksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch bookmarks joined with question data
  const { data: bookmarks } = await supabase
    .from('bookmarks')
    .select(`
      id,
      created_at,
      questions (
        id,
        question_text,
        topic,
        difficulty,
        question_type,
        correct_answer,
        options,
        explanation,
        high_yield
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const mcqBookmarks = bookmarks?.filter(b => (b.questions as any)?.question_type === 'mcq') ?? []
  const flashcardBookmarks = bookmarks?.filter(b => (b.questions as any)?.question_type === 'flashcard') ?? []

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Header */}
      <div className="bg-[#101010] px-5 pt-12 pb-8">
        <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-1">Saved</p>
        <h1 className="text-white text-2xl font-bold">Bookmarks</h1>
        <p className="text-white/40 text-xs mt-1">{bookmarks?.length ?? 0} questions saved</p>
      </div>

      <div className="px-5 pt-6 space-y-6">
        {!bookmarks || bookmarks.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 shadow-sm text-center">
            <p className="text-4xl mb-4">🔖</p>
            <p className="text-[#101010] font-semibold mb-1">No bookmarks yet</p>
            <p className="text-gray-400 text-sm">Tap the bookmark icon while practising to save questions here.</p>
            <Link
              href="/practice/mcq"
              className="mt-6 inline-block px-6 py-2.5 rounded-full bg-[#0D9488] text-white text-sm font-semibold hover:bg-[#0b7a6e] transition-colors"
            >
              Start practising
            </Link>
          </div>
        ) : (
          <>
            {/* MCQ Bookmarks */}
            {mcqBookmarks.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-[#101010] mb-3">MCQ ({mcqBookmarks.length})</h2>
                <div className="flex flex-col gap-3">
                  {mcqBookmarks.map(b => {
                    const q = b.questions as any
                    if (!q) return null
                    return (
                      <div key={b.id} className="bg-white rounded-2xl p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="text-xs bg-[#f0fdfb] text-[#0D9488] px-2.5 py-0.5 rounded-full font-semibold">{q.topic}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {q.high_yield && <span className="text-yellow-500 text-xs">⭐</span>}
                            <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                              q.difficulty === 'easy' ? 'bg-green-50 text-green-600' :
                              q.difficulty === 'medium' ? 'bg-orange-50 text-orange-500' :
                              'bg-red-50 text-red-500'
                            }`}>{q.difficulty}</span>
                          </div>
                        </div>
                        <p className="text-sm text-[#101010] font-medium leading-snug mb-3">{q.question_text}</p>
                        <div className="bg-[#f0fdfb] rounded-xl px-3 py-2">
                          <p className="text-xs font-semibold text-[#0D9488] mb-0.5">Answer: {q.correct_answer}</p>
                          <p className="text-xs text-gray-600 leading-relaxed">{q.explanation}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Flashcard Bookmarks */}
            {flashcardBookmarks.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-[#101010] mb-3">Flashcards ({flashcardBookmarks.length})</h2>
                <div className="flex flex-col gap-3">
                  {flashcardBookmarks.map(b => {
                    const q = b.questions as any
                    if (!q) return null
                    const answerOption = (q.options as string[])?.find(
                      (o: string) => o.startsWith(q.correct_answer + '.') || o.startsWith(q.correct_answer + ' ')
                    )
                    const answerText = answerOption
                      ? answerOption.replace(/^[A-D][\.\s]\s*/, '')
                      : q.explanation
                    return (
                      <div key={b.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                        <div className="px-4 pt-4 pb-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs bg-[#f0fdfb] text-[#0D9488] px-2.5 py-0.5 rounded-full font-semibold">{q.topic}</span>
                            {q.high_yield && <span className="text-yellow-500 text-xs">⭐ High Yield</span>}
                          </div>
                          <p className="text-sm text-[#101010] font-medium leading-snug">{q.question_text}</p>
                        </div>
                        <div className="bg-[#0D9488] px-4 py-3">
                          <p className="text-xs font-bold text-white/60 uppercase tracking-wide mb-1">Answer</p>
                          <p className="text-white font-semibold text-sm">{answerText}</p>
                          {q.explanation && (
                            <p className="text-white/70 text-xs mt-1.5 leading-relaxed">{q.explanation}</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
