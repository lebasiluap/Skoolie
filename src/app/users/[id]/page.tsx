import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import BottomNav from '@/components/BottomNav'

const LEAGUE_CONFIG = {
  bronze:  { label: 'Bronze',  emoji: '🥉', color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200',  min: 0    },
  silver:  { label: 'Silver',  emoji: '🥈', color: 'text-gray-500',   bg: 'bg-gray-50',   border: 'border-gray-200',   min: 500  },
  gold:    { label: 'Gold',    emoji: '🥇', color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', min: 1500 },
  diamond: { label: 'Diamond', emoji: '💎', color: 'text-cyan-500',   bg: 'bg-cyan-50',   border: 'border-cyan-200',   min: 4000 },
}

function getLeague(xp: number): keyof typeof LEAGUE_CONFIG {
  if (xp >= 4000) return 'diamond'
  if (xp >= 1500) return 'gold'
  if (xp >= 500)  return 'silver'
  return 'bronze'
}

const PROF_LABELS: Record<string, string> = {
  pharmacy: 'Pharmacy',
  medicine: 'Medicine',
  nursing: 'Nursing',
  general: 'General',
}

const YEAR_LABELS: Record<string, string> = {
  year1: 'Year 1', year2: 'Year 2', year3: 'Year 3',
  year4: 'Year 4', year5: 'Year 5', year6: 'Year 6',
  practitioner: 'Practitioner',
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
    .select('id, full_name, xp, level, current_streak, longest_streak, profession, study_year, avatar_url')
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

  const xpToNextLevel = 400
  const xpProgress = Math.min((profile.xp / xpToNextLevel) * 100, 100)

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Header */}
      <div className="bg-[#101010] px-5 pt-10 pb-8 flex items-center gap-3">
        <Link href="/progress" className="text-white/60 text-sm mr-1">←</Link>
        <h1 className="text-white text-lg font-bold">Profile</h1>
        {isMe && <span className="ml-auto text-xs bg-[#0D9488]/20 text-[#0D9488] px-2.5 py-0.5 rounded-full font-semibold">You</span>}
      </div>

      <div className="px-5 py-6 flex flex-col gap-5">
        {/* Avatar + name */}
        <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col items-center gap-3">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.full_name} className="w-20 h-20 rounded-full object-cover" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-[#0D9488] flex items-center justify-center text-white text-2xl font-bold">
              {initials}
            </div>
          )}
          <div className="text-center">
            <p className="text-[#101010] font-bold text-lg">{profile.full_name}</p>
            <p className="text-gray-400 text-sm">
              {PROF_LABELS[profile.profession] ?? profile.profession}
              {profile.study_year ? ` · ${YEAR_LABELS[profile.study_year] ?? profile.study_year}` : ''}
            </p>
          </div>

          {/* League badge */}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${leagueConf.bg} border ${leagueConf.border}`}>
            <span className="text-lg">{leagueConf.emoji}</span>
            <span className={`text-sm font-semibold ${leagueConf.color}`}>{leagueConf.label} League</span>
          </div>
        </div>

        {/* XP + level */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-[#101010]">Level {profile.level}</span>
            <span className="text-xs text-gray-400">{profile.xp} / {xpToNextLevel} XP</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#0D9488] rounded-full transition-all"
              style={{ width: `${xpProgress}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">{xpToNextLevel - profile.xp} XP to Level {profile.level + 1}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Total XP', value: `${profile.xp}`, color: 'text-[#0D9488]' },
            { label: 'Level', value: `${profile.level}`, color: 'text-[#0D9488]' },
            { label: 'Day streak', value: `${profile.current_streak}d`, color: 'text-orange-500' },
            { label: 'Best streak', value: `${profile.longest_streak}d`, color: 'text-[#0D9488]' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl p-4 shadow-sm">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-gray-400 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
