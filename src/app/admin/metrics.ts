export type Counts = Record<string, number>
export interface BetaMetrics {
  schema_version: number; measured_at: string; window_start: string; days: number
  summary: Counts
  daily: { day: string; signups: number; sessions: number; learners: number; responses: number }[]
  modes: { mode: string; sessions: number; responses: number; correct: number; scored_responses: number }[]
  topics: { topic: string; sessions: number; responses: number; correct: number; scored_responses: number }[]
  professions: { profession: string; users: number; activated: number; learners: number }[]
  countries: { country: string; users: number }[]
  people: { full_name: string | null; profession: string | null; country: string | null; created_at: string; activated: boolean; current_streak: number | null }[]
  traffic: { views: number; paths: { path: string; views: number }[] }
  reports: { open: number; oldest_open_at: string | null; new: number; resolved: number; mean_resolution_hours: number | null; reasons: { reason: string; reports: number }[] }
}
export interface ContentMetrics {
  measured_at: string; serving_mode: string; total_questions: number; released_questions: number; total_cases: number; released_cases: number
  catalog_questions: number; flagged_units: number; issue_tags: number; pending_status: number; running: number; unclosed_batches: number
  types: { question_type: string; available: number }[]
  difficulty: { difficulty: string; available: number }[]
  topics: { topic: string; available: number }[]
  findings: { issue_code: string; tags: number; units: number }[]
  statuses: { content_type: string; phase_a_status: string; units: number }[]
}
export function validDays(value: unknown): 7 | 30 | 90 {
  return value === '7' || value === 7 ? 7 : value === '90' || value === 90 ? 90 : 30
}
export function ratio(n: number, d: number): number | null {
  return Number.isFinite(n) && Number.isFinite(d) && d > 0 ? n / d * 100 : null
}
export function formatRate(n: number, d: number): string {
  const r = ratio(n, d)
  return r === null ? '—' : `${r.toFixed(1)}%`
}
export function changeLabel(current: number, previous: number): string {
  if (previous === 0) return current > 0 ? 'No prior-period baseline' : 'No change (both zero)'
  const r = (current - previous) / previous * 100
  return `${r > 0 ? '+' : ''}${r.toFixed(1)}% vs previous period`
}
// CSV formula injection and embedded quotes/newlines are handled for every cell.
export function toCSV(rows: (string | number | null)[][]): string {
  return rows.map(row => row.map(value => {
    let text = value == null ? '' : String(value)
    if (/^[\s]*[=+@-]/.test(text)) text = `'${text}`
    return `"${text.replaceAll('"', '""')}"`
  }).join(',')).join('\r\n')
}
