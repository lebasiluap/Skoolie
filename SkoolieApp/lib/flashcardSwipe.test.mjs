import test from 'node:test'
import assert from 'node:assert/strict'
import {captureCardSwipe,cardSwipeGrade,cardSwipeTranslation,createCardSwipeGuard} from './flashcardSwipe.ts'

test('drag motion is symmetric and softly bounded without a hard clamp',()=>{
  assert.equal(cardSwipeTranslation(0),0)
  assert.equal(cardSwipeTranslation(NaN),0)
  for(const dx of [1,24,64,80,120,300,1000]){
    assert.equal(cardSwipeTranslation(-dx),-cardSwipeTranslation(dx))
    assert.ok(cardSwipeTranslation(dx)>0&&cardSwipeTranslation(dx)<=32)
  }
  assert.ok(cardSwipeTranslation(65)>cardSwipeTranslation(64))
  assert.ok(cardSwipeTranslation(65)-cardSwipeTranslation(64)<1)
  assert.ok(cardSwipeTranslation(80)<20)
  // Visual resistance must not change the deliberate grading threshold.
  assert.equal(cardSwipeGrade(80,0,0),true)
  assert.equal(cardSwipeGrade(-80,0,0),false)
})

test('horizontal drags are captured but taps, vertical scroll and multi-touch are not',()=>{
  assert.equal(captureCardSwipe(20,2),true)
  assert.equal(captureCardSwipe(-20,2),true)
  assert.equal(captureCardSwipe(4,1),false)
  assert.equal(captureCardSwipe(20,60),false)
  assert.equal(captureCardSwipe(90,0,2),false)
  assert.equal(captureCardSwipe(NaN,0),false)
})
test('left and right drags grade consistently; short drags spring back',()=>{
  assert.equal(cardSwipeGrade(90,3,0),true)
  assert.equal(cardSwipeGrade(-90,3,0),false)
  assert.equal(cardSwipeGrade(40,3,0.9),true)
  assert.equal(cardSwipeGrade(-40,3,-0.9),false)
  assert.equal(cardSwipeGrade(20,0,2),null)
  assert.equal(cardSwipeGrade(40,0,-1),null)
  assert.equal(cardSwipeGrade(90,0,-1),true)
  assert.equal(cardSwipeGrade(-90,0,1),false)
  assert.equal(cardSwipeGrade(90,100,2),null)
})
test('one swipe owns one card; buttons cannot compete with its completion',()=>{
  const guard=createCardSwipeGuard(),token=guard.begin('first')
  assert.equal(guard.busy(),true)
  assert.equal(guard.begin('first'),null)
  assert.equal(guard.current(token,'first'),true)
  assert.equal(guard.current(token,'next'),false)
})
test('interruption or a new deck invalidates delayed animation callbacks',()=>{
  const guard=createCardSwipeGuard(),old=guard.begin('first')
  guard.invalidate()
  assert.equal(guard.busy(),false)
  const next=guard.begin('first') // even the same card in a new run is different
  assert.equal(guard.current(old,'first'),false)
  assert.equal(guard.current(next,'first'),true)
})
