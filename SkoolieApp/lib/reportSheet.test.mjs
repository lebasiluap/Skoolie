import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import ts from 'typescript'

// Execute the actual component handlers with deterministic hooks/native mocks.
// This verifies logic, NOT physical-device keyboard geometry.
function harness(platform='ios') {
 let cursor=0, tree, props={questionId:'question-a',questionType:'mcq'}, releaseAuth, pendingAuth=false, failInsert=false
 const slots=[], effects=[], inserts=[], toasts=[], listeners=new Map();let scrolls=0,dismisses=0
 const react={
  createElement:(type,props,...children)=>({type,props:props??{},children:children.flat(Infinity)}),
  Fragment:'Fragment',
  useRef:value=>{const i=cursor++;return slots[i]??(slots[i]={current:value})},
  useState:value=>{const i=cursor++;if(!(i in slots))slots[i]=value;return [slots[i],v=>{slots[i]=v}]},
  useEffect:(fn,deps)=>{const i=cursor++;if(JSON.stringify(slots[i]?.deps)!==JSON.stringify(deps)){slots[i]?.cleanup?.();effects.push(()=>{slots[i]={deps,cleanup:fn()}})}},
 }
 const native=Object.fromEntries(['KeyboardAvoidingView','ScrollView','Modal','Pressable','Text','TextInput','TouchableOpacity','View'].map(k=>[k,k]))
 Object.assign(native,{Platform:{OS:platform},Keyboard:{addListener:(name,fn)=>{listeners.set(name,fn);return {remove:()=>listeners.delete(name)}},dismiss:()=>{dismisses++}},StyleSheet:{create:x=>x,absoluteFill:{}}})
 const modules={react,'react-native':native,'react-native-safe-area-context':{useSafeAreaInsets:()=>({bottom:24})},
  '@/hooks/useTheme':{useTheme:()=>({})},'@/lib/nativeReportContext':{nativeReportContext:()=>({platform,app_build:'18'})},
  '@/lib/toast':{showToast:(...args)=>toasts.push(args)},'@/lib/withTimeout':{withTimeout:x=>x,TimeoutError:class extends Error{},AUTH_TIMEOUT_MESSAGE:'Timed out'},
  '@/lib/supabase':{supabase:{auth:{getUser:()=>pendingAuth?new Promise(r=>{releaseAuth=()=>r({data:{user:{id:'user-a'}}})}):Promise.resolve({data:{user:{id:'user-a'}}})},from:()=>({insert:payload=>{inserts.push(payload);return Promise.resolve({error:failInsert?{code:'network'}:null})}})}},
 }
 const code=ts.transpileModule(readFileSync(new URL('../components/ui/ReportButton.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React}}).outputText
 // Legacy JSX output expects React; supply it explicitly alongside named hooks.
 const out={};new Function('require','exports','React',code)(name=>{assert.ok(name in modules,name);return modules[name]},out,react)
 function nodes(n=tree){return n&&typeof n==='object'?[n,...(n.children??[]).flatMap(x=>nodes(x))]:[]}
 function render(){cursor=0;tree=out.default(props);for(const n of nodes())if(n.type==='ScrollView')n.props.ref.current={scrollToEnd:()=>{scrolls++}};while(effects.length)effects.shift()();return tree}
 const find=(type,predicate=()=>true)=>nodes().find(n=>n.type===type&&predicate(n))
 const text=n=>(n?.children??[]).map(x=>typeof x==='string'?x:text(x)).join('')
 const button=label=>find('TouchableOpacity',n=>text(n)===label)
 render()
 return {render,find,button,inserts,toasts,listeners,
  open(){find('TouchableOpacity',n=>n.props.accessibilityLabel==='Report a problem with this question').props.onPress();render()},
  prepare(){this.open();find('TouchableOpacity',n=>n.props.accessibilityRole==='radio').props.onPress();find('TextInput').props.onChangeText('My report');render()},
  hold(){pendingAuth=true},release(){releaseAuth()},fail(){failInsert=true},recover(){failInsert=false},
  target(id){props={...props,questionId:id};render()},get scrolls(){return scrolls},get dismisses(){return dismisses},
 }
}
for(const os of ['ios','android']) test(`${os}: scroll note after keyboard opens and keep sheet scrollable`,()=>{
 const h=harness(os);h.open()
 assert.equal(h.find('KeyboardAvoidingView').props.behavior,os==='ios'?'padding':'height')
 assert.equal(h.find('ScrollView').props.keyboardShouldPersistTaps,'handled')
 h.find('TextInput').props.onFocus();const before=h.scrolls;h.listeners.get('keyboardDidShow')()
 assert.equal(h.scrolls,before+1)
 h.find('Modal').props.onRequestClose();h.render();assert.equal(h.find('Modal').props.visible,false)
 assert.equal(h.listeners.size,0)
})
test('double tap sends one immutable target/text; closing and editing are blocked while submitting',async()=>{
 const h=harness();h.prepare();h.hold()
 const submit=h.button('Send report').props.onPress;const first=submit();await submit()
 h.render();assert.equal(h.find('TextInput').props.editable,false)
 h.find('Modal').props.onRequestClose();h.render();assert.equal(h.find('Modal').props.visible,true)
 h.target('question-b');h.release();await first;h.render()
 assert.equal(h.inserts.length,1);assert.equal(h.inserts[0].question_id,'question-a');assert.equal(h.inserts[0].note,'My report')
 assert.equal(h.find('Modal').props.visible,false);assert.equal(h.dismisses,1)
})
test('failed send retains text and unlocks retry without signing out',async()=>{
 const h=harness('android');h.prepare();h.fail();await h.button('Send report').props.onPress();h.render()
 assert.equal(h.find('TextInput').props.value,'My report');assert.equal(h.find('Modal').props.visible,true)
 assert.equal(h.button('Send report').props.disabled,false)
 h.recover();await h.button('Send report').props.onPress();h.render();assert.equal(h.inserts.length,2);assert.equal(h.find('Modal').props.visible,false)
})
