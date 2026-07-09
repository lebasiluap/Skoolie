/**
 * Preset avatar system — 30 curated emoji-on-color tiles anyone can pick
 * instead of (or before) uploading a photo. Stored as `preset:<n>` in
 * user_profiles.avatar_url and rendered locally by the Avatar component.
 *
 * Because presets are a first-class choice for every user, an account
 * wearing one carries no signal about who (or what) is behind it.
 */
export interface AvatarPreset { id: number; emoji: string; bg: string }

export const AVATAR_PRESETS: AvatarPreset[] = [
  { id: 1,  emoji: '🦉', bg: '#0E9E8E' },
  { id: 2,  emoji: '🦁', bg: '#E2674A' },
  { id: 3,  emoji: '🐘', bg: '#5C8FD6' },
  { id: 4,  emoji: '🦋', bg: '#8E6BD0' },
  { id: 5,  emoji: '🐢', bg: '#3D9970' },
  { id: 6,  emoji: '🦅', bg: '#C98A2E' },
  { id: 7,  emoji: '🐬', bg: '#2E9BC4' },
  { id: 8,  emoji: '🦒', bg: '#D98C3A' },
  { id: 9,  emoji: '🐝', bg: '#C2A11F' },
  { id: 10, emoji: '🦊', bg: '#D06A45' },
  { id: 11, emoji: '🐼', bg: '#6E8AA6' },
  { id: 12, emoji: '🦜', bg: '#2F9E63' },
  { id: 13, emoji: '🌺', bg: '#C45C82' },
  { id: 14, emoji: '🌵', bg: '#4FA36B' },
  { id: 15, emoji: '🌙', bg: '#7A6BCC' },
  { id: 16, emoji: '⚡', bg: '#C07A30' },
  { id: 17, emoji: '🔥', bg: '#D9534F' },
  { id: 18, emoji: '🌊', bg: '#2E83A6' },
  { id: 19, emoji: '🍀', bg: '#3F8F4F' },
  { id: 20, emoji: '⭐', bg: '#B08D2E' },
  { id: 21, emoji: '🧠', bg: '#9C6ADE' },
  { id: 22, emoji: '🩺', bg: '#0E9E8E' },
  { id: 23, emoji: '💊', bg: '#D06A8C' },
  { id: 24, emoji: '🔬', bg: '#3E8E6E' },
  { id: 25, emoji: '📚', bg: '#597FD1' },
  { id: 26, emoji: '🎯', bg: '#A65C5C' },
  { id: 27, emoji: '🚀', bg: '#4A90B8' },
  { id: 28, emoji: '🏆', bg: '#C2841F' },
  { id: 29, emoji: '🎓', bg: '#7D6E9E' },
  { id: 30, emoji: '🌟', bg: '#3AA6B9' },
]

/** Parse an avatar_url; returns the preset or null (photo URL / initials). */
export function parsePreset(avatarUrl: string | null | undefined): AvatarPreset | null {
  if (!avatarUrl?.startsWith('preset:')) return null
  const id = Number(avatarUrl.slice(7))
  return AVATAR_PRESETS.find(p => p.id === id) ?? null
}
