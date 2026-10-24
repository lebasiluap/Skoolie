import test from 'node:test'
import assert from 'node:assert/strict'
import { createSessionReadCache } from './sessionReadCache.ts'

test('startup and screen reads share one in-flight request', async () => {
  const cache = createSessionReadCache()
  let calls = 0
  const read = async () => { calls++; return [42] }
  const [a, b] = await Promise.all([cache.get('topics', read), cache.get('topics', read)])
  assert.equal(calls, 1)
  assert.deepEqual(a, b)
  assert.deepEqual(cache.peek('topics'), [42])
})
test('warm metadata is immediately available and fresh reads reuse it', async () => {
  const cache = createSessionReadCache()
  await cache.get('hub', async () => 42)
  assert.equal(cache.peek('hub'), 42)
  assert.equal(await cache.get('hub', async () => 99), 42)
})
test('stale metadata remains available while a new read refreshes it', async () => {
  const cache = createSessionReadCache(0)
  await cache.get('hub', async () => 42)
  assert.equal(cache.peek('hub'), 42)
  assert.equal(await cache.get('hub', async () => 99), 99)
})
test('failed requests are not cached as empty data', async () => {
  const cache = createSessionReadCache()
  await assert.rejects(cache.get('hub', async () => { throw new Error('offline') }))
  assert.equal(cache.peek('hub'), undefined)
  assert.equal(await cache.get('hub', async () => 42), 42)
})
test('clear prevents an old session from repopulating the cache', async () => {
  const cache = createSessionReadCache()
  let complete
  const old = cache.get('hub', () => new Promise(resolve => { complete = resolve }))
  await Promise.resolve()
  cache.clear()
  await cache.get('hub', async () => 99)
  complete(42)
  await old
  assert.equal(cache.peek('hub'), 99)
})
test('filter keys and cache scopes cannot reuse each other’s data', async () => {
  const a = createSessionReadCache(), b = createSessionReadCache()
  await a.get('easy', async () => 1)
  await a.get('hard', async () => 2)
  assert.equal(a.peek('easy'), 1)
  assert.equal(a.peek('hard'), 2)
  assert.equal(b.peek('easy'), undefined)
})
