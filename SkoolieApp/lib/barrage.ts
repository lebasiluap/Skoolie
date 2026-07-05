// Surprise Barrage — TWO 1-hour windows per day where a rapid-fire blitz pays
// 2× XP (and every 5th completed barrage earns a streak freeze).
//
// Windows are DETERMINISTIC per user per day (seeded from user id + date), so
// no server scheduling is needed and every device agrees:
//   slot 0 → starts somewhere 08:00–13:30
//   slot 1 → starts somewhere 15:00–20:30 (latest end 21:30)
//
// Claiming is enforced server-side: credit_xp(kind='barrage', slot) inserts
// into barrage_claims (unique per user/day/slot) and pays 0 on a repeat.

const WINDOW_MINUTES = 60

function fnv(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export interface BarrageWindow {
  slot: 0 | 1
  start: Date
  end: Date
  status: 'upcoming' | 'live' | 'missed'
  /** minutes remaining while live */
  minutesLeft: number
}

/** Both of today's barrage windows for this user (local time), earliest first. */
export function barrageWindows(userId: string, now: Date = new Date()): [BarrageWindow, BarrageWindow] {
  const h = fnv(`${userId}:${dayKey(now)}`)
  const mk = (slot: 0 | 1, startHour: number, half: number): BarrageWindow => {
    const start = new Date(now)
    start.setHours(startHour, half * 30, 0, 0)
    const end = new Date(start.getTime() + WINDOW_MINUTES * 60_000)
    const status = now < start ? 'upcoming' : now <= end ? 'live' : 'missed'
    return {
      slot, start, end, status,
      minutesLeft: status === 'live' ? Math.max(1, Math.ceil((end.getTime() - now.getTime()) / 60_000)) : 0,
    }
  }
  // slot 0: 08:00–13:30 starts · slot 1: 15:00–20:30 starts
  const w0 = mk(0, 8 + (h % 6), (h >>> 7) % 2)
  const w1 = mk(1, 15 + ((h >>> 11) % 6), (h >>> 17) % 2)
  return [w0, w1]
}

/** The window to surface right now: a LIVE unclaimed one first, else the next
 *  upcoming unclaimed one today, else null. */
export function nextBarrage(
  userId: string,
  claimedSlots: Set<number>,
  now: Date = new Date(),
): BarrageWindow | null {
  const wins = barrageWindows(userId, now).filter(w => !claimedSlots.has(w.slot))
  return wins.find(w => w.status === 'live') ?? wins.find(w => w.status === 'upcoming') ?? null
}

/** Today's date string in the shape barrage_claims.day uses. */
export const barrageDay = (d: Date = new Date()) => dayKey(d)
