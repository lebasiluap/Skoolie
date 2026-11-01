import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {onProgressSaved,notifyProgressSaved} from './progressEvents.ts'
import {weekStartKey} from './leagueWeek.ts'

const provider=readFileSync(new URL('../contexts/ProgressDataContext.tsx',import.meta.url),'utf8')
const screen=readFileSync(new URL('../app/(app)/progress/index.tsx',import.meta.url),'utf8')

test('a committed save publishes a revision after cache invalidation',()=>{
  assert.match(provider,/onProgressSaved\(\(\)=>\{cache\.clear\(\);setRevision\(r=>r\+1\);warm\(\)\}/)
  assert.match(provider,/useMemo\(\(\)=>\(\{\.\.\.value,revision\}\),\[value,revision\]\)/)
  assert.match(screen,/\[user\?\.id,progressData,scope\]/)
})
test('league uses a current-week key and identity-scoped cache',()=>{
  assert.match(provider,/\[uid,profession,accessKey,profile\?\.country\]/)
  assert.equal((provider.match(/league:\$\{weekStartKey\(\)\}/g)||[]).length,2)
})

test('league week matches UTC across Sunday/Monday in both timezone directions',()=>{
  assert.equal(weekStartKey(new Date('2026-11-02T00:30:00+14:00')),'2026-10-26')
  assert.equal(weekStartKey(new Date('2026-11-01T23:30:00-10:00')),'2026-11-02')
  assert.equal(weekStartKey(new Date('2026-11-02T00:00:00Z')),'2026-11-02')
})
test('background recovery and late responses retain their guards',()=>{
  assert.match(screen,/state!=='active'\|\|!wasBackground/)
  assert.match(screen,/foreground\.remove\(\);request\.current\+\+/)
  assert.match(screen,/if\(gen!==request\.current\)return/)
})
test('failed summary subscriber cannot break completion or later listeners',()=>{
  let calls=0
  const a=onProgressSaved(()=>{throw new Error('failed read')})
  const b=onProgressSaved(()=>{calls++})
  notifyProgressSaved()
  assert.equal(calls,1)
  a();b();notifyProgressSaved()
  assert.equal(calls,1)
})
