import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url)
const ts=require('typescript')
const screen=readFileSync(new URL('../app/(app)/practice/flashcards.tsx',import.meta.url),'utf8')
// Exercise the screen's real async grading function with deterministic IO.
const fragment=screen.slice(screen.indexOf('  async function next('),screen.indexOf('  // Replay the full deck'))
const js=ts.transpileModule(fragment,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText
function setup(){
  let saves=0,advanced=0,alertButtons=[],rating
  const context={
    cards:[{id:'first'},{id:'second'}],cardIndex:0,user:{id:'owner'},revealed:true,
    flipInFlight:{current:false},flipGeneration:{current:7},graded:{current:new Set()},
    checkpointOwner:{current:'owner'},currentCardId:{current:'first'},
    fromBookmarksRef:{current:false},isReviewMissedRef:{current:false},
    verified:{saving:false,answer:(_id,value)=>{if(rating!==undefined&&rating!==value)return false;rating=value;return true}},
    saveCheckpoint:async()=>{saves++;if(saves===1)throw new Error('storage failure')},
    Alert:{alert:(_title,_text,buttons)=>{alertButtons=buttons}},
    setGotIt:()=>{},setMissed:()=>{},setMissedCards:()=>{},
    flipAnim:{setValue:()=>{}},setFlipped:()=>{},setRevealed:()=>{},setIsFlipping:()=>{},
    setCardIndex:()=>{advanced++},
  }
  const next=new Function('context',`with(context){${js};return next}`)(context)
  return {context,next,get saves(){return saves},get advanced(){return advanced},get buttons(){return alertButtons},get rating(){return rating}}
}
test('failed checkpoint Retry succeeds with the original rating',async()=>{
  const s=setup()
  assert.equal(await s.next(false),false)
  assert.equal(s.context.graded.current.has('first'),false)
  s.buttons.find(b=>b.text==='Retry').onPress()
  await new Promise(resolve=>setImmediate(resolve))
  assert.equal(s.saves,2);assert.equal(s.advanced,1);assert.equal(s.rating,false)
})
test('Cancel leaves the revealed card available for a later rating retry',async()=>{
  const s=setup();await s.next(true)
  assert.equal(s.buttons.find(b=>b.text==='Cancel').style,'cancel')
  assert.equal(s.context.verified.saving,false)
  assert.equal(s.context.graded.current.has('first'),false)
  assert.equal(await s.next(true),true)
  assert.equal(s.saves,2);assert.equal(s.advanced,1)
})
test('late alert Retry does nothing after owner, card or generation changes',async()=>{
  for(const key of ['checkpointOwner','currentCardId','flipGeneration']){
    const s=setup();await s.next(false)
    s.context[key].current='changed'
    s.buttons.find(b=>b.text==='Retry').onPress()
    await new Promise(resolve=>setImmediate(resolve))
    assert.equal(s.saves,1);assert.equal(s.advanced,0)
  }
})
