import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const screen=readFileSync(new URL('../app/(app)/practice/flashcards.tsx',import.meta.url),'utf8')

test('flashcards have no swipe responder, offscreen translation or fade-out',()=>{
  assert.doesNotMatch(screen,/PanResponder|panHandlers|swipeX|cardOpacity|swipeGuard|Swipe the card/)
  assert.match(screen,/onPress=\{flip\}/)
  assert.match(screen,/onPress=\{\(\) => next\(false\)\}/)
  assert.match(screen,/onPress=\{\(\) => next\(true\)\}/)
})

test('tap grading keeps reveal, duplicate, ownership and checkpoint guards',()=>{
  assert.match(screen,/!revealed.*graded\.current\.has\(card\.id\)/)
  assert.match(screen,/graded\.current\.add\(card\.id\)/)
  assert.match(screen,/await saveCheckpoint\(\)/)
  assert.match(screen,/checkpointOwner\.current!==owner\|\|currentCardId\.current!==card\.id/)
  assert.match(screen,/await verified\.complete\(/)
})

test('checkpoint failure can be cancelled and a late retry cannot cross cards or owners',()=>{
  assert.match(screen,/text:'Cancel',style:'cancel'/)
  assert.match(screen,/checkpointOwner\.current===owner&&currentCardId\.current===card\.id&&flipGeneration\.current===generation/)
  assert.match(screen,/currentCardId\.current=null/)
})
