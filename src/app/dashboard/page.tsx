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
      .sort((a, b) => a.accuracy - b.accuracy) // weakest first
      .slice(0, 4)
  }

  const initials = profile.full_name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const xpToNextLevel = profile.level * 400
  const xpProgress = Math.min((profile.xp / xpToNextLevel) * 100, 100)

  const firstName = profile.full_name.split(' ')[0]

  async function handleLogout() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <div className="px-5 pt-12 pb-5 flex items-center justify-between border-b border-[#1F1F1F]">
        <div>
          <p className="text-[#888888] text-xs font-medium">Welcome back,</p>
          <p className="text-white font-semibold text-xl mt-0.5">{firstName}</p>
        </div>
        <div className="flex items-center gap-3">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="Profile" className="w-10 h-10 rounded-full object-cover ring-2 ring-[#1F1F1F]" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#0D9488] flex items-center justify-center text-black text-sm font-bold">
              {initials}
            </div>
          )}
        </div>
      </div>

      <div className="px-5 py-5 pb-28 flex flex-col gap-5">

        {/* Top stat cards */}
        <div className="grid grid-cols-2 gap-3">
          {/* Streak card — teal accent */}
          <div className="bg-[#0D9488]/10 rounded-2xl p-4 border border-[#0D9488] flex flex-col gap-2">
            <span className="text-2xl">🔥</span>
            <p className="text-[#888888] text-xs font-medium">Current Streak</p>
            <p className="text-white text-2xl font-bold">{profile.current_streak} Days</p>
          </div>

          {/* XP card */}
          <div className="bg-[#1A1A1A] rounded-2xl p-4 border border-[#1F1F1F] flex flex-col gap-2">
            <span className="text-2xl">⚡</span>
            <p className="text-[#888888] text-xs font-medium">XP Points</p>
            <p className="text-white text-2xl font-bold">{profile.xp.toLocaleString()} XP</p>
          </div>

          {/* Accuracy / Progress card */}
          <div className="bg-[#1A1A1A] rounded-2xl p-4 border border-[#1F1F1F] flex flex-col gap-2">
            <span className="text-2xl">📊</span>
            <p className="text-[#888888] text-xs font-medium">Level Progress</p>
            <p className="text-white text-2xl font-bold">{Math.round(xpProgress)}%</p>
            <div className="h-1.5 bg-[#1F1F1F] rounded-full overflow-hidden">
              <div className="h-full bg-[#0D9488] rounded-full" style={{ width: `${xpProgress}%` }} />
            </div>
          </div>

          {/* Accuracy */}
          <div className="bg-[#1A1A1A] rounded-2xl p-4 border border-[#1F1F1F] flex flex-col gap-2">
            <span className="text-2xl">🎯</span>
            <p className="text-[#888888] text-xs font-medium">Accuracy</p>
            <p className="text-white text-2xl font-bold">{avgAccuracy !== null ? `${avgAccuracy}%` : '—'}</p>
          </div>
        </div>

        {/* Weakest topics */}
        {topicStats.length > 0 && (
          <div className="bg-[#141414] rounded-2xl p-5 border border-[#1F1F1F]">
            <p className="text-white text-sm font-semibold mb-4">Weakest Topics</p>
            <div className="flex flex-col gap-4">
              {topicStats.map(({ topic, total, correct, accuracy }) => (
                <div key={topic}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-medium text-[#888888] truncate max-w-[65%]">{topic}</span>
                    <span className={`text-xs font-bold ${accuracy >= 70 ? 'text-[#0D9488]' : accuracy >= 50 ? 'text-orange-400' : 'text-red-400'}`}>
                      {accuracy}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-[#1F1F1F] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${accuracy >= 70 ? 'bg-[#0D9488]' : accuracy >= 50 ? 'bg-orange-400' : 'bg-red-400'}`}
                      style={{ width: `${accuracy}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Study modes */}
        <div className="bg-[#141414] rounded-2xl border border-[#1F1F1F] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#1F1F1F]">
            <p className="text-white text-sm font-semibold">Continue Studying</p>
          </div>
          <div className="grid grid-cols-2">
            {[
              { label: 'MCQ', icon: '📝', href: '/practice/mcq', sub: 'Multiple choice' },
              { label: 'Flashcards', icon: '🃏', href: '/practice/flashcards', sub: 'Test your recall' },
              { label: 'Case Studies', icon: '🩺', href: '/practice/cases', sub: 'Clinical scenarios' },
              { label: 'Bookmarks', icon: '🔖', href: '/bookmarks', sub: 'Saved questions' },
            ].map((mode, i) => (
              <Link
                key={mode.label}
                href={mode.href}
                className={`flex flex-col gap-1.5 p-4 hover:bg-[#1A1A1A] transition-colors ${i % 2 === 0 ? 'border-r border-[#1F1F1F]' : ''} ${i < 2 ? 'border-b border-[#1F1F1F]' : ''}`}
              >
                <span className="text-xl">{mode.icon}</span>
                <p className="text-sm font-semibold text-white">{mode.label}</p>
                <p className="text-[10px] text-[#888888]">{mode.sub}</p>
              </Link>
            ))}
          </div>
          <div className="px-5 py-4 border-t border-[#1F1F1F]">
            <Link
              href="/practice"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#0D9488] text-black text-sm font-semibold hover:bg-[#0b7a6e] transition-colors"
            >
              Browse all topics →
            </Link>
          </div>
        </div>

        {/* Recent activity */}
        {recentSessions && recentSessions.length > 0 && (
          <div className="bg-[#141414] rounded-2xl border border-[#1F1F1F] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#1F1F1F]">
              <p className="text-white text-sm font-semibold">Recent Activity</p>
            </div>
            <div className="flex flex-col">
              {recentSessions.map((session, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between px-5 py-3.5 ${i < recentSessions.length - 1 ? 'border-b border-[#1F1F1F]' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#0D9488]/15 border border-[#0D9488]/20 flex items-center justify-center text-sm">📝</div>
                    <div>
                      <p className="text-sm font-medium text-white">Quiz session</p>
                      <p className="text-xs text-[#888888]">{session.score} / {session.question_ids?.length} correct</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-[#0D9488]">+{session.xp_earned} XP</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sign out */}
        <form action={handleLogout}>
          <button
            type="submit"
            className="w-full py-3 rounded-full border border-[#2A2A2A] text-[#555555] text-sm font-semibold hover:bg-[#141414] hover:text-[#888888] transition-colors"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  )
}
