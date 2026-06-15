import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

import AvatarUpload from '@/components/AvatarUpload'
import ProfileSettingsClient from '@/components/ProfileSettingsClient'
import type { StudyYear } from '@/types'

const PROFESSION_META: Record<string, { label: string; icon: string }> = {
  pharmacy: { label: 'Pharmacy',  icon: '💊' },
  medicine: { label: 'Medicine',  icon: '🩺' },
  nursing:  { label: 'Nursing',   icon: '💉' },
  general:  { label: 'General',   icon: '📚' },
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
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const profMeta = PROFESSION_META[profile.profession] ?? { label: profile.profession, icon: '📚' }

  const joined = new Date(profile.created_at).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  })

  async function handleLogout() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] pb-28">
      {/* Header */}
      <div className="bg-[#0A0A0A] px-5 pt-12 pb-8 flex flex-col items-center border-b border-[#1F1F1F]">
        <div className="mb-4">
          <AvatarUpload
            userId={user.id}
            initials={initials}
            currentAvatarUrl={profile.avatar_url ?? null}
          />
        </div>
        <h1 className="text-white text-xl font-bold">{profile.full_name}</h1>
        <p className="text-[#888888] text-sm mt-0.5">{user.email}</p>

        <div className="flex items-center gap-2 mt-3">
          <span className="text-xs bg-[#0D9488]/15 text-[#0D9488] px-3 py-1 rounded-full font-semibold border border-[#0D9488]/30">
            {profMeta.icon} {profMeta.label}
          </span>
          <span className="text-xs bg-[#1F1F1F] text-[#888888] px-3 py-1 rounded-full font-semibold border border-[#2A2A2A]">
            Level {profile.level}
          </span>
        </div>

        <p className="text-[#555555] text-xs mt-3">Member since {joined}</p>
      </div>

      {/* XP bar */}
      <div className="px-5 mt-5">
        <div className="bg-[#141414] rounded-2xl p-4 border border-[#1F1F1F]">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-white">Level {profile.level}</span>
            <span className="text-xs text-[#888888]">{profile.xp} / {profile.level * 400} XP</span>
          </div>
          <div className="h-1.5 bg-[#1F1F1F] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#0D9488] rounded-full"
              style={{ width: `${Math.min((profile.xp / (profile.level * 400)) * 100, 100)}%` }}
            />
          </div>
          <p className="text-xs text-[#555555] mt-2">
            {Math.max(profile.level * 400 - profile.xp, 0)} XP to Level {profile.level + 1}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="px-5 mt-4">
        <p className="text-[10px] font-semibold text-[#0D9488] uppercase tracking-widest mb-3">Your stats</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Questions answered', value: totalQuestions, color: 'text-[#0D9488]' },
            { label: 'Accuracy',           value: `${accuracy}%`,  color: 'text-[#0D9488]' },
            { label: 'Total XP earned',    value: totalXP,         color: 'text-orange-400' },
            { label: 'Best streak',        value: `${profile.longest_streak}d`, color: 'text-[#0D9488]' },
          ].map(stat => (
            <div key={stat.label} className="bg-[#141414] rounded-2xl p-4 border border-[#1F1F1F]">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-[#888888] mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Settings */}
      <div className="px-5 mt-5">
        <p className="text-[10px] font-semibold text-[#0D9488] uppercase tracking-widest mb-3">Settings</p>
        <div className="bg-[#141414] rounded-2xl border border-[#1F1F1F] overflow-hidden">
          <Link
            href="/onboarding"
            className="flex items-center justify-between px-4 py-4 border-b border-[#1F1F1F] hover:bg-[#1A1A1A] transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">💊</span>
              <div>
                <p className="text-sm font-semibold text-white">Change profession</p>
                <p className="text-xs text-[#888888]">Currently: {profMeta.label}</p>
              </div>
            </div>
            <span className="text-[#555555] text-lg">→</span>
          </Link>

          <ProfileSettingsClient
            userId={user.id}
            initialStudyYear={(profile.study_year as StudyYear) ?? null}
            initialAllowRepeat={profile.allow_repeat_questions ?? true}
            initialShowTags={profile.show_question_tags ?? true}
          />

          <Link
            href="/progress"
            className="flex items-center justify-between px-4 py-4 border-t border-[#1F1F1F] hover:bg-[#1A1A1A] transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">🏆</span>
              <div>
                <p className="text-sm font-semibold text-white">View leaderboard</p>
                <p className="text-xs text-[#888888]">See how you rank against others</p>
              </div>
            </div>
            <span className="text-[#555555] text-lg">→</span>
          </Link>
        </div>
      </div>

      {/* Sign out */}
      <div className="px-5 mt-4">
        <form action={handleLogout}>
          <button
            type="submit"
            className="w-full py-3.5 rounded-full border border-[#2A2A2A] text-[#888888] text-sm font-semibold hover:bg-[#141414] transition-colors"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  )
}
