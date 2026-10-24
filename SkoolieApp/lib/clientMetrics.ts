// Bounded, memory-only diagnostics. Never record credentials, URLs, questions,
// answers, names or request bodies. These are client-reported, not audit truth.
export const METRIC_OPERATIONS = ['auth_request', 'profile_read', 'practice_counts', 'topic_counts', 'mcq_load', 'question_load', 'flashcard_load', 'case_load', 'rapid_fire_load'] as const
type Operation = typeof METRIC_OPERATIONS[number]
export type Metric = { operation: Operation; calls: number; failures: number; total_ms: number; max_ms: number }
let pending = new Map<Operation, Metric>()
export function recordClientMetric(operation: Operation, duration: number, failed: boolean) {
  const ms = Math.max(0, Math.min(120000, Math.round(duration)))
  if (!Number.isFinite(ms)) return
  const old = pending.get(operation) ?? { operation, calls: 0, failures: 0, total_ms: 0, max_ms: 0 }
  if (old.calls >= 1000) return
  pending.set(operation, { operation, calls: old.calls + 1, failures: old.failures + Number(failed), total_ms: old.total_ms + ms, max_ms: Math.max(old.max_ms, ms) })
}
export function drainClientMetrics(): Metric[] { const values = [...pending.values()]; pending = new Map(); return values }
export function clearClientMetrics() { pending.clear() }
export function metricOperation(path: string): Operation | undefined {
  if (path.startsWith('/auth/v1/token')) return 'auth_request'
  const rpc = path.split('/rest/v1/rpc/')[1]
  if (rpc === 'get_practice_counts') return 'practice_counts'
  if (rpc === 'get_question_counts' || rpc === 'get_case_study_counts') return 'topic_counts'
  if (rpc === 'get_random_mcqs') return 'mcq_load'
  if (rpc === 'get_questions_by_topic' || rpc === 'get_questions_by_ids') return 'question_load'
  if (rpc === 'get_random_flashcards') return 'flashcard_load'
  if (rpc === 'get_random_cases' || rpc === 'get_cases_by_topic') return 'case_load'
  if (rpc === 'get_rapid_fire_questions' || rpc === 'get_rapid_fire_flashcards') return 'rapid_fire_load'
  if (path === '/rest/v1/user_profiles') return 'profile_read'
}
