import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const LEAGUES = [
  { key: 'bronze',   label: 'Bronze',   color: '#CD7F32', min: 0     },
  { key: 'silver',   label: 'Silver',   color: '#C0C0C0', min: 500   },
  { key: 'gold',     label: 'Gold',     color: '#FFD700', min: 1500  },
  { key: 'platinum', label: 'Platinum', color: '#E5E4E2', min: 3000  },
  { key: 'emerald',  label: 'Emerald',  color: '#50C878', min: 5000  },
  { key: 'sapphire', label: 'Sapphire', color: '#0F52BA', min: 8000  },
  { key: 'diamond',  label: 'Diamond',  color: '#B9F2FF', min: 12000 },
] as const

type LeagueKey = typeof LEAGUES[number]['key']

function getLeagueIdx(xp: number): number {
  for (let i = LEAGUES.length - 1; i >= 0; i--) {
    if (xp >= LEAGUES[i].min) return i
  }
  return 0
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

  const { data: topUsers } = await supabase
    .from('user_profiles')
    .select('id, full_name, xp, level, current_streak, profession')
    .order('xp', { ascending: false })
    .limit(20)

  const leagueIdx = getLeagueIdx(profile.xp)
  const league = LEAGUES[leagueIdx]
  const nextLeague = LEAGUES[leagueIdx + 1]
  const userRank = topUsers ? topUsers.findIndex(u => u.id === user.id) + 1 : null

  const leagueProgress = nextLeague
    ? Math.min(((profile.xp - league.min) / (nextLeague.min - league.min)) * 100, 100)
    : 100

  return (
    <div className="min-h-screen bg-[#0A0A0A] pb-28">

      {/* League card */}
      <div className="px-5 pt-12 pb-6 border-b border-[#1F1F1F]">
        <p className="text-[10px] font-semibold text-[#0D9488] uppercase tracking-widest mb-4">Your League</p>

        <div className="bg-[#141414] rounded-2xl border border-[#1F1F1F] p-5 flex items-center gap-4">
          {/* Crown / rank icon */}
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0"
            style={{ backgroundColor: `${league.color}18`, border: `1px solid ${league.color}40` }}
          >
            👑
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[#888888] font-medium mb-0.5">Current league</p>
            <p className="text-xl font-bold" style={{ color: league.color }}>{league.label}</p>
            <p className="text-xs text-[#555555] mt-0.5">{profile.xp.toLocaleString()} XP total</p>
          </div>
          {userRank && (
            <div className="text-right shrink-0">
              <p className="text-xs text-[#555555] mb-0.5">Global rank</p>
              <p className="text-xl font-bold text-white">#{userRank}</p>
            </div>
          )}
        </div>

        {/* Progress to next league */}
        {nextLeague && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-[#555555] mb-2">
              <span style={{ color: league.color }}>{league.label}</span>
              <span>{nextLeague.label} at {nextLeague.min.toLocaleString()} XP</span>
            </div>
            <div className="h-2 bg-[#1F1F1F] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${leagueProgress}%`, backgroundColor: league.color }}
              />
            </div>
            <p className="text-xs text-[#555555] mt-1.5 text-right">
              {(nextLeague.min - profile.xp).toLocaleString()} XP to go
            </p>
          </div>
        )}
      </div>

      {/* Stat cards */}
      <div className="px-5 pt-5">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Level',       value: profile.level,           icon: '🎓', color: '#0D9488' },
            { label: 'Day streak',  value: profile.current_streak,  icon: '🔥', color: '#FB923C' },
            { label: 'Best streak', value: profile.longest_streak,  icon: '⚡', color: '#0D9488' },
          ].map(stat => (
            <div key={stat.label} className="bg-[#141414] rounded-2xl p-4 text-center border border-[#1F1F1F] flex flex-col items-center gap-1.5">
              <span className="text-xl">{stat.icon}</span>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-[10px] text-[#888888]">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="px-5 mt-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-semibold text-[#0D9488] uppercase tracking-widest">Leaderboard</p>
          <span className="text-xs text-[#555555]">Top 20 · all-time</span>
        </div>

        {/* Column headers */}
        <div className="flex items-center px-4 mb-2">
          <div className="w-9 shrink-0" />
          <div className="w-10 shrink-0 mx-3" />
          <p className="flex-1 text-[10px] font-semibold text-[#555555] uppercase tracking-widest">Name</p>
          <div className="flex items-center gap-4 shrink-0">
            <span className="text-[10px] font-semibold text-[#555555] uppercase tracking-widest w-12 text-center">⚡ XP</span>
            <span className="text-[10px] font-semibold text-[#555555] uppercase tracking-widest w-12 text-center">🔥 Streak</span>
          </div>
        </div>

        <div className="bg-[#141414] rounded-2xl border border-[#1F1F1F] overflow-hidden">
          {topUsers && topUsers.length > 0 ? topUsers.map((u, i) => {
            const isMe = u.id === user.id
            const rank = i + 1
            const initials = u.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

            // Rank badge style
            let badgeBg = '#1A1A1A'
            let badgeBorder = '#2A2A2A'
            let badgeText = '#555555'
            if (rank === 1) { badgeBg = '#0D9488'; badgeBorder = '#0D9488'; badgeText = '#000000' }
            else if (rank === 2) { badgeBg = 'transparent'; badgeBorder = '#C0C0C0'; badgeText = '#C0C0C0' }
            else if (rank === 3) { badgeBg = 'transparent'; badgeBorder = '#CD7F32'; badgeText = '#CD7F32' }

            return (
              <div
                key={u.id}
                className={`flex items-center gap-3 px-4 py-3.5 ${i < topUsers.length - 1 ? 'border-b border-[#1F1F1F]' : ''} transition-colors`}
                style={isMe ? { backgroundColor: '#0D94881A' } : {}}
              >
                {/* Rank badge — circular, numbered */}
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ backgroundColor: badgeBg, border: `2px solid ${badgeBorder}`, color: badgeText }}
                >
                  {rank}
                </div>

                {/* Avatar */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                  style={isMe
                    ? { backgroundColor: '#0D9488', color: '#000' }
                    : { backgroundColor: '#1F1F1F', color: '#888888' }
                  }
                >
                  {initials}
                </div>

                {/* Name + profession */}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-semibold truncate"
                    style={{ color: isMe ? '#5EEAD4' : '#FFFFFF' }}
                  >
                    {u.full_name}{isMe ? ' (you)' : ''}
                  </p>
                  <p className="text-xs text-[#555555] capitalize">Lv.{u.level}</p>
                </div>

                {/* XP + Streak columns */}
                <div className="flex items-center gap-4 shrink-0">
                  <p
                    className="text-sm font-bold w-12 text-center"
                    style={{ color: isMe ? '#5EEAD4' : '#888888' }}
                  >
                    {u.xp >= 1000 ? `${(u.xp / 1000).toFixed(1)}k` : u.xp}
                  </p>
                  <p
                    className="text-sm font-bold w-12 text-center"
                    style={{ color: isMe ? '#5EEAD4' : '#888888' }}
                  >
                    {u.current_streak}
                  </p>
                </div>
              </div>
            )
          }) : (
            <div className="p-8 text-center">
              <p className="text-[#888888] text-sm">No users yet — be the first!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
