import { createClient } from '@/lib/supabase/server'

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, boxShadow: 'var(--shadow)', padding: '18px 20px' }}>
      <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.1em' }}>{label}</p>
      <p style={{ margin: 0, fontSize: 28, fontWeight: 900, color: color ?? 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ margin: '5px 0 0', fontSize: 12, color: 'var(--text-faint)', fontWeight: 600 }}>{sub}</p>}
    </div>
  )
}

function SectionLabel({ title }: { title: string }) {
  return <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.1em' }}>{title}</p>
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, boxShadow: 'var(--shadow)', overflow: 'hidden', ...style }}>
      {children}
    </div>
  )
}

function TableRow({ children, last }: { children: React.ReactNode; last?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '12px 18px', borderBottom: last ? 'none' : '1px solid var(--border)' }}
      className="admin-table-row">
      {children}
    </div>
  )
}

export default async function AdminDashboard() {
  const supabase = await createClient()

  const now = new Date()
  const onlineThreshold = new Date(now.getTime() - 5 * 60 * 1000).toISOString()
  const todayStart = new Date(now.setHours(0, 0, 0, 0)).toISOString()
  const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const monthStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { data: profiles },
    { count: totalQuestions },
    { count: totalCases },
    { data: pageViewsToday },
    { data: pageViewsWeek },
    { data: pageViewsTotal },
    { data: onlineUsers },
    { data: recentSignups },
    { data: topTopics },
    { data: topUsers },
    { data: professionBreakdown },
    { data: yearBreakdown },
    { data: levelBreakdown },
    { data: hourlyViews },
  ] = await Promise.all([
    supabase.from('user_profiles').select('*').order('created_at', { ascending: false }),
    supabase.from('questions').select('id', { count: 'exact', head: true }),
    supabase.from('case_studies').select('id', { count: 'exact', head: true }),
    supabase.from('page_views').select('id', { count: 'exact' }).gte('created_at', todayStart),
    supabase.from('page_views').select('id', { count: 'exact' }).gte('created_at', weekStart),
    supabase.from('page_views').select('id', { count: 'exact' }),
    supabase.from('user_profiles').select('full_name, email, last_seen_at').gte('last_seen_at', onlineThreshold),
    supabase.from('user_profiles').select('full_name, email, profession, study_year, level, created_at').gte('created_at', monthStart).order('created_at', { ascending: false }),
    supabase.from('user_question_history').select('topic').gte('answered_at', monthStart),
    supabase.from('user_question_history').select('user_id').gte('answered_at', monthStart),
    supabase.from('user_profiles').select('profession'),
    supabase.from('user_profiles').select('study_year'),
    supabase.from('user_profiles').select('level'),
    supabase.from('page_views').select('created_at').gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
  ])

  const totalUsers = profiles?.length ?? 0
  const onlineNow = onlineUsers?.length ?? 0

  const topicCounts: Record<string, number> = {}
  for (const row of topTopics ?? []) {
    if (row.topic) topicCounts[row.topic] = (topicCounts[row.topic] ?? 0) + 1
  }
  const sortedTopics = Object.entries(topicCounts).sort((a, b) => b[1] - a[1]).slice(0, 10)

  const userActivity: Record<string, number> = {}
  for (const row of topUsers ?? []) {
    if (row.user_id) userActivity[row.user_id] = (userActivity[row.user_id] ?? 0) + 1
  }
  const topActiveUserIds = Object.entries(userActivity).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const topActiveUsers = topActiveUserIds.map(([uid, count]) => {
    const p = profiles?.find(p => p.id === uid)
    return { name: p?.full_name ?? 'Unknown', email: p?.email ?? '', count }
  })

  const profCounts: Record<string, number> = {}
  for (const row of professionBreakdown ?? []) {
    const k = row.profession ?? 'unknown'
    profCounts[k] = (profCounts[k] ?? 0) + 1
  }

  const yearCounts: Record<string, number> = {}
  for (const row of yearBreakdown ?? []) {
    const k = row.study_year ?? 'unknown'
    yearCounts[k] = (yearCounts[k] ?? 0) + 1
  }

  const lvlCounts: Record<number, number> = {}
  for (const row of levelBreakdown ?? []) {
    const k = row.level ?? 1
    lvlCounts[k] = (lvlCounts[k] ?? 0) + 1
  }

  const hourlyCounts: Record<number, number> = {}
  for (const row of hourlyViews ?? []) {
    const h = new Date(row.created_at).getHours()
    hourlyCounts[h] = (hourlyCounts[h] ?? 0) + 1
  }
  const peakHour = Object.entries(hourlyCounts).sort((a, b) => b[1] - a[1])[0]

  return (
    <div style={{ padding: 'clamp(20px,3vw,36px) clamp(16px,3vw,32px)', maxWidth: 1200, margin: '0 auto' }}>

      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.02em' }}>Dashboard</h1>
        <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--text-faint)', fontWeight: 600 }}>Live overview · refreshes on every visit</p>
      </div>

      {/* Key metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))', gap: 12, marginBottom: 28 }}>
        <StatCard label="Total Users" value={totalUsers} color="var(--teal)" />
        <StatCard label="Online Now" value={onlineNow} sub="last 5 min" color="var(--green)" />
        <StatCard label="Views Today" value={pageViewsToday?.length ?? 0} />
        <StatCard label="Views This Week" value={pageViewsWeek?.length ?? 0} sub={`${pageViewsTotal?.length ?? 0} all time`} />
        <StatCard label="Total Questions" value={(totalQuestions ?? 0).toLocaleString()} />
        <StatCard label="Case Studies" value={totalCases ?? 0} />
        <StatCard label="New Users (30d)" value={recentSignups?.length ?? 0} color="var(--coral)" />
        <StatCard label="Peak Hour (24h)" value={peakHour ? `${peakHour[0]}:00` : '—'} sub={peakHour ? `${peakHour[1]} views` : ''} />
      </div>

      {/* Row 1: Online now + Most active */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 20, marginBottom: 20 }}>
        <div>
          <SectionLabel title="Online Now" />
          <Card>
            {onlineUsers && onlineUsers.length > 0 ? onlineUsers.map((u, i) => (
              <TableRow key={i} last={i === onlineUsers.length - 1}>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>{u.full_name}</p>
                  <p style={{ margin: '1px 0 0', fontSize: 12, color: 'var(--text-faint)', fontWeight: 600 }}>{u.email}</p>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, background: 'var(--green-tint)', color: 'var(--green)', padding: '4px 10px', borderRadius: 999 }}>
                  {u.last_seen_at ? `${Math.round((Date.now() - new Date(u.last_seen_at).getTime()) / 60000)}m ago` : '—'}
                </span>
              </TableRow>
            )) : (
              <p style={{ padding: '32px 18px', textAlign: 'center', fontSize: 13, color: 'var(--text-faint)', fontWeight: 600 }}>No one online right now</p>
            )}
          </Card>
        </div>

        <div>
          <SectionLabel title="Most Active Users (30 days)" />
          <Card>
            {topActiveUsers.length > 0 ? topActiveUsers.map((u, i) => (
              <TableRow key={i} last={i === topActiveUsers.length - 1}>
                <span style={{ width: 26, height: 26, borderRadius: '50%', background: i === 0 ? 'var(--teal-tint)' : 'var(--surface-3)', color: i === 0 ? 'var(--teal)' : 'var(--text-faint)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0, marginRight: 10 }}>
                  {i + 1}
                </span>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>{u.name}</p>
                  <p style={{ margin: '1px 0 0', fontSize: 12, color: 'var(--text-faint)', fontWeight: 600 }}>{u.email}</p>
                </div>
                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--teal)' }}>{u.count}q</span>
              </TableRow>
            )) : (
              <p style={{ padding: '32px 18px', textAlign: 'center', fontSize: 13, color: 'var(--text-faint)', fontWeight: 600 }}>No activity yet</p>
            )}
          </Card>
        </div>
      </div>

      {/* Row 2: Topics + Profession + Year + Level + Traffic */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 20, marginBottom: 28 }}>
        {/* Top topics */}
        <div>
          <SectionLabel title="Most Studied Topics (30d)" />
          <Card>
            {sortedTopics.length > 0 ? sortedTopics.map(([topic, count], i) => (
              <div key={topic} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', borderBottom: i < sortedTopics.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <span style={{ fontSize: 11, color: 'var(--text-faint)', fontWeight: 700, width: 16, flexShrink: 0 }}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{topic}</p>
                  <div style={{ height: 4, borderRadius: 999, background: 'var(--surface-3)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'var(--teal)', borderRadius: 999, width: `${(count / sortedTopics[0][1]) * 100}%` }} />
                  </div>
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-faint)', fontWeight: 700, flexShrink: 0 }}>{count}</span>
              </div>
            )) : (
              <p style={{ padding: '32px 18px', textAlign: 'center', fontSize: 13, color: 'var(--text-faint)', fontWeight: 600 }}>No activity yet</p>
            )}
          </Card>
        </div>

        {/* Profession + Year stacked */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <SectionLabel title="By Profession" />
            <Card>
              {Object.entries(profCounts).sort((a, b) => b[1] - a[1]).map(([prof, count], i, arr) => (
                <TableRow key={prof} last={i === arr.length - 1}>
                  <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: 'var(--text)', textTransform: 'capitalize' }}>{prof.replace(/_/g, ' ')}</span>
                  <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text)' }}>{count}</span>
                </TableRow>
              ))}
            </Card>
          </div>

          <div>
            <SectionLabel title="By Year of Study" />
            <Card>
              {Object.entries(yearCounts).sort().map(([year, count], i, arr) => (
                <TableRow key={year} last={i === arr.length - 1}>
                  <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: 'var(--text)', textTransform: 'capitalize' }}>{year.replace('year', 'Year ')}</span>
                  <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text)' }}>{count}</span>
                </TableRow>
              ))}
            </Card>
          </div>
        </div>

        {/* Level + Traffic chart stacked */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <SectionLabel title="By Level" />
            <Card>
              {Object.entries(lvlCounts).sort((a, b) => Number(a[0]) - Number(b[0])).map(([lvl, count], i, arr) => (
                <TableRow key={lvl} last={i === arr.length - 1}>
                  <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>Level {lvl}</span>
                  <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text)' }}>{count}</span>
                </TableRow>
              ))}
            </Card>
          </div>

          <div>
            <SectionLabel title="Hourly Traffic (last 24h)" />
            <Card style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 64 }}>
                {Array.from({ length: 24 }, (_, h) => {
                  const count = hourlyCounts[h] ?? 0
                  const max = Math.max(...Object.values(hourlyCounts), 1)
                  return (
                    <div key={h} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }} title={`${h}:00 — ${count} views`}>
                      <div style={{ width: '100%', background: 'var(--teal)', borderRadius: '3px 3px 0 0', height: `${(count / max) * 100}%`, minHeight: count > 0 ? 2 : 0, opacity: 0.8 }} />
                    </div>
                  )
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                {['0h', '6h', '12h', '18h', '23h'].map(t => (
                  <span key={t} style={{ fontSize: 10, color: 'var(--text-faint)', fontWeight: 700 }}>{t}</span>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Recent signups table */}
      <div>
        <SectionLabel title="Recent Signups (30 days)" />
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, boxShadow: 'var(--shadow)', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Name', 'Email', 'Profession', 'Year', 'Level', 'Joined'].map(h => (
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
                  <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-soft)', whiteSpace: 'nowrap' }}>{u.study_year?.replace('year', 'Yr ') ?? '—'}</td>
                  <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                    <span style={{ fontSize: 12, fontWeight: 800, background: 'var(--teal-tint)', color: 'var(--teal)', padding: '3px 9px', borderRadius: 999 }}>Lv {u.level}</span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-faint)', fontWeight: 600, whiteSpace: 'nowrap' }}>{new Date(u.created_at).toLocaleDateString()}</td>
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
