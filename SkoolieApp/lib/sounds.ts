/**
 * Sound effects — the gamification layer's audio identity.
 *
 * All SFX are synthesized in-house (assets/sounds/*.wav, ~260KB total):
 *   correct   bright two-note "din-DING!" — positive reinforcement
 *   wrong     soft low "buh-dum" — negative but never punishing
 *   complete  rising fanfare — plays at EVERY quiz results screen,
 *             win or lose (the "you finished" signature)
 *   combo1–5  rising pops for rapid-fire streaks (pitch climbs with the combo)
 *   flip      card whoosh for flashcard flips (flashcards have NO grade sounds)
 *
 * expo-audio is a NATIVE module, so it's loaded behind the same
 * requireOptionalNativeModule probe as notifications: on a binary without it
 * (stale dev client) every play call is a silent no-op — never a crash.
 * Players are created once and reused (seekTo(0) + play).
 */

import { haptic, hapticCombo } from '@/lib/haptics'

// Static asset map — Metro needs literal require() calls.
const SOURCES = {
  correct: require('../assets/sounds/correct.wav'),
  wrong: require('../assets/sounds/wrong.wav'),
  complete: require('../assets/sounds/complete.wav'),
  combo1: require('../assets/sounds/combo1.wav'),
  combo2: require('../assets/sounds/combo2.wav'),
  combo3: require('../assets/sounds/combo3.wav'),
  combo4: require('../assets/sounds/combo4.wav'),
  combo5: require('../assets/sounds/combo5.wav'),
  flip: require('../assets/sounds/flip.wav'),
} as const

export type SoundName = keyof typeof SOURCES

type AudioModule = typeof import('expo-audio')
let _audio: AudioModule | null | undefined

function getAudio(): AudioModule | null {
  if (_audio !== undefined) return _audio
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const core = require('expo-modules-core')
    if (!core.requireOptionalNativeModule?.('ExpoAudio')) {
      _audio = null
      return null
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('expo-audio') as AudioModule
    // Play even when the iOS ringer switch is on silent — game SFX, not media.
    mod.setAudioModeAsync({ playsInSilentMode: true }).catch(() => {})
    _audio = mod
  } catch {
    _audio = null
  }
  return _audio
}

/** Create every player up-front so the first tap isn't silent while loading.
 *  Call once early (dashboard mount); cheap and idempotent. */
export function preloadSounds(): void {
  try {
    const Audio = getAudio()
    if (!Audio) return
    for (const name of Object.keys(SOURCES) as SoundName[]) {
      if (!players[name]) players[name] = Audio.createAudioPlayer(SOURCES[name])
    }
  } catch {
    // best-effort
  }
}

const players: Partial<Record<SoundName, import('expo-audio').AudioPlayer>> = {}

/** Fire-and-forget SFX. Safe to call anywhere; silent no-op without the native module.
 *  Reinforcement sounds carry their paired haptic — fires even without audio. */
export function playSound(name: SoundName): void {
  if (name === 'correct' || name === 'wrong' || name === 'complete' || name === 'flip') haptic(name)
  try {
    const Audio = getAudio()
    if (!Audio) return
    let p = players[name]
    if (!p) {
      p = Audio.createAudioPlayer(SOURCES[name])
      players[name] = p
    }
    p.seekTo(0)
    p.play()
  } catch {
    // never let a sound break gameplay
  }
}

/** Rapid-fire combo pop — pitch rises with the streak (1st correct → combo1 …). */
export function playCombo(streakAfterAnswer: number): void {
  hapticCombo(streakAfterAnswer)
  const n = Math.min(5, Math.max(1, streakAfterAnswer)) as 1 | 2 | 3 | 4 | 5
  playSound(`combo${n}` as SoundName)
}
