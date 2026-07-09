/**
 * Haptics — the physical half of the reward loop.
 *
 * Every reinforcement moment pairs sound + touch:
 *   correct    success tap        wrong     error buzz
 *   complete   success tap        combo     impact that grows with the streak
 *   flip       feather-light tick tick      light pulse (timer urgency)
 *   celebrate  heavy double-hit (level-up / tier / freeze-save ceremonies)
 *
 * expo-haptics is a NATIVE module — same requireOptionalNativeModule probe as
 * sounds/notifications: on a binary without it every call is a silent no-op.
 */
type HapticsModule = typeof import('expo-haptics')
let _haptics: HapticsModule | null | undefined

function getHaptics(): HapticsModule | null {
  if (_haptics !== undefined) return _haptics
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const core = require('expo-modules-core')
    if (!core.requireOptionalNativeModule?.('ExpoHaptics')) {
      _haptics = null
      return null
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _haptics = require('expo-haptics') as HapticsModule
  } catch {
    _haptics = null
  }
  return _haptics
}

export type HapticKind = 'correct' | 'wrong' | 'complete' | 'flip' | 'tick' | 'celebrate'

let hapticsOn = true
export function setHapticsEnabled(v: boolean): void { hapticsOn = v }

export function haptic(kind: HapticKind): void {
  if (!hapticsOn) return
  const H = getHaptics()
  if (!H) return
  try {
    switch (kind) {
      case 'correct':
      case 'complete':
        H.notificationAsync(H.NotificationFeedbackType.Success)
        break
      case 'wrong':
        H.notificationAsync(H.NotificationFeedbackType.Error)
        break
      case 'flip':
        H.selectionAsync()
        break
      case 'tick':
        H.impactAsync(H.ImpactFeedbackStyle.Light)
        break
      case 'celebrate':
        // Double-hit: heavy, then a success flourish a beat later.
        H.impactAsync(H.ImpactFeedbackStyle.Heavy)
        setTimeout(() => { try { H.notificationAsync(H.NotificationFeedbackType.Success) } catch {} }, 180)
        break
    }
  } catch {
    // never let a haptic failure surface
  }
}

/** Combo haptic — impact strength climbs with the streak (mirrors playCombo). */
export function hapticCombo(streak: number): void {
  const H = getHaptics()
  if (!H) return
  try {
    const style = streak >= 5 ? H.ImpactFeedbackStyle.Heavy
      : streak >= 3 ? H.ImpactFeedbackStyle.Medium
      : H.ImpactFeedbackStyle.Light
    H.impactAsync(style)
  } catch {}
}
