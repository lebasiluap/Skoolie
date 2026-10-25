import assert from 'node:assert/strict'
import { test } from 'node:test'
import { dateKey, effectiveStreak } from './streak.ts'

const RealDate = Date
function at(iso, fn) {
  globalThis.Date = class extends RealDate {
    constructor(...args) { super(...(args.length ? args : [iso])) }
    static now() { return new RealDate(iso).getTime() }
  }
  try { fn() } finally { globalThis.Date = RealDate }
}
test('study day is UTC regardless of device timezone', () => {
  assert.equal(dateKey(new Date('2026-10-25T00:30:00Z')), '2026-10-25')
  at('2026-10-25T00:30:00Z', () => assert.equal(effectiveStreak(4,'2026-10-25'),4))
})
test('freezes preserve an earned count, but never add to it', () => {
  at('2026-10-25T12:00:00Z', () => {
    assert.equal(effectiveStreak(1,'2026-10-22',['2026-10-23','2026-10-24']),1)
    assert.equal(effectiveStreak(1,'2026-10-22',['2026-10-24']),0)
    assert.equal(effectiveStreak(4,'2026-10-24'),4)
    assert.equal(effectiveStreak(4,'2026-10-22'),0)
    assert.equal(effectiveStreak(4,null),0)
    assert.equal(effectiveStreak(4,'2026-10-26'),0)
  })
})
