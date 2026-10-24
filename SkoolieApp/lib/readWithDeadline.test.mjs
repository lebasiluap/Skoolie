import test from 'node:test'
import assert from 'node:assert/strict'
import { readWithDeadline } from './readWithDeadline.ts'

test('returns successful reads', async () => {
  assert.equal(await readWithDeadline(() => Promise.resolve(42), 100), 42)
})
test('propagates failures', async () => {
  await assert.rejects(readWithDeadline(() => Promise.reject(new Error('offline')), 100), /offline/)
})
test('bounds a read that never reaches fetch and aborts it', async () => {
  let signal
  await assert.rejects(readWithDeadline(s => { signal = s; return new Promise(() => {}) }, 10), /timed out/)
  assert.equal(signal.aborted, true)
})
test('cancels obsolete screen requests', async () => {
  const controller = new AbortController()
  const result = readWithDeadline(() => new Promise(() => {}), 100, controller.signal)
  controller.abort()
  await assert.rejects(result, /cancelled/)
})
test('ignores late completion after timeout', async () => {
  await assert.rejects(readWithDeadline(() => new Promise(resolve => setTimeout(() => resolve(42), 30)), 5), /timed out/)
  await new Promise(resolve => setTimeout(resolve, 35))
})
