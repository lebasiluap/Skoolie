import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import ts from 'typescript'
import * as actions from './betaInteraction.ts'
const code=ts.transpileModule(readFileSync(new URL('./appMetrics.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
const exports={};new Function('require','exports',code)(()=>actions,exports)
const {createAppMetrics}=exports
const {betaScreen}=actions

test('automatic metrics contain aggregate allowlisted fields only; opening is not input',()=>{
 let t=0;const c=createAppMetrics('practice',()=>t);t=60000
 const [r]=c.take()
 assert.deepEqual(Object.keys(r).sort(),['screen','recent_ms','quiet_ms','idle_ms','views','touches','answers','flips','completions'].sort())
 assert.equal(r.recent_ms,0);assert.equal(r.quiet_ms,60000);assert.equal(r.views,1)
 assert.equal(JSON.stringify(r).includes('events'),false)
})
test('screen attribution, time buckets and bounded touch bursts reconcile',()=>{
 let t=0;const c=createAppMetrics('mcq',()=>t)
 c.action('touch','mcq');t=100;c.action('touch','mcq');t=1000;c.action('answer','mcq')
 t=31000;c.action('screen','flashcards');t=61000
 const rows=c.take()
 assert.equal(rows[0].touches,1);assert.equal(rows[0].answers,1)
 assert.equal(rows[1].views,1);assert.equal(rows[1].quiet_ms,30000)
 assert.equal(rows.reduce((n,r)=>n+r.recent_ms+r.quiet_ms+r.idle_ms,0),61000)
 t=121000;const [next]=c.take();assert.equal(next.views,0)
 t=181000;const [idle]=c.take();assert.equal(idle.idle_ms,60000)
})
test('suspension gaps are unknown; route parameters never enter payloads',()=>{
 let t=0;const c=createAppMetrics('cases',()=>t)
 t=200000;const rows=c.take();assert.equal(rows.reduce((n,r)=>n+r.recent_ms+r.quiet_ms+r.idle_ms,0),0)
 assert.equal(betaScreen(['(app)','cases','secret-case-id']),'cases')
 c.action('screen','secret-case-id');t+=1000
 assert.equal(JSON.stringify(c.take()).includes('secret-case-id'),false)
})
