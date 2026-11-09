import test from 'node:test'
import assert from 'node:assert/strict'
import { finishAccountDeletion, accountLocalKeys } from './accountDeletion.ts'
import { readFileSync } from 'node:fs'

test('actual profile handler keeps a synchronous double-tap lock, bounded request and finally cleanup', () => {
  const source = readFileSync(new URL('../app/(app)/profile.tsx', import.meta.url), 'utf8')
  assert.match(source, /deleteLock.current\) return/)
  assert.match(source, /deleteLock.current = true/)
  assert.match(source, /finally \{\s*deleteLock.current = false\s*setDeleting\(false\)/)
  assert.match(source, /readWithDeadline\(signal => supabase.functions.invoke\('delete-account'/)
  assert.match(source, /if \(appleCode === null\) return/)
  assert.match(source, /if \(!deleteLock.current\) setDeleteModal\(false\)/)
})

function flow() {
  const calls = []
  const steps = {
    request: async () => { calls.push('request'); return { deleted: true } },
    checkUser: async () => ({ error: null }),
    cancelNotifications: async () => { calls.push('notifications') },
    clearLocalData: async () => { calls.push('local-data') },
    signOut: async () => { calls.push('sign-out') },
  }
  return { calls, steps }
}
test('confirmed deletion cancels reminders and clears local state before local sign-out', async () => {
  const f = flow()
  assert.equal((await finishAccountDeletion(f.steps)).deleted, true)
  assert.deepEqual(f.calls, ['request', 'notifications', 'local-data', 'sign-out'])
})
test('lost response reconciles only an authoritative missing-user response', async () => {
  for (const code of ['user_not_found', 'session_not_found', undefined]) {
    const f = flow()
    f.steps.request = async () => { throw Error('response lost') }
    f.steps.checkUser = async () => ({ error: { code } })
    if (code === 'user_not_found') {
      assert.equal((await finishAccountDeletion(f.steps)).deleted, true)
      assert.deepEqual(f.calls, ['notifications', 'local-data', 'sign-out'])
    } else {
      await assert.rejects(finishAccountDeletion(f.steps), /response lost/)
      assert.deepEqual(f.calls, [])
    }
  }
})
test('network and unconfirmed success never sign out an existing account', async () => {
  const f = flow()
  f.steps.request = async () => ({ deleted: false })
  await assert.rejects(finishAccountDeletion(f.steps), /not confirmed/)
  f.steps.checkUser = async () => { throw Error('network') }
  await assert.rejects(finishAccountDeletion(f.steps))
  assert.deepEqual(f.calls, [])
})
test('an invalid session is cleared without falsely claiming deletion or depending on a specific server code', async () => {
  for (const status of [401, 403]) {
    const f = flow()
    f.steps.request = async () => { throw Error('response lost') }
    f.steps.checkUser = async () => ({ error: { code: 'unknown_auth_code', status } })
    const result = await finishAccountDeletion(f.steps)
    assert.equal(result.deleted, false)
    assert.deepEqual(f.calls, ['notifications', 'local-data', 'sign-out'])
  }
})
test('local cleanup failure cannot stop the remaining cleanup or misreport server deletion', async () => {
  const f = flow()
  f.steps.cancelNotifications = async () => { throw Error('native module') }
  const result = await finishAccountDeletion(f.steps)
  assert.equal(result.deleted, true)
  assert.equal(result.localCleanupFailed, true)
  assert.deepEqual(f.calls, ['request', 'local-data', 'sign-out'])
})
test('local deletion touches only exact user-namespaced keys', () => {
  assert.deepEqual(accountLocalKeys(['lbRanks:abc:week', 'zoneNotif:abc:x', 'skoolie:flashcard-checkpoint:v1:abc', 'lbRanks:abcd:week', 'theme'], 'abc'),
    ['lbRanks:abc:week', 'zoneNotif:abc:x', 'skoolie:flashcard-checkpoint:v1:abc'])
})
