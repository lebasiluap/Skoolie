import test from 'node:test'
import assert from 'node:assert/strict'
import {parseFlashcardCheckpoint,flashcardCheckpointKey} from './flashcardCheckpoint.ts'
const uid='owner',id='33333333-3333-4333-8333-333333333333',id2='44444444-4444-4444-8444-444444444444'
const cp=()=>({version:1,userId:uid,requestId:'11111111-1111-4111-8111-111111111111',itemIds:[id,id2],answers:{[id]:false},expiresAt:'2030-01-01T00:00:00Z'})
test('saved progress keeps false ratings and exact deck order',()=>{
 const x=parseFlashcardCheckpoint(JSON.stringify(cp()),uid)
 assert.deepEqual(x,cp());assert.equal(x.answers[id],false)
 assert.notEqual(flashcardCheckpointKey(uid),flashcardCheckpointKey('other'))
})
test('other accounts, expired and malformed checkpoints cannot resume',()=>{
 assert.equal(parseFlashcardCheckpoint(JSON.stringify(cp()),'other'),null)
 assert.equal(parseFlashcardCheckpoint(JSON.stringify(cp()),uid,Date.parse('2031-01-01')),null)
 for(const patch of [{itemIds:[id,id]},{answers:{[id2]:true}},{answers:{[id]:'true'}},{requestId:'bad'}])
  assert.equal(parseFlashcardCheckpoint(JSON.stringify({...cp(),...patch}),uid),null)
})
