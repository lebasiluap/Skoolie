import { createClient } from '@/lib/supabase/server'
import { StatCard, Card, Section, Row, MiniBar, PageHeader, PAGE_PAD, thStyle, Chip } from './ui'

export const dynamic = 'force-dynamic'

// ── Types for admin_dashboard_stats() payload ────────────────────────────────
interface DayPoint { day: string; total: number; correct: number }
interface SignupPoint { day: string; n: number }
interface TopicPerf { topic: string; attempts: number; correct: number }
interface TopUser { name: string | null; email: string | null; attempts: number; correct: number; streak: number | null; xp: number | null }
interface TopicContent { topic: string; mcq: number; flashcard: number; total: number }
interface OnlineUser { full_name: string | null; email: string | null; last_seen_at: string }
interface RecentSignup { full_name: string | null; email: string | null; profession: string | null; study_year: string | null; level: number | null; xp: number | null; created_at: string }
interface PerfSlice { attempts: number; correct: number }

interface Stats {
  total_users: number
  online_now: OnlineUser[] | null
  active_today: number
  new_30d: number
  avg_xp: number
  total_attempts: number
  total_correct: number
  attempts_7d: number
  views_today: number
  views_week: number
  views_total: number
  total_questions: number
  total_cases: number
  total_bookmarks: number
  open_reports: number
  reports_by_reason: Record<string, number>
  avg_streak: number
  users_with_streak: number
  max_streak: number
  questions_by_difficulty: Record<string, number>
  questions_by_type: Record<string, number>
  answers_by_day: DayPoint[]
  signups_by_day: SignupPoint[]
  hourly_views_utc: Record<string, number>
  topic_perf_30d: TopicPerf[]
  diff_perf: Record<string, PerfSlice>
  type_perf: Record<string, PerfSlice>
  top_users: TopUser[]
  topic_content: TopicContent[]
  recent_signups: RecentSignup[]
}

const pct = (correct: number, attempts: number) => attempts > 0 ? Math.round((correct / attempts) * 100) : 0
const rateColor = (r: number) => r >= 70 ? 'var(--green)' : r >= 50 ? 'var(--amber)' : 'var(--red)'

/** Fill a continuous day range so the charts show gaps honestly. */
function fillDays<P extends { day: string }, T>(days: number, points: P[], pick: (p: P) => T, empty: T): { day: string; v: T }[] {
  const map = new Map(points.map(p => [p.day, pick(p)]))
  const out: { day: string; v: T }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)
    out.push({ day: d, v: map.get(d) ?? empty })
  }
  return out
}

export default async function AdminDashboard() {
  const supabase = await createClient()

  // All aggregates computed in SQL (exact — a raw-row read caps at 1000 and
  // silently under-reports; page_views crossed that line already).
  const { data, error } = await supabase.rpc('admin_dashboard_stats')
  const s = (data ?? null) as Stats | null

  if (error || !s) {
    return (
      <div style={{ padding: PAGE_PAD, maxWidth: 1300, margin: '0 auto' }}>
        <PageHeader title="Dashboard" sub="Live analytics" />
        <Card style={{ padding: '40px 24px', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--red)' }}>
            Could not load stats{error ? `: ${error.message}` : ''} — refresh to retry.
          </p>
        </Card>
      </div>
    )
  }

  const correctRate = pct(s.total_correct, s.total_attempts)
  const online = s.online_now ?? []

  const answersSeries = fillDays(14, s.answers_by_day, (p: DayPoint) => ({ total: p.total, correct: p.correct }), { total: 0, correct: 0 })
  const maxDayAnswers = Math.max(...answersSeries.map(d => d.v.total), 1)
  const signupSeries = fillDays(30, s.signups_by_day, (p: SignupPoint) => p.n, 0)
  const maxSignups = Math.max(...signupSeries.map(d => d.v), 1)

  const hourly = s.hourly_views_utc ?? {}
  const maxHour = Math.max(...Object.values(hourly), 1)
  const peak = Object.entries(hourly).sort((a, b) => b[1] - a[1])[0]

  const diffCounts = s.questions_by_difficulty ?? {}
  const easyCount = diffCounts.easy ?? 0
  const easyShare = s.total_questions > 0 ? Math.round((easyCount / s.total_questions) * 100) : 0

  const maxTopicTotal = s.topic_content[0]?.total ?? 1
  const fmtDay = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

  return (
    <div style={{ padding: PAGE_PAD, maxWidth: 1300, margin: '0 auto' }}>

      <PageHeader title="Dashboard" sub={`Live analytics · ${new Date().toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' })}`} />

      {/* ── Key Metrics ──────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(155px,1fr))', gap: 12, marginBottom: 32 }}>
        <StatCard label="Total Users" value={s.total_users} color="var(--teal)" sub={`avg XP: ${s.avg_xp.toLocaleString()}`} />
        <StatCard label="Online Now" value={online.length} sub="last 5 min" color="var(--green)"
          pill={online.length > 0 ? { text: 'LIVE', color: 'var(--green)', bg: 'var(--green-tint)' } : undefined} />
        <StatCard label="Active Today" value={s.active_today} sub="answered a question" />
        <StatCard label="New (30d)" value={s.new_30d} color="var(--coral)" />
        <StatCard label="Total Attempts" value={s.total_attempts.toLocaleString()} sub={`${s.attempts_7d.toLocaleString()} this week`} />
        <StatCard label="Correct Rate" value={`${correctRate}%`} color={rateColor(correctRate)}
          sub={`${s.total_correct.toLocaleString()} / ${s.total_attempts.toLocaleString()} attempts`} />
        <StatCard label="Views Today" value={s.views_today.toLocaleString()} sub={`${s.views_total.toLocaleString()} all time`} />
        <StatCard label="Views/Week" value={s.views_week.toLocaleString()} />
        <StatCard label="Total Questions" value={s.total_questions.toLocaleString()} sub={`${(s.questions_by_type.mcq ?? 0).toLocaleString()} MCQ · ${(s.questions_by_type.flashcard ?? 0).toLocaleString()} cards`} />
        <StatCard label="Easy Coverage" value={`${easyShare}%`} color={easyShare >= 30 ? 'var(--green)' : 'var(--amber)'}
          sub={`${easyCount.toLocaleString()} easy · ${(diffCounts.medium ?? 0).toLocaleString()} med · ${(diffCounts.hard ?? 0).toLocaleString()} hard`} />
        <StatCard label="Case Studies" value={s.total_cases.toLocaleString()} />
        <StatCard label="Open Reports" value={s.open_reports} color={s.open_reports > 0 ? 'var(--red)' : 'var(--text)'}
          sub={s.open_reports > 0 ? 'needs review' : 'all clear'}
          pill={s.open_reports > 0 ? { text: 'REVIEW', color: 'var(--red)', bg: 'var(--red-tint)' } : undefined} />
        <StatCard label="Bookmarks" value={s.total_bookmarks.toLocaleString()} />
        <StatCard label="Avg Streak" value={s.avg_streak} sub={`max: ${s.max_streak}d · ${s.users_with_streak} active`} />
      </div>

      {/* ── Charts: Practice activity + Signups ─────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 20, marginBottom: 28 }}>

        <div>
          <Section title="Practice Activity (last 14 days · by last answer)" />
          <Card style={{ padding: '18px 18px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 80, marginBottom: 10 }}>
              {answersSeries.map(({ day, v }) => {
                const barH = Math.max((v.total / maxDayAnswers) * 100, v.total > 0 ? 4 : 0)
                const correctShare = v.total > 0 ? (v.correct / v.total) * 100 : 0
                return (
                  <div key={day} title={`${fmtDay(day)}: ${v.total} questions (${v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0}% correct)`}
                    style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', cursor: 'default' }}>
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: `${barH}%`, borderRadius: '4px 4px 0 0', overflow: 'hidden', minHeight: v.total > 0 ? 4 : 0 }}>
                      <div style={{ height: `${correctShare}%`, background: 'var(--green)', opacity: 0.85 }} />
                      <div style={{ flex: 1, background: 'var(--red)', opacity: 0.6 }} />
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              {answersSeries.filter((_, i) => i % 2 === 0).map(({ day }) => (
                <span key={day} style={{ fontSize: 9.5, color: 'var(--text-faint)', fontWeight: 700 }}>{fmtDay(day)}</span>
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

        <div>
          <Section title="New Signups per Day (last 30 days)" />
          <Card style={{ padding: '18px 18px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 80, marginBottom: 10 }}>
              {signupSeries.map(({ day, v }) => {
                const h = Math.max((v / maxSignups) * 100, v > 0 ? 5 : 0)
                return (
                  <div key={day} title={`${fmtDay(day)}: ${v} signups`}
                    style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%', cursor: 'default' }}>
                    <div style={{ width: '100%', height: `${h}%`, background: 'var(--coral)', borderRadius: '3px 3px 0 0', minHeight: v > 0 ? 3 : 0, opacity: 0.85 }} />
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              {signupSeries.filter((_, i) => i % 6 === 0).map(({ day }) => (
                <span key={day} style={{ fontSize: 9.5, color: 'var(--text-faint)', fontWeight: 700 }}>{fmtDay(day)}</span>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* ── Performance Analytics ──────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 20, marginBottom: 28 }}>

        <div>
          <Section title="Correct Rate by Topic (30d · by attempts)" />
          <Card>
            {s.topic_perf_30d.length > 0 ? s.topic_perf_30d.map((t, i) => {
              const rate = pct(t.correct, t.attempts)
              return (
                <div key={t.topic} style={{ display: 'flex', alignItems: 'center', padding: '10px 18px', borderBottom: i < s.topic_perf_30d.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-faint)', fontWeight: 700, width: 18, flexShrink: 0 }}>{i + 1}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', minWidth: 100, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.topic}</span>
                  <MiniBar value={rate} max={100} color={rateColor(rate)} />
                  <span style={{ fontSize: 12, fontWeight: 800, color: rateColor(rate), width: 36, textAlign: 'right', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{rate}%</span>
                  <span style={{ fontSize: 11, color: 'var(--text-faint)', fontWeight: 600, marginLeft: 6, flexShrink: 0 }}>({t.attempts})</span>
                </div>
              )
            }) : (
              <p style={{ padding: '32px 18px', textAlign: 'center', fontSize: 13, color: 'var(--text-faint)', fontWeight: 600 }}>No activity yet</p>
            )}
          </Card>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <Section title="Correct Rate by Difficulty (all time)" />
            <Card>
              {['easy', 'medium', 'hard'].map((d, i, arr) => {
                const slice = s.diff_perf[d]
                const rate = slice ? pct(slice.correct, slice.attempts) : 0
                const colorMap: Record<string, string> = { easy: 'var(--green)', medium: 'var(--amber)', hard: 'var(--red)' }
                return (
                  <Row key={d} last={i === arr.length - 1}>
                    <span style={{ width: 60, fontSize: 13, fontWeight: 700, color: 'var(--text)', textTransform: 'capitalize' }}>{d}</span>
                    <MiniBar value={rate} max={100} color={colorMap[d]} />
                    <span style={{ fontSize: 13, fontWeight: 800, color: colorMap[d], width: 38, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{slice ? `${rate}%` : '—'}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-faint)', fontWeight: 600, marginLeft: 6, width: 56, textAlign: 'right' }}>{(slice?.attempts ?? 0).toLocaleString()} att</span>
                  </Row>
                )
              })}
            </Card>
          </div>

          <div>
            <Section title="Correct Rate by Question Type (all time)" />
            <Card>
              {(['mcq', 'flashcard'] as const).map((t, i, arr) => {
                const slice = s.type_perf[t]
                const rate = slice ? pct(slice.correct, slice.attempts) : 0
                return (
                  <Row key={t} last={i === arr.length - 1}>
                    <span style={{ width: 80, fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{t === 'mcq' ? 'MCQ' : 'Flashcard'}</span>
                    <MiniBar value={rate} max={100} />
                    <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--teal)', width: 38, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{slice ? `${rate}%` : '—'}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-faint)', fontWeight: 600, marginLeft: 6, width: 56, textAlign: 'right' }}>{(slice?.attempts ?? 0).toLocaleString()} att</span>
                  </Row>
                )
              })}
            </Card>
          </div>

          <div>
            <Section title="Hourly Traffic (last 24h · UTC)" />
            <Card style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 56 }}>
                {Array.from({ length: 24 }, (_, h) => {
                  const count = hourly[String(h)] ?? 0
                  return (
                    <div key={h} title={`${h}:00 UTC — ${count} views`}
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
              {peak && (
                <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--text-faint)', fontWeight: 600 }}>
                  Peak: <strong style={{ color: 'var(--text)' }}>{peak[0]}:00 UTC</strong> · {peak[1]} views
                </p>
              )}
            </Card>
          </div>

          {s.open_reports > 0 && (
            <div>
              <Section title="Open Reports by Reason" />
              <Card style={{ padding: '14px 18px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {Object.entries(s.reports_by_reason).sort((a, b) => b[1] - a[1]).map(([reason, n]) => (
                  <Chip key={reason} text={`${reason.replace(/_/g, ' ')}: ${n}`} tone={reason === 'wrong_answer' ? 'red' : 'amber'} />
                ))}
              </Card>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <Section title="Most Active Users (all time · attempts)" />
            <Card>
              {s.top_users.length > 0 ? s.top_users.map((u, i) => (
                <Row key={u.email ?? i} last={i === s.top_users.length - 1}>
                  <span style={{ width: 26, height: 26, borderRadius: '50%', background: i === 0 ? 'var(--teal-tint)' : 'var(--surface-3)', color: i === 0 ? 'var(--teal)' : 'var(--text-faint)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0, marginRight: 10 }}>
                    {i + 1}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name ?? 'Unknown'}</p>
                    <p style={{ margin: '1px 0 0', fontSize: 11.5, color: 'var(--text-faint)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email ?? ''}</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: 'var(--teal)', fontVariantNumeric: 'tabular-nums' }}>{u.attempts} att · {pct(u.correct, u.attempts)}%</p>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--text-faint)', fontWeight: 600 }}>🔥{u.streak ?? 0} · {(u.xp ?? 0).toLocaleString()}xp</p>
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
              {online.length > 0 ? online.map((u, i) => (
                <Row key={u.email ?? i} last={i === online.length - 1}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', marginRight: 12, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>{u.full_name ?? '—'}</p>
                    <p style={{ margin: '1px 0 0', fontSize: 12, color: 'var(--text-faint)', fontWeight: 600 }}>{u.email ?? ''}</p>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, background: 'var(--green-tint)', color: 'var(--green)', padding: '4px 10px', borderRadius: 999 }}>
                    {/* eslint-disable-next-line react-hooks/purity -- server component renders per request; wall-clock read is intended */}
                    {u.last_seen_at ? `${Math.round((Date.now() - new Date(u.last_seen_at).getTime()) / 60000)}m ago` : '—'}
                  </span>
                </Row>
              )) : (
                <p style={{ padding: '32px 18px', textAlign: 'center', fontSize: 13, color: 'var(--text-faint)', fontWeight: 600 }}>No one online right now</p>
              )}
            </Card>
          </div>
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
                    <th key={h} style={{ ...thStyle, padding: '11px 16px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {s.topic_content.map((t, i) => (
                  <tr key={t.topic} style={{ borderBottom: i < s.topic_content.length - 1 ? '1px solid var(--border)' : 'none' }} className="admin-table-row">
                    <td style={{ padding: '10px 16px', fontSize: 13.5, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap' }}>{t.topic}</td>
                    <td style={{ padding: '10px 16px', fontSize: 13, color: 'var(--teal)', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{t.mcq.toLocaleString()}</td>
                    <td style={{ padding: '10px 16px', fontSize: 13, color: 'var(--purple)', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{t.flashcard.toLocaleString()}</td>
                    <td style={{ padding: '10px 16px', fontSize: 13.5, fontWeight: 900, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{t.total.toLocaleString()}</td>
                    <td style={{ padding: '10px 16px', minWidth: 160 }}>
                      <div style={{ height: 6, borderRadius: 999, background: 'var(--surface-3)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: 'var(--teal)', borderRadius: 999, width: `${(t.total / maxTopicTotal) * 100}%`, opacity: 0.85 }} />
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
        <Card>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Name', 'Email', 'Profession', 'Year', 'Level', 'XP', 'Joined'].map(h => (
                    <th key={h} style={{ ...thStyle, padding: '12px 16px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {s.recent_signups.map((u, i) => (
                  <tr key={`${u.email}-${u.created_at}`} style={{ borderBottom: i < s.recent_signups.length - 1 ? '1px solid var(--border)' : 'none' }} className="admin-table-row">
                    <td style={{ padding: '12px 16px', fontSize: 13.5, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap' }}>{u.full_name}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-soft)', whiteSpace: 'nowrap' }}>{u.email}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-soft)', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>{u.profession?.replace(/_/g, ' ')}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-soft)', whiteSpace: 'nowrap' }}>{u.study_year?.replace('year', 'Yr ').replace('practitioner', 'Pract.') ?? '—'}</td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}><Chip text={`Lv ${u.level ?? 1}`} /></td>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{(u.xp ?? 0).toLocaleString()}</td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-faint)', fontWeight: 600, whiteSpace: 'nowrap' }}>{new Date(u.created_at).toLocaleDateString('en-GB')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
