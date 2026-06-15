import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'


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

export default async function ProgressPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/onboarding')

  // Get top 20 users by XP for the leaderboard
  const { data: topUsers } = await supabase
    .from('user_profiles')
    .select('id, full_name, xp, level, current_streak, profession')
    .order('xp', { ascending: false })
    .limit(20)

  const userLeague = getLeague(profile.xp)
  const leagueConf = LEAGUE_CONFIG[userLeague]

  // Find current user's rank
  const userRank = topUsers ? topUsers.findIndex(u => u.id === user.id) + 1 : null

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-[#101010] px-5 pt-12 pb-8 text-center">
        <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-4">Your League</p>
        <div className={`inline-flex flex-col items-center gap-2 ${leagueConf.bg} ${leagueConf.border} border rounded-3xl px-10 py-5 mb-4`}>
          <span className="text-5xl">{leagueConf.emoji}</span>
          <span className={`text-lg font-bold ${leagueConf.color}`}>{leagueConf.label}</span>
        </div>
        <p className="text-white font-bold text-2xl">{profile.xp} XP</p>
        <p className="text-white/50 text-xs mt-1">
          {userRank ? `Rank #${userRank} overall` : 'Keep studying to rank up!'}
        </p>

        {/* League progress bar */}
        {userLeague !== 'diamond' && (() => {
          const leagues = Object.entries(LEAGUE_CONFIG) as [keyof typeof LEAGUE_CONFIG, typeof LEAGUE_CONFIG[keyof typeof LEAGUE_CONFIG]][]
          const currentIdx = leagues.findIndex(([k]) => k === userLeague)
          const next = leagues[currentIdx + 1]
          const progress = Math.min(((profile.xp - leagueConf.min) / (next[1].min - leagueConf.min)) * 100, 100)
          return (
            <div className="mt-5 px-2">
              <div className="flex justify-between text-xs text-white/40 mb-1.5">
                <span>{leagueConf.label}</span>
                <span>{next[0].charAt(0).toUpperCase() + next[0].slice(1)} at {next[1].min} XP</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full">
                <div className="h-full bg-[#0D9488] rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )
        })()}
      </div>

      {/* Stats strip */}
      <div className="px-5 -mt-0 pt-5">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-[#0D9488]">{profile.level}</p>
            <p className="text-xs text-gray-400 mt-1">Level</p>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-orange-500">{profile.current_streak}</p>
            <p className="text-xs text-gray-400 mt-1">Day streak</p>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-[#0D9488]">{profile.longest_streak}</p>
            <p className="text-xs text-gray-400 mt-1">Best streak</p>
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="px-5 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-[#101010]">Leaderboard</h2>
          <span className="text-xs text-gray-400">Top 20 all-time</span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {topUsers && topUsers.length > 0 ? topUsers.map((u, i) => {
            const isMe = u.id === user.id
            const rank = i + 1
            const rankDisplay = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`
            const initials = u.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

            return (
              <Link
                key={u.id}
                href={`/users/${u.id}`}
                className={`flex items-center gap-3 px-4 py-3.5 ${i < topUsers.length - 1 ? 'border-b border-gray-50' : ''} ${isMe ? 'bg-[#f0fdfb]' : 'hover:bg-gray-50'} transition-colors`}
              >
                <span className={`text-base font-bold w-8 text-center ${rank <= 3 ? 'text-xl' : 'text-gray-400'}`}>{rankDisplay}</span>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${isMe ? 'bg-[#0D9488] text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${isMe ? 'text-[#0D9488]' : 'text-[#101010]'}`}>
                    {u.full_name}{isMe ? ' (you)' : ''}
                  </p>
                  <p className="text-xs text-gray-400 capitalize">{u.profession} · Lv.{u.level}</p>
                </div>
                <span className={`text-sm font-bold ${isMe ? 'text-[#0D9488]' : 'text-gray-500'}`}>{u.xp} XP</span>
              </Link>
            )
          }) : (
            <div className="p-8 text-center">
              <p className="text-gray-400 text-sm">No users yet — be the first!</p>
            </div>
          )}
        </div>
      </div>


    </div>
  )
}
