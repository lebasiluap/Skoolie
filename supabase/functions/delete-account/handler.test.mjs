import test from 'node:test'
import assert from 'node:assert/strict'
import { createDeletionHandler } from './handler.ts'

function fixture(apple = false) {
  const calls = []
  const deps = {
    authenticate: async () => ({ id: 'verified-owner', identities: apple ? [{ provider: 'apple', identity_data: { sub: 'apple-owner' } }] : [] }),
    revokeApple: async (...args) => { calls.push(['apple', ...args]) },
    removeUploads: async uid => { calls.push(['storage', uid]) },
    removeReports: async uid => { calls.push(['reports', uid]) },
    deleteUser: async uid => { calls.push(['delete', uid]) },
  }
  const send = (body, auth = 'Bearer test') => createDeletionHandler(deps)(new Request('https://example.test/delete-account', {
    method: 'POST', headers: { Authorization: auth }, body: JSON.stringify(body),
  }))
  return { deps, calls, send }
}
test('only the verified caller can be deleted, after upload/report cleanup', async () => {
  const f = fixture()
  const response = await f.send({ confirm: 'DELETE', user_id: 'victim' })
  assert.equal(response.status, 200)
  assert.deepEqual(f.calls, [['storage', 'verified-owner'], ['reports', 'verified-owner'], ['delete', 'verified-owner']])
})
test('authentication, explicit confirmation and bounded input fail closed', async () => {
  const f = fixture()
  assert.equal((await f.send({ confirm: 'DELETE' }, '')).status, 401)
  assert.equal((await f.send({})).status, 400)
  assert.equal((await f.send({ confirm: 'DELETE', excess: 'x'.repeat(9000) })).status, 413)
  f.deps.authenticate = async () => null
  assert.equal((await f.send({ confirm: 'DELETE' })).status, 401)
  assert.deepEqual(f.calls, [])
})
test('Apple code must bind to the verified Apple identity before any deletion', async () => {
  const f = fixture(true)
  assert.equal((await f.send({ confirm: 'DELETE' })).status, 409)
  assert.deepEqual(f.calls, [])
  assert.equal((await f.send({ confirm: 'DELETE', apple_authorization_code: 'one-use-code' })).status, 200)
  assert.deepEqual(f.calls[0], ['apple', 'one-use-code', 'apple-owner'])
})
test('failed Apple verification/revocation does not delete data', async () => {
  const f = fixture(true)
  f.deps.revokeApple = async () => { throw Error('mismatched sub / offline') }
  assert.equal((await f.send({ confirm: 'DELETE', apple_authorization_code: 'bad-code' })).status, 502)
  assert.deepEqual(f.calls, [])
})
test('Apple subject falls back to the server-verified identity provider_id', async () => {
  const f = fixture(true)
  f.deps.authenticate = async () => ({ id: 'verified-owner', identities: [{ provider: 'apple', provider_id: 'legacy-apple-sub' }] })
  assert.equal((await f.send({ confirm: 'DELETE', apple_authorization_code: 'code' })).status, 200)
  assert.deepEqual(f.calls[0], ['apple', 'code', 'legacy-apple-sub'])
})
test('explicit legacy manual revocation fallback remains available', async () => {
  const f = fixture(true)
  const response = await f.send({ confirm: 'DELETE', manual_apple_revoke: true })
  assert.equal(response.status, 200)
  assert.equal((await response.json()).manual_apple_revocation, true)
  assert.equal(f.calls[0][0], 'storage')
})
test('storage/report failure leaves account present and reports incomplete deletion', async () => {
  for (const step of ['removeUploads', 'removeReports']) {
    const f = fixture()
    f.deps[step] = async () => { throw Error('offline') }
    assert.equal((await f.send({ confirm: 'DELETE' })).status, 503)
    assert.equal(f.calls.some(call => call[0] === 'delete'), false)
  }
})
