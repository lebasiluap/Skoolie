import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import ts from 'typescript'
import {createStreakSnapshotStore,nextUtcMidnightDelay} from './streakSnapshot.ts'

const sample={current_streak:8,longest_streak:8,last_active_date:'2026-11-05',streak_freezes:1,frozen_dates:['2026-11-06','2026-11-07'],study_days:['2026-11-05'],today:new Date().toISOString().slice(0,10)}
const flush=()=>new Promise(r=>setImmediate(r))
function harness() {
 let effect,cleanup,calls=0,fail=false,uid='user-a',store
 const timers=new Map(),listeners=new Set()
 const app={currentState:'active',addEventListener:(_,f)=>{listeners.add(f);return {remove:()=>listeners.delete(f)}}}
 const react={createContext:()=>({Provider:'Provider'}),createElement:(type,props)=>({type,props}),useMemo:f=>f(),useEffect:f=>{effect=f}}
 const modules={react,'react-native':{AppState:app},'expo-router':{useFocusEffect:()=>{}},
 '@/hooks/useAuth':{useAuth:()=>({user:uid?{id:uid}:null})},'@/lib/streakSnapshot':{createStreakSnapshotStore,nextUtcMidnightDelay},
 '@/lib/progressEvents':{onProgressSaved:f=>{h.progress=f;return()=>{h.progress=null}}},
 '@/lib/readWithDeadline':{readWithDeadline:f=>f({})},
 '@/lib/supabase':{supabase:{rpc:()=>({abortSignal:async()=>{calls++;return fail?{error:new Error('offline')}:{data:sample,error:null}}})}}}
 const code=ts.transpileModule(readFileSync(new URL('../contexts/StreakContext.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React}}).outputText
 const out={};new Function('require','exports','React','setTimeout','clearTimeout',code)(n=>{assert.ok(modules[n],n);return modules[n]},out,react,
 (f,ms)=>{const id={};timers.set(id,{f,ms});return id},id=>timers.delete(id))
 const h={progress:null,render(){store=out.StreakProvider({children:null}).props.value;cleanup=effect()},
  state(s){app.currentState=s;for(const f of listeners)f(s)},fail(v){fail=v},
  timer(ms){const entry=[...timers].find(([,t])=>t.ms===ms);assert.ok(entry,`timer ${ms}`);timers.delete(entry[0]);entry[1].f()},
  cleanup(){cleanup?.()},replay(){cleanup?.();cleanup=effect()},get calls(){return calls},get timers(){return timers},get store(){return store},get listeners(){return listeners.size}}
 h.render();return h
}
test('provider retries initial failures twice, then stops; cleanup removes all timers/listeners',async()=>{
 const h=harness();h.fail(true);await flush();assert.equal(h.calls,1)
 h.timer(2000);await flush();assert.equal(h.calls,2)
 h.timer(5000);await flush();assert.equal(h.calls,3)
 assert.ok([...h.timers.values()].every(t=>t.ms>5000))
 h.cleanup();assert.equal(h.timers.size,0);assert.equal(h.listeners,0);assert.equal(h.progress,null)
})
test('foreground and committed progress refresh; iOS inactive flicker does not',async()=>{
 const h=harness();await flush();assert.equal(h.calls,1)
 h.state('inactive');h.state('active');await flush();assert.equal(h.calls,1)
 h.state('background');h.state('inactive');h.state('active');await flush();assert.equal(h.calls,2)
 h.progress();await flush();assert.equal(h.calls,3)
 h.cleanup()
})
test('UTC timer refreshes and reschedules; StrictMode replay keeps store usable',async()=>{
 const h=harness();h.replay();await flush();assert.equal(h.calls,1)
 const [id,t]=[...h.timers][0];h.timers.delete(id);t.f();await flush();assert.equal(h.calls,2)
 assert.equal(h.timers.size,1);h.cleanup()
})
test('actual tracker renders matching count/balance and server-day calendar in both themes',()=>{
 const react={createElement:(type,props,...children)=>({type,props:props||{},children:children.flat(Infinity)})}
 for(const isDark of [false,true]){
 const modules={'react-native':{View:'View',Text:'Text',StyleSheet:{create:x=>x}},'@expo/vector-icons':{Ionicons:'Icon'},
 '@/hooks/useTheme':{useTheme:()=>({shadow:{}})},'@/contexts/ThemeContext':{useThemeMode:()=>({isDark})},
 '@/lib/streak':{dateKey:d=>d.toISOString().slice(0,10),STREAK_FREEZE_BLUE:'#38BDF8',streakColors:()=>({fill:'#F5B301',text:'#aaa',onFill:'#fff',goal:'#aaa'})},'@/lib/freezePolicy':{FREEZE_CAPACITY:2}}
 const code=ts.transpileModule(readFileSync(new URL('../components/ui/StreakTracker.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React}}).outputText
 const out={};new Function('require','exports','React',code)(n=>{assert.ok(modules[n],n);return modules[n]},out,react)
 const nodes=n=>n&&typeof n==='object'?[n,...n.children.flatMap(nodes)]:[]
 const draw=s=>nodes(out.StreakTracker({snapshot:s,createdAt:'2026-11-01'}))
 const texts=s=>draw(s).filter(n=>n.type==='Text').map(n=>n.children.join(''))
 assert.ok(texts(null).includes('— day streak'))
 assert.ok(texts(sample).includes('8'));assert.ok(texts(sample).includes('1/2'))
 const updated={...sample,current_streak:9,streak_freezes:2};assert.ok(texts(updated).includes('9'));assert.ok(texts(updated).includes('2/2'))
 assert.ok(draw({...sample,today:'2026-11-08'}).some(n=>n.type==='Icon'&&n.props.name==='snow'))
 }
})
