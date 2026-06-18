import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import BottomNav from '@/components/BottomNav'
import AvatarUpload from '@/components/AvatarUpload'
import ProfileSettingsClient from '@/components/ProfileSettingsClient'
import type { StudyYear } from '@/types'

const PROFESSION_META: Record<string, { label: string; color: string; bg: string }> = {
  pharmacy: { label: 'Pharmacy',  color: 'var(--teal)',   bg: 'var(--teal-tint)' },
  medicine: { label: 'Medicine',  color: 'var(--green)',  bg: 'var(--green-tint)' },
  nursing:  { label: 'Nursing',   color: 'var(--coral)',  bg: 'var(--coral-tint)' },
  general:  { label: 'General',   color: 'var(--text-soft)', bg: 'var(--surface-3)' },
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  if (!profile) redirect('/onboarding')

  const { data: sessions } = await supabase
    .from('quiz_sessions')
    .select('score, question_ids, xp_earned')
    .eq('user_id', user.id)

  const totalQuestions = sessions?.reduce((acc, s) => acc + (s.question_ids?.length ?? 0), 0) ?? 0
  const totalCorrect   = sessions?.reduce((acc, s) => acc + (s.score ?? 0), 0) ?? 0
  const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0
  const totalXP = sessions?.reduce((acc, s) => acc + (s.xp_earned ?? 0), 0) ?? 0

  const initials = profile.full_name
    .split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

  const profMeta = PROFESSION_META[profile.profession] ?? { label: profile.profession, color: 'var(--text-soft)', bg: 'var(--surface-3)' }

  const todayStr = new Date().toISOString().split('T')[0]
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  const lastActiveStr = profile.last_active_date ?? ''
  const effectiveStreak = (lastActiveStr === todayStr || lastActiveStr === yesterdayStr)
    ? (profile.current_streak ?? 0) : 0

  const joined = new Date(profile.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  const xpInLevel = profile.xp % 400
  const xpToNext = 400 - xpInLevel

  async function handleLogout() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <BottomNav />

      <div style={{ maxWidth: 640, margin: '0 auto', padding: 'clamp(18px,3.5vw,38px) clamp(16px,3.5vw,28px) 100px' }}>

        {/* ── Profile header card ──────────────────────────────────────── */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 24, boxShadow: 'var(--shadow-lg)', padding: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 20 }}>
          <AvatarUpload
            userId={user.id}
            initials={initials}
            currentAvatarUrl={profile.avatar_url ?? null}
          />

          <h1 style={{ margin: '14px 0 3px', fontSize: 22, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.02em' }}>{profile.full_name}</h1>
          <p style={{ margin: '0 0 14px', fontSize: 14, color: 'var(--text-faint)', fontWeight: 600 }}>{user.email}</p>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: profMeta.color, background: profMeta.bg, padding: '6px 14px', borderRadius: 999 }}>
              {profMeta.label}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-soft)', background: 'var(--surface-3)', padding: '6px 14px', borderRadius: 999 }}>
              Level {profile.level}
            </span>
          </div>

          {/* XP progress */}
          <div style={{ width: '100%', maxWidth: 340 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-soft)' }}>Level {profile.level}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-faint)' }}>{xpInLevel} / 400 XP</span>
            </div>
            <div style={{ height: 8, background: 'var(--surface-3)', borderRadius: 999, overflow: 'hidden' }}>
              <div className="progress-bar" style={{ height: '100%', borderRadius: 999, background: 'linear-gradient(90deg,var(--teal),var(--teal-deep))', width: `${(xpInLevel / 400) * 100}%` }} />
            </div>
            <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-faint)', fontWeight: 600 }}>{xpToNext} XP to Level {profile.level + 1}</p>
          </div>

          <p style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--text-faint)', fontWeight: 600 }}>Member since {joined}</p>
        </div>

        {/* ── 2×2 stats ───────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { val: totalQuestions.toLocaleString(), label: 'Questions answered', color: 'var(--teal)' },
            { val: `${accuracy}%`,                  label: 'Accuracy',           color: 'var(--green)' },
            { val: totalXP.toLocaleString(),         label: 'Total XP earned',   color: 'var(--coral)' },
            { val: `${effectiveStreak}d`,            label: 'Current streak',    color: 'var(--text)' },
          ].map(s => (
            <div key={s.label} className="prof-stat-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, boxShadow: 'var(--shadow)', padding: '18px 16px' }}>
              <p style={{ margin: 0, fontSize: 26, fontWeight: 900, color: s.color, letterSpacing: '-0.02em' }}>{s.val}</p>
              <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-faint)', fontWeight: 600 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Settings card ────────────────────────────────────────────── */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, boxShadow: 'var(--shadow)', overflow: 'hidden', marginBottom: 14 }}>

          {/* Change profession */}
          <Link href="/onboarding" className="settings-row" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', borderBottom: '1px solid var(--border)', textDecoration: 'none' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: profMeta.bg, color: profMeta.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
              💊
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 14.5, fontWeight: 800, color: 'var(--text)' }}>Change profession</p>
              <p style={{ margin: '1px 0 0', fontSize: 12.5, color: 'var(--text-faint)', fontWeight: 600 }}>Currently: {profMeta.label}</p>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6l6 6-6 6"/>
            </svg>
          </Link>

          {/* Leaderboard */}
          <Link href="/progress" className="settings-row" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', borderBottom: '1px solid var(--border)', textDecoration: 'none' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--amber-tint)', color: 'var(--amber)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
              🏆
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 14.5, fontWeight: 800, color: 'var(--text)' }}>View leaderboard</p>
              <p style={{ margin: '1px 0 0', fontSize: 12.5, color: 'var(--text-faint)', fontWeight: 600 }}>See how you rank against others</p>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6l6 6-6 6"/>
            </svg>
          </Link>

          {/* Study year + practice preferences (interactive) */}
          <ProfileSettingsClient
            userId={user.id}
            initialStudyYear={(profile.study_year as StudyYear) ?? null}
            initialAllowRepeat={profile.allow_repeat_questions ?? true}
            initialShowTags={profile.show_question_tags ?? true}
          />
        </div>

        {/* ── Sign out ─────────────────────────────────────────────────── */}
        <form action={handleLogout}>
          <button type="submit" className="signout-btn"
            style={{ width: '100%', padding: '14px 0', borderRadius: 999, background: 'transparent', color: 'var(--red)', border: '1.5px solid var(--red)', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
            Sign out
          </button>
        </form>
      </div>

      <style>{`
        .settings-row { transition: background .15s ease; }
        .settings-row:hover { background: var(--surface-2) !important; }
        .prof-stat-card { transition: transform .22s ease, box-shadow .22s ease; }
        .prof-stat-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-lg); }
        .signout-btn { transition: background .15s ease, color .15s ease; }
        .signout-btn:hover { background: var(--red-tint) !important; }
      `}</style>
    </div>
  )
}
