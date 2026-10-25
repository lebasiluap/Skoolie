import test from 'node:test'
import assert from 'node:assert/strict'
import { timedVerdict } from './timedVerdict.ts'
const shuffled={options:['second','first','third'],correctLetter:'A',displayToOriginalLetter:{A:'B',B:'A',C:'C'}}
test('lost-response retry displays the original canonical answer, not a different new tap',()=>{
 assert.deepEqual(timedVerdict(shuffled,'B'),{display:'A',correct:true,timedOut:false})
 assert.deepEqual(timedVerdict(shuffled,'A'),{display:'B',correct:false,timedOut:false})
})
test('timeout retry preserves a previously accepted correct answer; a true timeout stays wrong',()=>{
 assert.equal(timedVerdict(shuffled,'B').correct,true)
 assert.deepEqual(timedVerdict(shuffled,null),{display:'',correct:false,timedOut:true})
})
test('an unbound canonical answer fails closed',()=>assert.throws(()=>timedVerdict(shuffled,'F')))
