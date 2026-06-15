import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'


export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/onboarding')

  const { data: allSessions } = await supabase
    .from('quiz_sessions')
    .select('score, question_ids, xp_earned, started_at')
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })

  const recentSessions = allSessions?.slice(0, 4) ?? []
  const totalAnswered = allSessions?.reduce((acc, s) => acc + (s.question_ids?.length ?? 0), 0) ?? 0
  const totalCorrect  = allSessions?.reduce((acc, s) => acc + (s.score ?? 0), 0) ?? 0
  const avgAccuracy   = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : null

  let topicStats: { topic: string; total: number; correct: number; accuracy: number }[] = []

  const { data: historyRows } = await supabase
    .from('user_question_history')
    .select('topic, was_correct')
    .eq('user_id', user.id)
    .eq('question_type', 'mcq')

  if (historyRows && historyRows.length > 0) {
    const topicMap = new Map<string, { total: number; correct: number }>()
    for (const row of historyRows) {
      if (!row.topic) continue
      const entry = topicMap.get(row.topic) ?? { total: 0, correct: 0 }
      entry.total += 1
      if (row.was_correct) entry.correct += 1
      topicMap.set(row.topic, entry)
    }
    topicStats = Array.from(topicMap.entries())
      .map(([topic, { total, correct }]) => ({
        topic,
        total,
        correct,
        accuracy: Math.round((correct / total) * 100),
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6)
  }

  const initials = profile.full_name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const xpToNextLevel = 400
  const xpProgress = Math.min((profile.xp / xpToNextLevel) * 100, 100)

  async function handleLogout() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <div className="bg-[#0A0A0A] px-5 pt-12 pb-5 flex items-center justify-between border-b border-[#1F1F1F]">
        <div>
          <p className="text-[#888888] text-xs">Good morning,</p>
          <p className="text-white font-semibold text-base">{profile.full_name}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs bg-[#0D9488]/15 text-[#0D9488] px-3 py-1 rounded-full font-semibold border border-[#0D9488]/30">
            🔥 {profile.current_streak}d streak
          </span>
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="Profile" className="w-9 h-9 rounded-full object-cover ring-2 ring-[#1F1F1F]" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-[#0D9488] flex items-center justify-center text-black text-sm font-bold">
              {initials}
            </div>
          )}
        </div>
      </div>

      <div className="px-5 py-5 space-y-5 pb-28">
        {/* XP Progress */}
        <div className="bg-[#141414] rounded-2xl p-4 border border-[#1F1F1F]">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-semibold text-white">Level {profile.level}</span>
            <span className="text-xs text-[#888888]">{profile.xp} / {xpToNextLevel} XP</span>
          </div>
          <div className="h-1.5 bg-[#1F1F1F] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#0D9488] rounded-full transition-all"
              style={{ width: `${xpProgress}%` }}
            />
          </div>
          <p className="text-xs text-[#555555] mt-2">{xpToNextLevel - profile.xp} XP to Level {profile.level + 1}</p>
        </div>

        {/* Stats */}
        <div>
          <p className="text-[10px] font-semibold text-[#0D9488] uppercase tracking-widest mb-3">Your stats</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Questions answered', value: totalAnswered, color: 'text-[#0D9488]' },
              { label: 'Avg accuracy', value: avgAccuracy !== null ? `${avgAccuracy}%` : '—', color: 'text-[#0D9488]' },
              { label: 'Current streak', value: `${profile.current_streak}d`, color: 'text-orange-400' },
              { label: 'Longest streak', value: `${profile.longest_streak}d`, color: 'text-[#0D9488]' },
            ].map(stat => (
              <div key={stat.label} className="bg-[#141414] rounded-2xl p-4 border border-[#1F1F1F]">
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-[#888888] mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Topic performance */}
        {topicStats.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-[#0D9488] uppercase tracking-widest mb-3">Topic performance</p>
            <div className="bg-[#141414] rounded-2xl p-4 border border-[#1F1F1F] flex flex-col gap-4">
              {topicStats.map(({ topic, total, correct, accuracy }) => (
                <div key={topic}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-semibold text-white truncate max-w-[60%]">{topic}</span>
                    <span className="text-xs text-[#888888]">
                      {correct}/{total} ·{' '}
                      <span className={`font-semibold ${accuracy >= 70 ? 'text-[#0D9488]' : accuracy >= 50 ? 'text-orange-400' : 'text-red-400'}`}>
                        {accuracy}%
                      </span>
                    </span>
                  </div>
                  <div className="h-1.5 bg-[#1F1F1F] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${accuracy >= 70 ? 'bg-[#0D9488]' : accuracy >= 50 ? 'bg-orange-400' : 'bg-red-400'}`}
                      style={{ width: `${accuracy}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Start studying */}
        <div>
          <p className="text-[10px] font-semibold text-[#0D9488] uppercase tracking-widest mb-3">Start studying</p>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'MCQ', icon: '📝', href: '/practice/mcq' },
              { label: 'Cards', icon: '🃏', href: '/practice/flashcards' },
              { label: 'Cases', icon: '🩺', href: '/practice/cases' },
              { label: 'Saved', icon: '🔖', href: '/bookmarks' },
            ].map(mode => (
              <Link
                key={mode.label}
                href={mode.href}
                className="bg-[#141414] rounded-2xl p-3 border border-[#1F1F1F] flex flex-col items-center gap-2 hover:border-[#0D9488]/50 transition-all"
              >
                <span className="text-2xl">{mode.icon}</span>
                <span className="text-[10px] font-semibold text-[#888888]">{mode.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div>
          <p className="text-[10px] font-semibold text-[#0D9488] uppercase tracking-widest mb-3">Recent activity</p>
          {recentSessions && recentSessions.length > 0 ? (
            <div className="flex flex-col gap-2">
              {recentSessions.map((session, i) => (
                <div key={i} className="bg-[#141414] rounded-2xl p-4 border border-[#1F1F1F] flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">Quiz session</p>
                    <p className="text-xs text-[#888888] mt-0.5">{session.score} / {session.question_ids?.length} correct</p>
                  </div>
                  <span className="text-sm font-bold text-[#0D9488]">+{session.xp_earned} XP</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-[#141414] rounded-2xl p-6 border border-[#1F1F1F] text-center">
              <p className="text-[#888888] text-sm">No sessions yet — start a quiz to see your history!</p>
            </div>
          )}
        </div>

        {/* Sign out */}
        <form action={handleLogout}>
          <button
            type="submit"
            className="w-full py-3 rounded-full border border-[#2A2A2A] text-[#888888] text-sm font-semibold hover:bg-[#141414] transition-colors"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  )
}
