import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { publicAvatar, AVATAR_PRESETS } from './avatars.ts'

test('public avatar preserves only curated presets and replaces arbitrary uploads', () => {
  assert.equal(AVATAR_PRESETS.length, 30)
  assert.deepEqual(AVATAR_PRESETS.map(p => p.id), Array.from({ length: 30 }, (_, i) => i + 1))
  assert.equal(publicAvatar('preset:4', 'owner').id, 4)
  const avatar = publicAvatar('https://example.test/private-photo.jpg', 'owner')
  assert.ok(AVATAR_PRESETS.includes(avatar))
  assert.deepEqual(avatar, publicAvatar(null, 'owner'))
  assert.deepEqual(avatar, publicAvatar('data:image/png;base64,bad', 'owner'))
})
test('released public profile and league surfaces opt into curated-only avatars', () => {
  for (const path of ['../app/users/[id].tsx', '../app/(app)/progress/index.tsx']) {
    const source = readFileSync(new URL(path, import.meta.url), 'utf8')
    for (const tag of source.matchAll(/<Avatar\b[^>]+\/>/g)) assert.match(tag[0], /publicId=/)
  }
  const owner = readFileSync(new URL('../app/(app)/profile.tsx', import.meta.url), 'utf8')
  assert.match(owner, /<Avatar name=\{profile.full_name\} avatarUrl=\{profile.avatar_url\} size=\{80\}/)
})
