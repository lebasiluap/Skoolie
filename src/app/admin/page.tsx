import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// ── Tiny shared components ────────────────────────────────────────────────────

function StatCard({ label, value, sub, color, pill }: {
  label: string
  value: string | number
  sub?: string
  color?: string
  pill?: { text: string; color: string; bg: string }
}) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, boxShadow: 'var(--shadow)', padding: '18px 20px' }}>
      <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.1em' }}>{label}</p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <p style={{ margin: 0, fontSize: 28, fontWeight: 900, color: color ?? 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</p>
        {pill && <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 999, background: pill.bg, color: pill.color }}>{pill.text}</span>}
      </div>
      {sub && <p style={{ margin: '5px 0 0', fontSize: 12, color: 'var(--text-faint)', fontWeight: 600 }}>{sub}</p>}
    </div>
  )
}

function Section({ title }: { title: string }) {
  return <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.1em' }}>{title}</p>
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, boxShadow: 'var(--shadow)', overflow: 'hidden', ...style }}>
      {children}
    </div>
  )
}

function Row({ children, last }: { children: React.ReactNode; last?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '12px 18px', borderBottom: last ? 'none' : '1px solid var(--border)' }}
      className="admin-table-row">
      {children}
    </div>
  )
}

function MiniBar({ value, max, color = 'var(--teal)' }: { value: number; max: number; color?: string }) {
  return (
    <div style={{ height: 4, borderRadius: 999, background: 'var(--surface-3)', overflow: 'hidden', flex: 1, margin: '0 10px' }}>
      <div style={{ height: '100%', background: color, borderRadius: 999, width: `${Math.max(2, (value / Math.max(max, 1)) * 100)}%` }} />
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default async function AdminDashboard() {
  const supabase = await createClient()

  const now = new Date()
  const onlineThreshold = new Date(now.getTime() - 5 * 60 * 1000).toISOString()
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
  const todayISO = todayStart.toISOString()
  const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const monthStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const twoWeeksStart = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
  const twentyFourHAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const [
    // Users
    { data: profiles },
    { data: onlineUsers },
    { data: recentSignups },
    // Content counts
    { count: totalQuestions },
    { count: totalCases },
    { count: totalBookmarks },
    // Page views
    { data: pageViewsToday },
    { data: pageViewsWeek },
    { data: pageViewsTotal },
    { data: hourlyViews },
    // Answer history — full & sliced for performance
    { data: allAnswers },
    { data: answersThisWeek },
    { data: answersToday },
    { data: answersLast14d },
    { data: answersByTopic },
  ] = await Promise.all([
    // Users
    supabase.from('user_profiles').select('*').order('created_at', { ascending: false }),
    supabase.from('user_profiles').select('full_name, email, last_seen_at').gte('last_seen_at', onlineThreshold),
    supabase.from('user_profiles').select('full_name, email, profession, study_year, level, created_at').gte('created_at', monthStart).order('created_at', { ascending: false }),
    // Content
    supabase.from('questions').select('id', { count: 'exact', head: true }),
    supabase.from('case_studies').select('id', { count: 'exact', head: true }),
    supabase.from('bookmarks').select('id', { count: 'exact', head: true }),
    // Page views
    supabase.from('page_views').select('id', { count: 'exact' }).gte('created_at', todayISO),
    supabase.from('page_views').select('id', { count: 'exact' }).gte('created_at', weekStart),
    supabase.from('page_views').select('id', { count: 'exact' }),
    supabase.from('page_views').select('created_at').gte('created_at', twentyFourHAgo),
    // Answers — lightweight selects only
    supabase.from('user_question_history').select('user_id, was_correct, topic, question_type, difficulty'),
    supabase.from('user_question_history').select('user_id, was_correct').gte('answered_at', weekStart),
    supabase.from('user_question_history').select('user_id').gte('answered_at', todayISO),
    supabase.from('user_question_history').select('answered_at, was_correct').gte('answered_at', twoWeeksStart),
    supabase.from('user_question_history').select('topic, was_correct').gte('answered_at', monthStart),
  ])

  // ── Aggregate: users ──────────────────────────────────────────────────────
  const totalUsers = profiles?.length ?? 0
  const onlineNow = onlineUsers?.length ?? 0
  const dauToday = new Set((answersToday ?? []).map(r => r.user_id)).size

  const profCounts: Record<string, number> = {}
  const yearCounts: Record<string, number> = {}
  let totalXP = 0, totalStreak = 0, usersWithStreak = 0, maxStreak = 0

  for (const p of profiles ?? []) {
    profCounts[p.profession ?? 'unknown'] = (profCounts[p.profession ?? 'unknown'] ?? 0) + 1
    yearCounts[p.study_year ?? 'unknown'] = (yearCounts[p.study_year ?? 'unknown'] ?? 0) + 1
    totalXP += p.xp ?? 0
    if ((p.current_streak ?? 0) > 0) {
      totalStreak += p.current_streak
      usersWithStreak++
    }
    if ((p.longest_streak ?? 0) > maxStreak) maxStreak = p.longest_streak ?? 0
  }
  const avgXP = totalUsers > 0 ? Math.round(totalXP / totalUsers) : 0
  const avgStreak = usersWithStreak > 0 ? (totalStreak / usersWithStreak).toFixed(1) : '0'

  // ── Aggregate: signups per day (last 30d) ─────────────────────────────────
  const signupsByDay: Record<string, number> = {}
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000)
    signupsByDay[d.toISOString().slice(0, 10)] = 0
  }
  for (const p of recentSignups ?? []) {
    const day = new Date(p.created_at).toISOString().slice(0, 10)
    if (signupsByDay[day] !== undefined) signupsByDay[day]++
  }

  // ── Aggregate: answers ────────────────────────────────────────────────────
  const totalAnswers = allAnswers?.length ?? 0
  const correctAnswers = (allAnswers ?? []).filter(r => r.was_correct).length
  const correctRate = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0
  const weeklyAnswers = answersThisWeek?.length ?? 0
  const dauAnswering = new Set((answersToday ?? []).map(r => r.user_id)).size

  // Correct rate by topic
  const topicStats: Record<string, { total: number; correct: number }> = {}
  for (const r of answersByTopic ?? []) {
    if (!r.topic) continue
    if (!topicStats[r.topic]) topicStats[r.topic] = { total: 0, correct: 0 }
    topicStats[r.topic].total++
    if (r.was_correct) topicStats[r.topic].correct++
  }
  const topicPerf = Object.entries(topicStats)
    .map(([topic, s]) => ({ topic, rate: Math.round((s.correct / s.total) * 100), total: s.total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 12)

  // Correct rate by difficulty
  const diffStats: Record<string, { total: number; correct: number }> = {}
  for (const r of allAnswers ?? []) {
    if (!r.difficulty) continue
    if (!diffStats[r.difficulty]) diffStats[r.difficulty] = { total: 0, correct: 0 }
    diffStats[r.difficulty].total++
    if (r.was_correct) diffStats[r.difficulty].correct++
  }

  // Correct rate by question type
  const typeStats: Record<string, { total: number; correct: number }> = {}
  for (const r of allAnswers ?? []) {
    if (!r.question_type) continue
    if (!typeStats[r.question_type]) typeStats[r.question_type] = { total: 0, correct: 0 }
    typeStats[r.question_type].total++
    if (r.was_correct) typeStats[r.question_type].correct++
  }

  // Most active users (all time)
  const userActivity: Record<string, number> = {}
  for (const r of allAnswers ?? []) {
    if (r.user_id) userActivity[r.user_id] = (userActivity[r.user_id] ?? 0) + 1
  }
  const topActiveUsers = Object.entries(userActivity)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([uid, count]) => {
      const p = profiles?.find(p => p.id === uid)
      return { name: p?.full_name ?? 'Unknown', email: p?.email ?? '', count, streak: p?.current_streak ?? 0, xp: p?.xp ?? 0 }
    })

  // ── Aggregate: answers per day (last 14d) ─────────────────────────────────
  const answersByDay: Record<string, { total: number; correct: number }> = {}
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)
    answersByDay[d] = { total: 0, correct: 0 }
  }
  for (const r of answersLast14d ?? []) {
    const day = new Date(r.answered_at).toISOString().slice(0, 10)
    if (answersByDay[day]) {
      answersByDay[day].total++
      if (r.was_correct) answersByDay[day].correct++
    }
  }
  const maxDayAnswers = Math.max(...Object.values(answersByDay).map(d => d.total), 1)

  // ── Aggregate: hourly traffic ─────────────────────────────────────────────
  const hourlyCounts: Record<number, number> = {}
  for (const r of hourlyViews ?? []) {
    const h = new Date(r.created_at).getHours()
    hourlyCounts[h] = (hourlyCounts[h] ?? 0) + 1
  }
  const peakHour = Object.entries(hourlyCounts).sort((a, b) => b[1] - a[1])[0]
  const maxHour = Math.max(...Object.values(hourlyCounts), 1)

  // ── Aggregate: questions per topic (from DB) ──────────────────────────────
  const { data: qPerTopic } = await supabase
    .from('questions')
    .select('topic, question_type')

  const topicContent: Record<string, { mcq: number; flashcard: number; total: number }> = {}
  for (const q of qPerTopic ?? []) {
    if (!q.topic) continue
    if (!topicContent[q.topic]) topicContent[q.topic] = { mcq: 0, flashcard: 0, total: 0 }
    topicContent[q.topic].total++
    if (q.question_type === 'mcq') topicContent[q.topic].mcq++
    if (q.question_type === 'flashcard') topicContent[q.topic].flashcard++
  }
  const sortedContent = Object.entries(topicContent).sort((a, b) => b[1].total - a[1].total)
  const maxTopicTotal = sortedContent[0]?.[1]?.total ?? 1

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: 'clamp(20px,3vw,36px) clamp(16px,3vw,32px)', maxWidth: 1300, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.02em' }}>Dashboard</h1>
        <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--text-faint)', fontWeight: 600 }}>
          Live analytics · {new Date().toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' })}
        </p>
      </div>

      {/* ── Key Metrics ──────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(155px,1fr))', gap: 12, marginBottom: 32 }}>
        <StatCard label="Total Users" value={totalUsers} color="var(--teal)" sub={`avg XP: ${avgXP.toLocaleString()}`} />
        <StatCard label="Online Now" value={onlineNow} sub="last 5 min" color="var(--green)"
          pill={onlineNow > 0 ? { text: 'LIVE', color: 'var(--green)', bg: 'var(--green-tint)' } : undefined} />
        <StatCard label="Active Today" value={dauToday} sub="answered a question" />
        <StatCard label="New (30d)" value={recentSignups?.length ?? 0} color="var(--coral)" />
        <StatCard label="Total Answers" value={totalAnswers.toLocaleString()} sub={`${weeklyAnswers} this week`} />
        <StatCard label="Correct Rate" value={`${correctRate}%`} color={correctRate >= 60 ? 'var(--green)' : correctRate >= 40 ? 'var(--amber)' : 'var(--red)'}
          sub={`${correctAnswers.toLocaleString()} / ${totalAnswers.toLocaleString()}`} />
        <StatCard label="Views Today" value={pageViewsToday?.length ?? 0} sub={`${pageViewsTotal?.length ?? 0} all time`} />
        <StatCard label="Views/Week" value={pageViewsWeek?.length ?? 0} />
        <StatCard label="Total Questions" value={(totalQuestions ?? 0).toLocaleString()} />
        <StatCard label="Case Studies" value={totalCases ?? 0} />
        <StatCard label="Bookmarks" value={totalBookmarks ?? 0} />
        <StatCard label="Avg Streak" value={avgStreak} sub={`max: ${maxStreak}d · ${usersWithStreak} active`} />
      </div>

      {/* ── Charts: Answers per day + Signups per day ─────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 20, marginBottom: 28 }}>

        {/* Answer volume chart */}
        <div>
          <Section title="Answers per Day (last 14 days)" />
          <Card style={{ padding: '18px 18px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 80, marginBottom: 10 }}>
              {Object.entries(answersByDay).map(([day, data]) => {
                const barH = maxDayAnswers > 0 ? Math.max((data.total / maxDayAnswers) * 100, data.total > 0 ? 4 : 0) : 0
                const correctH = data.total > 0 ? (data.correct / data.total) * barH : 0
                const label = new Date(day + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                return (
                  <div key={day} title={`${label}: ${data.total} answers (${data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0}% correct)`}
                    style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', cursor: 'default' }}>
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: `${barH}%`, borderRadius: '4px 4px 0 0', overflow: 'hidden', minHeight: data.total > 0 ? 4 : 0 }}>
                      <div style={{ height: `${correctH > 0 ? (correctH / barH) * 100 : 0}%`, background: 'var(--green)', opacity: 0.85 }} />
                      <div style={{ flex: 1, background: 'var(--red)', opacity: 0.6 }} />
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              {Object.keys(answersByDay).filter((_, i) => i % 2 === 0).map(day => (
                <span key={day} style={{ fontSize: 9.5, color: 'var(--text-faint)', fontWeight: 700 }}>
                  {new Date(day + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-faint)', fontWeight: 700 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--green)', display: 'inline-block' }} />Correct
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-faint)', fontWeight: 700 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--red)', opacity: 0.6, display: 'inline-block' }} />Incorrect
              </span>
            </div>
          </Card>
        </div>

        {/* Signups per day */}
        <div>
          <Section title="New Signups per Day (last 30 days)" />
          <Card style={{ padding: '18px 18px 14px' }}>
            {(() => {
              const vals = Object.values(signupsByDay)
              const maxVal = Math.max(...vals, 1)
              return (
                <>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 80, marginBottom: 10 }}>
                    {Object.entries(signupsByDay).map(([day, count]) => {
                      const h = Math.max((count / maxVal) * 100, count > 0 ? 5 : 0)
                      return (
                        <div key={day} title={`${day}: ${count} signups`}
                          style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%', cursor: 'default' }}>
                          <div style={{ width: '100%', height: `${h}%`, background: 'var(--coral)', borderRadius: '3px 3px 0 0', minHeight: count > 0 ? 3 : 0, opacity: 0.85 }} />
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    {Object.keys(signupsByDay).filter((_, i) => i % 6 === 0).map(day => (
                      <span key={day} style={{ fontSize: 9.5, color: 'var(--text-faint)', fontWeight: 700 }}>
                        {new Date(day + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                    ))}
                  </div>
                </>
              )
            })()}
          </Card>
        </div>
      </div>

      {/* ── Performance Analytics ──────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 20, marginBottom: 28 }}>

        {/* Correct rate by topic */}
        <div>
          <Section title="Correct Rate by Topic (30d)" />
          <Card>
            {topicPerf.length > 0 ? topicPerf.map((t, i) => (
              <div key={t.topic} style={{ display: 'flex', alignItems: 'center', padding: '10px 18px', borderBottom: i < topicPerf.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <span style={{ fontSize: 11, color: 'var(--text-faint)', fontWeight: 700, width: 18, flexShrink: 0 }}>{i + 1}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', minWidth: 100, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.topic}</span>
                <MiniBar value={t.rate} max={100} color={t.rate >= 70 ? 'var(--green)' : t.rate >= 50 ? 'var(--amber)' : 'var(--red)'} />
                <span style={{ fontSize: 12, fontWeight: 800, color: t.rate >= 70 ? 'var(--green)' : t.rate >= 50 ? 'var(--amber)' : 'var(--red)', width: 36, textAlign: 'right', flexShrink: 0 }}>{t.rate}%</span>
                <span style={{ fontSize: 11, color: 'var(--text-faint)', fontWeight: 600, marginLeft: 6, flexShrink: 0 }}>({t.total})</span>
              </div>
            )) : (
              <p style={{ padding: '32px 18px', textAlign: 'center', fontSize: 13, color: 'var(--text-faint)', fontWeight: 600 }}>No activity yet</p>
            )}
          </Card>
        </div>

        {/* Difficulty + Type performance */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <Section title="Correct Rate by Difficulty" />
            <Card>
              {['easy', 'medium', 'hard'].map((d, i, arr) => {
                const s = diffStats[d]
                const rate = s ? Math.round((s.correct / s.total) * 100) : 0
                const colorMap: Record<string, string> = { easy: 'var(--green)', medium: 'var(--amber)', hard: 'var(--red)' }
                return (
                  <Row key={d} last={i === arr.length - 1}>
                    <span style={{ width: 60, fontSize: 13, fontWeight: 700, color: 'var(--text)', textTransform: 'capitalize' }}>{d}</span>
                    <MiniBar value={rate} max={100} color={colorMap[d]} />
                    <span style={{ fontSize: 13, fontWeight: 800, color: colorMap[d], width: 38, textAlign: 'right' }}>{s ? `${rate}%` : '—'}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-faint)', fontWeight: 600, marginLeft: 6, width: 50, textAlign: 'right' }}>{s?.total ?? 0} ans</span>
                  </Row>
                )
              })}
            </Card>
          </div>

          <div>
            <Section title="Correct Rate by Question Type" />
            <Card>
              {(['mcq', 'flashcard'] as const).map((t, i, arr) => {
                const s = typeStats[t]
                const rate = s ? Math.round((s.correct / s.total) * 100) : 0
                const label = t === 'mcq' ? 'MCQ' : 'Flashcard'
                return (
                  <Row key={t} last={i === arr.length - 1}>
                    <span style={{ width: 80, fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{label}</span>
                    <MiniBar value={rate} max={100} />
                    <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--teal)', width: 38, textAlign: 'right' }}>{s ? `${rate}%` : '—'}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-faint)', fontWeight: 600, marginLeft: 6, width: 50, textAlign: 'right' }}>{s?.total ?? 0} ans</span>
                  </Row>
                )
              })}
            </Card>
          </div>

          <div>
            <Section title="Hourly Traffic (last 24h)" />
            <Card style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 56 }}>
                {Array.from({ length: 24 }, (_, h) => {
                  const count = hourlyCounts[h] ?? 0
                  return (
                    <div key={h} title={`${h}:00 — ${count} views`}
                      style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ width: '100%', background: 'var(--teal)', borderRadius: '3px 3px 0 0', height: `${(count / maxHour) * 100}%`, minHeight: count > 0 ? 2 : 0, opacity: 0.8 }} />
                    </div>
                  )
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                {['0h', '6h', '12h', '18h', '23h'].map(t => (
                  <span key={t} style={{ fontSize: 10, color: 'var(--text-faint)', fontWeight: 700 }}>{t}</span>
                ))}
              </div>
              {peakHour && (
                <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--text-faint)', fontWeight: 600 }}>
                  Peak: <strong style={{ color: 'var(--text)' }}>{peakHour[0]}:00</strong> · {peakHour[1]} views
                </p>
              )}
            </Card>
          </div>
        </div>

        {/* User Demographics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <Section title="Users by Profession" />
            <Card>
              {Object.entries(profCounts).sort((a, b) => b[1] - a[1]).map(([prof, count], i, arr) => (
                <Row key={prof} last={i === arr.length - 1}>
                  <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: 'var(--text)', textTransform: 'capitalize' }}>{prof.replace(/_/g, ' ')}</span>
                  <MiniBar value={count} max={totalUsers} />
                  <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text)', width: 30, textAlign: 'right' }}>{count}</span>
                </Row>
              ))}
            </Card>
          </div>

          <div>
            <Section title="Users by Year of Study" />
            <Card>
              {Object.entries(yearCounts).sort().map(([year, count], i, arr) => (
                <Row key={year} last={i === arr.length - 1}>
                  <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: 'var(--text)', textTransform: 'capitalize' }}>{year.replace('year', 'Year ').replace('practitioner', 'Practitioner')}</span>
                  <MiniBar value={count} max={totalUsers} />
                  <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text)', width: 30, textAlign: 'right' }}>{count}</span>
                </Row>
              ))}
            </Card>
          </div>
        </div>
      </div>

      {/* ── Users: Active + Online ─────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 20, marginBottom: 28 }}>

        <div>
          <Section title="Most Active Users (all time)" />
          <Card>
            {topActiveUsers.length > 0 ? topActiveUsers.map((u, i) => (
              <Row key={i} last={i === topActiveUsers.length - 1}>
                <span style={{ width: 26, height: 26, borderRadius: '50%', background: i === 0 ? 'var(--teal-tint)' : 'var(--surface-3)', color: i === 0 ? 'var(--teal)' : 'var(--text-faint)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0, marginRight: 10 }}>
                  {i + 1}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</p>
                  <p style={{ margin: '1px 0 0', fontSize: 11.5, color: 'var(--text-faint)', fontWeight: 600 }}>{u.email}</p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: 'var(--teal)' }}>{u.count}q</p>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--text-faint)', fontWeight: 600 }}>🔥{u.streak} · {u.xp.toLocaleString()}xp</p>
                </div>
              </Row>
            )) : (
              <p style={{ padding: '32px 18px', textAlign: 'center', fontSize: 13, color: 'var(--text-faint)', fontWeight: 600 }}>No activity yet</p>
            )}
          </Card>
        </div>

        <div>
          <Section title="Online Now (last 5 min)" />
          <Card>
            {onlineUsers && onlineUsers.length > 0 ? onlineUsers.map((u, i) => (
              <Row key={i} last={i === onlineUsers.length - 1}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', marginRight: 12, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>{u.full_name}</p>
                  <p style={{ margin: '1px 0 0', fontSize: 12, color: 'var(--text-faint)', fontWeight: 600 }}>{u.email}</p>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, background: 'var(--green-tint)', color: 'var(--green)', padding: '4px 10px', borderRadius: 999 }}>
                  {u.last_seen_at ? `${Math.round((Date.now() - new Date(u.last_seen_at).getTime()) / 60000)}m ago` : '—'}
                </span>
              </Row>
            )) : (
              <p style={{ padding: '32px 18px', textAlign: 'center', fontSize: 13, color: 'var(--text-faint)', fontWeight: 600 }}>No one online right now</p>
            )}
          </Card>
        </div>
      </div>

      {/* ── Content Coverage ───────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <Section title="Content Library — Questions per Topic" />
        <Card>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Topic', 'MCQs', 'Flashcards', 'Total', 'Distribution'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '11px 16px', fontSize: 11, fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.08em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedContent.map(([topic, counts], i) => (
                  <tr key={topic} style={{ borderBottom: i < sortedContent.length - 1 ? '1px solid var(--border)' : 'none' }} className="admin-table-row">
                    <td style={{ padding: '10px 16px', fontSize: 13.5, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap' }}>{topic}</td>
                    <td style={{ padding: '10px 16px', fontSize: 13, color: 'var(--teal)', fontWeight: 800 }}>{counts.mcq.toLocaleString()}</td>
                    <td style={{ padding: '10px 16px', fontSize: 13, color: '#A855F7', fontWeight: 800 }}>{counts.flashcard.toLocaleString()}</td>
                    <td style={{ padding: '10px 16px', fontSize: 13.5, fontWeight: 900, color: 'var(--text)' }}>{counts.total.toLocaleString()}</td>
                    <td style={{ padding: '10px 16px', minWidth: 160 }}>
                      <div style={{ height: 6, borderRadius: 999, background: 'var(--surface-3)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: 'var(--teal)', borderRadius: 999, width: `${(counts.total / maxTopicTotal) * 100}%`, opacity: 0.85 }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* ── Recent Signups ─────────────────────────────────────────────── */}
      <div>
        <Section title="Recent Signups (30 days)" />
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, boxShadow: 'var(--shadow)', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Name', 'Email', 'Profession', 'Year', 'Level', 'XP', 'Joined'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.08em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(recentSignups ?? []).map((u, i) => (
                <tr key={i} style={{ borderBottom: i < (recentSignups?.length ?? 0) - 1 ? '1px solid var(--border)' : 'none' }} className="admin-table-row">
                  <td style={{ padding: '12px 16px', fontSize: 13.5, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap' }}>{u.full_name}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-soft)', whiteSpace: 'nowrap' }}>{u.email}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-soft)', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>{u.profession?.replace(/_/g, ' ')}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-soft)', whiteSpace: 'nowrap' }}>{u.study_year?.replace('year', 'Yr ').replace('practitioner', 'Pract.') ?? '—'}</td>
                  <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                    <span style={{ fontSize: 12, fontWeight: 800, background: 'var(--teal-tint)', color: 'var(--teal)', padding: '3px 9px', borderRadius: 999 }}>Lv {u.level}</span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap' }}>{(u as any).xp?.toLocaleString() ?? '0'}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-faint)', fontWeight: 600, whiteSpace: 'nowrap' }}>{new Date(u.created_at).toLocaleDateString('en-GB')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`.admin-table-row:hover { background: var(--surface-2); }`}</style>
    </div>
  )
}
