import test from 'node:test'
import assert from 'node:assert/strict'
import {createSessionBootstrap} from './sessionBootstrap.ts'

test('interrupted startup never becomes a false sign-out; retry restores the session',async()=>{
 let offline=true,failures=0;const accepted=[]
 const boot=createSessionBootstrap(async()=>({data:{session:offline?null:{user:'same-user'}},error:offline?new Error('offline'):null}),s=>accepted.push(s),()=>failures++)
 await boot.recover();assert.equal(failures,1);assert.deepEqual(accepted,[])
 offline=false;await boot.recover();assert.deepEqual(accepted,[{user:'same-user'}])
})
test('genuinely absent session remains signed out',async()=>{
 const accepted=[]
 await createSessionBootstrap(async()=>({data:{session:null},error:null}),s=>accepted.push(s),()=>assert.fail()).recover()
 assert.deepEqual(accepted,[null])
})
test('explicit sign-out invalidates a late recovery and cannot be resurrected',async()=>{
 let resolve;const accepted=[]
 const boot=createSessionBootstrap(()=>new Promise(r=>resolve=r),s=>accepted.push(s),()=>assert.fail())
 const pending=boot.recover();await Promise.resolve();boot.invalidate()
 resolve({data:{session:{user:'old-user'}},error:null});await pending
 assert.deepEqual(accepted,[])
})
test('foreground and retry share a single recovery read',async()=>{
 let calls=0
 const boot=createSessionBootstrap(async()=>{calls++;return{data:{session:{}},error:null}},()=>{},()=>assert.fail())
 await Promise.all([boot.recover(),boot.recover()]);assert.equal(calls,1)
})
