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
    body: 'Practice on any day to keep it alive — miss a day and it resets. Long streaks earn badge tiers, and Streak Freezes can save you when life happens.',
  },
  freeze: {
    mascot: 'noggin',
    title: 'You have a Streak Freeze 🧊',
    body: "Miss a day and a freeze is spent automatically — your streak survives, and that day shows blue in your tracker. Earn one for every 5 barrages you complete.",
  },
  tier: {
    mascot: 'cappy',
    title: 'Your specialty rank',
    body: "This rank grows with how many distinct questions you've answered AND how broadly you practice — grinding one topic won't cut it. Once earned, it never drops.",
  },
  league: {
    mascot: 'buddy',
    title: 'The weekly league',
    body: "Everyone's weekly XP resets Monday. Finish top 10 in your league to get promoted; the bottom 5 drop down. Your all-time XP is safe — this is just the weekly race.",
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
