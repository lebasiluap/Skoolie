import test from 'node:test'
import assert from 'node:assert/strict'
// Transpile the two pure helpers in memory; no React Native runtime needed.
import ts from 'typescript'
import {readFileSync} from 'node:fs'
const load=(file)=>ts.transpileModule(readFileSync(new URL(file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText
const deadline={exports:{}}
new Function('exports','require',load('./readWithDeadline.ts'))(deadline.exports,()=>{})
const timed={exports:{}}
new Function('exports','require',load('./timedRequest.ts'))(timed.exports,()=>deadline.exports)
const {timedRequest}=timed.exports

test('lost response retries the identical timed operation',async()=>{
  const args={session:'one',item:'first',answer:'B'},calls=[]
  const result=await timedRequest(()=>{
    calls.push({...args})
    if(calls.length===1)return Promise.reject(new Error('lost response'))
    return Promise.resolve({data:{answer:'B'},error:null})
  })
  assert.deepEqual(calls,[args,args]);assert.deepEqual(result,{answer:'B'})
})
test('stalled request is bounded and retried only once',async()=>{
  let calls=0
  await assert.rejects(timedRequest(()=>{calls++;return new Promise(()=>{})},5),/timed out/)
  assert.equal(calls,2)
})
test('order and authorization failures fail closed without repeated writes',async()=>{
  for(const code of ['22023','42501']){
    let calls=0
    await assert.rejects(timedRequest(()=>{calls++;return Promise.resolve({data:null,error:{code}})}))
    assert.equal(calls,1)
  }
})
