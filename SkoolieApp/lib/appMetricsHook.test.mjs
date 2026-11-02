import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import ts from 'typescript'
import * as actions from './betaInteraction.ts'
function compile(path,modules){
 const exports={}
 const code=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
 return {code,exports,require:name=>{assert.ok(name in modules,`Unexpected dependency ${name}`);return modules[name]}}
}
const metric=compile('./appMetrics.ts',{'./betaInteraction':actions})
new Function('require','exports',metric.code)(metric.require,metric.exports)
const settle=async()=>{for(let i=0;i<12;i++)await new Promise(resolve=>setImmediate(resolve))}
function harness(user='user-a'){
 let cleanup,start,beat,stateChanged,release,t=0,hold=false,fail=false,uuid=0
 const calls=[]
 const app={currentState:'active',addEventListener:(_,fn)=>{stateChanged=fn;return {remove(){}}}}
 const x=compile('../hooks/useBetaActivity.ts',{
  react:{useEffect:fn=>{cleanup=fn()}},'react-native':{AppState:app,Platform:{OS:'ios'}},
  'expo-crypto':{randomUUID:()=>`session-${++uuid}`},'expo-modules-core':{requireOptionalNativeModule:()=>null},
  '@/lib/betaInteraction':actions,'@/lib/appMetrics':{createAppMetrics:screen=>metric.exports.createAppMetrics(screen,()=>t)},
  '@/lib/readWithDeadline':{readWithDeadline:fn=>fn(undefined)},
  '@/lib/supabase':{supabase:{rpc:(name,args)=>({abortSignal:()=>{
   calls.push({name,args})
   if(fail){fail=false;return Promise.reject(new Error('Offline'))}
   if(hold&&args.p_event==='beat'){hold=false;return new Promise(resolve=>{release=()=>resolve({error:null})})}
   return Promise.resolve({error:null})
  }})}},
 })
 new Function('require','exports','setTimeout','setInterval','clearTimeout','clearInterval','performance',x.code)(x.require,x.exports,fn=>{start=fn;return 1},fn=>{beat=fn;return 2},()=>{},()=>{},{now:()=>t})
 x.exports.useBetaActivity(user)
 return {calls,start:()=>start?.(),tick:async()=>{t+=30000;beat?.();await settle()},hold:()=>{hold=true},release:()=>release(),fail:()=>{fail=true},stop:()=>cleanup?.(),background:async()=>{app.currentState='background';stateChanged?.('background');await settle()}}
}
test('signed-out users send no data',async()=>{
 const h=harness(null);h.start();await h.tick();assert.equal(h.calls.length,0);h.stop()
})
test('all signed-in users get minute aggregates without optional beta consent or raw events',async()=>{
 actions.allowBetaDetails(false);const h=harness()
 try{
  h.start();await settle();actions.betaAction('answer');await h.tick()
  assert.equal(h.calls.filter(c=>c.name==='record_app_metrics').length,0)
  await h.tick()
  const rows=h.calls.find(c=>c.name==='record_app_metrics').args.p_rows
  assert.equal(rows.reduce((n,r)=>n+r.answers,0),1)
  assert.equal(JSON.stringify(rows).includes('events'),false)
  await h.background()
 }finally{h.stop()}
})
test('busy beats are skipped before take, and new activity survives until the next minute',async()=>{
 const h=harness()
 try{
  h.start();await settle();await h.tick();h.hold()
  await h.tick();actions.betaAction('answer');await h.tick()
  h.release();await settle();await h.tick()
  const batches=h.calls.filter(c=>c.name==='record_app_metrics')
  assert.equal(batches.length,2)
  assert.equal(batches[1].args.p_rows.reduce((n,r)=>n+r.answers,0),1)
 }finally{h.stop()}
})
test('account cleanup discards queued metrics and failed beats do not stall later calls',async()=>{
 const h=harness()
 h.start();await settle();h.fail();await h.tick();h.hold();await h.tick()
 h.stop();h.release();await settle()
 assert.equal(h.calls.filter(c=>c.name==='record_app_metrics').length,0)
 assert.ok(h.calls.some(c=>c.args.p_event==='end'))
})
