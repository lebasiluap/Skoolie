import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  return <LandingPage />
}

function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">

      {/* ── NAV ─────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#1F1F1F] bg-[#0A0A0A]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#0D9488] flex items-center justify-center">
              <svg width="16" height="13" viewBox="0 0 56 44" fill="none">
                <path d="M0 22L14 4L28 22L14 40L0 22Z" fill="white" />
                <path d="M28 22L42 4L56 22L42 40L28 22Z" fill="white" fillOpacity="0.4" />
              </svg>
            </div>
            <span className="font-bold text-white tracking-tight">Skoolie</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-[#888888] hover:text-white transition-colors">Features</a>
            <a href="#practice" className="text-sm text-[#888888] hover:text-white transition-colors">Practice</a>
            <a href="#progress" className="text-sm text-[#888888] hover:text-white transition-colors">Progress</a>
            <a href="#leaderboard" className="text-sm text-[#888888] hover:text-white transition-colors">Leaderboard</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-[#888888] hover:text-white transition-colors hidden md:block">Sign in</Link>
            <Link href="/signup" className="px-4 py-2 rounded-full bg-[#0D9488] text-black text-sm font-semibold hover:bg-[#0b7a6e] transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────── */}
      <section className="pt-32 pb-20 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0D9488]/10 border border-[#0D9488]/30 text-[#0D9488] text-xs font-semibold mb-8">
            ✦ Trusted by 15,000+ healthcare students
          </div>
          <h1 className="text-4xl md:text-6xl font-bold leading-tight tracking-tight mb-6">
            Master Healthcare Exams<br />
            with <span className="text-[#0D9488]">Confidence</span>
          </h1>
          <p className="text-[#888888] text-lg leading-relaxed max-w-xl mx-auto mb-10">
            The smart study platform for Primary, Midwife, and Nursing students. Adaptive questions, real-time analytics, and gamified learning.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/signup" className="px-8 py-3.5 rounded-full bg-[#0D9488] text-black font-semibold text-base hover:bg-[#0b7a6e] transition-colors">
              Start for free →
            </Link>
            <Link href="/login" className="px-8 py-3.5 rounded-full border border-[#2A2A2A] text-white font-semibold text-base hover:bg-[#141414] transition-colors">
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* ── DASHBOARD SECTION ───────────────────────────────────────── */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-[10px] font-bold text-[#0D9488] uppercase tracking-widest text-center mb-3">Dashboard</p>
          <h2 className="text-3xl font-bold text-center mb-3">Your Learning Command Center</h2>
          <p className="text-[#888888] text-center text-sm mb-12 max-w-md mx-auto">
            Everything you need to ace your exam in streaks, XP, goals and rankings.
          </p>

          {/* Dashboard mockup */}
          <div className="bg-[#0D0D0D] rounded-3xl border border-[#1F1F1F] p-4 md:p-6 overflow-hidden">
            {/* Mock header */}
            <div className="flex items-center justify-between mb-5 px-1">
              <div>
                <p className="text-[#888888] text-xs">Welcome back,</p>
                <p className="text-white font-bold text-lg">Sarah</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-[#0D9488] flex items-center justify-center text-black text-sm font-bold">S</div>
            </div>
            {/* Stat grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-4">
              {[
                { icon: '🔥', label: 'Current Streak', value: '12 Days', teal: true },
                { icon: '⚡', label: 'XP Points', value: '4,850 XP', teal: false },
                { icon: '📊', label: 'Level Progress', value: '65%', teal: false },
                { icon: '🎯', label: 'Accuracy', value: '87%', teal: false },
              ].map(card => (
                <div
                  key={card.label}
                  className="rounded-xl p-3 flex flex-col gap-1.5"
                  style={card.teal
                    ? { backgroundColor: 'rgba(13,148,136,0.08)', border: '1px solid rgba(13,148,136,0.4)' }
                    : { backgroundColor: '#1A1A1A', border: '1px solid #1F1F1F' }
                  }
                >
                  <span className="text-lg">{card.icon}</span>
                  <p className="text-[#888888] text-[10px]">{card.label}</p>
                  <p className="text-white text-base font-bold">{card.value}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Weakest topics */}
              <div className="bg-[#141414] rounded-xl p-4 border border-[#1F1F1F]">
                <p className="text-white text-xs font-semibold mb-3">Weakest Topics</p>
                {[
                  { topic: 'Nephrology', pct: 28, color: '#EF4444' },
                  { topic: 'Pharmacokinetics', pct: 44, color: '#F97316' },
                  { topic: 'Gastroenterology', pct: 52, color: '#F97316' },
                  { topic: 'Cardiovascular', pct: 67, color: '#0D9488' },
                ].map(t => (
                  <div key={t.topic} className="mb-2.5">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] text-[#888888]">{t.topic}</span>
                      <span className="text-[10px] font-bold" style={{ color: t.color }}>{t.pct}%</span>
                    </div>
                    <div className="h-1 bg-[#1F1F1F] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${t.pct}%`, backgroundColor: t.color }} />
                    </div>
                  </div>
                ))}
              </div>
              {/* Continue Studying */}
              <div className="bg-[#141414] rounded-xl border border-[#1F1F1F] overflow-hidden">
                <p className="text-white text-xs font-semibold px-4 py-3 border-b border-[#1F1F1F]">Continue Studying</p>
                <div className="grid grid-cols-2">
                  {[
                    { icon: '📝', label: 'MCQ', sub: 'Multiple choice' },
                    { icon: '🃏', label: 'Flashcards', sub: 'Test your recall' },
                    { icon: '🩺', label: 'Case Studies', sub: 'Clinical scenarios' },
                    { icon: '🔖', label: 'Bookmarks', sub: 'Saved questions' },
                  ].map((m, i) => (
                    <div
                      key={m.label}
                      className={`flex flex-col gap-1 p-3 ${i % 2 === 0 ? 'border-r border-[#1F1F1F]' : ''} ${i < 2 ? 'border-b border-[#1F1F1F]' : ''}`}
                    >
                      <span className="text-base">{m.icon}</span>
                      <p className="text-xs font-semibold text-white">{m.label}</p>
                      <p className="text-[9px] text-[#888888]">{m.sub}</p>
                    </div>
                  ))}
                </div>
                <div className="px-3 py-2.5 border-t border-[#1F1F1F]">
                  <div className="w-full py-2 rounded-lg bg-[#0D9488] text-black text-xs font-bold text-center">
                    Browse all topics →
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRACTICE SECTION ────────────────────────────────────────── */}
      <section id="practice" className="py-20 px-6 bg-[#0D0D0D]">
        <div className="max-w-5xl mx-auto">
          <p className="text-[10px] font-bold text-[#0D9488] uppercase tracking-widest text-center mb-3">Practice</p>
          <h2 className="text-3xl font-bold text-center mb-3">Practice Smarter, Not Harder</h2>
          <p className="text-[#888888] text-center text-sm mb-12 max-w-md mx-auto">
            Adaptive questions that learn your weak spots. Concise explanations written by clinicians.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {/* MCQ mockup */}
            <div className="bg-[#141414] rounded-2xl border border-[#1F1F1F] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#1F1F1F] flex items-center justify-between">
                <div className="w-7 h-7 rounded-full bg-[#1F1F1F] flex items-center justify-center text-[#888888] text-sm">←</div>
                <span className="text-xs text-[#888888]">3 / 10</span>
                <div className="w-7 h-7 rounded-full bg-[#1F1F1F] flex items-center justify-center text-[#888888]">🔖</div>
              </div>
              <div className="h-1 bg-[#1F1F1F]"><div className="h-full bg-[#0D9488] w-1/3" /></div>
              <div className="p-4 flex flex-col gap-3">
                <div className="flex gap-2 flex-wrap">
                  <span className="text-[9px] bg-[#1F1F1F] text-[#888888] px-2 py-0.5 rounded-full">Cardiovascular</span>
                  <span className="text-[9px] bg-orange-400/10 text-orange-400 px-2 py-0.5 rounded-full">Medium</span>
                </div>
                <div className="bg-[#0D0D0D] rounded-xl p-3 border border-[#1F1F1F]">
                  <p className="text-white text-xs leading-relaxed font-medium">
                    A 58-year-old man presents with crushing chest pain radiating to the left arm for 30 minutes. ECG shows ST elevation in leads II, III, aVF. Which of the following is the most appropriate immediate management?
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  {[
                    { l: 'A', t: 'Aspirin 300mg + PCI within 90 minutes', sel: true },
                    { l: 'B', t: 'IV heparin + thrombolysis', sel: false },
                    { l: 'C', t: 'GTN spray + observation', sel: false },
                    { l: 'D', t: 'Echo + cardiac biomarkers only', sel: false },
                  ].map(opt => (
                    <div
                      key={opt.l}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all"
                      style={opt.sel
                        ? { borderColor: '#0D9488', backgroundColor: 'rgba(13,148,136,0.07)' }
                        : { borderColor: '#1F1F1F', backgroundColor: 'transparent' }
                      }
                    >
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                        style={opt.sel
                          ? { backgroundColor: '#0D9488', color: '#000' }
                          : { backgroundColor: '#1F1F1F', color: '#555555' }
                        }
                      >
                        {opt.l}
                      </div>
                      <span className="text-[10px] leading-snug" style={{ color: opt.sel ? '#5EEAD4' : '#CCCCCC' }}>{opt.t}</span>
                    </div>
                  ))}
                </div>
                <div className="w-full py-2.5 rounded-full bg-[#0D9488] text-black text-xs font-bold text-center">
                  Submit Answer
                </div>
              </div>
            </div>

            {/* Feature bullets */}
            <div className="flex flex-col gap-5 justify-center">
              {[
                { icon: '🎯', title: 'Adaptive difficulty', desc: 'Questions adjust to your performance. Crush your weak areas faster.' },
                { icon: '📖', title: 'Clinical explanations', desc: 'Every answer explained with referenced clinical guidelines, not textbook jargon.' },
                { icon: '🔄', title: 'No repeats', desc: 'Smart history tracking ensures you never see the same question twice until you need it.' },
                { icon: '📌', title: 'Bookmark & review', desc: 'Save tricky questions and revisit them during your next session.' },
              ].map(f => (
                <div key={f.title} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#0D9488]/10 border border-[#0D9488]/20 flex items-center justify-center text-xl shrink-0">
                    {f.icon}
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold mb-1">{f.title}</p>
                    <p className="text-[#888888] text-sm leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── PROGRESS SECTION ────────────────────────────────────────── */}
      <section id="progress" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-[10px] font-bold text-[#0D9488] uppercase tracking-widest text-center mb-3">Progress</p>
          <h2 className="text-3xl font-bold text-center mb-3">Track Every Step of Your Journey</h2>
          <p className="text-[#888888] text-center text-sm mb-12 max-w-md mx-auto">
            Deep insights into your strengths, weaknesses, and progress. Never wonder where to focus again.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Topic Mastery mockup */}
            <div className="bg-[#141414] rounded-2xl border border-[#1F1F1F] p-5">
              <p className="text-white text-xs font-semibold mb-4">Topic Mastery</p>
              {[
                { t: 'Cardiovascular System', pct: 88, color: '#0D9488' },
                { t: 'Pharmacology', pct: 74, color: '#0D9488' },
                { t: 'Respiratory', pct: 61, color: '#F97316' },
                { t: 'Gastroenterology', pct: 45, color: '#F97316' },
                { t: 'Nephrology', pct: 31, color: '#EF4444' },
              ].map(t => (
                <div key={t.t} className="mb-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[11px] text-[#888888]">{t.t}</span>
                    <span className="text-[11px] font-bold" style={{ color: t.color }}>{t.pct}%</span>
                  </div>
                  <div className="h-1.5 bg-[#1F1F1F] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${t.pct}%`, backgroundColor: t.color }} />
                  </div>
                </div>
              ))}
              {/* Progress Over Time bar chart */}
              <p className="text-white text-xs font-semibold mt-5 mb-3">Progress Over Time</p>
              <div className="flex items-end gap-1.5 h-12">
                {[40, 55, 50, 70, 65, 80, 75, 88].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t-sm"
                    style={{ height: `${h}%`, backgroundColor: i === 7 ? '#0D9488' : '#1F1F1F' }}
                  />
                ))}
              </div>
            </div>

            {/* Rank / circular progress */}
            <div className="flex flex-col gap-4">
              <div className="bg-[#141414] rounded-2xl border border-[#1F1F1F] p-5 flex items-center gap-5">
                {/* Circular progress */}
                <div className="relative w-20 h-20 shrink-0">
                  <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                    <circle cx="40" cy="40" r="32" fill="none" stroke="#1F1F1F" strokeWidth="8" />
                    <circle
                      cx="40" cy="40" r="32" fill="none" stroke="#0D9488" strokeWidth="8"
                      strokeDasharray={`${2 * Math.PI * 32 * 0.84} ${2 * Math.PI * 32}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white font-bold text-lg">84%</span>
                  </div>
                </div>
                <div>
                  <p className="text-[#888888] text-xs mb-1">Overall accuracy</p>
                  <p className="text-white text-2xl font-bold">84%</p>
                  <div className="mt-2 px-2.5 py-1 rounded-full bg-[#0D9488]/10 border border-[#0D9488]/30 inline-block">
                    <span className="text-[#0D9488] text-[10px] font-bold">Top 8%</span>
                  </div>
                </div>
              </div>

              {[
                { icon: '📈', title: 'Smart analytics', desc: 'See exactly which topics drag your score down — then fix them.' },
                { icon: '🏅', title: 'Global ranking', desc: 'Compare your performance with other students in real time.' },
                { icon: '📅', title: 'Study streaks', desc: 'Daily consistency tracked, rewarded, and displayed on your profile.' },
              ].map(f => (
                <div key={f.title} className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#0D9488]/10 border border-[#0D9488]/20 flex items-center justify-center text-base shrink-0">
                    {f.icon}
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold mb-0.5">{f.title}</p>
                    <p className="text-[#888888] text-xs leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── LEADERBOARD SECTION ─────────────────────────────────────── */}
      <section id="leaderboard" className="py-20 px-6 bg-[#0D0D0D]">
        <div className="max-w-5xl mx-auto">
          <p className="text-[10px] font-bold text-[#0D9488] uppercase tracking-widest text-center mb-3">Leaderboard</p>
          <h2 className="text-3xl font-bold text-center mb-3">Rise Through the Ranks</h2>
          <p className="text-[#888888] text-center text-sm mb-12 max-w-md mx-auto">
            Climb seven tiers — from Bronze to Diamond — and prove who studies hardest.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Leaderboard mockup */}
            <div className="bg-[#141414] rounded-2xl border border-[#1F1F1F] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#1F1F1F]">
                <p className="text-white text-xs font-semibold">Weekly Leaderboard</p>
              </div>
              {[
                { name: 'Adam Chen', xp: '3,240 XP', streak: 18, rank: 1, me: false },
                { name: 'Zara Mohammed', xp: '3,100 XP', streak: 14, rank: 2, me: false },
                { name: 'Priya Rao', xp: '2,890 XP', streak: 11, rank: 3, me: false },
                { name: 'Abebe Wolde', xp: '2,440 XP', streak: 9, rank: 4, me: false },
                { name: 'You', xp: '2,280 XP', streak: 7, rank: 5, me: true },
              ].map((u, i) => {
                let badgeBg = '#1A1A1A'; let badgeBorder = '#2A2A2A'; let badgeText = '#555555'
                if (u.rank === 1) { badgeBg = '#0D9488'; badgeBorder = '#0D9488'; badgeText = '#000' }
                else if (u.rank === 2) { badgeBg = 'transparent'; badgeBorder = '#C0C0C0'; badgeText = '#C0C0C0' }
                else if (u.rank === 3) { badgeBg = 'transparent'; badgeBorder = '#CD7F32'; badgeText = '#CD7F32' }
                return (
                  <div
                    key={u.name}
                    className={`flex items-center gap-3 px-4 py-3 ${i < 4 ? 'border-b border-[#1F1F1F]' : ''}`}
                    style={u.me ? { backgroundColor: 'rgba(13,148,136,0.1)' } : {}}
                  >
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                      style={{ backgroundColor: badgeBg, border: `1.5px solid ${badgeBorder}`, color: badgeText }}>
                      {u.rank}
                    </div>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                      style={{ backgroundColor: u.me ? '#0D9488' : '#1F1F1F', color: u.me ? '#000' : '#888888' }}>
                      {u.name[0]}
                    </div>
                    <p className="flex-1 text-xs font-semibold truncate" style={{ color: u.me ? '#5EEAD4' : '#FFF' }}>{u.name}</p>
                    <span className="text-xs font-bold" style={{ color: u.me ? '#5EEAD4' : '#888888' }}>{u.xp}</span>
                  </div>
                )
              })}
            </div>

            {/* League tiers */}
            <div className="flex flex-col gap-4">
              <div className="bg-[#141414] rounded-2xl border border-[#1F1F1F] p-5">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#C0C0C0]/10 border border-[#C0C0C0]/30 flex items-center justify-center text-2xl">🥈</div>
                  <div>
                    <p className="text-[#888888] text-xs">Your league</p>
                    <p className="text-[#C0C0C0] text-xl font-bold">Silver</p>
                    <p className="text-[#555555] text-xs">1,280 XP total</p>
                  </div>
                </div>
                <p className="text-white text-xs font-semibold mb-2">Goal Tiers</p>
                <div className="flex flex-col gap-1.5">
                  {[
                    { label: 'Bronze', color: '#CD7F32', done: true },
                    { label: 'Silver', color: '#C0C0C0', done: true },
                    { label: 'Gold', color: '#FFD700', done: false },
                    { label: 'Platinum', color: '#E5E4E2', done: false },
                    { label: 'Emerald', color: '#50C878', done: false },
                    { label: 'Sapphire', color: '#0F52BA', done: false },
                    { label: 'Diamond', color: '#B9F2FF', done: false },
                  ].map(tier => (
                    <div key={tier.label} className="flex items-center gap-2.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tier.color, opacity: tier.done ? 1 : 0.4 }} />
                      <span className="text-xs" style={{ color: tier.done ? tier.color : '#555555' }}>{tier.label}</span>
                      {tier.done && <span className="text-[9px] text-[#0D9488] ml-auto">✓ achieved</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HABITS SECTION ──────────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-[10px] font-bold text-[#0D9488] uppercase tracking-widest text-center mb-3">Habits</p>
          <h2 className="text-3xl font-bold text-center mb-3">Build Habits That Stick</h2>
          <p className="text-[#888888] text-center text-sm mb-12 max-w-md mx-auto">
            Daily streaks, XP rewards, and milestone badges keep you coming back every day.
          </p>

          <div className="grid md:grid-cols-3 gap-5">
            {/* Streak card */}
            <div className="bg-[#141414] rounded-2xl border border-[#1F1F1F] p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-[#0D9488]/10 border border-[#0D9488]/30 flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">14</span>
                </div>
                <div>
                  <p className="text-white font-bold">Day Streak</p>
                  <p className="text-[#888888] text-xs">Best: 31 days</p>
                </div>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {Array.from({ length: 14 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold"
                    style={{ backgroundColor: '#0D9488', color: '#000' }}
                  >
                    ✓
                  </div>
                ))}
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={`e-${i}`} className="w-6 h-6 rounded-full bg-[#1F1F1F]" />
                ))}
              </div>
            </div>

            {/* Milestone badges */}
            <div className="bg-[#141414] rounded-2xl border border-[#1F1F1F] p-5">
              <p className="text-white text-xs font-semibold mb-3">Milestone Badges</p>
              {[
                { icon: '🔥', name: 'Week Warrior', sub: '7-day streak', earned: true },
                { icon: '💎', name: 'Diamond Mind', sub: '100 questions', earned: true },
                { icon: '🧠', name: 'Brain Trust', sub: '500 correct', earned: false },
                { icon: '🏆', name: 'Top Scholar', sub: 'Reach Gold tier', earned: false },
              ].map(b => (
                <div key={b.name} className="flex items-center gap-3 mb-2.5">
                  <span className={`text-lg ${b.earned ? '' : 'opacity-30 grayscale'}`}>{b.icon}</span>
                  <div className="flex-1">
                    <p className={`text-xs font-semibold ${b.earned ? 'text-white' : 'text-[#555555]'}`}>{b.name}</p>
                    <p className="text-[10px] text-[#555555]">{b.sub}</p>
                  </div>
                  {b.earned && <span className="text-[9px] text-[#0D9488] font-bold">✓</span>}
                </div>
              ))}
            </div>

            {/* Daily XP Rewards */}
            <div className="bg-[#141414] rounded-2xl border border-[#1F1F1F] p-5">
              <p className="text-white text-xs font-semibold mb-3">Daily XP Rewards</p>
              {[
                { action: 'Correct answer', xp: '+10 XP' },
                { action: 'Wrong answer', xp: '+2 XP' },
                { action: 'Flashcard known', xp: '+5 XP' },
                { action: 'Case study Q', xp: '+10 XP' },
                { action: 'Daily streak', xp: '+25 XP' },
              ].map(r => (
                <div key={r.action} className="flex items-center justify-between py-2 border-b border-[#1F1F1F] last:border-0">
                  <span className="text-xs text-[#888888]">{r.action}</span>
                  <span className="text-xs font-bold text-[#0D9488]">{r.xp}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-[#0D0D0D]">
        <div className="max-w-5xl mx-auto">
          <p className="text-[10px] font-bold text-[#0D9488] uppercase tracking-widest text-center mb-3">Student Reviews</p>
          <h2 className="text-3xl font-bold text-center mb-12">Loved by Healthcare Students</h2>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                stars: 5,
                text: 'The weakest topics section is genius. I focused on nephrology for a week and went from 28% to 74% accuracy. Passed my primaries on first attempt.',
                name: 'Aisha Kamara',
                role: 'Primary Care, Year 3',
              },
              {
                stars: 5,
                text: 'I love that it never repeats questions until I actually need the review. The case studies are exactly what I needed for clinical training.',
                name: 'Marcus Osei',
                role: 'Nursing Student, Year 2',
              },
              {
                stars: 5,
                text: 'The streak system kept me studying every day even when I felt unmotivated. My accuracy went from 61% to 89% in two months.',
                name: 'Fatima Al-Hassan',
                role: 'Midwifery, Year 4',
              },
            ].map(t => (
              <div key={t.name} className="bg-[#141414] rounded-2xl border border-[#1F1F1F] p-5">
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <span key={i} className="text-[#0D9488] text-sm">★</span>
                  ))}
                </div>
                <p className="text-[#CCCCCC] text-sm leading-relaxed mb-4">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#0D9488]/20 border border-[#0D9488]/30 flex items-center justify-center text-xs font-bold text-[#0D9488]">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-white text-xs font-semibold">{t.name}</p>
                    <p className="text-[#555555] text-[10px]">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER CTA ──────────────────────────────────────────────── */}
      <section className="py-24 px-6 text-center">
        <div className="max-w-xl mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-[#0D9488] flex items-center justify-center mx-auto mb-6">
            <svg width="28" height="22" viewBox="0 0 56 44" fill="none">
              <path d="M0 22L14 4L28 22L14 40L0 22Z" fill="white" />
              <path d="M28 22L42 4L56 22L42 40L28 22Z" fill="white" fillOpacity="0.4" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold mb-3">Start Mastering Your Exams Today</h2>
          <p className="text-[#888888] text-sm mb-8 max-w-sm mx-auto leading-relaxed">
            Join thousands of healthcare students who study smarter with Skoolie.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap mb-14">
            <Link href="/signup" className="px-8 py-3.5 rounded-full bg-[#0D9488] text-black font-semibold text-base hover:bg-[#0b7a6e] transition-colors">
              Create free account →
            </Link>
            <Link href="/login" className="px-8 py-3.5 rounded-full border border-[#2A2A2A] text-white font-semibold text-base hover:bg-[#141414] transition-colors">
              Sign in
            </Link>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-4 gap-6">
            {[
              { value: '15,000+', label: 'Students' },
              { value: '250,000+', label: 'Questions answered' },
              { value: '94%', label: 'Pass rate' },
              { value: '4.9/5', label: 'Rating' },
            ].map(s => (
              <div key={s.label}>
                <p className="text-white text-lg font-bold">{s.value}</p>
                <p className="text-[#555555] text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────── */}
      <footer className="border-t border-[#1F1F1F] px-6 py-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#0D9488] flex items-center justify-center">
              <svg width="12" height="10" viewBox="0 0 56 44" fill="none">
                <path d="M0 22L14 4L28 22L14 40L0 22Z" fill="white" />
                <path d="M28 22L42 4L56 22L42 40L28 22Z" fill="white" fillOpacity="0.4" />
              </svg>
            </div>
            <span className="text-sm font-bold text-[#888888]">Skoolie</span>
          </div>
          <p className="text-[#555555] text-xs">© 2026 Skoolie. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
