import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'


export default async function BookmarksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

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
    <div className="min-h-screen bg-[#0A0A0A] pb-28">
      {/* Header */}
      <div className="bg-[#0A0A0A] px-5 pt-12 pb-6 border-b border-[#1F1F1F]">
        <p className="text-[10px] font-semibold text-[#0D9488] uppercase tracking-widest mb-1">Saved</p>
        <h1 className="text-white text-2xl font-bold">Bookmarks</h1>
        <p className="text-[#888888] text-xs mt-1">{bookmarks?.length ?? 0} questions saved</p>
      </div>

      <div className="px-5 pt-5 space-y-5">
        {!bookmarks || bookmarks.length === 0 ? (
          <div className="bg-[#141414] rounded-2xl p-10 border border-[#1F1F1F] text-center">
            <p className="text-4xl mb-4">🔖</p>
            <p className="text-white font-semibold mb-1">No bookmarks yet</p>
            <p className="text-[#888888] text-sm">Tap the bookmark icon while practising to save questions here.</p>
            <Link
              href="/practice/mcq"
              className="mt-6 inline-block px-6 py-2.5 rounded-full bg-[#0D9488] text-black text-sm font-semibold hover:bg-[#0b7a6e] transition-colors"
            >
              Start practising
            </Link>
          </div>
        ) : (
          <>
            {/* MCQ Bookmarks */}
            {mcqBookmarks.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-[#0D9488] uppercase tracking-widest mb-3">MCQ ({mcqBookmarks.length})</p>
                <div className="flex flex-col gap-3">
                  {mcqBookmarks.map(b => {
                    const q = b.questions as any
                    if (!q) return null
                    return (
                      <div key={b.id} className="bg-[#141414] rounded-2xl p-4 border border-[#1F1F1F]">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <span className="text-xs bg-[#0D9488]/15 text-[#0D9488] px-2.5 py-0.5 rounded-full font-semibold border border-[#0D9488]/20">{q.topic}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {q.high_yield && <span className="text-yellow-400 text-xs">⭐</span>}
                            <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                              q.difficulty === 'easy' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                              q.difficulty === 'medium' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                              'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>{q.difficulty}</span>
                          </div>
                        </div>
                        <p className="text-sm text-white font-medium leading-snug mb-3">{q.question_text}</p>
                        <div className="bg-[#0D9488]/10 border border-[#0D9488]/20 rounded-xl px-3 py-2">
                          <p className="text-xs font-semibold text-[#0D9488] mb-0.5">Answer: {q.correct_answer}</p>
                          <p className="text-xs text-[#888888] leading-relaxed">{q.explanation}</p>
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
                <p className="text-[10px] font-semibold text-[#0D9488] uppercase tracking-widest mb-3">Flashcards ({flashcardBookmarks.length})</p>
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
                      <div key={b.id} className="bg-[#141414] rounded-2xl border border-[#1F1F1F] overflow-hidden">
                        <div className="px-4 pt-4 pb-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs bg-[#0D9488]/15 text-[#0D9488] px-2.5 py-0.5 rounded-full font-semibold border border-[#0D9488]/20">{q.topic}</span>
                            {q.high_yield && <span className="text-yellow-400 text-xs">⭐ High Yield</span>}
                          </div>
                          <p className="text-sm text-white font-medium leading-snug">{q.question_text}</p>
                        </div>
                        <div className="bg-[#0D9488] px-4 py-3">
                          <p className="text-[10px] font-bold text-black/50 uppercase tracking-widest mb-1">Answer</p>
                          <p className="text-black font-semibold text-sm">{answerText}</p>
                          {q.explanation && (
                            <p className="text-black/60 text-xs mt-1.5 leading-relaxed">{q.explanation}</p>
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
    </div>
  )
}
