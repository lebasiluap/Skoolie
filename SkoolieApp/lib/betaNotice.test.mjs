import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const root = readFileSync(new URL('../app/_layout.tsx', import.meta.url), 'utf8')
const profile = readFileSync(new URL('../app/(app)/profile.tsx', import.meta.url), 'utf8')

test('main navigator has no intrusive beta activity banner or automatic opt-in', () => {
  assert.doesNotMatch(root, /betaNotice|setBetaNotice|Beta activity details|allowBetaDetails\(true\)/)
  assert.match(root, /<Stack screenOptions/)
})

test('Profile keeps privacy accessible without a redundant metrics explanation', () => {
  assert.match(profile, /Privacy Policy/)
  assert.match(profile, /pathname: '\/legal', params: \{ doc: 'privacy' \}/)
  assert.doesNotMatch(profile, /App usage metrics|account-linked usage summaries/)
  assert.doesNotMatch(profile, /Optional beta activity details|requestBetaDetailsEnable/)
})

test('Privacy policy retains the app metrics disclosure', () => {
  const legal = readFileSync(new URL('./legal.ts', import.meta.url), 'utf8')
  assert.match(legal, /App usage metrics/)
  assert.match(legal, /account-linked app activity/)
})

test('Streak card is compact while retaining the count, freeze balance and calendar', () => {
  const streak = readFileSync(new URL('../components/ui/StreakTracker.tsx', import.meta.url), 'utf8')
  assert.doesNotMatch(streak, /Store up to 2 freezes|freeze limit is now|Older excess|const caption|current\.short|s\.caption/)
  assert.match(streak, /\{streak\}/)
  assert.match(streak, /\{balance\}\/\{FREEZE_CAPACITY\}/)
  assert.match(streak, /week\.map/)
  assert.match(streak, /snapshot\.current_streak/)
  const provider = readFileSync(new URL('../contexts/StreakContext.tsx', import.meta.url), 'utf8')
  assert.match(provider, /rpc\('get_study_streak'\)/)
})
