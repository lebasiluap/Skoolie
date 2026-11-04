import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {freezeBalance, FREEZE_CAPACITY, FREEZE_REMINDER, BARRAGE_FREEZE_REMINDER} from './freezePolicy.ts'

test('bank display is bounded; unknown is not fabricated as zero',()=>{
 assert.equal(FREEZE_CAPACITY,2)
 for(const [value,want] of [[0,0],[1,1],[2,2],[13,2],[-1,0],[null,null],[undefined,null],[NaN,null]]) assert.equal(freezeBalance(value),want)
})
test('scheduled messages never assert an exact current balance or promise a grant',()=>{
 assert.match(FREEZE_REMINDER,/Without one/)
 assert.match(BARRAGE_FREEZE_REMINDER,/if there is space/)
 const code=readFileSync(new URL('./notifications.ts',import.meta.url),'utf8')
 assert.doesNotMatch(code,/this one earns you|streaks reset at midnight|watch it die|streak is one quiz away/)
 assert.match(code,/BARRAGE_FREEZE_REMINDER/)
 assert.doesNotMatch(code,/state\.barragesToFreeze/)
})
test('barrage results do not fabricate an earned freeze from a divisible count',()=>{
 const code=readFileSync(new URL('../app/(app)/practice/rapidfire.tsx',import.meta.url),'utf8')
 assert.doesNotMatch(code,/Streak Freeze earned! 5 barrages/)
 assert.match(code,/max 2 stored/)
})
