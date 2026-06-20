import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import BottomNav from '@/components/BottomNav'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  if (!profile) redirect('/onboarding')

  const { data: allSessions } = await supabase
    .from('quiz_sessions')
    .select('score, question_ids, xp_earned, started_at')
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })

  const recentSessions = allSessions?.slice(0, 4) ?? []
  const totalAnswered = allSessions?.reduce((acc, s) => acc + (s.question_ids?.length ?? 0), 0) ?? 0
  const totalCorrect  = allSessions?.reduce((acc, s) => acc + (s.score ?? 0), 0) ?? 0
  const avgAccuracy   = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : null

  let topicStats: { topic: string; total: number; correct: number; accuracy: number }[] = []
  const { data: historyRows } = await supabase
    .from('user_question_history')
    .select('topic, was_correct')
    .eq('user_id', user.id)
    .eq('question_type', 'mcq')

  if (historyRows && historyRows.length > 0) {
    const topicMap = new Map<string, { total: number; correct: number }>()
    for (const row of historyRows) {
      if (!row.topic) continue
      const entry = topicMap.get(row.topic) ?? { total: 0, correct: 0 }
      entry.total += 1
      if (row.was_correct) entry.correct += 1
      topicMap.set(row.topic, entry)
    }
    topicStats = Array.from(topicMap.entries())
      .map(([topic, { total, correct }]) => ({
        topic, total, correct,
        accuracy: Math.round((correct / total) * 100),
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6)
  }

  const initials = profile.full_name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? 'SK'

  const XP_PER_LEVEL = 400
  const xpIntoCurrentLevel = profile.xp % XP_PER_LEVEL
  const xpToNextLevel = XP_PER_LEVEL - xpIntoCurrentLevel
  const xpProgress = (xpIntoCurrentLevel / XP_PER_LEVEL) * 100

  const todayStr = new Date().toISOString().split('T')[0]
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  const lastActiveStr = profile.last_active_date ?? ''
  const effectiveStreak = (lastActiveStr === todayStr || lastActiveStr === yesterdayStr)
    ? (profile.current_streak ?? 0) : 0
  const streakDoneToday = lastActiveStr === todayStr

  const greetingHour = new Date().getHours()
  const greeting = greetingHour < 12 ? 'Good morning' : greetingHour < 17 ? 'Good afternoon' : 'Good evening'

  function topicColor(accuracy: number) {
    if (accuracy >= 70) return 'var(--green)'
    if (accuracy >= 50) return 'var(--amber)'
    return 'var(--red)'
  }

  async function handleLogout() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  const P = { padding: 'clamp(18px,3.5vw,38px)' }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <BottomNav />

      <div style={{ maxWidth: 1140, margin: '0 auto', padding: `clamp(18px,3.5vw,38px) clamp(16px,3.5vw,38px) 100px` }}>

        {/* ── Greeting row ─────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
          <div>
            <p style={{ margin: '0 0 3px', fontSize: 15, color: 'var(--text-soft)', fontWeight: 600 }}>{greeting},</p>
            <h1 style={{ margin: 0, fontSize: 'clamp(26px,3vw,32px)', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.025em' }}>
              {profile.full_name} 👋
            </h1>
          </div>
          {effectiveStreak > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--coral-tint)', color: 'var(--coral-deep)', padding: '9px 15px', borderRadius: 999, fontWeight: 800, fontSize: 14 }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5c.9 2.8-1.2 4-1.2 6.2A1.4 1.4 0 0 0 12 10a1.3 1.3 0 0 0 1.3-1.3c0-.6.3-1 .3-1 1.6 1.4 3.4 3.3 3.4 6.3a5 5 0 0 1-10 0c0-3.2 2.4-5.4 5-12z"/></svg>
              {effectiveStreak}-day streak
            </div>
          )}
        </div>

        {/* ── XP / Level banner ────────────────────────────────────────── */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, boxShadow: 'var(--shadow)', padding: 22, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 13 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <div style={{ width: 42, height: 42, borderRadius: 13, background: 'var(--teal-tint)', color: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 4.5 13.5a.7.7 0 0 0 .56 1.12H10l-1 7.4 8.5-11.5a.7.7 0 0 0-.56-1.12H12z"/></svg>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>Level {profile.level}</p>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-faint)', fontWeight: 600 }}>{profile.profession}{profile.study_year ? ` · Year ${profile.study_year}` : ''}</p>
              </div>
            </div>
            <span style={{ fontSize: 14, color: 'var(--text-soft)', fontWeight: 700 }}>{xpIntoCurrentLevel} / {XP_PER_LEVEL} XP</span>
          </div>
          <div style={{ height: 11, background: 'var(--surface-3)', borderRadius: 999, overflow: 'hidden' }}>
            <div className="progress-bar" style={{ height: '100%', borderRadius: 999, background: 'linear-gradient(90deg,var(--teal),var(--teal-deep))', width: `${xpProgress}%` }} />
          </div>
          <p style={{ margin: '9px 0 0', fontSize: 13, color: 'var(--text-faint)', fontWeight: 600 }}>{xpToNextLevel} XP to Level {profile.level + 1}</p>
        </div>

        {/* ── Streak status card ───────────────────────────────────────── */}
        {streakDoneToday ? (
          <div style={{
            background: 'linear-gradient(135deg, #0f4a3a 0%, #0d3d31 100%)',
            border: '1.5px solid var(--teal)',
            borderRadius: 20, padding: '18px 22px', marginBottom: 20,
            display: 'flex', alignItems: 'center', gap: 16,
          }}>
            {/* Flame with checkmark */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <svg width="44" height="44" viewBox="0 0 24 24" fill="#f97316"><path d="M12 2.5c.9 2.8-1.2 4-1.2 6.2A1.4 1.4 0 0 0 12 10a1.3 1.3 0 0 0 1.3-1.3c0-.6.3-1 .3-1 1.6 1.4 3.4 3.3 3.4 6.3a5 5 0 0 1-10 0c0-3.2 2.4-5.4 5-12z"/></svg>
              <div style={{
                position: 'absolute', bottom: -2, right: -4,
                width: 18, height: 18, borderRadius: '50%',
                background: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid #0d3d31',
              }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5 10 17l9-10"/></svg>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--teal)' }}>
                Streak secured! {effectiveStreak > 0 ? `${effectiveStreak} days 🔥` : 'Nice work!'}
              </p>
              <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--text-soft)', fontWeight: 600 }}>
                You&apos;ve already studied today — keep it up tomorrow.
              </p>
            </div>
          </div>
        ) : (
          <div style={{
            background: 'linear-gradient(135deg, #3d2200 0%, #2e1a00 100%)',
            border: '1.5px solid var(--amber)',
            borderRadius: 20, padding: '18px 22px', marginBottom: 20,
            display: 'flex', alignItems: 'center', gap: 16,
          }}>
            {/* Greyed-out flame with X */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <svg width="44" height="44" viewBox="0 0 24 24" fill="#6b5030"><path d="M12 2.5c.9 2.8-1.2 4-1.2 6.2A1.4 1.4 0 0 0 12 10a1.3 1.3 0 0 0 1.3-1.3c0-.6.3-1 .3-1 1.6 1.4 3.4 3.3 3.4 6.3a5 5 0 0 1-10 0c0-3.2 2.4-5.4 5-12z"/></svg>
              <div style={{
                position: 'absolute', bottom: -2, right: -4,
                width: 18, height: 18, borderRadius: '50%',
                background: 'var(--amber)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid #2e1a00',
              }}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--amber)' }}>
                {effectiveStreak > 0 ? `Don't break your ${effectiveStreak}-day streak!` : 'Start your streak today!'}
              </p>
              <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--text-soft)', fontWeight: 600 }}>
                You haven&apos;t studied yet today. One session is all it takes.
              </p>
            </div>
            <Link href="/practice/mcq" style={{
              flexShrink: 0, textDecoration: 'none',
              background: 'var(--amber)', color: '#1a0d00',
              fontWeight: 800, fontSize: 13, padding: '9px 16px',
              borderRadius: 999, whiteSpace: 'nowrap',
            }}>Study now →</Link>
          </div>
        )}

        {/* ── Two-column grid ──────────────────────────────────────────── */}
        <div className="dash-grid">

          {/* Col 1 / Start studying */}
          <div className="dash-studying">
            <h2 style={{ margin: '0 0 13px', fontSize: 15, fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Start studying</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 13 }}>
              {[
                { label: 'MCQs', href: '/practice/mcq', bg: 'var(--teal-tint)', fg: 'var(--teal)', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6.5h11M9 12h11M9 17.5h11"/><path d="M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01"/></svg> },
                { label: 'Flashcards', href: '/practice/flashcards', bg: 'var(--coral-tint)', fg: 'var(--coral-deep)', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="7.5" width="13.5" height="12" rx="2.5"/><path d="M7 7.5V6a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-1.5"/></svg> },
                { label: 'Cases', href: '/practice/cases', bg: 'var(--amber-tint)', fg: 'var(--amber)', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="4" width="14" height="17" rx="2.5"/><path d="M9 4.5V3.6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v.9"/><path d="M8 13h2l1-2 1.6 4 1-2h1.4"/></svg> },
                { label: 'Bookmarks', href: '/bookmarks', bg: 'var(--surface-3)', fg: 'var(--text-soft)', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M7 4h10a1 1 0 0 1 1 1v15.5l-6-4-6 4V5a1 1 0 0 1 1-1z"/></svg> },
              ].map(({ label, href, bg, fg, icon }) => (
                <Link key={label} href={href} className="dash-mode-card" style={{
                  textDecoration: 'none', textAlign: 'left', cursor: 'pointer',
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 18, boxShadow: 'var(--shadow)', padding: 18,
                  display: 'flex', flexDirection: 'column', gap: 14,
                }}>
                  <div style={{ width: 44, height: 44, borderRadius: 13, background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {icon}
                  </div>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{label}</p>
                </Link>
              ))}
            </div>
          </div>

          {/* Col 1 / Recent activity */}
          <div className="dash-activity">
            <h2 style={{ margin: '0 0 13px', fontSize: 15, fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Recent activity</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recentSessions.length > 0 ? recentSessions.map((session, i) => (
                <div key={i} className="dash-activity-row" style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 16, boxShadow: 'var(--shadow)',
                  padding: '15px 17px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14,
                }}>
                  <div style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--teal-tint)', color: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5 10 17l9-10"/></svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>Quiz session</p>
                    <p style={{ margin: '1px 0 0', fontSize: 13, color: 'var(--text-faint)', fontWeight: 600 }}>{session.score}/{session.question_ids?.length} correct</p>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--coral)' }}>+{session.xp_earned} XP</span>
                </div>
              )) : (
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 17px' }}>
                  <p style={{ margin: 0, fontSize: 14, color: 'var(--text-faint)', fontWeight: 600 }}>No sessions yet — start a quiz to see your history!</p>
                </div>
              )}
            </div>
          </div>

          {/* Col 2 / Stats */}
          <div className="dash-stats">
            <h2 style={{ margin: '0 0 13px', fontSize: 15, fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Your stats</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
              {[
                { val: totalAnswered,                                       label: 'Questions',     color: 'var(--teal)' },
                { val: avgAccuracy !== null ? `${avgAccuracy}%` : '—',      label: 'Avg accuracy',  color: 'var(--green)' },
                { val: `${effectiveStreak}d`,                               label: 'Current streak',color: 'var(--coral)' },
                { val: `${profile.longest_streak ?? 0}d`,                   label: 'Longest',       color: 'var(--text)' },
              ].map(s => (
                <div key={s.label} className="dash-stat-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, boxShadow: 'var(--shadow)', padding: 17 }}>
                  <p style={{ margin: 0, fontSize: 27, fontWeight: 900, color: s.color, letterSpacing: '-0.02em' }}>{s.val}</p>
                  <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--text-faint)', fontWeight: 600 }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Col 2 / Topic performance */}
          {topicStats.length > 0 && (
            <div className="dash-topics">
              <h2 style={{ margin: '0 0 13px', fontSize: 15, fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Topic performance</h2>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, boxShadow: 'var(--shadow)', padding: 18, display: 'flex', flexDirection: 'column', gap: 15 }}>
                {topicStats.map(({ topic, accuracy }) => (
                  <div key={topic}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{topic}</span>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: topicColor(accuracy), flexShrink: 0, marginLeft: 10 }}>{accuracy}%</span>
                    </div>
                    <div style={{ height: 7, background: 'var(--surface-3)', borderRadius: 999, overflow: 'hidden' }}>
                      <div className="progress-bar" style={{ height: '100%', borderRadius: 999, width: `${accuracy}%`, background: topicColor(accuracy) }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Sign out ─────────────────────────────────────────────────── */}
        <form action={handleLogout} style={{ marginTop: 32 }}>
          <button type="submit" style={{
            width: '100%', maxWidth: 300, display: 'block', margin: '0 auto',
            padding: '14px', borderRadius: 999,
            background: 'transparent', border: '1.5px solid var(--border-strong)',
            color: 'var(--red)', fontSize: 15, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'inherit',
          }}>
            Sign out
          </button>
        </form>
      </div>

      {/* ── Dashboard grid layout ─────────────────────────────────────── */}
      <style>{`
        .dash-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
        }
        @media (min-width: 820px) {
          .dash-grid {
            grid-template-columns: 1.5fr 1fr;
          }
          .dash-studying  { grid-column: 1; grid-row: 1; }
          .dash-activity  { grid-column: 1; grid-row: 2; }
          .dash-stats     { grid-column: 2; grid-row: 1; }
          .dash-topics    { grid-column: 2; grid-row: 2; }
        }
        .dash-mode-card {
          transition: transform .24s cubic-bezier(.2,.75,.25,1), box-shadow .24s ease, border-color .24s ease;
        }
        .dash-mode-card:hover {
          transform: translateY(-5px);
          box-shadow: var(--shadow-lg);
          border-color: var(--teal) !important;
        }
        .dash-activity-row {
          transition: transform .24s cubic-bezier(.2,.75,.25,1), box-shadow .24s ease, border-color .24s ease;
        }
        .dash-activity-row:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-lg);
          border-color: var(--teal) !important;
        }
        .dash-stat-card {
          transition: transform .22s cubic-bezier(.2,.75,.25,1), box-shadow .22s ease;
        }
        .dash-stat-card:hover {
          transform: translateY(-3px);
          box-shadow: var(--shadow-lg);
        }
      `}</style>
    </div>
  )
}
