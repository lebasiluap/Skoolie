import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import ts from 'typescript'
import * as policy from './freezePolicy.ts'

function harness() {
 const jobs=[];let cancelled=0
 const native={setNotificationHandler(){},getPermissionsAsync:async()=>({granted:true}),
  cancelAllScheduledNotificationsAsync:async()=>{jobs.length=0;cancelled++},
  scheduleNotificationAsync:async job=>{jobs.push(job);return String(jobs.length)},
  SchedulableTriggerInputTypes:{DATE:'date'}}
 const now='2026-11-04T10:00:00Z',RealDate=Date
 const Clock=class extends RealDate{constructor(...args){super(...(args.length?args:[now]))}static now(){return new RealDate(now).getTime()}}
 const mods={
  'react-native':{Platform:{OS:'ios'}},
  '@react-native-async-storage/async-storage':{default:{getItem:async()=>null,setItem:async()=>{}}},
  '@/lib/barrage':{barrageWindows:()=>[{slot:0,status:'upcoming',start:new Clock('2026-11-04T11:00:00Z')}]},
  '@/lib/league':{weekStartKey:()=> '2026-11-02'},
  './freezePolicy':policy,
  'expo-modules-core':{requireOptionalNativeModule:()=>true},
  'expo-notifications':native,
 }
 const code=ts.transpileModule(readFileSync(new URL('./notifications.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText
 const out={};new Function('require','exports','Date',code)(name=>{assert.ok(name in mods,name);return mods[name]},out,Clock)
 return {out,jobs,get cancelled(){return cancelled}}
}
test('actual scheduler: no exhausted/earned promises at any freeze balance, pending notifications rebuilt',async()=>{
 const h=harness()
 for(const freezes of [0,1,2]){
  await h.out.rescheduleAll({userId:'fixture',streak:5,practicedToday:false,freezes})
  assert.ok(h.jobs.length>0)
  const bodies=h.jobs.map(j=>j.content.body).join('\n')
  assert.match(bodies,/Without one/)
  assert.match(bodies,/if there is space \(maximum 2 stored\)/)
  assert.doesNotMatch(bodies,/this one earns|last freeze|freezes left|about to run out|reset at midnight|2 hours/)
 }
 assert.equal(h.cancelled,3)
 await h.out.rescheduleAll({userId:'fixture',streak:5,practicedToday:false,prefs:{streak:false,barrage:false,league:false}})
 assert.equal(h.jobs.length,0)
})
