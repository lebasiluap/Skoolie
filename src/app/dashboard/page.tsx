import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import BottomNav from '@/components/BottomNav'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch user profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/onboarding')

  // Fetch all sessions for stats + recent 4 for activity list
  const { data: allSessions } = await supabase
    .from('quiz_sessions')
    .select('score, question_ids, xp_earned, started_at, answers')
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })

  const recentSessions = allSessions?.slice(0, 4) ?? []
  const totalAnswered = allSessions?.reduce((acc, s) => acc + (s.question_ids?.length ?? 0), 0) ?? 0
  const totalCorrect  = allSessions?.reduce((acc, s) => acc + (s.score ?? 0), 0) ?? 0
  const avgAccuracy   = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : null

  // Build topic performance breakdown
  const allQuestionIds = [...new Set(allSessions?.flatMap(s => s.question_ids ?? []) ?? [])]
  let topicStats: { topic: string; total: number; correct: number; accuracy: number }[] = []

  if (allQuestionIds.length > 0) {
    const { data: questionMeta } = await supabase
      .from('questions')
      .select('id, topic, correct_answer')
      .in('id', allQuestionIds)

    if (questionMeta) {
      const qMap = new Map(questionMeta.map(q => [q.id, q]))
      const topicMap = new Map<string, { total: number; correct: number }>()

      for (const session of allSessions ?? []) {
        const answers = session.answers as Record<string, string> | null
        for (const qId of session.question_ids ?? []) {
          const q = qMap.get(qId)
          if (!q) continue
          const entry = topicMap.get(q.topic) ?? { total: 0, correct: 0 }
          entry.total += 1
          if (answers?.[qId] === q.correct_answer) entry.correct += 1
          topicMap.set(q.topic, entry)
        }
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#101010] px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-white/60 text-xs">Good morning,</p>
          <p className="text-white font-semibold text-base">{profile.full_name} 👋</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs bg-[#0D9488]/20 text-[#0D9488] px-3 py-1 rounded-full font-semibold">
            🔥 {profile.current_streak} day streak
          </span>
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="Profile" className="w-9 h-9 rounded-full object-cover" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-[#0D9488] flex items-center justify-center text-white text-sm font-bold">
              {initials}
            </div>
          )}
        </div>
      </div>

      <div className="px-5 py-6 space-y-6">
        {/* XP Progress */}
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
        <div>
          <h2 className="text-sm font-semibold text-[#101010] mb-3">Your stats</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Questions answered', value: totalAnswered, color: 'text-[#0D9488]' },
              { label: 'Avg accuracy', value: avgAccuracy !== null ? `${avgAccuracy}%` : '—', color: 'text-green-500' },
              { label: 'Current streak', value: `${profile.current_streak}d`, color: 'text-orange-500' },
              { label: 'Longest streak', value: `${profile.longest_streak}d`, color: 'text-[#0D9488]' },
            ].map(stat => (
              <div key={stat.label} className="bg-white rounded-2xl p-4 shadow-sm">
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-gray-400 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Topic performance */}
        {topicStats.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-[#101010] mb-3">Topic performance</h2>
            <div className="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-3">
              {topicStats.map(({ topic, total, correct, accuracy }) => (
                <div key={topic}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-semibold text-[#101010] truncate max-w-[60%]">{topic}</span>
                    <span className="text-xs text-gray-400">{correct}/{total} · <span className={`font-semibold ${accuracy >= 70 ? 'text-[#0D9488]' : accuracy >= 50 ? 'text-orange-500' : 'text-red-400'}`}>{accuracy}%</span></span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
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
          <h2 className="text-sm font-semibold text-[#101010] mb-3">Start studying</h2>
          <div className="flex gap-3">
            {[
              { label: 'MCQ', icon: '📝', href: '/practice/mcq' },
              { label: 'Flashcards', icon: '🃏', href: '/practice/flashcards' },
              { label: 'Bookmarks', icon: '🔖', href: '/bookmarks' },
            ].map(mode => (
              <Link
                key={mode.label}
                href={mode.href}
                className="flex-1 bg-white rounded-2xl p-4 shadow-sm flex flex-col items-center gap-2 hover:border-[#0D9488] border-2 border-transparent transition-all"
              >
                <span className="text-2xl">{mode.icon}</span>
                <span className="text-xs font-semibold text-[#101010]">{mode.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div>
          <h2 className="text-sm font-semibold text-[#101010] mb-3">Recent activity</h2>
          {recentSessions && recentSessions.length > 0 ? (
            <div className="flex flex-col gap-3">
              {recentSessions.map((session, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#101010]">Quiz session</p>
                    <p className="text-xs text-gray-400 mt-0.5">{session.score} / {session.question_ids?.length} correct</p>
                  </div>
                  <span className="text-sm font-bold text-[#0D9488]">+{session.xp_earned} XP</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
              <p className="text-gray-400 text-sm">No sessions yet — start a quiz to see your history!</p>
            </div>
          )}
        </div>

        {/* Sign out */}
        <form action={handleLogout}>
          <button
            type="submit"
            className="w-full py-3 rounded-full border border-gray-200 text-gray-500 text-sm font-semibold hover:bg-gray-100 transition-colors"
          >
            Sign out
          </button>
        </form>
      </div>

      <BottomNav />
    </div>
  )
}
