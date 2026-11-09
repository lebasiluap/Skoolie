import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import ts from 'typescript'
import * as policy from './freezePolicy.ts'

function harness() {
 const jobs=[];let cancelled=0;const updates=[]
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
  'expo-constants':{default:{expoConfig:{extra:{eas:{projectId:'fixture'}}}}},
  '@/lib/supabase':{supabase:{from:()=>({update:value=>{
   const filters=[];const query={eq:(key,value)=>{filters.push([key,value]);return query},then:resolve=>{updates.push({value,filters});return Promise.resolve({error:null}).then(resolve)}};return query
  }})}},
 }
 const code=ts.transpileModule(readFileSync(new URL('./notifications.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText
 const out={};new Function('require','exports','Date',code)(name=>{assert.ok(name in mods,name);return mods[name]},out,Clock)
 return {out,jobs,native,updates,get cancelled(){return cancelled}}
}
test('account cleanup cancels reminders and invalidates an in-flight old-account rebuild',async()=>{
 const h=harness()
 let release
 h.native.getPermissionsAsync=()=>new Promise(resolve=>{release=resolve})
 const pending=h.out.rescheduleAll({userId:'fixture',streak:5,practicedToday:false,freezes:1})
 while(!release) await Promise.resolve()
 const cancel=h.out.cancelAccountNotifications()
 release({granted:true});await pending
 await cancel
 assert.equal(h.jobs.length,0)
 assert.equal(h.cancelled,1)
})
test('native schedule finishing after cancellation request is drained before final cancel',async()=>{
 const h=harness();let release
 h.native.scheduleNotificationAsync=job=>new Promise(resolve=>{const previous=release;release=()=>{previous?.();h.jobs.push(job);resolve('id')}})
 const pending=h.out.rescheduleAll({userId:'fixture',streak:5,practicedToday:false})
 while(!release) await Promise.resolve()
 const cancel=h.out.cancelAccountNotifications()
 release();await pending;await cancel
 assert.equal(h.jobs.length,0)
})
test('sign-out clears only this account and this device token, including registration in flight',async()=>{
 const h=harness();let release
 h.native.getExpoPushTokenAsync=()=>new Promise(resolve=>{release=()=>resolve({data:'device-token'})})
 const pending=h.out.registerPushToken('first-user')
 while(!release) await Promise.resolve()
 const cancel=h.out.cancelAccountNotifications('first-user')
 release();await pending
 // Cancellation obtains the token without requesting permission if registration was invalidated.
 while(h.updates.length===0){await Promise.resolve();release()}
 await cancel
 assert.deepEqual(h.updates,[{value:{push_token:null},filters:[['id','first-user'],['push_token','device-token']]}])
 h.native.getExpoPushTokenAsync=async()=>({data:'device-token'})
 assert.equal(await h.out.registerPushToken('second-user'),true)
 assert.deepEqual(h.updates[1],{value:{push_token:'device-token'},filters:[['id','second-user']]})
})
test('ordinary rescheduling does not invalidate an in-flight push registration',async()=>{
 const h=harness();let release
 h.native.getExpoPushTokenAsync=()=>new Promise(resolve=>{release=()=>resolve({data:'device-token'})})
 const pending=h.out.registerPushToken('fixture')
 while(!release) await Promise.resolve()
 await h.out.rescheduleAll({userId:'fixture',streak:1,practicedToday:false})
 release();assert.equal(await pending,true)
 assert.deepEqual(h.updates,[{value:{push_token:'device-token'},filters:[['id','fixture']]}])
})
test('offline push-token lookup cannot indefinitely block local notification cleanup',async()=>{
 const h=harness()
 h.native.getExpoPushTokenAsync=()=>new Promise(()=>{})
 const start=Date.now()
 await h.out.cancelAccountNotifications('fixture')
 assert.ok(Date.now()-start<6500)
 assert.equal(h.cancelled,1)
 assert.equal(h.updates.length,0)
})
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
