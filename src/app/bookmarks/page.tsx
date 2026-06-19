import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import BottomNav from '@/components/BottomNav'

function DiffBadge({ difficulty }: { difficulty: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    easy:   { bg: 'var(--green-tint)',  color: 'var(--green)' },
    medium: { bg: 'var(--amber-tint)',  color: 'var(--amber)' },
    hard:   { bg: 'var(--red-tint)',    color: 'var(--red)' },
  }
  const s = styles[difficulty] ?? { bg: 'var(--surface-3)', color: 'var(--text-faint)' }
  return (
    <span style={{ fontSize: 11.5, fontWeight: 800, padding: '4px 9px', borderRadius: 999, background: s.bg, color: s.color, flexShrink: 0, textTransform: 'capitalize' }}>
      {difficulty}
    </span>
  )
}

export default async function BookmarksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: bookmarks } = await supabase
    .from('bookmarks')
    .select(`id, created_at, questions (id, question_text, topic, difficulty, question_type, correct_answer, options, explanation, high_yield)`)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const mcqBookmarks = bookmarks?.filter(b => (b.questions as any)?.question_type === 'mcq') ?? []
  const flashcardBookmarks = bookmarks?.filter(b => (b.questions as any)?.question_type === 'flashcard') ?? []
  const total = bookmarks?.length ?? 0

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <BottomNav />

      <div style={{ maxWidth: 720, margin: '0 auto', padding: 'clamp(18px,3.5vw,38px) clamp(16px,3.5vw,28px) 100px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 'clamp(26px,3vw,32px)', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.025em' }}>Bookmarks</h1>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-faint)', fontWeight: 600 }}>{total} question{total !== 1 ? 's' : ''} saved</p>
          </div>
          {total > 0 && (
            <Link href={`/bookmarks/practice?type=${mcqBookmarks.length > 0 ? 'mcq' : 'flashcard'}`}
              style={{ padding: '11px 18px', borderRadius: 999, background: 'var(--teal)', color: 'var(--on-teal)', fontSize: 14, fontWeight: 800, textDecoration: 'none' }}>
              Practice all →
            </Link>
          )}
        </div>

        {/* Empty state */}
        {total === 0 ? (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 24, boxShadow: 'var(--shadow)', padding: '60px 24px', textAlign: 'center' }}>
            <div style={{ width: 72, height: 72, borderRadius: 22, background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, margin: '0 auto 18px' }}>🔖</div>
            <p style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>No bookmarks yet</p>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--text-faint)', fontWeight: 600 }}>Tap the bookmark icon while practising to save questions here.</p>
            <Link href="/practice/mcq"
              style={{ display: 'inline-block', padding: '13px 28px', borderRadius: 999, background: 'var(--teal)', color: 'var(--on-teal)', fontSize: 14, fontWeight: 800, textDecoration: 'none' }}>
              Start practising
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

            {/* MCQ Bookmarks */}
            {mcqBookmarks.length > 0 && (
              <section>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>
                    MCQs <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-faint)' }}>({mcqBookmarks.length})</span>
                  </h2>
                  <Link href="/bookmarks/practice?type=mcq"
                    style={{ padding: '8px 16px', borderRadius: 999, background: 'var(--teal-tint)', color: 'var(--teal)', fontSize: 13, fontWeight: 800, textDecoration: 'none' }}>
                    Practice →
                  </Link>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {mcqBookmarks.map(b => {
                    const q = b.questions as any
                    if (!q) return null
                    return (
                      <div key={b.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, boxShadow: 'var(--shadow)', padding: 18 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
                          <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--teal)', background: 'var(--teal-tint)', padding: '4px 10px', borderRadius: 999 }}>{q.topic}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                            {q.high_yield && <span style={{ fontSize: 13 }}>⭐</span>}
                            <DiffBadge difficulty={q.difficulty} />
                          </div>
                        </div>
                        <p style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: 'var(--text)', lineHeight: 1.55 }}>{q.question_text}</p>
                        <div style={{ background: 'var(--teal-tint)', borderRadius: 12, padding: '10px 14px' }}>
                          <p style={{ margin: '0 0 3px', fontSize: 12, fontWeight: 800, color: 'var(--teal)' }}>Answer: {q.correct_answer}</p>
                          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-soft)', lineHeight: 1.55 }}>{q.explanation}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Flashcard Bookmarks */}
            {flashcardBookmarks.length > 0 && (
              <section>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>
                    Flashcards <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-faint)' }}>({flashcardBookmarks.length})</span>
                  </h2>
                  <Link href="/bookmarks/practice?type=flashcard"
                    style={{ padding: '8px 16px', borderRadius: 999, background: 'var(--coral-tint)', color: 'var(--coral)', fontSize: 13, fontWeight: 800, textDecoration: 'none' }}>
                    Practice →
                  </Link>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {flashcardBookmarks.map(b => {
                    const q = b.questions as any
                    if (!q) return null
                    // For flashcards: correct_answer holds the answer when non-empty;
                    // fall back to explanation for older cards where explanation IS the answer.
                    const answerText = (q.correct_answer && q.correct_answer.trim())
                      ? q.correct_answer
                      : q.explanation
                    return (
                      <div key={b.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
                        <div style={{ padding: '16px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--coral)', background: 'var(--coral-tint)', padding: '4px 10px', borderRadius: 999 }}>{q.topic}</span>
                            {q.high_yield && <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--gold)' }}>⭐ High Yield</span>}
                          </div>
                          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text)', lineHeight: 1.55 }}>{q.question_text}</p>
                        </div>
                        <div style={{ background: 'var(--teal)', padding: '14px 18px' }}>
                          <p style={{ margin: '0 0 5px', fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,.6)', textTransform: 'uppercase', letterSpacing: '.1em' }}>Answer</p>
                          <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#fff', lineHeight: 1.55 }}>{answerText}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
