import test from 'node:test'
import assert from 'node:assert/strict'
import {onProgressSaved,notifyProgressSaved} from './progressEvents.ts'
test('completion invalidates summaries and unsubscribed accounts receive nothing',()=>{
  let calls=0
  const stop=onProgressSaved(()=>calls++)
  notifyProgressSaved();assert.equal(calls,1)
  stop();notifyProgressSaved();assert.equal(calls,1)
})
test('summary listener errors cannot break a committed reward',()=>{
  const stop=onProgressSaved(()=>{throw new Error('offline')})
  assert.doesNotThrow(notifyProgressSaved)
  stop()
})
