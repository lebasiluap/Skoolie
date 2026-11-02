import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const root = readFileSync(new URL('../app/_layout.tsx', import.meta.url), 'utf8')
const profile = readFileSync(new URL('../app/(app)/profile.tsx', import.meta.url), 'utf8')

test('main navigator has no intrusive beta activity banner or automatic opt-in', () => {
  assert.doesNotMatch(root, /betaNotice|setBetaNotice|Beta activity details|allowBetaDetails\(true\)/)
  assert.match(root, /allowBetaDetails\(false\)/)
  assert.match(root, /<Stack screenOptions/)
})

test('optional detail control remains in Profile with explicit enable and stop', () => {
  assert.match(profile, /Manage optional beta activity details/)
  assert.match(profile, /betaDetailsAllowed\(\)/)
  assert.match(profile, /text:'Not now',style:'cancel'/)
  assert.match(profile, /text:'Enable',onPress:/)
  assert.match(profile, /betaControlMounted.current && enable\(\)/)
  assert.match(profile, /useSyncExternalStore\(onBetaConsent/)
  assert.match(profile, /allowBetaDetails\(false\)/)
})
