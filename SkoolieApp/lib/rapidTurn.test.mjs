import test from 'node:test'
import assert from 'node:assert/strict'
import {advanceRapidTurn,rapidTapReady} from './rapidTurn.ts'

test('advance changes item and answer together; never reopens the previous item',()=>{
  assert.deepEqual(advanceRapidTurn({index:0,answer:'B'}),{index:1,answer:null})
  assert.deepEqual(advanceRapidTurn({index:2,answer:''}),{index:3,answer:null})
})
test('an unanswered item cannot advance',()=>{
  const turn={index:0,answer:null}
  assert.equal(advanceRapidTurn(turn),turn)
})
test('timer readiness accepts a tap after the one-time cascade guard',()=>{
  assert.equal(rapidTapReady(1200,1000,350),false)
  assert.equal(rapidTapReady(1400,1000,350),true)
  assert.equal(rapidTapReady(2100,1000,350),true)
  assert.equal(rapidTapReady(2100,0,350),false)
})
