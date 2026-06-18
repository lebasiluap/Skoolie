import { createClient } from '@/lib/supabase/server'

export default async function AdminUsersPage() {
  const supabase = await createClient()

  const [{ data: profiles }, { data: history }] = await Promise.all([
    supabase.from('user_profiles').select('*').order('created_at', { ascending: false }),
    supabase.from('user_question_history').select('user_id, question_type, topic, answered_at'),
  ])

  const userStats: Record<string, { total: number; mcq: number; flashcard: number; case: number; lastActive: string }> = {}
  for (const row of history ?? []) {
    if (!row.user_id) continue
    if (!userStats[row.user_id]) {
      userStats[row.user_id] = { total: 0, mcq: 0, flashcard: 0, case: 0, lastActive: '' }
    }
    userStats[row.user_id].total++
    if (row.question_type === 'mcq') userStats[row.user_id].mcq++
    if (row.question_type === 'flashcard') userStats[row.user_id].flashcard++
    if (row.question_type === 'case_study') userStats[row.user_id].case++
    if (!userStats[row.user_id].lastActive || row.answered_at > userStats[row.user_id].lastActive) {
      userStats[row.user_id].lastActive = row.answered_at
    }
  }

  const todayStr = new Date().toISOString().split('T')[0]
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  function effectiveStreak(profile: { current_streak?: number; last_active_date?: string }) {
    const lastActive = profile.last_active_date ?? ''
    return (lastActive === todayStr || lastActive === yesterdayStr)
      ? (profile.current_streak ?? 0)
      : 0
  }

  const totalUsers = profiles?.length ?? 0
  const activeToday = profiles?.filter(p => (p.last_active_date ?? '') === todayStr).length ?? 0
  const withKey = profiles?.filter(p => p.access_key).length ?? 0

  return (
    <div style={{ padding: 'clamp(20px,3vw,36px) clamp(16px,3vw,32px)', maxWidth: 1400, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.02em' }}>Users</h1>
        <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--text-faint)', fontWeight: 600 }}>{totalUsers} total accounts</p>
      </div>

      {/* Summary chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 22 }}>
        {[
          { label: 'Total', value: totalUsers, bg: 'var(--teal-tint)', color: 'var(--teal)' },
          { label: 'Active today', value: activeToday, bg: 'var(--green-tint)', color: 'var(--green)' },
          { label: 'With access key', value: withKey, bg: 'var(--amber-tint)', color: 'var(--amber)' },
        ].map(chip => (
          <span key={chip.label} style={{ fontSize: 12.5, fontWeight: 800, padding: '6px 14px', borderRadius: 999, background: chip.bg, color: chip.color }}>
            {chip.label}: {chip.value}
          </span>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, boxShadow: 'var(--shadow)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Name', 'Email', 'Profession', 'Year', 'Level / XP', 'Streak', 'MCQs', 'Cards', 'Cases', 'Last Active', 'Joined', 'Key'].map((h, i) => (
                <th key={h} style={{ textAlign: i >= 6 && i <= 8 ? 'right' : 'left', padding: '12px 14px', fontSize: 11, fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.08em', whiteSpace: 'nowrap' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(profiles ?? []).map((u, rowIdx) => {
              const stats = userStats[u.id] ?? { total: 0, mcq: 0, flashcard: 0, case: 0, lastActive: '' }
              const hoursAgo = u.last_seen_at
                ? Math.round((Date.now() - new Date(u.last_seen_at).getTime()) / 3600000)
                : null
              const lastSeen = hoursAgo === null ? '—'
                : hoursAgo < 1 ? 'Just now'
                : hoursAgo < 24 ? `${hoursAgo}h ago`
                : `${Math.round(hoursAgo / 24)}d ago`
              const streak = effectiveStreak(u)
              const isOnline = hoursAgo !== null && hoursAgo < 1
              const isLast = rowIdx === (profiles?.length ?? 0) - 1

              return (
                <tr key={u.id} style={{ borderBottom: isLast ? 'none' : '1px solid var(--border)' }} className="admin-table-row">
                  <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      {isOnline && <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', flexShrink: 0, display: 'inline-block' }} />}
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>{u.full_name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '11px 14px', fontSize: 12.5, color: 'var(--text-soft)', whiteSpace: 'nowrap' }}>{u.email}</td>
                  <td style={{ padding: '11px 14px', fontSize: 12.5, color: 'var(--text-soft)', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>{u.profession?.replace(/_/g, ' ')}</td>
                  <td style={{ padding: '11px 14px', fontSize: 12.5, color: 'var(--text-soft)', whiteSpace: 'nowrap' }}>{u.study_year?.replace('year', 'Yr ') ?? '—'}</td>
                  <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                    <span style={{ fontSize: 12, fontWeight: 800, background: 'var(--teal-tint)', color: 'var(--teal)', padding: '3px 8px', borderRadius: 999, marginRight: 6 }}>Lv {u.level}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-faint)', fontWeight: 600 }}>{u.xp} XP</span>
                  </td>
                  <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                    {streak > 0
                      ? <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--coral)' }}>🔥 {streak}</span>
                      : <span style={{ color: 'var(--border-strong)', fontSize: 13 }}>—</span>
                    }
                    {(u.longest_streak ?? 0) > 0 && (
                      <span style={{ fontSize: 11, color: 'var(--text-faint)', fontWeight: 600, marginLeft: 5 }}>(best {u.longest_streak})</span>
                    )}
                  </td>
                  <td style={{ padding: '11px 14px', textAlign: 'right', fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>{stats.mcq}</td>
                  <td style={{ padding: '11px 14px', textAlign: 'right', fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>{stats.flashcard}</td>
                  <td style={{ padding: '11px 14px', textAlign: 'right', fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>{stats.case}</td>
                  <td style={{ padding: '11px 14px', fontSize: 12, color: 'var(--text-faint)', fontWeight: 600, whiteSpace: 'nowrap' }}>{lastSeen}</td>
                  <td style={{ padding: '11px 14px', fontSize: 12, color: 'var(--text-faint)', fontWeight: 600, whiteSpace: 'nowrap' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                    {u.access_key
                      ? <span style={{ fontSize: 11.5, fontWeight: 800, background: 'var(--teal-tint)', color: 'var(--teal)', padding: '3px 8px', borderRadius: 999 }}>{u.access_key}</span>
                      : <span style={{ fontSize: 12, color: 'var(--border-strong)' }}>—</span>
                    }
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <style>{`.admin-table-row:hover { background: var(--surface-2); }`}</style>
    </div>
  )
}
