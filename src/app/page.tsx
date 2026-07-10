import Link from 'next/link'
import StoreBadges from '@/components/StoreBadges'

const DK = '#15302B'

/** Cappy — the Skoolie mascot (inlined from SkoolieApp/components/mascots/CappyHead.tsx, idle expression). */
function Cappy({ size = 160 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 130 130" role="img" aria-label="Cappy, the Skoolie mascot">
      {/* Body capsule */}
      <rect x={40} y={24} width={50} height={92} rx={25} fill="#0E9E8E" />
      {/* Coral belly section */}
      <path d="M40 80 H90 V94 a25 25 0 0 1 -50 0 Z" fill="#F2774E" />
      {/* Seam line */}
      <rect x={40} y={78.5} width={50} height={3} fill="#fff" opacity={0.9} />
      {/* Shine */}
      <ellipse cx={55} cy={58} rx={9} ry={18} fill="#fff" opacity={0.16} />
      {/* Cheeks */}
      <circle cx={49} cy={66} r={4} fill="#F2774E" opacity={0.45} />
      <circle cx={81} cy={66} r={4} fill="#F2774E" opacity={0.45} />
      {/* Eyes */}
      <ellipse cx={58} cy={58} rx={9} ry={10} fill="#fff" />
      <ellipse cx={72} cy={58} rx={9} ry={10} fill="#fff" />
      <circle cx={59.5} cy={59.5} r={4.6} fill={DK} />
      <circle cx={73.5} cy={59.5} r={4.6} fill={DK} />
      <circle cx={56.4} cy={55.6} r={1.8} fill="#fff" />
      <circle cx={70.4} cy={55.6} r={1.8} fill="#fff" />
      {/* Smile */}
      <path d="M57 66 Q65 73 73 66" stroke={DK} strokeWidth={3} fill="none" strokeLinecap="round" />
      {/* Grad cap */}
      <path d="M65 10 L96 22 L65 34 L34 22 Z" fill="#16221F" />
      <circle cx={65} cy={22} r={3} fill="#27C2AE" />
      {/* Tassel */}
      <path d="M96 22 v11" stroke="#F2774E" strokeWidth={2.4} fill="none" strokeLinecap="round" />
      <circle cx={96} cy={34} r={2.6} fill="#F2774E" />
    </svg>
  )
}

const FEATURES = [
  {
    emoji: '📚',
    tint: 'var(--teal-tint)',
    title: 'A question bank that gets you',
    body: 'Thousands of MCQs, flashcards, and clinical cases written for pharmacy, medicine, and nursing students in Ghana — with explanations that actually teach.',
  },
  {
    emoji: '🔥',
    tint: 'var(--coral-tint)',
    title: 'Streaks & leagues',
    body: 'Keep your streak alive, earn XP, and climb weekly leagues against fellow students. Studying is easier when it feels like a game.',
  },
  {
    emoji: '⚡',
    tint: 'var(--amber-tint)',
    title: 'Daily challenge',
    body: 'A fresh bite-sized challenge every day keeps concepts warm — five minutes on a trotro is enough to stay sharp.',
  },
  {
    emoji: '🎯',
    tint: 'var(--green-tint)',
    title: 'Exam readiness insights',
    body: 'See your strengths and weak topics at a glance, track progress over time, and walk into exam day knowing exactly where you stand.',
  },
]

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <header className="mx-auto w-full max-w-5xl px-6 pt-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cappy size={40} />
          <span className="text-xl font-black" style={{ color: 'var(--teal)' }}>
            Skoolie
          </span>
        </div>
        <nav className="flex items-center gap-5 text-sm font-bold" style={{ color: 'var(--text-soft)' }}>
          <Link href="/terms" className="hover:underline">Terms</Link>
          <Link href="/privacy" className="hover:underline">Privacy</Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto w-full max-w-3xl px-6 pt-14 pb-16 sm:pt-20 text-center flex flex-col items-center">
        <div className="anim-pop">
          <Cappy size={150} />
        </div>
        <h1
          className="mt-6 text-5xl sm:text-6xl font-black tracking-tight"
          style={{ color: 'var(--text)' }}
        >
          Skoolie
        </h1>
        <p className="mt-3 text-2xl sm:text-3xl font-extrabold" style={{ color: 'var(--teal)' }}>
          Study smarter. Pass with confidence.
        </p>
        <p
          className="mt-4 max-w-xl text-base sm:text-lg font-semibold leading-relaxed"
          style={{ color: 'var(--text-soft)' }}
        >
          MCQs, flashcards, and clinical cases for pharmacy, medicine, and nursing students —
          with streaks, leagues, and a daily challenge that make exam prep feel like a game.
        </p>
        <div className="mt-9">
          <StoreBadges />
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto w-full max-w-5xl px-6 pb-20">
        <div className="grid gap-5 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-3xl p-6 border"
              style={{
                background: 'var(--surface)',
                borderColor: 'var(--border)',
                boxShadow: 'var(--shadow)',
              }}
            >
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl"
                style={{ background: f.tint }}
              >
                {f.emoji}
              </div>
              <h2 className="mt-4 text-lg font-extrabold" style={{ color: 'var(--text)' }}>
                {f.title}
              </h2>
              <p className="mt-2 text-sm font-semibold leading-relaxed" style={{ color: 'var(--text-soft)' }}>
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="mx-auto w-full max-w-5xl px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm font-bold" style={{ color: 'var(--text-faint)' }}>
            © {new Date().getFullYear()} Skoolie · Made for health students in Ghana 🇬🇭
          </p>
          <nav className="flex items-center gap-5 text-sm font-bold" style={{ color: 'var(--text-soft)' }}>
            <Link href="/terms" className="hover:underline">Terms</Link>
            <Link href="/privacy" className="hover:underline">Privacy</Link>
            <a href="mailto:support@skoolieapp.com" className="hover:underline" style={{ color: 'var(--teal)' }}>
              support@skoolieapp.com
            </a>
          </nav>
        </div>
      </footer>
    </main>
  )
}
