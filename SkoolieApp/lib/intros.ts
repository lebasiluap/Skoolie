// First-encounter explanations — one short, mascot-led card per system,
// shown ONCE at the system's first natural surface (audit: the app runs eight
// progression systems with zero pedagogy; introduce each one when it first
// matters, never all at once).
//
// Seen-state lives in user_profiles.intros_seen (syncs across devices).

export type IntroKey = 'xp' | 'streak' | 'freeze' | 'tier' | 'league' | 'barrage' | 'readiness'

export type IntroMascot = 'cappy' | 'noggin' | 'buddy'

export const INTROS: Record<IntroKey, { mascot: IntroMascot; title: string; body: string }> = {
  xp: {
    mascot: 'cappy',
    title: 'You earned XP!',
    body: 'Every finished session pays up to 50 XP — more with timed mode and bonuses. XP powers your level and the weekly leaderboard. Show up, answer, climb.',
  },
  streak: {
    mascot: 'cappy',
    title: "That's a streak! 🔥",
    body: 'Complete a verified practice session to earn one streak day. Extra sessions on the same day do not add days. A missed day breaks the streak unless a freeze protects it.',
  },
  freeze: {
    mascot: 'noggin',
    title: 'You have a Streak Freeze 🧊',
    body: "A freeze protects a missed day without increasing your streak. Protected days show blue, not as studied days. Earn one for every 5 barrages you complete.",
  },
  tier: {
    mascot: 'cappy',
    title: 'Your specialty rank',
    body: "This rank grows with how many distinct questions you've answered AND how broadly you practice — grinding one topic won't cut it. Once earned, it never drops.",
  },
  league: {
    mascot: 'buddy',
    title: 'The weekly league',
    body: "Everyone's weekly XP resets Monday. Finish top 3 in your league to get promoted; the bottom 3 drop down. Your all-time XP is safe — this is just the weekly race.",
  },
  barrage: {
    mascot: 'buddy',
    title: 'Surprise Barrage! ⚡',
    body: 'Twice a day, a secret 1-hour window opens where a rapid-fire blitz pays 2× XP. Catch it while it lasts — and every 5 completed barrages earn you a Streak Freeze.',
  },
  readiness: {
    mascot: 'noggin',
    title: 'Your exam readiness',
    body: 'One score blending accuracy, coverage, breadth, retention and consistency. The plan underneath tells you exactly what to practice next to raise it.',
  },
}
