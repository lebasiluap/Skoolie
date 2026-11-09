import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

function fixture(result, code) {
  let authCalls = 0
  const apple = { signInAsync: async options => {
    assert.deepEqual(options, { requestedScopes: [] })
    if (code) throw { code }
    return result
  } }
  const mods = {
    'react-native': { Platform: { OS: 'ios' } },
    '@/lib/supabase': { supabase: { auth: new Proxy({}, { get: () => () => { authCalls++; throw Error('Login must not be called') } }) } },
    '@/lib/withTimeout': {},
    'expo-modules-core': { requireOptionalNativeModule: () => true },
    'expo-apple-authentication': apple,
  }
  const out = {}
  const source = ts.transpileModule(readFileSync(new URL('./appleAuth.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  new Function('require', 'exports', source)(name => mods[name], out)
  return { run: out.appleDeletionCode, authCalls: () => authCalls }
}
test('deletion reauthorization returns only the code and never changes the active sign-in', async () => {
  const f = fixture({ authorizationCode: 'fresh-code', identityToken: 'not-returned' })
  assert.equal(await f.run(), 'fresh-code')
  assert.equal(f.authCalls(), 0)
})
test('Apple cancellation is silent; other errors and missing codes remain failures', async () => {
  assert.equal(await fixture({}, 'ERR_REQUEST_CANCELED').run(), null)
  await assert.rejects(fixture({}, 'ERR_REQUEST_FAILED').run())
  await assert.rejects(fixture({}).run())
})
