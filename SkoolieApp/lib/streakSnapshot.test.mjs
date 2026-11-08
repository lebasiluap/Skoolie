import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createStreakSnapshotStore, parseStreakSnapshot, nextUtcMidnightDelay } from './streakSnapshot.ts'

const sample = (count=8,freezes=1) => ({current_streak:count,longest_streak:count,last_active_date:'2026-11-05',streak_freezes:freezes,frozen_dates:['2026-11-06','2026-11-07'],study_days:['2026-11-05'],today:'2026-11-08'})
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject}}
const flush=()=>new Promise(r=>setImmediate(r))

test('two screens share exactly one atomic snapshot and one in-flight read',async()=>{
 const d=deferred();let calls=0
 const store=createStreakSnapshotStore(()=>{calls++;return d.promise})
 const home=[],profile=[]
 store.subscribe(()=>home.push(store.getSnapshot()));store.subscribe(()=>profile.push(store.getSnapshot()))
 const a=store.refresh(),b=store.refresh();assert.equal(a,b)
 await flush();assert.equal(calls,1);assert.equal(store.getSnapshot(),null)
 d.resolve(sample());await a
 assert.equal(home[0],profile[0]);assert.equal(home[0].current_streak,8);assert.equal(home[0].streak_freezes,1)
})
test('verified completion invalidates an older read and queues one fresh read',async()=>{
 const a=deferred(),b=deferred();let calls=0
 const store=createStreakSnapshotStore(()=>++calls===1?a.promise:b.promise)
 const first=store.refresh();await flush()
 const afterSave=store.refresh(true),afterSaveAgain=store.refresh(true)
 a.resolve(sample(7,2));await first;await flush()
 assert.equal(store.getSnapshot(),null);assert.equal(calls,2)
 b.resolve(sample(8,1));await Promise.all([afterSave,afterSaveAgain])
 assert.equal(store.getSnapshot().current_streak,8);assert.equal(store.getSnapshot().streak_freezes,1)
})
test('timeout and malformed response preserve the last whole snapshot and allow retry',async()=>{
 let result=sample();const store=createStreakSnapshotStore(async()=>{if(result instanceof Error)throw result;return result})
 await store.refresh();const old=store.getSnapshot()
 result=new Error('timeout');await store.refresh();assert.equal(store.getSnapshot(),old)
 result={...sample(),streak_freezes:99};await store.refresh();assert.equal(store.getSnapshot(),old)
 result=sample(9,2);await store.refresh();assert.equal(store.getSnapshot().current_streak,9)
})
test('identity stores never share snapshots and late disposed reads cannot publish',async()=>{
 const d=deferred();const old=createStreakSnapshotStore(()=>d.promise),next=createStreakSnapshotStore(async()=>sample(1,0))
 const p=old.refresh();old.dispose();d.resolve(sample(8,2));await p
 assert.equal(old.getSnapshot(),null);assert.equal(next.getSnapshot(),null)
 await next.refresh();assert.equal(next.getSnapshot().current_streak,1)
})
test('server day and arrays are validated and copied',()=>{
 // Read-only projection of the live get_study_streak response fields for an
 // empty profile, captured 2026-11-08. No reconcile RPC/production writes run.
 assert.deepEqual(parseStreakSnapshot({today:'2026-11-08',study_days:[],frozen_dates:[],current_streak:0,longest_streak:0,streak_freezes:0,last_active_date:null}),
  {today:'2026-11-08',study_days:[],frozen_dates:[],current_streak:0,longest_streak:0,streak_freezes:0,last_active_date:null})
 const v=sample(),s=parseStreakSnapshot(v);v.study_days.push('2026-11-08');assert.equal(s.study_days.length,1)
 assert.throws(()=>parseStreakSnapshot({...sample(),today:'bad'}))
 assert.deepEqual(parseStreakSnapshot({...sample(),study_days:null}).study_days,[])
 const nullable=parseStreakSnapshot({...sample(),current_streak:null,longest_streak:null,streak_freezes:null,frozen_dates:null})
 assert.equal(nullable.current_streak,0);assert.equal(nullable.streak_freezes,0);assert.deepEqual(nullable.frozen_dates,[])
 assert.throws(()=>parseStreakSnapshot({...sample(),study_days:undefined}))
 assert.throws(()=>parseStreakSnapshot({...sample(),last_active_date:undefined}))
 assert.throws(()=>parseStreakSnapshot({...sample(),current_streak:-1}))
 assert.equal(nextUtcMidnightDelay(Date.parse('2026-11-08T23:59:59Z')),1050)
})
test('both platforms use the shared provider; cards have no independent fetch or profile fallback',()=>{
 const source=p=>readFileSync(new URL(p,import.meta.url),'utf8')
 const tracker=source('../components/ui/StreakTracker.tsx'),provider=source('../contexts/StreakContext.tsx')
 const dashboard=source('../app/(app)/dashboard.tsx'),profile=source('../app/(app)/profile.tsx')
 assert.doesNotMatch(tracker,/get_study_streak|verifiedBalance|verifiedFrozen|useFocusEffect|effectiveStreak/)
 assert.match(tracker,/snapshot.current_streak/);assert.match(tracker,/snapshot.today/)
 for(const screen of [dashboard,profile])assert.match(screen,/<StreakTracker snapshot=\{streakSnapshot\}/)
 assert.match(profile,/streakSnapshot\?\.current_streak/)
 assert.match(provider,/onProgressSaved/);assert.match(provider,/state === 'active'/);assert.match(provider,/nextUtcMidnightDelay/)
 assert.match(source('../app/(app)/_layout.tsx'),/<StreakProvider>/)
})
