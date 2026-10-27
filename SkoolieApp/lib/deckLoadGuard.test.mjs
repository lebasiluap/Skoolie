import test from 'node:test'
import assert from 'node:assert/strict'
import {createDeckLoadGuard} from './deckLoadGuard.ts'

test('double taps cannot launch two decks; errors can release the lock for retry',()=>{
 const guard=createDeckLoadGuard(), first=guard.start()
 assert.notEqual(first,null)
 assert.equal(guard.start(),null)
 assert.equal(guard.finish(first),true)
 assert.notEqual(guard.start(),null)
})
test('stale responses after identity change cannot replace or unlock the new deck',()=>{
 const guard=createDeckLoadGuard(), old=guard.start()
 guard.invalidate()
 const next=guard.start()
 assert.equal(guard.current(old),false)
 assert.equal(guard.finish(old),false)
 assert.equal(guard.current(next),true)
 assert.equal(guard.start(),null)
 assert.equal(guard.finish(next),true)
})
