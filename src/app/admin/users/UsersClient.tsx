'use client'

import { useMemo, useState } from 'react'
import { PAGE_PAD, inputStyle, PageHeader, Chip, EmptyState, thStyle } from '../ui'

interface Profile {
  id: string
  full_name: string | null
  email: string | null
  profession: string | null
  study_year: string | null
  level: number | null
  xp: number | null
  current_streak: number | null
  longest_streak: number | null
  last_active_date: string | null
  last_seen_at: string | null
  created_at: string
  access_key: string | null
}

interface StatRow { user_id: string; attempts: number; correct: number; mcq: number; flashcard: number; cases: number; last_active: string }

type SortKey = 'joined' | 'attempts' | 'accuracy' | 'xp' | 'streak' | 'lastSeen'

const pct = (c: number, a: number) => a > 0 ? Math.round((c / a) * 100) : 0

export default function UsersClient({ profiles, statsById }: { profiles: Profile[]; statsById: Record<string, StatRow> }) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('joined')

  // Relative-time columns intentionally read the clock; stale-until-refresh is fine for admin.
  const todayStr = new Date().toISOString().split('T')[0]
  // eslint-disable-next-line react-hooks/purity
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  function effectiveStreak(p: Profile) {
    const lastActive = p.last_active_date ?? ''
    return (lastActive === todayStr || lastActive === yesterdayStr) ? (p.current_streak ?? 0) : 0
  }

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = q
      ? profiles.filter(p =>
          (p.full_name ?? '').toLowerCase().includes(q) ||
          (p.email ?? '').toLowerCase().includes(q) ||
          (p.profession ?? '').toLowerCase().includes(q))
      : profiles

    const val = (p: Profile): number => {
      const s = statsById[p.id]
      switch (sort) {
        case 'attempts': return s?.attempts ?? 0
        case 'accuracy': return s ? pct(s.correct, s.attempts) : -1
        case 'xp':       return p.xp ?? 0
        case 'streak':   return effectiveStreak(p)
        case 'lastSeen': return p.last_seen_at ? new Date(p.last_seen_at).getTime() : 0
        default:         return new Date(p.created_at).getTime()
      }
    }
    return [...filtered].sort((a, b) => val(b) - val(a))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profiles, statsById, query, sort])

  const totalUsers = profiles.length
  const activeToday = profiles.filter(p => (p.last_active_date ?? '') === todayStr).length
  const withKey = profiles.filter(p => p.access_key).length

  const SORTS: { key: SortKey; label: string }[] = [
    { key: 'joined', label: 'Newest' },
    { key: 'attempts', label: 'Attempts' },
    { key: 'accuracy', label: 'Accuracy' },
    { key: 'xp', label: 'XP' },
    { key: 'streak', label: 'Streak' },
    { key: 'lastSeen', label: 'Last seen' },
  ]

  return (
    <div style={{ padding: PAGE_PAD, maxWidth: 1400, margin: '0 auto' }}>

      <PageHeader title="Users" sub={`${totalUsers} total accounts`} />

      {/* Summary chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <Chip text={`Total: ${totalUsers}`} />
        <Chip text={`Active today: ${activeToday}`} tone="green" />
        <Chip text={`With access key: ${withKey}`} tone="amber" />
      </div>

      {/* Search + sort */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20, alignItems: 'center' }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search name, email or profession…"
          aria-label="Search users"
          style={{ ...inputStyle, flex: 1, minWidth: 220, maxWidth: 380 }}
          className="admin-input-focus"
        />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {SORTS.map(sOpt => (
            <button key={sOpt.key} onClick={() => setSort(sOpt.key)}
              style={{
                padding: '7px 13px', borderRadius: 999, fontSize: 12.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
                border: '1px solid ' + (sort === sOpt.key ? 'var(--teal)' : 'var(--border)'),
                background: sort === sOpt.key ? 'var(--teal-tint)' : 'var(--surface)',
                color: sort === sOpt.key ? 'var(--teal)' : 'var(--text-soft)',
              }}>
              {sOpt.label}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No users match" sub="Try a different search." />
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, boxShadow: 'var(--shadow)', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1000 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Name', 'Email', 'Profession', 'Year', 'Level / XP', 'Streak', 'Attempts', 'Accuracy', 'MCQ / Cards / Cases', 'Last Active', 'Joined', 'Key'].map((h, i) => (
                  <th key={h} style={{ ...thStyle, textAlign: i >= 6 && i <= 8 ? 'right' : 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((u, rowIdx) => {
                const s = statsById[u.id]
                const hoursAgo = u.last_seen_at
                  // eslint-disable-next-line react-hooks/purity
                  ? Math.round((Date.now() - new Date(u.last_seen_at).getTime()) / 3600000)
                  : null
                const lastSeen = hoursAgo === null ? '—'
                  : hoursAgo < 1 ? 'Just now'
                  : hoursAgo < 24 ? `${hoursAgo}h ago`
                  : `${Math.round(hoursAgo / 24)}d ago`
                const streak = effectiveStreak(u)
                const isOnline = hoursAgo !== null && hoursAgo < 1
                const acc = s ? pct(s.correct, s.attempts) : null
                const accColor = acc == null ? 'var(--text-faint)' : acc >= 70 ? 'var(--green)' : acc >= 50 ? 'var(--amber)' : 'var(--red)'
                const isLast = rowIdx === rows.length - 1

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
                      <Chip text={`Lv ${u.level ?? 1}`} />
                      <span style={{ fontSize: 12, color: 'var(--text-faint)', fontWeight: 600, marginLeft: 6, fontVariantNumeric: 'tabular-nums' }}>{(u.xp ?? 0).toLocaleString()} XP</span>
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
                    <td style={{ padding: '11px 14px', textAlign: 'right', fontSize: 13.5, fontWeight: 800, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{s?.attempts ?? 0}</td>
                    <td style={{ padding: '11px 14px', textAlign: 'right', fontSize: 13.5, fontWeight: 800, color: accColor, fontVariantNumeric: 'tabular-nums' }}>{acc == null ? '—' : `${acc}%`}</td>
                    <td style={{ padding: '11px 14px', textAlign: 'right', fontSize: 12.5, fontWeight: 600, color: 'var(--text-soft)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                      {s ? `${s.mcq} / ${s.flashcard} / ${s.cases}` : '0 / 0 / 0'}
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: 12, color: 'var(--text-faint)', fontWeight: 600, whiteSpace: 'nowrap' }}>{lastSeen}</td>
                    <td style={{ padding: '11px 14px', fontSize: 12, color: 'var(--text-faint)', fontWeight: 600, whiteSpace: 'nowrap' }}>{new Date(u.created_at).toLocaleDateString('en-GB')}</td>
                    <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                      {u.access_key
                        ? <Chip text={u.access_key} />
                        : <span style={{ fontSize: 12, color: 'var(--border-strong)' }}>—</span>
                      }
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
