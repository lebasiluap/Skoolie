import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import BottomNav from '@/components/BottomNav'

const LEAGUE_CONFIG = {
  bronze:  { label: 'Bronze League',  icon: '🥉', color: '#b45309', bg: 'rgba(180,83,9,.1)',   border: 'rgba(180,83,9,.25)'  },
  silver:  { label: 'Silver League',  icon: '🥈', color: '#6b7280', bg: 'rgba(107,114,128,.1)',border: 'rgba(107,114,128,.25)'},
  gold:    { label: 'Gold League',    icon: '🥇', color: '#d97706', bg: 'rgba(217,119,6,.1)',   border: 'rgba(217,119,6,.25)' },
  diamond: { label: 'Diamond League', icon: '💎', color: '#0891b2', bg: 'rgba(8,145,178,.1)',   border: 'rgba(8,145,178,.25)' },
}

function getLeague(xp: number): keyof typeof LEAGUE_CONFIG {
  if (xp >= 4000) return 'diamond'
  if (xp >= 1500) return 'gold'
  if (xp >= 500)  return 'silver'
  return 'bronze'
}

const PROF_META: Record<string, { label: string; color: string; bg: string }> = {
  pharmacy: { label: 'Pharmacy', color: 'var(--teal)',      bg: 'var(--teal-tint)'  },
  medicine: { label: 'Medicine', color: 'var(--green)',     bg: 'var(--green-tint)' },
  nursing:  { label: 'Nursing',  color: 'var(--coral)',     bg: 'var(--coral-tint)' },
  general:  { label: 'General',  color: 'var(--text-soft)', bg: 'var(--surface-3)'  },
}

function formatStudyYear(year: string | null | undefined): string {
  if (!year) return ''
  if (/^\d+$/.test(year)) return ` · Year ${year}`
  return ` · ${year.charAt(0).toUpperCase() + year.slice(1)}`
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function UserProfilePage({ params }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { id } = await params

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, full_name, xp, level, current_streak, longest_streak, profession, study_year, avatar_url, created_at')
    .eq('id', id)
    .single()

  if (!profile) notFound()

  const isMe = profile.id === user.id
  const initials = profile.full_name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const league = getLeague(profile.xp)
  const leagueConf = LEAGUE_CONFIG[league]
  const profMeta = PROF_META[profile.profession] ?? { label: profile.profession, color: 'var(--text-soft)', bg: 'var(--surface-3)' }

  const XP_PER_LEVEL = 400
  const xpIntoLevel = profile.xp % XP_PER_LEVEL
  const xpToNext = XP_PER_LEVEL - xpIntoLevel
  const xpProgress = (xpIntoLevel / XP_PER_LEVEL) * 100

  const joined = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    : null

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <BottomNav />

      {/* Top bar */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/progress" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)', textDecoration: 'none', color: 'var(--text-soft)', fontSize: 16 }}>←</Link>
        <h1 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>Profile</h1>
        {isMe && (
          <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: 'var(--teal)', background: 'var(--teal-tint)', padding: '4px 12px', borderRadius: 999 }}>You</span>
        )}
      </div>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: 'clamp(16px,3vw,28px) clamp(14px,3vw,24px) 100px' }}>

        {/* ── Avatar + name card ─────────────────────────────────────── */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 24, boxShadow: 'var(--shadow-lg)', padding: '28px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 14 }}>

          {/* Avatar */}
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.full_name} style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--teal)' }} />
          ) : (
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--teal)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 900 }}>
              {initials}
            </div>
          )}

          <h1 style={{ margin: '14px 0 3px', fontSize: 22, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.02em' }}>{profile.full_name}</h1>
          <p style={{ margin: '0 0 14px', fontSize: 14, color: 'var(--text-faint)', fontWeight: 600 }}>
            {profMeta.label}{formatStudyYear(profile.study_year)}
          </p>

          {/* Pills */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: profMeta.color, background: profMeta.bg, padding: '6px 14px', borderRadius: 999 }}>
              {profMeta.label}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-soft)', background: 'var(--surface-3)', padding: '6px 14px', borderRadius: 999 }}>
              Level {profile.level}
            </span>
          </div>

          {/* League badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 999, background: leagueConf.bg, border: `1.5px solid ${leagueConf.border}` }}>
            <span style={{ fontSize: 18 }}>{leagueConf.icon}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: leagueConf.color }}>{leagueConf.label}</span>
          </div>

          {joined && (
            <p style={{ margin: '14px 0 0', fontSize: 12, color: 'var(--text-faint)', fontWeight: 600 }}>Member since {joined}</p>
          )}
        </div>

        {/* ── XP progress bar ──────────────────────────────────────────── */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, boxShadow: 'var(--shadow)', padding: '18px 20px', marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>Level {profile.level}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-faint)' }}>{xpIntoLevel} / {XP_PER_LEVEL} XP</span>
          </div>
          <div style={{ height: 10, background: 'var(--surface-3)', borderRadius: 999, overflow: 'hidden' }}>
            <div className="progress-bar" style={{ height: '100%', borderRadius: 999, background: 'linear-gradient(90deg,var(--teal),var(--teal-deep))', width: `${xpProgress}%` }} />
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--text-faint)', fontWeight: 600 }}>{xpToNext} XP to Level {profile.level + 1}</p>
        </div>

        {/* ── Stats 2×2 ────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
          {[
            { val: profile.xp.toLocaleString(), label: 'Total XP',     color: 'var(--teal)'  },
            { val: `${profile.level}`,           label: 'Level',        color: 'var(--teal)'  },
            { val: `${profile.current_streak}d`, label: 'Day streak',   color: 'var(--coral)' },
            { val: `${profile.longest_streak}d`, label: 'Best streak',  color: 'var(--green)' },
          ].map(s => (
            <div key={s.label} className="user-stat-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, boxShadow: 'var(--shadow)', padding: '18px 16px' }}>
              <p style={{ margin: 0, fontSize: 27, fontWeight: 900, color: s.color, letterSpacing: '-0.02em' }}>{s.val}</p>
              <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-faint)', fontWeight: 600 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .user-stat-card { transition: transform .22s ease, box-shadow .22s ease; }
        .user-stat-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-lg); }
      `}</style>
    </div>
  )
}
