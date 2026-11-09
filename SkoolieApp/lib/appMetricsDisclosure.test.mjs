import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import ts from 'typescript'
const readPolicy=path=>{
 const code=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText
 const exports={};new Function('exports',code)(exports);return exports.PRIVACY
}
test('mobile and website publish the same first-party metrics disclosure',()=>{
 const mobile=readPolicy('./legal.ts'),web=readPolicy('../../src/lib/legal.ts')
 assert.deepEqual(mobile,web)
 assert.equal(mobile.updated,'November 9, 2026')
 const text=mobile.sections[0].body
 for(const phrase of ['automatically','signed-in users','account','not anonymous','30 days','not proof of attention','other apps or websites'])assert.ok(text.includes(phrase),phrase)
})
