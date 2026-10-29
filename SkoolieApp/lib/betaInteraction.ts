/** Metadata only. No labels, coordinates, typed text, answers or question IDs. */
export type BetaAction = 'touch' | 'screen' | 'answer' | 'flip' | 'complete'
export const BETA_SCREENS = ['dashboard','practice','mcq','flashcards','rapid-fire','cases','progress','insights','leaderboard','profile','settings','history','bookmarks','other'] as const
export type BetaScreen = typeof BETA_SCREENS[number]
export function betaScreen(segments: readonly string[]): BetaScreen {
  if (!segments.includes('(app)')) return 'other'
  if (segments.includes('rapidfire')) return 'rapid-fire'
  if (segments.includes('challenge')) return 'mcq'
  return [...segments].reverse().find(s => (BETA_SCREENS as readonly string[]).includes(s)) as BetaScreen || 'other'
}
let screen: BetaScreen = 'other'
let allowed = false
export function allowBetaDetails(value: boolean) { allowed = value }
export function betaDetailsAllowed() { return allowed }
const listeners = new Set<(kind: BetaAction, screen: BetaScreen) => void>()
export function betaAction(kind: BetaAction) {
  for (const listener of listeners) { try { listener(kind, screen) } catch { /* telemetry cannot break interaction */ } }
}
export function betaRoute(next: BetaScreen) { if (next !== screen) { screen = next; betaAction('screen') } }
export function onBetaAction(listener: (kind: BetaAction, screen: BetaScreen) => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
export function createBetaCollector(now: () => number = () => performance.now()) {
  let last = now(), input = last, entered = last, current = screen
  let recent = 0, quiet = 0, idle = 0, interactions = 0
  let firstInput = false
  let events: {kind: BetaAction; screen: BetaScreen; delay_ms: number}[] = []
  const account = () => {
    const t = now(), gap = t - last
    // A suspended process / missing heartbeat is unknown, never backfilled.
    if (gap >= 0 && gap <= 90000) {
      const r = Math.max(0, Math.min(t, input + 30000) - last)
      const q = Math.max(0, Math.min(t, input + 120000) - Math.max(last, input + 30000))
      recent += r; quiet += q; idle += Math.max(0, gap-r-q)
    }
    last = t
    return t
  }
  return {
    action(kind: BetaAction, next: BetaScreen) {
      const t = account()
      if (kind === 'screen') { current = next; entered = t; firstInput = false }
      else {
        // Collapse scroll/touch bursts; semantic events remain separately visible.
        if (kind === 'touch' && firstInput && t-input < 500) return
        interactions++; input = t
      }
      if (events.length < 60 && (kind !== 'touch' || !firstInput)) events.push({kind, screen: current, delay_ms: Math.min(3600000, Math.max(0, Math.round(t-entered)))})
      if (kind !== 'screen') firstInput = true
    },
    take() {
      account()
      const data = {recent_ms: Math.round(recent), quiet_ms: Math.round(quiet), idle_ms: Math.round(idle), interactions, events}
      recent=quiet=idle=interactions=0; events=[]
      return data
    },
  }
}
