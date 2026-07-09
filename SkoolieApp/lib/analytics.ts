// Learning analytics — pure calculations over the user's own data.
// SESSIONS-FIRST: quiz_sessions is the authoritative record of practice (covers mcq,
// flashcards, cases) and is the source for headline accuracy, coverage and trends — so
// these always match the Progress page. user_question_history adds per-attempt depth
// (per-subtopic correctness, trend, retention) for MCQs + flashcards when available.

export interface HistRow {
  question_id: string
  topic: string | null
  category: string | null
  subtopic: string | null
  difficulty: string | null
  question_type: string
  was_correct: boolean
  answered_at: string
}

export interface SessRow {
  score: number
  question_ids: string[]
  xp_earned: number
  started_at: string
  mode: string | null
  topic: string | null
}

export type QMeta = Record<string, { topic: string | null; subtopic: string | null; category: string | null }>

export interface SubtopicStat {
  name: string
  attempts: number
  correct: number
  accuracy: number
  lastPracticed: string | null
}

export interface TopicStat {
  topic: string
  attempts: number           // from history if present, else session questions in this topic
  accuracy: number           // 0–100 (history attempts, else session score ratio)
  answered: number           // distinct questions answered (coverage)
  total: number              // available questions in topic (bank)
  mastery: number            // 0–100 coverage = answered / total
  lastPracticed: string | null
  trendDelta: number
  dueScore: number
  hasDepth: boolean          // true if backed by per-attempt history
  subtopics: SubtopicStat[]
}

export interface DayPoint {
  day: string; label: string; value: number
  /** true = no activity that day (distinguishes "didn't practice" from a real 0%) */
  missing?: boolean
}

export interface PlanItem {
  kind: 'weak' | 'review' | 'new' | 'polish'
  topic: string
  title: string
  reason: string
  /** rough size suggestion, e.g. "10 questions" */
  size: string
}

export interface Analytics {
  hasData: boolean
  attempts: number
  accuracy: number
  distinctQuestions: number
  mastery: number
  retention: number
  consistency: number
  sessions: number
  activeDays: number
  topics: TopicStat[]
  strongest: TopicStat | null
  weakest: TopicStat | null
  neglected: TopicStat[]
  untouched: string[]
  reviewQueue: TopicStat[]
  byHour: number[]
  byWeekday: number[]
  bestHour: number | null
  xpByDay: DayPoint[]
  accuracyByDay: DayPoint[]
  mix: { mcq: number; flashcard: number; case_study: number }
  recommendations: { kind: 'focus' | 'review' | 'strength' | 'start'; text: string; topic?: string }[]
  /** 0–100: how broadly and evenly practice is spread across the syllabus */
  diversity: number
  /** 0–100 composite exam-readiness score */
  readiness: number
  readinessLabel: string
  /** Ordered, actionable study plan (merges weak spots, due reviews, new ground) */
  studyPlan: PlanItem[]
}

const DAY_MS = 86400000
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0)
const maxIso = (a: string | null, b: string | null) => (!a ? b : !b ? a : a > b ? a : b)

export function computeAnalytics(
  history: HistRow[],
  sessions: SessRow[],
  qMeta: QMeta,
  topicTotals: Record<string, number>,
): Analytics {
  const now = Date.now()

  // ── Session-derived (authoritative) ──────────────────────────────────────
  let sumScore = 0, sumTotal = 0
  const answeredAll = new Set<string>()
  const answeredByTopic = new Map<string, Set<string>>()
  const sessByTopic = new Map<string, { score: number; total: number; last: string | null }>()
  const xpMap = new Map<string, number>()
  const sessAccDay = new Map<string, { c: number; a: number }>()
  const sessTimestamps: number[] = []
  const mix = { mcq: 0, flashcard: 0, case_study: 0 }

  for (const s of sessions) {
    const ids = s.question_ids ?? []
    sumScore += s.score ?? 0
    sumTotal += ids.length
    // Rapid fire, barrage and the daily challenge are all MCQ answering —
    // fold them into the MCQ bucket so the study mix reflects ALL practice.
    const mixMode = s.mode === 'flashcard' ? 'flashcard' : s.mode === 'case_study' ? 'case_study' : s.mode ? 'mcq' : null
    if (mixMode) mix[mixMode] += ids.length
    for (const id of ids) {
      answeredAll.add(id)
      const m = qMeta[id]
      if (m?.topic) {
        if (!answeredByTopic.has(m.topic)) answeredByTopic.set(m.topic, new Set())
        answeredByTopic.get(m.topic)!.add(id)
      }
    }
    if (s.topic) {
      const e = sessByTopic.get(s.topic) ?? { score: 0, total: 0, last: null }
      e.score += s.score ?? 0; e.total += ids.length; e.last = maxIso(e.last, s.started_at)
      sessByTopic.set(s.topic, e)
    }
    const k = dayKey(new Date(s.started_at))
    xpMap.set(k, (xpMap.get(k) ?? 0) + (s.xp_earned ?? 0))
    const ad = sessAccDay.get(k) ?? { c: 0, a: 0 }
    ad.c += s.score ?? 0; ad.a += ids.length; sessAccDay.set(k, ad)
    sessTimestamps.push(new Date(s.started_at).getTime())
  }
  const accuracy = pct(sumScore, sumTotal)
  const distinctQuestions = answeredAll.size

  // ── History-derived (per-attempt depth) ──────────────────────────────────
  const histByTopic = new Map<string, HistRow[]>()
  for (const h of history) {
    if (!h.topic) continue
    if (!histByTopic.has(h.topic)) histByTopic.set(h.topic, [])
    histByTopic.get(h.topic)!.push(h)
  }
  const latestByQ = new Map<string, HistRow>()
  for (const h of history) {
    const p = latestByQ.get(h.question_id)
    if (!p || h.answered_at > p.answered_at) latestByQ.set(h.question_id, h)
  }
  const retention = history.length
    ? pct([...latestByQ.values()].filter(h => h.was_correct).length, latestByQ.size)
    : accuracy // no per-attempt data → accuracy is the best available proxy

  const recentCut = now - 14 * DAY_MS
  const priorCut = now - 28 * DAY_MS

  const allTopics = new Set<string>([
    ...Object.keys(topicTotals),
    ...answeredByTopic.keys(),
    ...sessByTopic.keys(),
    ...histByTopic.keys(),
  ])

  const topics: TopicStat[] = []
  for (const topic of allTopics) {
    const total = topicTotals[topic] ?? 0
    const answered = answeredByTopic.get(topic)?.size ?? 0
    const hist = histByTopic.get(topic) ?? []
    const sess = sessByTopic.get(topic)
    const hasDepth = hist.length > 0

    let attempts = 0, accuracyT = 0, lastPracticed: string | null = null
    const subtopics: SubtopicStat[] = []

    if (hasDepth) {
      attempts = hist.length
      accuracyT = pct(hist.filter(r => r.was_correct).length, attempts)
      lastPracticed = hist.reduce<string | null>((m, r) => maxIso(m, r.answered_at), null)
      const subMap = new Map<string, HistRow[]>()
      for (const r of hist) {
        const key = r.subtopic || r.category || 'General'
        if (!subMap.has(key)) subMap.set(key, [])
        subMap.get(key)!.push(r)
      }
      for (const [name, sr] of subMap) {
        subtopics.push({
          name, attempts: sr.length, correct: sr.filter(r => r.was_correct).length,
          accuracy: pct(sr.filter(r => r.was_correct).length, sr.length),
          lastPracticed: sr.reduce<string | null>((m, r) => maxIso(m, r.answered_at), null),
        })
      }
      subtopics.sort((a, b) => b.accuracy - a.accuracy)
    } else if (sess) {
      // fall back to session-level accuracy for topic-specified sessions
      attempts = sess.total
      accuracyT = pct(sess.score, sess.total)
      lastPracticed = sess.last
    }
    lastPracticed = maxIso(lastPracticed, sess?.last ?? null)

    if (total === 0 && attempts === 0 && answered === 0) continue

    // trend (history only)
    let trendDelta = 0
    if (hasDepth) {
      const recent = hist.filter(r => new Date(r.answered_at).getTime() >= recentCut)
      const prior = hist.filter(r => { const t = new Date(r.answered_at).getTime(); return t >= priorCut && t < recentCut })
      if (recent.length >= 3 && prior.length >= 3) {
        trendDelta = pct(recent.filter(r => r.was_correct).length, recent.length) - pct(prior.filter(r => r.was_correct).length, prior.length)
      }
    }

    const mastery = total > 0 ? Math.min(100, pct(answered, total)) : 0
    const daysSince = lastPracticed ? (now - new Date(lastPracticed).getTime()) / DAY_MS : 999
    const dueScore = attempts > 0 ? daysSince * (1 - mastery / 100) : 0

    topics.push({ topic, attempts, accuracy: accuracyT, answered, total, mastery, lastPracticed, trendDelta, dueScore, hasDepth, subtopics })
  }

  topics.sort((a, b) => b.mastery - a.mastery || b.attempts - a.attempts)

  const practiced = topics.filter(t => t.attempts >= 3)
  const strongest = practiced.length ? practiced.reduce((a, b) => (b.accuracy > a.accuracy ? b : a)) : null
  const weakest = practiced.length ? practiced.reduce((a, b) => (b.accuracy < a.accuracy ? b : a)) : null
  const neglected = topics
    .filter(t => t.attempts > 0 && t.lastPracticed && (now - new Date(t.lastPracticed).getTime()) / DAY_MS >= 7)
    .sort((a, b) => b.dueScore - a.dueScore)
  const untouched = Object.keys(topicTotals)
    .filter(t => topicTotals[t] > 0 && (answeredByTopic.get(t)?.size ?? 0) === 0 && !histByTopic.has(t) && !sessByTopic.has(t))
    .sort((a, b) => topicTotals[b] - topicTotals[a])
  const reviewQueue = topics
    .filter(t => t.attempts >= 3 && t.lastPracticed && (now - new Date(t.lastPracticed).getTime()) / DAY_MS >= 3 && t.mastery < 90)
    .sort((a, b) => b.dueScore - a.dueScore)
    .slice(0, 6)

  const sumAnswered = [...answeredByTopic.values()].reduce((s, set) => s + set.size, 0)
  const sumTotalsAll = Object.values(topicTotals).reduce((s, n) => s + n, 0)
  const mastery = pct(sumAnswered, sumTotalsAll)

  // ── Behaviour (history timestamps if present, else session timestamps) ────
  const byHour = new Array(24).fill(0)
  const byHourCorrect = new Array(24).fill(0)
  const byWeekday = new Array(7).fill(0)
  const activeDaySet = new Set<string>()
  if (history.length) {
    for (const h of history) {
      const d = new Date(h.answered_at)
      byHour[d.getHours()]++; if (h.was_correct) byHourCorrect[d.getHours()]++
      byWeekday[d.getDay()]++; activeDaySet.add(dayKey(d))
    }
  } else {
    for (const t of sessTimestamps) {
      const d = new Date(t)
      byHour[d.getHours()]++; byWeekday[d.getDay()]++; activeDaySet.add(dayKey(d))
    }
  }
  let bestHour: number | null = null, bestAcc = -1
  for (let i = 0; i < 24; i++) if (byHour[i] >= 5 && byHourCorrect[i] / byHour[i] > bestAcc) { bestAcc = byHourCorrect[i] / byHour[i]; bestHour = i }
  const last30 = now - 30 * DAY_MS
  const activeDays = [...activeDaySet].filter(k => new Date(k).getTime() >= last30).length
  const consistency = pct(activeDays, 30)

  // ── Trends (last 14 days) ────────────────────────────────────────────────
  const histAccDay = new Map<string, { c: number; a: number }>()
  for (const h of history) {
    const k = dayKey(new Date(h.answered_at))
    const e = histAccDay.get(k) ?? { c: 0, a: 0 }
    e.a++; if (h.was_correct) e.c++; histAccDay.set(k, e)
  }
  const accSrc = history.length ? histAccDay : sessAccDay
  const xpByDay: DayPoint[] = []
  const accuracyByDay: DayPoint[] = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now - i * DAY_MS)
    const k = dayKey(d)
    xpByDay.push({ day: k, label: WD[d.getDay()], value: xpMap.get(k) ?? 0 })
    const e = accSrc.get(k)
    const hasDay = !!e && e.a > 0
    accuracyByDay.push({ day: k, label: WD[d.getDay()], value: hasDay ? Math.round((e!.c / e!.a) * 100) : 0, missing: !hasDay })
  }

  // ── Recommendations ──────────────────────────────────────────────────────
  const recommendations: Analytics['recommendations'] = []
  if (weakest && weakest.accuracy < 70) recommendations.push({ kind: 'focus', topic: weakest.topic, text: `Focus on ${weakest.topic} — ${weakest.accuracy}% accuracy` })
  if (neglected[0]) {
    const days = Math.round((now - new Date(neglected[0].lastPracticed!).getTime()) / DAY_MS)
    recommendations.push({ kind: 'review', topic: neglected[0].topic, text: `You may be forgetting ${neglected[0].topic} — last practiced ${days}d ago` })
  }
  if (untouched[0]) recommendations.push({ kind: 'start', topic: untouched[0], text: `Start ${untouched[0]} — you haven't touched it yet` })
  if (strongest && strongest.accuracy >= 80) recommendations.push({ kind: 'strength', topic: strongest.topic, text: `You're strongest in ${strongest.topic} (${strongest.accuracy}%)` })

  // ── Diversity (breadth × balance) ────────────────────────────────────────
  // An exam samples the whole syllabus — grinding one subject shouldn't read
  // as "ready". Breadth = share of available subjects you've practiced.
  // Balance = normalized Shannon entropy of your attempts across practiced
  // subjects (1 = evenly spread, →0 = all attempts in one subject).
  const availableTopics = Object.keys(topicTotals).filter(t => topicTotals[t] > 0)
  const attempted = topics.filter(t => t.attempts > 0)
  const breadth = availableTopics.length > 0 ? attempted.length / availableTopics.length : 0
  let balance = 0
  if (attempted.length > 1) {
    const totalAttempts = attempted.reduce((s, t) => s + t.attempts, 0)
    const entropy = -attempted.reduce((s, t) => {
      const p = t.attempts / totalAttempts
      return s + (p > 0 ? p * Math.log(p) : 0)
    }, 0)
    balance = entropy / Math.log(attempted.length)
  }
  const diversity = Math.round(100 * breadth * (0.6 + 0.4 * balance))

  // ── Exam readiness (composite) ───────────────────────────────────────────
  // Accuracy = can you answer correctly; mastery = how much of the bank you've
  // covered; diversity = how broadly/evenly across the syllabus; retention =
  // do you still get previously-seen questions right; consistency = are you
  // studying regularly. Weighted toward correctness and coverage.
  const hasAnyData = sessions.length > 0 || history.length > 0
  const readiness = hasAnyData
    ? Math.round(0.30 * accuracy + 0.25 * mastery + 0.20 * diversity + 0.15 * retention + 0.10 * consistency)
    : 0
  const readinessLabel =
    readiness >= 85 ? 'Exam ready' :
    readiness >= 65 ? 'Strong' :
    readiness >= 45 ? 'On track' :
    readiness >= 25 ? 'Building' : 'Getting started'

  // ── Today's study plan ───────────────────────────────────────────────────
  // Priority: fix weaknesses → refresh fading topics → cover new ground →
  // polish near-mastered topics. Max 4 items, no duplicate topics.
  const studyPlan: PlanItem[] = []
  const planned = new Set<string>()
  const addPlan = (item: PlanItem) => {
    if (studyPlan.length < 4 && !planned.has(item.topic)) { planned.add(item.topic); studyPlan.push(item) }
  }
  // Narrow coverage hurts readiness the most — broaden first when diversity is low
  if (diversity < 40 && untouched[0]) {
    addPlan({ kind: 'new', topic: untouched[0], title: `Start ${untouched[0]}`, reason: `Broaden your coverage — exams sample everything`, size: '5 questions' })
  }
  if (weakest && weakest.accuracy < 70) {
    addPlan({ kind: 'weak', topic: weakest.topic, title: `Strengthen ${weakest.topic}`, reason: `Your weakest subject — ${weakest.accuracy}% accuracy`, size: '10 questions' })
  }
  for (const t of reviewQueue.slice(0, 2)) {
    const days = t.lastPracticed ? Math.round((now - new Date(t.lastPracticed).getTime()) / DAY_MS) : 0
    addPlan({ kind: 'review', topic: t.topic, title: `Review ${t.topic}`, reason: `Fading — last practiced ${days}d ago`, size: '5–10 questions' })
  }
  if (untouched[0]) {
    addPlan({ kind: 'new', topic: untouched[0], title: `Start ${untouched[0]}`, reason: `Untouched — ${topicTotals[untouched[0]]} questions waiting`, size: '5 questions' })
  }
  // If still short, polish an almost-mastered topic to keep momentum
  if (studyPlan.length < 2) {
    const polish = topics.find(t => t.attempts >= 3 && t.mastery < 100 && !planned.has(t.topic))
    if (polish) addPlan({ kind: 'polish', topic: polish.topic, title: `Push ${polish.topic} further`, reason: `${polish.mastery}% covered — close the gap`, size: '10 questions' })
  }

  return {
    hasData: sessions.length > 0 || history.length > 0,
    attempts: history.length || sumTotal,
    accuracy, distinctQuestions, mastery, retention, consistency,
    sessions: sessions.length, activeDays,
    topics, strongest, weakest, neglected, untouched, reviewQueue,
    byHour, byWeekday, bestHour, xpByDay, accuracyByDay, mix, recommendations,
    diversity, readiness, readinessLabel, studyPlan,
  }
}

/** Peer percentile by XP (0–100, higher = better). */
export function percentile(myXp: number, peerXps: number[]): number {
  if (peerXps.length === 0) return 0
  return Math.round((peerXps.filter(x => x < myXp).length / peerXps.length) * 100)
}
