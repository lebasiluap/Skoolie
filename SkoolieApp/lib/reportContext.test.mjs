import test from 'node:test'
import assert from 'node:assert/strict'
import { reportContext } from './reportContext.ts'
import { readFileSync } from 'node:fs'
test('report labels are bounded and contain no identifiers, credentials or raw routes',()=>{
  const c=reportContext({platform:'ios',version:'1.0.0',build:'18',os:'26.3.1',screen:'mcq'})
  assert.deepEqual(c,{platform:'ios',app_version:'1.0.0',app_build:'18',os_version:'26.3.1',app_screen:'mcq'})
  assert.equal(reportContext({platform:'invalid'}).app_build,'unknown')
  assert.equal(reportContext({platform:'ios',version:'x'.repeat(200)}).app_version.length,80)
  assert.equal(reportContext({platform:'ios',screen:'/mcq?token=secret'}).app_screen,'unknown')
})
test('web practice never submits a client score or legacy reward/history writes',()=>{
 for(const path of ['mcq/MCQClient.tsx','cases/CaseStudyClient.tsx','flashcards/FlashcardClient.tsx']){
  const text=readFileSync(new URL(`../../src/app/practice/${path}`,import.meta.url),'utf8')
  assert.match(text,/useVerifiedWebPractice/)
  assert.match(text,/await verified.finish\(\)/)
  assert.doesNotMatch(text,/credit_xp|record_answer|from\(['"]quiz_sessions|from\(['"]user_question_history/)
 }
 const hook=readFileSync(new URL('../../src/lib/useVerifiedWebPractice.ts',import.meta.url),'utf8')
 assert.match(hook,/readWithDeadline/)
 assert.match(hook,/binding.client.finish\(\).catch\(\(\)=>binding.client.finish\(\)\)/)
 assert.match(hook,/active.current!==binding/)
})
test('report sheet has keyboard avoidance, scrolling and safe-area padding on both platforms',()=>{
 const text=readFileSync(new URL('../components/ui/ReportButton.tsx',import.meta.url),'utf8')
 assert.match(text,/<KeyboardAvoidingView/);assert.match(text,/<ScrollView[^>]*keyboardShouldPersistTaps="handled"/)
 assert.match(text,/insets.bottom/);assert.match(text,/nativeReportContext\(\)/)
})
