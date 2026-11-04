import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import ts from 'typescript'

function load(path, modules){
 const code=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React}}).outputText
 const out={};new Function('require','exports',code)(name=>{assert.ok(name in modules,name);return modules[name]},out);return out
}
function harness(path){
 let reply={data:1,error:null}, email='lebasiluap@gmail.com';const calls=[],invalidations=[]
 const client={auth:{getUser:async()=>({data:{user:email?{email}:null}})},rpc:async(name,args)=>{calls.push({name,args});return reply}}
 const actions=load(path,{'@/lib/supabase/server':{createClient:async()=>client},'next/cache':{revalidatePath:path=>invalidations.push(path)}})
 return {actions,calls,invalidations,reply:x=>{reply=x},user:x=>{email=x}}
}
const reports='../../src/app/admin/reports/actions.ts', questions='../../src/app/admin/questions/actions.ts'
test('resolution actions reject database errors and zero rows, revalidating only confirmed writes',async()=>{
 const h=harness(reports);h.reply({error:{message:'Denied'},data:null})
 await assert.rejects(h.actions.setReportStatus('report','resolved'),/Denied/);assert.equal(h.invalidations.length,0)
 h.reply({error:null,data:0});await assert.rejects(h.actions.reopenReport('report'),/not reopened/)
 h.reply({error:null,data:1});await h.actions.setReportStatus('report','dismissed');assert.equal(h.calls.at(-1).name,'admin_set_report_status')
 assert.ok(h.invalidations.includes('/admin/reports'))
 await assert.rejects(h.actions.resolveAllForItem(null,null),/exactly one/)
})
test('expired/non-admin sessions cannot invoke either administrative write lane',async()=>{
 const a=harness(reports),b=harness(questions);a.user(null);b.user('other@example.com')
 await assert.rejects(a.actions.setReportStatus('report','resolved'),/Unauthorized/)
 await assert.rejects(b.actions.updateQuestionField('q','question_text','draft','old'),/Unauthorized/)
 assert.equal(a.calls.length+b.calls.length,0)
})
test('editing carries original value, preserves no-op and rejects unconfirmed responses',async()=>{
 const h=harness(questions);h.reply({error:null,data:{changed:false}})
 assert.deepEqual(await h.actions.updateQuestionField('q','access_key','',null),{ok:true,changed:false})
 assert.equal(h.calls.at(-1).args.p_expected,null)
 h.reply({error:null,data:null});assert.equal((await h.actions.updateQuestionField('q','question_text','draft','old')).ok,false)
 h.reply({error:{message:'Question changed'},data:null});assert.match((await h.actions.updateQuestionField('q','question_text','draft','old')).error,/changed/)
 const n=h.calls.length;assert.equal((await h.actions.updateQuestionField('q','id','bad','old')).ok,false);assert.equal(h.calls.length,n)
})
test('archive is guarded reversible quarantine, never direct table deletion',async()=>{
 const h=harness(questions);assert.deepEqual(await h.actions.archiveQuestion('q'),{ok:true});assert.equal(h.calls[0].name,'admin_archive_question')
 h.reply({error:null,data:0});assert.equal((await h.actions.archiveQuestion('q')).ok,false)
})
