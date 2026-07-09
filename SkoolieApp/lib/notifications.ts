/**
 * Local push notifications — mascot-voiced nudges, no server required.
 *
 * Everything here is SCHEDULED LOCALLY and recomputed every time the dashboard
 * gains focus (rescheduleAll cancels + rebuilds), so messages always reflect
 * current state. The barrage window is deterministic per user/day, so even the
 * "live event" ping needs no backend. Remote (server-sent) push stays a later
 * phase.
 *
 * Voices: Cappy (the capsule — upbeat coach), Noggin (the brain — dry, nerdy),
 * Buddy (the speech bubble — warm best-friend energy).
 */
import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { barrageWindows } from '@/lib/barrage'
import { weekStartKey, type ZoneEvent } from '@/lib/league'

// expo-notifications is a NATIVE module — loading it eagerly crashes on any
// runtime whose binary doesn't include it yet (Expo Go variants, stale dev
// clients: "Cannot find native module 'ExpoPushTokenManager'"). Load lazily
// and degrade to a no-op; notifications light up automatically once the app
// runs in a build that includes the module.
type NotificationsModule = typeof import('expo-notifications')
let _notifications: NotificationsModule | null | undefined

/** True only when the notifications native code is actually in this binary.
 *  Uses requireOptionalNativeModule (returns null, never throws) so we never
 *  evaluate expo-notifications on a runtime that would crash on it. */
function nativeAvailable(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const core = require('expo-modules-core')
    return !!core.requireOptionalNativeModule?.('ExpoPushTokenManager')
  } catch {
    return false
  }
}

function getNotifications(): NotificationsModule | null {
  if (_notifications !== undefined) return _notifications
  if (!nativeAvailable()) {
    _notifications = null   // native module absent — notifications disabled
    return null
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod: NotificationsModule = require('expo-notifications')
    // Show alerts even while the app is foregrounded
    mod.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    })
    _notifications = mod
  } catch {
    _notifications = null
  }
  return _notifications
}

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

type Msg = { title: string; body: string }

const STREAK_TONIGHT = (streak: number): Msg[] => [
  { title: 'Cappy 🎓', body: `Your ${streak}-day streak is one quiz away from surviving the night. Don't make me watch it die.` },
  { title: 'Noggin 🧠', body: `Fun fact: streaks reset at midnight. Your ${streak}-day one included. Just saying.` },
  { title: 'Buddy 💬', body: `Hey, it's me. Your ${streak}-day streak asked me to remind you it exists. 5 questions?` },
  { title: 'Cappy 🎓', body: `${streak} days of momentum vs. 3 minutes of effort. Easy math. Come save the streak!` },
]

const PRACTICE_TONIGHT: Msg[] = [
  { title: 'Cappy 🎓', body: `No pressure, but future-you is watching. A quick session tonight?` },
  { title: 'Noggin 🧠', body: `Your brain forgets 70% of new material in 24h. I'm not nagging, I'm citing Ebbinghaus.` },
  { title: 'Buddy 💬', body: `One tiny quiz before bed. Your exam self will write you a thank-you note.` },
]

const LAPSE_48H: Msg[] = [
  { title: 'Noggin 🧠', body: `Two days without practice. Your neurons filed a missing person report.` },
  { title: 'Cappy 🎓', body: `It's been 2 days! The questions are getting cocky. Come put them in their place.` },
  { title: 'Buddy 💬', body: `Day 2 without you. The flashcards keep asking where you went. It's getting awkward.` },
]

const LAPSE_5D: Msg[] = [
  { title: 'Buddy 💬', body: `5 days… your leaderboard rank is quietly slipping while others climb. Just one session?` },
  { title: 'Noggin 🧠', body: `At this point I've reviewed the pharmacology deck alone. Twice. It's not the same without you.` },
  { title: 'Cappy 🎓', body: `A week is where good habits go to die. Don't let it get there — 5 questions today.` },
]

const BARRAGE_LIVE: Msg[] = [
  { title: 'Cappy ⚡', body: `SURPRISE BARRAGE IS LIVE! 2× XP for 2 hours. Drop everything (safely). GO!` },
  { title: 'Buddy ⚡', body: `It's happening!! Your 2× XP barrage window just opened. See you inside!` },
  { title: 'Noggin ⚡', body: `Statistically optimal moment to practice: right now. Barrage live, 2× XP, clock ticking.` },
]

const LEAGUE_SUNDAY: Msg[] = [
  { title: 'Cappy 🏆', body: `League locks tonight! One good session could mean promotion. Finish strong.` },
  { title: 'Noggin 🏆', body: `Final standings compute at midnight. Your move, contender.` },
  { title: 'Buddy 🏆', body: `Last day of the league week! Don't get relegated on a technicality — go earn some XP.` },
]

const capWord = (w: string) => w.charAt(0).toUpperCase() + w.slice(1)

/** Zone-transition messages — each kind fires AT MOST once per league week
 *  (AsyncStorage-guarded), one evening slot per day, so it can never spam. */
const ZONE_MSGS: Record<ZoneEvent['kind'], (e: ZoneEvent) => Msg[]> = {
  enter_promo: e => [
    { title: "You're in the promotion zone! 🎉", body: `Cappy checking in — #${e.rank} in ${capWord(e.league)} League. Hold it till Monday and you rise.` },
    { title: 'Promotion zone secured 💪', body: `#${e.rank} in ${capWord(e.league)}. Someone's always lurking one place below — keep your lead.` },
  ],
  exit_promo: e => [
    { title: 'You got bumped 😤', body: `Someone overtook you — you're #${e.rank} now, just outside the promotion zone. One session takes it back.` },
    { title: 'Knocked out of the zone', body: `Buddy here — you slipped to #${e.rank} in ${capWord(e.league)}. The cut is close; a quick session puts you back inside.` },
  ],
  near_promo: e => [
    { title: 'So close to promotion 👀', body: `#${e.rank} in ${capWord(e.league)} — ${e.rank - e.promoteN} place${e.rank - e.promoteN === 1 ? '' : 's'} off the zone. One Rapid Fire could do it.` },
    { title: 'The zone is right there', body: `Noggin's math says #${e.rank} is within striking distance of promotion. A handful of questions closes it.` },
  ],
  enter_releg: e => [
    { title: '⚠️ Demotion zone', body: `You've slipped to #${e.rank} in ${capWord(e.league)} — the bottom 5 drop on Monday. One session climbs you out.` },
    { title: 'Danger zone, friend', body: `Buddy here — #${e.rank} puts you in the demotion cut. Don't let the week end there.` },
  ],
}

let permissionAsked = false

/**
 * Check (and optionally request) notification permission.
 * The OS dialog only fires when `requestIfNeeded` — background scheduling passes
 * false so users are never cold-prompted; the primed ask happens at onboarding.
 */
export async function ensureNotificationPermissions(requestIfNeeded = true): Promise<boolean> {
  const Notifications = getNotifications()
  if (!Notifications) return false
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Reminders',
        importance: Notifications.AndroidImportance.DEFAULT,
      })
    }
    const settings = await Notifications.getPermissionsAsync()
    if (settings.granted) return true
    if (!requestIfNeeded || permissionAsked) return false
    permissionAsked = true
    const req = await Notifications.requestPermissionsAsync()
    return req.granted
  } catch {
    return false
  }
}

interface ScheduleState {
  userId: string
  /** effective streak (0 if already broken) */
  streak: number
  practicedToday: boolean
  /** today's already-claimed barrage slots (0 and/or 1) */
  claimedSlotsToday?: number[]
  /** barrages remaining until the next streak freeze (1–5) */
  barragesToFreeze?: number
  /** per-category opt-outs from profile.notif_prefs — missing key = enabled */
  prefs?: import('@/types').NotifPrefs | null
  /** league zone transition detected at app-open (lib/league.detectZoneEvent) */
  zoneEvent?: ZoneEvent | null
}

function todayAt(h: number, m = 0): Date {
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d
}
function daysFrom(base: Date, days: number): Date {
  return new Date(base.getTime() + days * 86_400_000)
}

/**
 * Cancel + rebuild all scheduled nudges from current state.
 * Called on every dashboard focus, so no notification can go stale
 * (e.g. a streak reminder after the user already practiced).
 */
export async function rescheduleAll(state: ScheduleState): Promise<void> {
  const Notifications = getNotifications()
  if (!Notifications) return
  try {
    const ok = await ensureNotificationPermissions(false)
    if (!ok) return
    await Notifications.cancelAllScheduledNotificationsAsync()

    const now = new Date()
    const at = (d: Date): import('expo-notifications').DateTriggerInput => ({
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: d,
    })
    const sched = (msg: Msg, date: Date) => {
      if (date <= now) return Promise.resolve('')
      return Notifications.scheduleNotificationAsync({ content: { title: msg.title, body: msg.body }, trigger: at(date) })
    }
    const jobs: Promise<string>[] = []
    const on = (k: 'streak' | 'barrage' | 'league') => state.prefs?.[k] !== false

    // 1) Tonight, 19:30 — streak rescue (or a gentle practice nudge if no streak)
    if (on('streak') && !state.practicedToday) {
      const msg = state.streak > 0 ? pick(STREAK_TONIGHT(state.streak)) : pick(PRACTICE_TONIGHT)
      jobs.push(sched(msg, todayAt(19, 30)))
    }
    // Tomorrow evening too (covers users who don't reopen the app)
    if (on('streak')) {
      jobs.push(sched(pick(PRACTICE_TONIGHT), daysFrom(todayAt(19, 30), 1)))
      // 2) Lapse escalation — cleared automatically next time the app opens
      jobs.push(sched(pick(LAPSE_48H), daysFrom(todayAt(18, 0), 2)))
      jobs.push(sched(pick(LAPSE_5D), daysFrom(todayAt(18, 0), 5)))
    }

    // 3) Barrage — window start today (if still ahead and unclaimed) and tomorrow.
    // Messages carry streak-freeze progress: every 5th completed barrage earns one.
    const toFreeze = state.barragesToFreeze ?? 0
    const freezeLine = toFreeze === 1
      ? ' And this one earns you a streak freeze 🧊!'
      : toFreeze > 1 ? ` (${toFreeze} more barrages to a 🧊 streak freeze)` : ''
    const withFreeze = (m: Msg): Msg => ({ title: m.title, body: m.body + freezeLine })
    if (on('barrage')) {
      const claimed = new Set(state.claimedSlotsToday ?? [])
      for (const w of barrageWindows(state.userId, now)) {
        if (!claimed.has(w.slot) && w.status === 'upcoming') {
          jobs.push(sched(withFreeze(pick(BARRAGE_LIVE)), w.start))
        }
      }
      const tomorrow = daysFrom(now, 1)
      for (const w of barrageWindows(state.userId, tomorrow)) {
        jobs.push(sched(withFreeze(pick(BARRAGE_LIVE)), w.start))
      }
    }

    // 4) League deadline — Sunday 18:00 (league resets Monday)
    if (on('league')) {
      const sunday = new Date(now)
      sunday.setDate(now.getDate() + ((7 - now.getDay()) % 7))   // next Sunday (today if Sunday)
      sunday.setHours(18, 0, 0, 0)
      jobs.push(sched(pick(LEAGUE_SUNDAY), sunday))
    }

    // 5) League zone transition — ONE evening ping, each kind at most once per
    // league week. rescheduleAll cancels everything on each app open, so the
    // guard stores the fire time: a still-future ping is re-scheduled (not
    // lost), a past one is never repeated.
    if (on('league') && state.zoneEvent) {
      const e = state.zoneEvent
      const guardKey = `zoneNotif:${weekStartKey()}:${e.kind}`
      try {
        const stored = await AsyncStorage.getItem(guardKey)
        let when: Date | null = null
        if (stored) {
          const at2 = new Date(stored)
          if (at2 > now) when = at2            // pending — restore after cancelAll
        } else {
          when = todayAt(20, 15)
          if (when <= now) when = daysFrom(when, 1)
          await AsyncStorage.setItem(guardKey, when.toISOString())
        }
        if (when) jobs.push(sched(pick(ZONE_MSGS[e.kind](e)), when))
      } catch { /* guard failures just skip the ping */ }
    }

    await Promise.all(jobs)
  } catch {
    // Notifications are best-effort — never let scheduling break the app
  }
}
