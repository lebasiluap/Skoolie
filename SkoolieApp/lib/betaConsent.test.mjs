import test from 'node:test'
import assert from 'node:assert/strict'
import {allowBetaDetails,betaDetailsAllowed,betaConsentRevision,requestBetaDetailsEnable} from './betaInteraction.ts'

test('enable callback is one-use and cannot survive a consent reset', () => {
  allowBetaDetails(false)
  const enable = requestBetaDetailsEnable()
  assert.equal(enable(),true)
  assert.equal(betaDetailsAllowed(),true)
  assert.equal(enable(),false)
  const old = requestBetaDetailsEnable()
  allowBetaDetails(false)
  assert.equal(old(),false)
  assert.equal(betaDetailsAllowed(),false)
})

test('off then on is a new consent generation, invalidating queued details', () => {
  allowBetaDetails(true)
  const queued = betaConsentRevision()
  allowBetaDetails(false)
  allowBetaDetails(true)
  assert.notEqual(queued,betaConsentRevision())
  allowBetaDetails(false)
})
