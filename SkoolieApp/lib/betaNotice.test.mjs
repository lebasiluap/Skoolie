import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const root = readFileSync(new URL('../app/_layout.tsx', import.meta.url), 'utf8')
const profile = readFileSync(new URL('../app/(app)/profile.tsx', import.meta.url), 'utf8')

test('main navigator has no intrusive beta activity banner or automatic opt-in', () => {
  assert.doesNotMatch(root, /betaNotice|setBetaNotice|Beta activity details|allowBetaDetails\(true\)/)
  assert.match(root, /<Stack screenOptions/)
})

test('Profile explains automatic usage summaries and links privacy without a beta permission prompt', () => {
  assert.match(profile, /Read about app usage metrics and privacy/)
  assert.match(profile, /account-linked usage summaries/)
  assert.doesNotMatch(profile, /Optional beta activity details|requestBetaDetailsEnable/)
})
