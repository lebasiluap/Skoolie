import test from 'node:test'
import assert from 'node:assert/strict'
import {createBetaCollector,betaScreen,onBetaAction,betaAction,allowBetaDetails,betaDetailsAllowed} from './betaInteraction.ts'
test('separates recent input, quiet reading, and possible idle without deducting rewards',()=>{
 let t=0;const c=createBetaCollector(()=>t)
 t=30000;c.take();t=60000;let x=c.take();assert.equal(x.quiet_ms,30000)
 t=90000;c.take();t=120000;c.take();t=150000;x=c.take();assert.equal(x.idle_ms,30000)
 c.action('touch','mcq');t=180000;x=c.take();assert.equal(x.recent_ms,30000)
})
test('first input latency, screen transitions and capped metadata queue',()=>{
 let t=0;const c=createBetaCollector(()=>t);c.action('screen','flashcards')
 t=10000;c.action('touch','flashcards');t=12000;c.action('touch','flashcards')
 let x=c.take();assert.equal(x.interactions,2);assert.equal(x.events.length,2);assert.equal(x.events[1].delay_ms,10000)
 for(let i=0;i<100;i++){t+=1000;c.action('answer','flashcards')}
 assert.equal(c.take().events.length,60)
})
test('suspension gaps are unknown; routes cannot leak parameters or auth inputs',()=>{
 let t=0;const c=createBetaCollector(()=>t);t=300000
 const x=c.take();assert.equal(x.recent_ms+x.quiet_ms+x.idle_ms,0)
 assert.equal(betaScreen(['(auth)','login']),'other')
 assert.equal(betaScreen(['(app)','practice','mcq','private-id']),'mcq')
 assert.equal(betaScreen(['(app)','practice','rapidfire']),'rapid-fire')
 const stop=onBetaAction(()=>{throw Error('offline')});assert.doesNotThrow(()=>betaAction('touch'));stop()
})
test('details default off and can be disabled independently of normal app use',()=>{
 assert.equal(betaDetailsAllowed(),false)
 allowBetaDetails(true);assert.equal(betaDetailsAllowed(),true)
 allowBetaDetails(false);assert.equal(betaDetailsAllowed(),false)
})
