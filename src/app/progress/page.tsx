import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import BottomNav from '@/components/BottomNav'

function getLeague(xp: number) {
  if (xp >= 4000) return { label: 'Diamond', icon: '💎' }
  if (xp >= 1500) return { label: 'Gold',    icon: '🏆' }
  if (xp >= 500)  return { label: 'Silver',  icon: '🥈' }
  return              { label: 'Bronze',  icon: '🥉' }
}

function topicColor(accuracy: number) {
  if (accuracy >= 70) return 'var(--green)'
  if (accuracy >= 50) return 'var(--amber)'
  return 'var(--red)'
}

function rankBadgeStyle(rank: number) {
  if (rank === 1) return { bg: 'var(--gold)',    color: '#fff' }
  if (rank === 2) return { bg: '#A6AEB3',         color: '#fff' }
  if (rank === 3) return { bg: '#C0835A',         color: '#fff' }
  return               { bg: 'var(--surface-3)', color: 'var(--text-faint)' }
}

export default async function ProgressPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  if (!profile) redirect('/onboarding')

  const { data: topUsers } = await supabase
    .from('user_profiles')
    .select('id, full_name, xp, level, profession')
    .order('xp', { ascending: false })
    .limit(20)

  // Topic stats for topic mastery
  const { data: historyRows } = await supabase
    .from('user_question_history')
    .select('topic, was_correct')
    .eq('user_id', user.id)
    .eq('question_type', 'mcq')

  let topicStats: { topic: string; accuracy: number }[] = []
  if (historyRows && historyRows.length > 0) {
    const map = new Map<string, { total: number; correct: number }>()
    for (const row of historyRows) {
      if (!row.topic) continue
      const e = map.get(row.topic) ?? { total: 0, correct: 0 }
      e.total += 1
      if (row.was_correct) e.correct += 1
      map.set(row.topic, e)
    }
    topicStats = Array.from(map.entries())
      .map(([topic, { total, correct }]) => ({ topic, accuracy: Math.round((correct / total) * 100) }))
      .sort((a, b) => b.accuracy - a.accuracy)
      .slice(0, 6)
  }

  const league = getLeague(profile.xp)
  const userRank = topUsers ? topUsers.findIndex(u => u.id === user.id) + 1 : 0

  const todayStr = new Date().toISOString().split('T')[0]
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  const lastActiveStr = profile.last_active_date ?? ''
  const effectiveStreak = (lastActiveStr === todayStr || lastActiveStr === yesterdayStr)
    ? (profile.current_streak ?? 0) : 0

  const totalAnswered = profile.xp ? Math.floor(profile.xp / 6) : 0 // rough approximation
  const avgAccuracy = topicStats.length > 0 ? Math.round(topicStats.reduce((s, t) => s + t.accuracy, 0) / topicStats.length) : null

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <BottomNav />

      <div style={{ maxWidth: 1140, margin: '0 auto', padding: 'clamp(18px,3.5vw,38px) clamp(16px,3.5vw,38px) 100px' }}>
        <h1 style={{ margin: '0 0 22px', fontSize: 'clamp(26px,3vw,32px)', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.025em' }}>Your progress</h1>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>

          {/* ── Left column ─────────────────────────────────────────────── */}
          <div style={{ flex: '1 1 440px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Topic mastery */}
            {topicStats.length > 0 && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, boxShadow: 'var(--shadow)', padding: 22 }}>
                <h2 style={{ margin: '0 0 17px', fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>Topic mastery</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {topicStats.map(({ topic, accuracy }) => (
                    <div key={topic}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{topic}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: topicColor(accuracy), flexShrink: 0, marginLeft: 10 }}>{accuracy}%</span>
                      </div>
                      <div style={{ height: 8, background: 'var(--surface-3)', borderRadius: 999, overflow: 'hidden' }}>
                        <div className="progress-bar" style={{ height: '100%', borderRadius: 999, width: `${accuracy}%`, background: topicColor(accuracy) }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Right column ─────────────────────────────────────────────── */}
          <div style={{ flex: '1 1 290px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* League card */}
            <div className="league-card" style={{
              background: 'linear-gradient(150deg,var(--teal),var(--teal-deep))',
              borderRadius: 20, boxShadow: 'var(--shadow)', padding: 24,
              color: '#fff', position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,.1)', top: -70, right: -50 }} />
              <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,.75)', textTransform: 'uppercase', letterSpacing: '.06em', position: 'relative' }}>Current league</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 13, position: 'relative', marginTop: 8 }}>
                <div style={{ width: 54, height: 54, borderRadius: 16, background: 'rgba(255,255,255,.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
                  {league.icon}
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 24, fontWeight: 900, letterSpacing: '-0.02em' }}>{league.label}</p>
                  <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,.8)', fontWeight: 600 }}>
                    {userRank > 0 ? `Rank ${userRank} · ` : ''}{profile.xp} XP
                  </p>
                </div>
              </div>
            </div>

            {/* 2×2 stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
              {[
                { val: totalAnswered, label: 'Total answered', color: 'var(--teal)' },
                { val: avgAccuracy !== null ? `${avgAccuracy}%` : '—', label: 'Accuracy', color: 'var(--green)' },
                { val: `${effectiveStreak}d`, label: 'Streak', color: 'var(--coral)' },
                { val: `L${profile.level}`, label: 'Level', color: 'var(--text)' },
              ].map(s => (
                <div key={s.label} className="dash-stat-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, boxShadow: 'var(--shadow)', padding: 18 }}>
                  <p style={{ margin: 0, fontSize: 26, fontWeight: 900, color: s.color, letterSpacing: '-0.02em' }}>{s.val}</p>
                  <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-faint)', fontWeight: 600 }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Leaderboard (full width) ───────────────────────────────────── */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, boxShadow: 'var(--shadow)', padding: '18px 12px', marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 8px', marginBottom: 10 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>Leaderboard</h2>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-faint)' }}>Top 20 · all-time</span>
          </div>

          {topUsers && topUsers.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {topUsers.map((u, i) => {
                const isMe = u.id === user.id
                const rank = i + 1
                const badge = rankBadgeStyle(rank)
                const initials = u.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) ?? '??'
                return (
                  <Link key={u.id} href={`/users/${u.id}`} className="leaderboard-row"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 13, padding: '11px 12px',
                      borderRadius: 14, textDecoration: 'none',
                      background: isMe ? 'var(--teal-tint)' : 'transparent',
                    }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: badge.bg, color: badge.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
                      {rank <= 3 ? ['🥇','🥈','🥉'][rank - 1] : rank}
                    </div>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: isMe ? 'var(--teal)' : 'var(--surface-3)', color: isMe ? 'var(--on-teal)' : 'var(--text-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
                      {initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: isMe ? 'var(--teal)' : 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {u.full_name}{isMe ? ' (you)' : ''}
                      </p>
                      <p style={{ margin: 0, fontSize: 12, color: 'var(--text-faint)', fontWeight: 600, textTransform: 'capitalize' }}>{u.profession} · Lv.{u.level}</p>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 800, color: isMe ? 'var(--teal)' : 'var(--text-soft)', flexShrink: 0 }}>{u.xp.toLocaleString()} XP</span>
                  </Link>
                )
              })}
            </div>
          ) : (
            <p style={{ padding: '20px 12px', textAlign: 'center', fontSize: 14, color: 'var(--text-faint)', fontWeight: 600 }}>No users yet — be the first!</p>
          )}
        </div>
      </div>

      <style>{`
        .league-card { transition: transform .25s cubic-bezier(.2,.75,.25,1), box-shadow .25s ease; }
        .league-card:hover { transform: translateY(-4px) scale(1.01); box-shadow: var(--shadow-lg); }
        .dash-stat-card { transition: transform .22s cubic-bezier(.2,.75,.25,1), box-shadow .22s ease; }
        .dash-stat-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-lg); }
        .leaderboard-row { transition: transform .18s ease; }
        .leaderboard-row:hover { transform: translateX(5px); }
      `}</style>
    </div>
  )
}
