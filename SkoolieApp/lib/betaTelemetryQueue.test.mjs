import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import ts from 'typescript'
import * as consent from './betaInteraction.ts'

const source = readFileSync(new URL('../hooks/useBetaActivity.ts',import.meta.url),'utf8')
const compiled = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
const settle = async () => { for(let i=0;i<12;i++) await new Promise(resolve=>setImmediate(resolve)) }
function harness() {
  let cleanup, start, beat, release
  let hold = false
  let fail = false
  const calls=[]
  const modules={
    react:{useEffect:fn=>{cleanup=fn()}},
    'react-native':{AppState:{currentState:'active',addEventListener:()=>({remove(){}})},Platform:{OS:'ios'}},
    'expo-crypto':{randomUUID:()=> 'test-session'},
    'expo-modules-core':{requireOptionalNativeModule:()=>null},
    '@/lib/betaInteraction':consent,
    '@/lib/readWithDeadline':{readWithDeadline:fn=>fn(undefined)},
    '@/lib/supabase':{supabase:{rpc:(name,args)=>({abortSignal:()=>{
      calls.push({name,args})
      if(fail) {fail=false;return Promise.reject(new Error('Offline'))}
      if(hold && args.p_event==='beat') {hold=false;return new Promise(resolve=>{release=()=>resolve({error:null})})}
      return Promise.resolve({error:null})
    }})}},
  }
  const exports={}
  new Function('require','exports','setTimeout','setInterval','clearTimeout','clearInterval',compiled)(name=>{
    assert.ok(name in modules,`Unexpected dependency ${name}`);return modules[name]
  },exports,fn=>{start=fn;return 1},fn=>{beat=fn;return 2},()=>{},()=>{})
  exports.useBetaActivity('user-a')
  return {calls,start:()=>start(),beat:()=>beat(),fail:()=>{fail=true},hold:()=>{hold=true},release:()=>release(),stop:()=>cleanup()}
}
test('off-state input is never included when details are subsequently enabled',async()=>{
  consent.allowBetaDetails(false)
  const h=harness()
  try {
    h.start();await settle()
    consent.betaAction('touch')
    consent.allowBetaDetails(true)
    h.beat();await settle()
    const detail=h.calls.find(c=>c.name==='record_beta_interactions')
    assert.ok(detail)
    assert.equal(detail.args.p_data.interactions,0)
    assert.deepEqual(detail.args.p_data.events,[])
  } finally {h.stop();consent.allowBetaDetails(false)}
})
test('revocation drops a detail batch waiting behind a basic heartbeat',async()=>{
  consent.allowBetaDetails(true)
  const h=harness()
  try {
    h.start();await settle();h.calls.length=0
    consent.betaAction('touch');h.hold();h.beat();await settle()
    consent.allowBetaDetails(false)
    h.release();await settle()
    assert.equal(h.calls.filter(c=>c.name==='record_beta_interactions').length,0)
    assert.ok(h.calls.some(c=>c.name==='record_beta_activity'))
  } finally {h.stop();consent.allowBetaDetails(false)}
})
test('account cleanup drops queued details even if another session opts in',async()=>{
  consent.allowBetaDetails(true)
  const h=harness()
  try {
    h.start();await settle();h.calls.length=0
    consent.betaAction('touch');h.hold();h.beat();await settle()
    h.stop();consent.allowBetaDetails(false);consent.allowBetaDetails(true)
    h.release();await settle()
    assert.equal(h.calls.filter(c=>c.name==='record_beta_interactions').length,0)
  } finally {consent.allowBetaDetails(false)}
})

test('a rejected heartbeat does not stall subsequent beats or the end event',async()=>{
  consent.allowBetaDetails(false)
  const h=harness()
  try {
    h.start();await settle();h.calls.length=0
    h.fail();h.beat();await settle()
    h.beat();await settle()
    assert.equal(h.calls.filter(c=>c.args.p_event==='beat').length,2)
    h.stop();await settle()
    assert.equal(h.calls.filter(c=>c.args.p_event==='end').length,1)
  } finally {consent.allowBetaDetails(false)}
})
