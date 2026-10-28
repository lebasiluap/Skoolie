import test from 'node:test'
import assert from 'node:assert/strict'
import {rapidFeedback,rapidAdvanceWait} from './rapidFeedback.ts'

test('right and wrong feedback does not wait for a network result',()=>{
  assert.deepEqual(rapidFeedback(null,'B','B'),{answer:'B',label:'CORRECT!'})
  assert.deepEqual(rapidFeedback(null,'A','B'),{answer:'A',label:'NOT QUITE'})
})
test('server rejection or timeout replaces provisional feedback',()=>{
  assert.deepEqual(rapidFeedback('','B','B'),{answer:'',label:'TIME’S UP'})
  assert.deepEqual(rapidFeedback('A','B','B'),{answer:'A',label:'NOT QUITE'})
})
test('missing local key never invents a right or wrong verdict',()=>{
  assert.equal(rapidFeedback(null,'A',null).label,'ANSWER SELECTED')
})
test('latency is absorbed by the feedback interval, never added to it',()=>{
  assert.equal(rapidAdvanceWait(1000,1200),500)
  assert.equal(rapidAdvanceWait(1000,1900),0)
  assert.equal(rapidAdvanceWait(1000,900),700)
})
