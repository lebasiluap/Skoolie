import test from 'node:test'
import assert from 'node:assert/strict'
import { createVerifiedSession } from './verifiedSession.ts'
const request = '11111111-1111-4111-8111-111111111111'
const sid = '22222222-2222-4222-8222-222222222222'
const qid = '33333333-3333-4333-8333-333333333333'
const quiz = '44444444-4444-4444-8444-444444444444'
const issued = () => ({ protocol_version: 1, session_id: sid, mode: 'mcq', item_ids: [qid], total: 1,
  expires_at: '2026-10-25T12:00:00Z', items: [{ id: qid, question_text: 'Authoritative payload' }] })
const receipt = () => ({ protocol_version: 1, session_id: sid, quiz_session_id: quiz, mode: 'mcq', score: 1,
  total: 1, xp: 50, completed_at: '2026-10-25T00:00:00Z' })
const config = () => ({ requestId: request, mode: 'mcq', itemIds: [qid] })

test('deduplicates concurrent issuance and completion without submitting a client score', async () => {
  const calls = []
  const rpc = async (name, args) => { calls.push({ name, args }); return { data: name.startsWith('begin') ? issued() : receipt(), error: null } }
  const s = createVerifiedSession(rpc, config())
  const [a, b] = await Promise.all([s.begin(), s.begin()])
  assert.deepEqual(a, b)
  s.answer(qid, 'B')
  const [r, retry] = await Promise.all([s.finish(), s.finish()])
  assert.deepEqual(r, retry)
  assert.equal(calls.length, 2)
  assert.deepEqual(calls[1].args, { p_session_id: sid, p_answers: { [qid]: 'B' } })
  assert.equal('p_score' in calls[1].args, false)
  assert.equal('p_xp' in calls[1].args, false)
})

test('lost completion response retries exact session and answer envelope, never legacy XP', async () => {
  const submissions = []; let failed = false
  const s = createVerifiedSession(async (name, args) => {
    if (name.startsWith('begin')) return { data: issued(), error: null }
    submissions.push(args)
    if (!failed) { failed = true; throw new Error('Connection lost after commit') }
    return { data: receipt(), error: null }
  }, config())
  await s.begin(); s.answer(qid, 'B')
  await assert.rejects(s.finish(), /Connection lost/)
  assert.throws(() => s.answer(qid, 'A'), /cannot be changed/)
  assert.equal((await s.finish()).xp, 50)
  assert.deepEqual(submissions[0], submissions[1])
})

test('failed issuance retries the same request id and never permits pre-issuance answers', async () => {
  const requests = []; let failed = false
  const s = createVerifiedSession(async (name, args) => {
    requests.push(args)
    if (!failed) { failed = true; return { data: null, error: { message: 'Offline' } } }
    return { data: issued(), error: null }
  }, config())
  assert.throws(() => s.answer(qid, 'A'), /issued payload/)
  await assert.rejects(s.begin(), /Offline/)
  await s.begin()
  assert.deepEqual(requests[0], requests[1])
})

test('requires every issued answer, preserves explicit timeout null, and rejects extra IDs', async () => {
  const s = createVerifiedSession(async name => ({ data: name.startsWith('begin') ? issued() : { ...receipt(), score: 0, xp: 0 }, error: null }), config())
  await s.begin()
  await assert.rejects(s.finish(), /incomplete/)
  assert.throws(() => s.answer('other', 'A'), /Invalid/)
  assert.throws(() => s.answer(qid, true), /Invalid/)
  s.answer(qid, null)
  assert.equal((await s.finish()).score, 0)
})

test('rejects wrong-session, reordered item, and malformed receipt responses', async () => {
  const wrongStart = createVerifiedSession(async () => ({ data: { ...issued(), item_ids: ['other'] }, error: null }), config())
  await assert.rejects(wrongStart.begin(), /binding/)
  const s = createVerifiedSession(async name => ({ data: name.startsWith('begin') ? issued() : { ...receipt(), session_id: request }, error: null }), config())
  await s.begin(); s.answer(qid, 'A')
  await assert.rejects(s.finish(), /binding/)
})

test('caller mutations cannot alter the captured configuration, issued binding or cached receipt', async () => {
  const cfg = config(); const seen = []
  const s = createVerifiedSession(async (name, args) => { seen.push(args); return { data: name.startsWith('begin') ? issued() : receipt(), error: null } }, cfg)
  cfg.itemIds[0] = 'changed'
  const a = await s.begin(); a.session_id = request; a.item_ids[0] = 'changed'
  assert.equal((await s.begin()).session_id, sid)
  s.answer(qid, 'A')
  const r = await s.finish(); r.xp = 99999
  assert.equal((await s.finish()).xp, 50)
  assert.equal(seen[1].p_session_id, sid)
})
