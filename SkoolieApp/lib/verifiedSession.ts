/** Shared web/native protocol client. No legacy fallback and no score/XP input.
 * The caller must render begin().items, not an earlier prefetched question copy.
 * Timed/challenge issuance policy is selected by the transport wrapper; timed
 * answers must be server-confirmed before being recorded in this envelope.
 */
export type VerifiedMode = 'mcq' | 'case_study' | 'flashcard' | 'rapid_fire'
export type CanonicalAnswer = string | boolean | null
export type SessionRpc = (name: string, args: Record<string, unknown>) => PromiseLike<{
  data: unknown; error: { message: string } | null
}>
export interface IssuedSession {
  protocol_version: 1
  session_id: string
  mode: VerifiedMode
  item_ids: string[]
  total: number
  expires_at: string
  items: Record<string, unknown>[]
}
export interface RewardReceipt {
  protocol_version: 1
  session_id: string
  quiz_session_id: string
  mode: VerifiedMode
  score: number
  total: number
  xp: number
  completed_at: string
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const object = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x)
const date = (x: unknown) => typeof x === 'string' && Number.isFinite(Date.parse(x))
const copy = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T
const own = (x: object, key: string) => Object.prototype.hasOwnProperty.call(x, key)

export function createVerifiedSession(rpc: SessionRpc, config: {
  requestId: string; mode: VerifiedMode; itemIds: readonly string[]
}) {
  const requestId = config.requestId
  const mode = config.mode
  const itemIds = [...config.itemIds]
  if (!UUID.test(requestId) || !['mcq', 'case_study', 'flashcard', 'rapid_fire'].includes(mode)
      || itemIds.length < 1 || itemIds.length > 60 || new Set(itemIds).size !== itemIds.length) {
    throw new Error('Invalid verified-session configuration')
  }
  const answers: Record<string, CanonicalAnswer> = Object.create(null)
  let issued: IssuedSession | undefined
  let beginPromise: Promise<IssuedSession> | undefined
  let finishPromise: Promise<RewardReceipt> | undefined
  let frozenAnswers: Readonly<Record<string, CanonicalAnswer>> | undefined

  async function call(name: string, args: Record<string, unknown>) {
    const { data, error } = await rpc(name, args)
    if (error) throw new Error(error.message)
    return data
  }
  function begin(): Promise<IssuedSession> {
    if (issued) return Promise.resolve(copy(issued))
    if (beginPromise) return beginPromise.then(copy)
    beginPromise = (async () => {
      const x = await call('begin_verified_session', { p_request_id: requestId, p_mode: mode, p_item_ids: [...itemIds] })
      if (!object(x) || x.protocol_version !== 1 || typeof x.session_id !== 'string' || !UUID.test(x.session_id)
          || x.mode !== mode || x.total !== itemIds.length || !date(x.expires_at)
          || !Array.isArray(x.item_ids) || x.item_ids.length !== itemIds.length
          || !x.item_ids.every((id, i) => id === itemIds[i]) || !Array.isArray(x.items)
          || x.items.length !== itemIds.length || !x.items.every((item, i) => object(item) && item.id === itemIds[i])) {
        throw new Error('Session binding response is invalid')
      }
      // Do not give callers a mutable reference to the transport response.
      issued = copy(x) as unknown as IssuedSession
      return issued
    })().catch(error => { beginPromise = undefined; throw error })
    return beginPromise.then(copy)
  }
  function answer(itemId: string, value: CanonicalAnswer) {
    if (!issued) throw new Error('Wait for the issued payload before answering')
    if (frozenAnswers) {
      if (own(frozenAnswers, itemId) && frozenAnswers[itemId] === value) return false
      throw new Error('Submitted answers cannot be changed')
    }
    if (!itemIds.includes(itemId) || (mode === 'flashcard'
      ? typeof value !== 'boolean' : value !== null && (typeof value !== 'string' || !/^[A-F]$/.test(value)))) {
      throw new Error('Invalid canonical answer')
    }
    if (own(answers, itemId)) {
      if (answers[itemId] !== value) throw new Error('Answer already recorded')
      return false
    }
    answers[itemId] = value
    return true
  }
  function finish(): Promise<RewardReceipt> {
    if (finishPromise) return finishPromise.then(copy)
    if (!issued || itemIds.some(id => !own(answers, id))) return Promise.reject(new Error('Session answers are incomplete'))
    frozenAnswers ??= Object.freeze({ ...answers })
    const sessionId = issued.session_id
    finishPromise = (async () => {
      const x = await call('finish_verified_session', { p_session_id: sessionId, p_answers: { ...frozenAnswers } })
      if (!object(x) || x.protocol_version !== 1 || x.session_id !== sessionId || x.mode !== mode
          || typeof x.quiz_session_id !== 'string' || !UUID.test(x.quiz_session_id)
          || x.total !== itemIds.length || !Number.isInteger(x.score) || Number(x.score) < 0 || Number(x.score) > itemIds.length
          || !Number.isInteger(x.xp) || Number(x.xp) < 0 || !date(x.completed_at)) {
        throw new Error('Reward receipt binding is invalid')
      }
      return copy(x) as unknown as RewardReceipt
    })().catch(error => { finishPromise = undefined; throw error })
    return finishPromise.then(copy)
  }
  return { begin, answer, finish }
}
