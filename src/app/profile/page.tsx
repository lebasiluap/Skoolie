import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

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
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Header */}
      <div className="bg-[#101010] px-5 pt-12 pb-10 flex flex-col items-center">
        {/* Avatar */}
        <div className="w-20 h-20 rounded-full bg-[#0D9488] flex items-center justify-center text-white text-2xl font-bold mb-4 shadow-lg">
          {initials}
        </div>
        <h1 className="text-white text-xl font-bold">{profile.full_name}</h1>
        <p className="text-white/50 text-sm mt-0.5">{user.email}</p>

        <div className="flex items-center gap-2 mt-3">
          <span className="text-xs bg-[#0D9488]/20 text-[#0D9488] px-3 py-1 rounded-full font-semibold">
            {profMeta.icon} {profMeta.label}
          </span>
          <span className="text-xs bg-white/10 text-white/60 px-3 py-1 rounded-full font-semibold">
            Level {profile.level}
          </span>
        </div>

        <p className="text-white/30 text-xs mt-3">Member since {joined}</p>
      </div>

      {/* XP bar */}
      <div className="px-5 mt-5">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-[#101010]">Level {profile.level}</span>
            <span className="text-xs text-gray-400">{profile.xp} / {profile.level * 400} XP</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#0D9488] rounded-full"
              style={{ width: `${Math.min((profile.xp / (profile.level * 400)) * 100, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {Math.max(profile.level * 400 - profile.xp, 0)} XP to Level {profile.level + 1}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="px-5 mt-4">
        <h2 className="text-sm font-bold text-[#101010] mb-3">Your stats</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Questions answered', value: totalQuestions, color: 'text-[#0D9488]' },
            { label: 'Accuracy',           value: `${accuracy}%`,  color: 'text-green-500' },
            { label: 'Total XP earned',    value: totalXP,         color: 'text-orange-500' },
            { label: 'Best streak',        value: `${profile.longest_streak}d`, color: 'text-[#0D9488]' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl p-4 shadow-sm">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-gray-400 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Settings */}
      <div className="px-5 mt-6">
        <h2 className="text-sm font-bold text-[#101010] mb-3">Settings</h2>
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <Link
            href="/onboarding"
            className="flex items-center justify-between px-4 py-4 border-b border-gray-50 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">🎓</span>
              <div>
                <p className="text-sm font-semibold text-[#101010]">Change profession</p>
                <p className="text-xs text-gray-400">Currently: {profMeta.label}</p>
              </div>
            </div>
            <span className="text-gray-300 text-lg">→</span>
          </Link>
          <Link
            href="/progress"
            className="flex items-center justify-between px-4 py-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">🏆</span>
              <div>
                <p className="text-sm font-semibold text-[#101010]">View leaderboard</p>
                <p className="text-xs text-gray-400">See how you rank against others</p>
              </div>
            </div>
            <span className="text-gray-300 text-lg">→</span>
          </Link>
        </div>
      </div>

      {/* Sign out */}
      <div className="px-5 mt-4">
        <form action={handleLogout}>
          <button
            type="submit"
            className="w-full py-3.5 rounded-full border border-red-200 text-red-400 text-sm font-semibold hover:bg-red-50 transition-colors"
          >
            Sign out
          </button>
        </form>
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-3 flex justify-around">
        {[
          { label: 'Home',     icon: '🏠', href: '/dashboard',    active: false },
          { label: 'Practice', icon: '📝', href: '/practice/mcq', active: false },
          { label: 'Progress', icon: '📊', href: '/progress',      active: false },
          { label: 'Profile',  icon: '👤', href: '/profile',       active: true  },
        ].map(item => (
          <Link key={item.label} href={item.href} className="flex flex-col items-center gap-1">
            <span className="text-xl">{item.icon}</span>
            <span className={`text-xs font-semibold ${item.active ? 'text-[#0D9488]' : 'text-gray-400'}`}>{item.label}</span>
            {item.active && <div className="w-5 h-0.5 rounded-full bg-[#0D9488]" />}
          </Link>
        ))}
      </div>
    </div>
  )
}
