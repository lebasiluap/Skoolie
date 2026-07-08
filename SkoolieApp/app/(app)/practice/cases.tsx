import { useEffect, useRef, useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert, Animated, PanResponder, Pressable } from 'react-native'
import { router, useLocalSearchParams, useNavigation } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { MAX_CONTENT } from '@/hooks/useResponsive'
import { useFocusSessionWhile } from '@/hooks/useFocusSession'
import { Entrance } from '@/components/ui/Entrance'
import { useTheme } from '@/hooks/useTheme'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { TopicIcon } from '@/components/ui/TopicIcon'
import { TopBar } from '@/components/ui/TopBar'
import { SkeletonList } from '@/components/ui/Skeleton'
import { FilterBanner } from '@/components/ui/FilterBanner'
import { BuddyHead } from '@/components/mascots/BuddyHead'
import { MascotAnimator } from '@/components/mascots/MascotAnimator'
import { topicColor } from '@/constants/topics'
import type { TopicRow } from '@/types'
import { buildShuffledMcq, LETTERS } from '@/lib/answers'
import { computeStreakUpdate } from '@/lib/streak'
import type { ThemeColors } from '@/constants/Colors'
import { useFilters } from '@/contexts/FiltersContext'
import { useCollapsePracticeStack } from '@/hooks/usePracticeStack'
import { withFilterAnim, withAccordionAnim } from '@/lib/anim'
import { CASE_QUESTION_SEC, URGENT_AT_SEC } from '@/lib/timing'
import { orderByInterestAndUnseen } from '@/lib/interests'
import { playSound } from '@/lib/sounds'
import { trySave } from '@/lib/reliably'
import { showToast } from '@/lib/toast'

const CAT_ORDER = ['Anatomy & Physiology', 'Pharmacology', 'Pathophysiology', 'Clinicals']

const shuffleArr = <T,>(a: T[]): T[] => [...a].sort(() => Math.random() - 0.5)
/** Orders cases so unseen come first; seen backfill so the session still fills. */
function orderCasesByUnseen<T extends { id: string }>(pool: T[], seen: Set<string>): T[] {
  if (seen.size === 0) return shuffleArr(pool)
  return [...shuffleArr(pool.filter(x => !seen.has(x.id))), ...shuffleArr(pool.filter(x => seen.has(x.id)))]
}

type Screen = 'topics' | 'vignette' | 'case' | 'results'

interface CaseQuestion {
  question_number: number
  question: string
  options: string[]
  correct_answer: string   // 'A' | 'B' | 'C' | 'D'
  explanation: string
}

interface CaseStudy {
  id: string
  title: string
  topic: string
  subtopic: string | null
  difficulty: string | null
  style: string | null
  high_yield: boolean | null
  clinical_vignette: string
  patient_history: Record<string, string> | null
  examination_findings: Record<string, string> | null
  investigations: Record<string, string> | null
  questions: CaseQuestion[]
}

// Coerce any value (string / number / array / nested object) into readable text.
function fmtVal(v: any): string {
  if (v == null) return ''
  if (Array.isArray(v)) return v.map(fmtVal).filter(Boolean).join(', ')
  if (typeof v === 'object') return Object.entries(v).map(([k, x]) => `${k.replace(/_/g, ' ')}: ${fmtVal(x)}`).join(', ')
  return String(v)
}

// ── Info card (patient history / exam findings / investigations) ─────────────
function InfoCard({ label, data, C }: { label: string; data: Record<string, any>; C: ThemeColors }) {
  if (!data || Object.keys(data).length === 0) return null
  return (
    <View style={[ic.card, { backgroundColor: C.surface, borderColor: C.border }]}>
      <Text style={[ic.label, { color: C.textFaint }]}>{label.toUpperCase()}</Text>
      {Object.entries(data).map(([key, val]) => (
        <View key={key} style={ic.row}>
          <Text style={[ic.key, { color: C.textFaint }]}>{key.replace(/_/g, ' ')}</Text>
          {val && typeof val === 'object' && !Array.isArray(val) ? (
            <View style={{ flex: 1 }}>
              {Object.entries(val as Record<string, any>).map(([k, v]) => (
                <Text key={k} style={[ic.val, { color: C.text }]}>
                  <Text style={{ color: C.textFaint }}>{k.replace(/_/g, ' ')}: </Text>{fmtVal(v)}
                </Text>
              ))}
            </View>
          ) : (
            <Text style={[ic.val, { color: C.text }]}>{fmtVal(val)}</Text>
          )}
        </View>
      ))}
    </View>
  )
}
const ic = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, padding: 18, marginBottom: 12 },
  label: { fontSize: 11, fontFamily: 'Nunito_800ExtraBold', letterSpacing: 1, marginBottom: 12 },
  row: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  key: { fontSize: 13, fontFamily: 'Nunito_700Bold', textTransform: 'capitalize', flexShrink: 0, width: '32%', maxWidth: 110, lineHeight: 20 },
  val: { fontSize: 13, fontFamily: 'Nunito_600SemiBold', flex: 1, lineHeight: 20 },
})

export default function CasesScreen() {
  useCollapsePracticeStack()
  const C = useTheme()
  const insets = useSafeAreaInsets()
  const { profile, user, refreshProfile } = useAuth()
  const { smartStart, startCaseId, startTopic, caseIds, from, fromBookmarks } = useLocalSearchParams<{ smartStart?: string; startCaseId?: string; startTopic?: string; caseIds?: string; from?: string; fromBookmarks?: string }>()
  const navigation = useNavigation<any>()
  // Back returns to the origin; dashboard launches also reset the Practice tab to its hub.
  const goBack = () => {
    if (from === 'analytics') {
      router.navigate('/(app)/progress/analytics' as any)
      setTimeout(() => navigation.reset({ index: 0, routes: [{ name: 'index' as never }] }), 0)
    } else if (from === 'search') {
      router.navigate('/(app)/search' as any)
      setTimeout(() => navigation.reset({ index: 0, routes: [{ name: 'index' as never }] }), 0)
    } else if (from === 'dashboard') {
      router.navigate('/(app)/dashboard' as any)
      setTimeout(() => navigation.reset({ index: 0, routes: [{ name: 'index' as never }] }), 0)
    } else if (from === 'history') {
      router.navigate('/(app)/history' as any)
      setTimeout(() => navigation.reset({ index: 0, routes: [{ name: 'index' as never }] }), 0)
    } else {
      router.navigate('/(app)/practice' as any)
    }
  }
  // Bookmark-opened cases return to Bookmarks and reset the Practice tab stack.
  const backToBookmarks = () => {
    router.navigate({ pathname: '/(app)/bookmarks', params: { from } } as any)
    setTimeout(() => navigation.reset({ index: 0, routes: [{ name: 'index' as never }] }), 0)
  }
  // Fresh option order each app session (stable across renders) — see mcq.tsx.
  const shuffleSalt = useRef(Math.random().toString(36).slice(2)).current
  const autoStarted = useRef(false)
  const sessionSavedRef = useRef(false)   // prevents double-save; reset on every new session start
  const isRetakeRef = useRef(false)        // "Retake these cases" replay: saves session + XP, but NOT streak
  const isReviewWrongRef = useRef(false)   // "Review wrong" re-drill: practice only — no session, XP, or streak
  const isPracticeOnlyRef = useRef(false)  // single case opened from Search: never counts toward sessions/XP/streak

  const [screen, setScreen] = useState<Screen>('topics')
  // Focused session — hide app chrome (tab bar) while a case is active
  useFocusSessionWhile(screen === 'vignette' || screen === 'case')

  // Filters collapsed by default — the topic list is the browse screen's job
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Jump Back In lands here with startTopic — scroll the expanded topic into
  // view once its card reports layout (it can sit below the fold).
  const topicsScrollRef = useRef<ScrollView>(null)
  const scrolledToStartTopic = useRef(false)
  const scrollToStartTopic = (topic: string, y: number) => {
    if (topic !== startTopic || scrolledToStartTopic.current) return
    scrolledToStartTopic.current = true
    setTimeout(() => topicsScrollRef.current?.scrollTo({ y: Math.max(0, y - 8), animated: true }), 300)
  }
  const [topicRows, setTopicRows] = useState<TopicRow[]>([])
  const [cases, setCases] = useState<CaseStudy[]>([])
  const [originalCases, setOriginalCases] = useState<CaseStudy[]>([])     // full set, for "Retake"
  const [wrongCaseIds, setWrongCaseIds] = useState<Set<string>>(new Set()) // cases with ≥1 missed question, for "Review wrong"
  const [overlayVisible, setOverlayVisible] = useState(false)             // answer-review overlay (matches MCQ)
  const [detailsVisible, setDetailsVisible] = useState(false)             // vignette cross-check sheet on the question screen
  const [bookmarkedCases, setBookmarkedCases] = useState<Set<string>>(new Set())
  const [caseIdx, setCaseIdx] = useState(0)
  const [qIdx, setQIdx] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)   // letter 'A'–'D'
  const [revealed, setRevealed] = useState(false)
  // Review sheet slides up from the bottom each time it (re)opens.
  const sheetAnim = useRef(new Animated.Value(0)).current
  useEffect(() => {
    if (revealed && overlayVisible) {
      sheetAnim.setValue(420)
      Animated.spring(sheetAnim, { toValue: 0, friction: 10, tension: 70, useNativeDriver: true }).start()
    }
  }, [overlayVisible, revealed]) // eslint-disable-line react-hooks/exhaustive-deps

  // Drag the sheet down to dismiss (the handle promises it — make it true).
  const sheetDrag = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_e, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
    onPanResponderMove: (_e, g) => sheetAnim.setValue(Math.max(0, g.dy)),
    onPanResponderRelease: (_e, g) => {
      if (g.dy > 120 || g.vy > 1.2) {
        Animated.timing(sheetAnim, { toValue: 540, duration: 150, useNativeDriver: true }).start(() => setOverlayVisible(false))
      } else {
        Animated.spring(sheetAnim, { toValue: 0, friction: 9, useNativeDriver: true }).start()
      }
    },
    onPanResponderTerminate: () => {
      Animated.spring(sheetAnim, { toValue: 0, friction: 9, useNativeDriver: true }).start()
    },
  })).current

  const [score, setScore] = useState(0)
  const [totalQ, setTotalQ] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingCases, setLoadingCases] = useState(false)
  const { caseFilter, setCaseFilter } = useFilters()
  const difficulty = caseFilter.difficulty
  const sessionSize = caseFilter.sessionSize
  const setDifficulty = (v: string) => setCaseFilter(f => ({ ...f, difficulty: v }))
  const setSessionSize = (v: number) => setCaseFilter(f => ({ ...f, sessionSize: v }))
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null)

  // ── Timed mode ────────────────────────────────────────────────────────────
  // Preference lives on the profile — set from the TopBar clock button,
  // the Practice-hub banner, or Profile settings (TimedModeSheet).
  const timedOn = profile?.timed_mode ?? false
  const timedSecs = profile?.timed_seconds ?? CASE_QUESTION_SEC

  // Per-question countdown — runs only while a timed, unanswered case question is
  // on screen. Timeout fires through a ref so the interval never captures stale state.
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [timedOut, setTimedOut] = useState(false)
  const handleTimeoutRef = useRef<() => void>(() => {})
  useEffect(() => {
    if (screen !== 'case' || !timedOn || revealed || cases.length === 0) {
      setTimeLeft(null)
      return
    }
    let fired = false
    setTimeLeft(timedSecs)
    const iv = setInterval(() => {
      setTimeLeft(t => {
        if (t == null) return t
        if (t <= 1) {
          clearInterval(iv)
          if (!fired) { fired = true; handleTimeoutRef.current() }
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(iv)
  }, [screen, timedOn, timedSecs, revealed, caseIdx, qIdx, cases.length])

  // Remember last session params so "New cases" can replay without going back to picker
  const [lastTopic, setLastTopic] = useState<string | null>(null)
  const [lastCategory, setLastCategory] = useState<string | undefined>(undefined)
  const [lastWasSurprise, setLastWasSurprise] = useState(false)

  useEffect(() => { loadTopics() }, [difficulty, profile])

  // Load the user's bookmarked case ids (for the in-runner bookmark toggle).
  useEffect(() => {
    if (!user) return
    supabase.from('bookmarks').select('case_id').eq('user_id', user.id).not('case_id', 'is', null)
      .then(({ data }) => setBookmarkedCases(new Set((data ?? []).map((b: any) => b.case_id))))
  }, [user?.id])

  function toggleCaseBookmark(id: string) {
    if (!user) return
    if (bookmarkedCases.has(id)) {
      supabase.from('bookmarks').delete().eq('user_id', user.id).eq('case_id', id).then(() => {})
      setBookmarkedCases(s => { const n = new Set(s); n.delete(id); return n })
    } else {
      supabase.from('bookmarks').insert({ user_id: user.id, case_id: id }).then(() => {})
      setBookmarkedCases(s => new Set(s).add(id))
    }
  }

  useEffect(() => {
    if (!profile || autoStarted.current) return
    if (startCaseId) {
      autoStarted.current = true
      loadCaseById(startCaseId)
    } else if (caseIds) {
      autoStarted.current = true
      loadCasesByIds(JSON.parse(caseIds))
    } else if (startTopic) {
      autoStarted.current = true
      setExpandedTopic(startTopic)   // land on the topic list with this topic open (don't auto-start)
    } else if (smartStart === '1') {
      autoStarted.current = true
      surpriseCases()
    }
  }, [profile])

  // Open a single case directly (from Search). Practice only — never counts toward sessions/XP/streak.
  async function loadCaseById(id: string) {
    setLoadingCases(true)
    const { data } = await supabase.rpc('get_case_by_id', { p_id: id })
    const row = Array.isArray(data) ? data[0] : null
    if (!row) { setLoadingCases(false); Alert.alert('Not found', 'Could not load that case.'); setScreen('topics'); return }
    const cs = row as CaseStudy
    if (!Array.isArray(cs.questions) || cs.questions.length === 0) {
      setLoadingCases(false); Alert.alert('Not available', 'This case has no questions yet.'); setScreen('topics'); return
    }
    sessionSavedRef.current = false
    isPracticeOnlyRef.current = true
    isRetakeRef.current = false
    isReviewWrongRef.current = false
    setLastTopic(null); setLastCategory(undefined); setLastWasSurprise(false)
    setCases([cs]); setOriginalCases([cs])
    setCaseIdx(0); setQIdx(0); setSelected(null); setRevealed(false); setOverlayVisible(false); setScore(0); setWrongCaseIds(new Set())
    setTotalQ(cs.questions.length)
    setLoadingCases(false)
    setScreen('vignette')
  }

  // Replay a Time Capsule case session: load every case by id, practice-only
  // (no XP, no streak, no session record — same contract as MCQ/flashcard replays).
  async function loadCasesByIds(ids: string[]) {
    setLoadingCases(true)
    const rows = await Promise.all(ids.map(id => supabase.rpc('get_case_by_id', { p_id: id }).then(({ data }) => (Array.isArray(data) ? data[0] : null))))
    const loaded = (rows.filter(Boolean) as CaseStudy[]).filter(cs => Array.isArray(cs.questions) && cs.questions.length > 0)
    if (loaded.length === 0) { setLoadingCases(false); Alert.alert('Not found', 'Could not load those cases.'); setScreen('topics'); return }
    sessionSavedRef.current = false
    isPracticeOnlyRef.current = true
    isRetakeRef.current = false
    isReviewWrongRef.current = false
    setLastTopic(null); setLastCategory(undefined); setLastWasSurprise(false)
    setCases(loaded); setOriginalCases(loaded)
    setCaseIdx(0); setQIdx(0); setSelected(null); setRevealed(false); setOverlayVisible(false); setScore(0); setWrongCaseIds(new Set())
    setTotalQ(loaded.reduce((n, cs) => n + cs.questions.length, 0))
    setLoadingCases(false)
    setScreen('vignette')
  }

  // The "you finished" fanfare — same sound at every results screen, win or lose.
  useEffect(() => { if (screen === 'results') playSound('complete') }, [screen])

  // Save session once results screen renders — only for fully completed case sessions.
  // Credits XP/level/streak to the profile (previously case XP was recorded on the
  // session but never added to the user's total, so cases gave no XP toward leveling).
  useEffect(() => {
    if (screen !== 'results' || sessionSavedRef.current || !user || !profile || cases.length === 0) return
    // "Review wrong" re-drills and Search-opened single cases are practice only — no session, XP, or streak.
    if (isReviewWrongRef.current || isPracticeOnlyRef.current) return
    sessionSavedRef.current = true
    // "Retake" saves the session + XP, but must NOT advance the streak (already credited on the first completion).
    const isRetake = isRetakeRef.current
    // Mirror of the server formula (credit_xp): base = score/total x 50 (same scale
    // as MCQ so the shared leaderboard is fair), +10% timed. Kept for the session
    // record; the authoritative award happens server-side.
    const base = Math.round((score / Math.max(totalQ, 1)) * 50)
    const xp = timedOn ? Math.round(base * 1.1) : base
    const streak = isRetake ? {} : computeStreakUpdate(profile)
    ;(async () => {
      const sessionOk = await trySave(() => supabase.from('quiz_sessions').insert({
        user_id: user.id,
        score,
        // One id per QUESTION (composite caseId:idx) so counts/accuracy match MCQ & flashcards.
        question_ids: cases.flatMap(c => c.questions.map((_, i) => `${c.id}:${i}`)),
        xp_earned: xp,
        mode: 'case_study',
        timed: timedOn,
        topic: lastTopic ?? null, // null = Surprise me / random
      }))
      // XP + level + weekly league standing are credited SERVER-SIDE (credit_xp);
      // the profile update carries only the streak.
      const xpOk = await trySave(() => supabase.rpc('credit_xp', { p_kind: 'case_study', p_score: score, p_total: totalQ, p_timed: timedOn }))
      let streakOk = true
      if (Object.keys(streak).length > 0) {
        streakOk = await trySave(() => supabase.from('user_profiles').update({ ...streak }).eq('id', user.id))
      }
      if (!sessionOk || !xpOk || !streakOk) {
        showToast("Couldn't save your progress — check your connection. This session's XP may not have counted.", 'error')
      }
      refreshProfile()
    })()
  }, [screen]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadTopics() {
    if (!profile) return
    setLoading(true)
    const [{ data: richRows }, { data: mcqRows }] = await Promise.all([
      supabase.rpc('get_case_study_counts', {
        p_profession: profile.profession,
        p_access_key: profile.access_key ?? null,
        p_difficulty: difficulty !== 'all' ? difficulty : null,
      }),
      supabase.rpc('get_question_counts', {
        p_profession: profile.profession,
        p_question_type: 'case_study',
        p_access_key: profile.access_key ?? null,
      }),
    ])
    const allRows = [...(richRows ?? []), ...(mcqRows ?? [])]
    setTopicRows(allRows.map((r: any) => ({ topic: r.topic, category: r.category, subtopic: r.subtopic, count: Number(r.cnt) })))
    setLoading(false)
  }

  /** Seen case ids for this user (from saved sessions) — empty when repeats are allowed. */
  async function fetchSeenCaseIds(): Promise<Set<string>> {
    if (!user || profile?.allow_repeat_questions) return new Set()
    const { data } = await supabase.from('quiz_sessions').select('question_ids').eq('user_id', user.id).limit(500)
    const seen = new Set<string>()
    // question_ids may be composite (caseId:idx) for case sessions or plain ids elsewhere — take the caseId.
    for (const row of (data ?? [])) for (const id of ((row as any).question_ids ?? [])) seen.add(String(id).split(':')[0])
    return seen
  }

  async function startCase(topic: string, category?: string) {
    if (!profile) return
    sessionSavedRef.current = false
    setLoadingCases(true)
    setLastTopic(topic); setLastCategory(category); setLastWasSurprise(false)
    const { data } = await supabase.rpc('get_cases_by_topic', {
      p_profession: profile.profession,
      p_topic: topic,
      p_category: category ?? null,
      p_difficulty: difficulty !== 'all' ? difficulty : null,
      p_access_key: profile.access_key ?? null,
      p_limit: sessionSize * 3,
    })
    const valid = ((data as CaseStudy[] | null) ?? []).filter(c => Array.isArray(c.questions) && c.questions.length > 0)
    if (valid.length === 0) { setLoadingCases(false); Alert.alert('No cases', 'No case studies found.'); return }

    const shuffled = orderCasesByUnseen(valid, await fetchSeenCaseIds()).slice(0, sessionSize)
    setCases(shuffled); setOriginalCases(shuffled)
    isRetakeRef.current = false; isReviewWrongRef.current = false; isPracticeOnlyRef.current = false
    setCaseIdx(0); setQIdx(0); setSelected(null); setRevealed(false); setOverlayVisible(false); setScore(0); setWrongCaseIds(new Set())
    setTotalQ(shuffled.reduce((s: number, c: CaseStudy) => s + c.questions.length, 0))
    setLoadingCases(false)
    setScreen('vignette')
  }

  async function surpriseCases() {
    if (!profile) return
    sessionSavedRef.current = false
    setLoadingCases(true)
    setLastTopic(null); setLastCategory(undefined); setLastWasSurprise(true)
    // Surprise me = truly random across topics (server-side), within the set filters.
    const { data } = await supabase.rpc('get_random_cases', {
      p_profession: profile.profession,
      p_limit: sessionSize * 5,
      p_difficulty: difficulty !== 'all' ? difficulty : null,
      p_access_key: profile.access_key ?? null,
    })
    const valid = ((data as CaseStudy[] | null) ?? []).filter(c => Array.isArray(c.questions) && c.questions.length > 0)
    if (valid.length === 0) { setLoadingCases(false); Alert.alert('No cases', 'No case studies found.'); return }
    // Areas of interest bias the surprise pool (unseen-interest first); empty = decide for me
    const shuffled = orderByInterestAndUnseen(valid, profile.interests, await fetchSeenCaseIds()).slice(0, sessionSize)
    setCases(shuffled); setOriginalCases(shuffled)
    isRetakeRef.current = false; isReviewWrongRef.current = false; isPracticeOnlyRef.current = false
    setCaseIdx(0); setQIdx(0); setSelected(null); setRevealed(false); setOverlayVisible(false); setScore(0); setWrongCaseIds(new Set())
    setTotalQ(shuffled.reduce((s: number, c: CaseStudy) => s + c.questions.length, 0))
    setLoadingCases(false)
    setScreen('vignette')
  }

  function submitAnswer() {
    if (!selected || revealed) return
    setRevealed(true)
    setOverlayVisible(true)
    const cs = cases[caseIdx]
    const cq = cs.questions[qIdx]
    const correct = selected === buildShuffledMcq(cq.options, cq.correct_answer, `${cs.id}:${qIdx}:${shuffleSalt}`).correctLetter
    playSound(correct ? 'correct' : 'wrong')
    if (correct) setScore(s => s + 1)
    else setWrongCaseIds(prev => new Set(prev).add(cs.id))
  }

  /** Timed-mode timeout: counts as wrong, opens the same review overlay. */
  handleTimeoutRef.current = () => {
    if (revealed) return
    const cs = cases[caseIdx]
    if (!cs) return
    playSound('wrong')
    setTimedOut(true)
    setRevealed(true)
    setOverlayVisible(true)
    setWrongCaseIds(prev => new Set(prev).add(cs.id))
  }

  // Replay the full set — saves a session + XP but does NOT advance the streak.
  function retakeCases() {
    sessionSavedRef.current = false; isRetakeRef.current = true; isReviewWrongRef.current = false
    const deck = shuffleArr(originalCases.length ? originalCases : cases)
    setCases(deck)
    setCaseIdx(0); setQIdx(0); setSelected(null); setRevealed(false); setOverlayVisible(false); setScore(0); setWrongCaseIds(new Set())
    setTotalQ(deck.reduce((s, c) => s + c.questions.length, 0))
    setScreen('vignette')
  }

  // Re-drill only the cases where a question was missed — pure practice (no session, XP, or streak).
  function reviewWrongCases() {
    const wrong = (originalCases.length ? originalCases : cases).filter(c => wrongCaseIds.has(c.id))
    if (wrong.length === 0) return
    sessionSavedRef.current = false; isReviewWrongRef.current = true; isRetakeRef.current = false
    const deck = shuffleArr(wrong)
    setCases(deck)
    setCaseIdx(0); setQIdx(0); setSelected(null); setRevealed(false); setOverlayVisible(false); setScore(0); setWrongCaseIds(new Set())
    setTotalQ(deck.reduce((s, c) => s + c.questions.length, 0))
    setScreen('vignette')
  }

  /** Confirm before abandoning an active case session (progress saves at results). */
  function confirmAbandon(onExit: () => void) {
    const answeredCount = cases.slice(0, caseIdx).reduce((n, c) => n + c.questions.length, 0) + qIdx + (revealed ? 1 : 0)
    if (answeredCount === 0) { onExit(); return }
    Alert.alert(
      'Leave this session?',
      `You've answered ${answeredCount} of ${totalQ} questions. Progress is only saved when you finish — leaving now loses it.`,
      [
        { text: 'Continue', style: 'cancel' },
        { text: 'Exit session', style: 'destructive', onPress: onExit },
      ],
    )
  }

  function next() {
    setOverlayVisible(false)
    setTimedOut(false)
    const cs = cases[caseIdx]
    if (qIdx + 1 < cs.questions.length) {
      setQIdx(i => i + 1)
      setSelected(null); setRevealed(false)
    } else if (caseIdx + 1 < cases.length) {
      setCaseIdx(i => i + 1)
      setQIdx(0); setSelected(null); setRevealed(false)
      setScreen('vignette')   // show next case's preamble before questions
    } else {
      // XP, level and streak are all credited in the results-save useEffect.
      setScreen('results')
    }
  }

  // ── Topics screen ──────────────────────────────────────────────────────────
  if (screen === 'topics') {
    const grouped = topicRows.reduce((acc: Record<string, TopicRow[]>, r) => {
      if (!r.topic) return acc
      if (!acc[r.topic]) acc[r.topic] = []
      acc[r.topic].push(r)
      return acc
    }, {})

    const totalCases = topicRows.reduce((s, r) => s + r.count, 0)
    const DIFF_OPTS = [
      { id: 'all',    label: 'All levels', activeBg: C.text,    activeFg: C.bg },
      { id: 'easy',   label: 'Easy',       activeBg: C.green,   activeFg: C.onTeal },
      { id: 'medium', label: 'Medium',     activeBg: C.amber,   activeFg: C.onTeal },
      { id: 'hard',   label: 'Hard',       activeBg: C.red,     activeFg: C.onTeal },
    ]

    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <TopBar title="Practice" />
        <View style={[s.header, { paddingTop: 14, backgroundColor: C.surface, borderBottomColor: C.border }]}>
          <TouchableOpacity onPress={goBack} style={[s.backBtn, { backgroundColor: C.surface2, borderColor: C.border }]}>
            <Ionicons name="arrow-back" size={20} color={C.textSoft} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[s.headerTitle, { color: C.text }]}>Case Studies</Text>
            {!loading && <Text style={[s.headerSub, { color: C.textFaint }]}>{totalCases.toLocaleString()} cases available</Text>}
          </View>
        </View>

        {/* Pinned: active filters survive across visits — keep them visible with one-tap clear */}
        <FilterBanner kind="case" />
        <ScrollView ref={topicsScrollRef} contentContainerStyle={{ paddingBottom: 40, width: '100%', maxWidth: MAX_CONTENT, alignSelf: 'center' }} showsVerticalScrollIndicator={false}>
        {/* Filters — collapsed to one summary row by default (matches MCQ) */}
        <View style={[s.filterSection, { backgroundColor: C.surface, borderBottomColor: C.border, paddingTop: 0, paddingBottom: filtersOpen ? 18 : 0 }]}>
          <TouchableOpacity
            onPress={() => withAccordionAnim(() => setFiltersOpen(o => !o))}
            style={s.filterToggle}
            accessibilityRole="button"
            accessibilityState={{ expanded: filtersOpen }}
            accessibilityLabel="Session filters"
          >
            <Ionicons name="options-outline" size={17} color={C.textSoft} />
            <Text style={[s.filterToggleTitle, { color: C.text }]}>Filters</Text>
            <Text style={[s.filterToggleSummary, { color: C.textFaint }]} numberOfLines={1}>
              {difficulty === 'all' ? 'All levels' : difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} · {sessionSize} {sessionSize === 1 ? 'case' : 'cases'}
            </Text>
            <Ionicons name={filtersOpen ? 'chevron-up' : 'chevron-down'} size={17} color={C.textFaint} />
          </TouchableOpacity>
          {filtersOpen && (<Entrance dy={-8}>
          <Text style={[s.filterLabel, { color: C.textFaint }]}>DIFFICULTY</Text>
          <View style={s.chipRow}>
            {DIFF_OPTS.map(d => {
              const active = difficulty === d.id
              return (
                <TouchableOpacity key={d.id} onPress={() => withFilterAnim(() => setDifficulty(d.id))} activeOpacity={0.75}
                  style={[s.chip, { backgroundColor: active ? d.activeBg : C.surface2, borderColor: active ? d.activeBg : C.border }]}>
                  <Text style={[s.chipText, { color: active ? d.activeFg : C.textSoft }]}>{d.label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>

          <Text style={[s.filterLabel, { color: C.textFaint, marginTop: 14 }]}>SESSION SIZE</Text>
          <View style={s.chipRow}>
            {[1, 2, 3, 4, 5].map(n => {
              const active = sessionSize === n
              const disabled = totalCases > 0 && n > totalCases
              return (
                <TouchableOpacity key={n} disabled={disabled} onPress={() => withFilterAnim(() => setSessionSize(n))} activeOpacity={0.75}
                  style={[s.chip, { backgroundColor: active ? C.teal : C.surface2, borderColor: active ? C.teal : C.border, opacity: disabled ? 0.4 : 1 }]}>
                  <Text style={[s.chipText, { color: active ? C.onTeal : C.textSoft }]}>
                    {n} {n === 1 ? 'case' : 'cases'}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
          </Entrance>)}
        </View>

        <TouchableOpacity onPress={surpriseCases} activeOpacity={0.85}
          style={[s.surpriseBanner, { backgroundColor: C.teal, marginHorizontal: 16, marginTop: 14, marginBottom: 4 }]}>
          <Text style={[s.surpriseLeft, { color: C.onTeal }]}>🎲 Surprise me</Text>
          <Text style={[s.surpriseRight, { color: C.onTeal }]}>Random cases →</Text>
        </TouchableOpacity>

        {loading ? <SkeletonList rows={7} style={{ marginHorizontal: 16, marginTop: 16 }} /> : (
          <>
            {Object.entries(grouped).map(([topic, rows]) => {
              const total = rows.reduce((s, r) => s + r.count, 0)
              const isExp = expandedTopic === topic
              const { color: iconColor, bgLight: iconBg } = topicColor(topic)

              const catMap = new Map<string, number>()
              for (const r of rows) {
                const catKey = r.category ?? 'General'
                catMap.set(catKey, (catMap.get(catKey) ?? 0) + r.count)
              }
              const sortedCats = Array.from(catMap.entries()).sort(([a], [b]) => {
                const ai = CAT_ORDER.indexOf(a); const bi = CAT_ORDER.indexOf(b)
                return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
              })

              return (
                <View key={topic} onLayout={e => scrollToStartTopic(topic, e.nativeEvent.layout.y)} style={[s.topicCard, { backgroundColor: C.surface, borderColor: C.border, ...C.shadow, marginHorizontal: 16, marginBottom: 10 }]}>
                  <View style={s.topicRowInner}>
                    <View style={[s.topicIcon, { backgroundColor: iconBg }]}>
                      <TopicIcon topic={topic} size={20} color={iconColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.topicName, { color: C.text }]}>{topic}</Text>
                      <Text style={[s.topicMeta, { color: C.textFaint }]}>
                        {total.toLocaleString()} cases · {sortedCats.length} {sortedCats.length === 1 ? 'category' : 'categories'}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => startCase(topic)} activeOpacity={0.75}
                      style={[s.startBtn, { backgroundColor: C.tealTint, borderColor: C.teal }]}>
                      <Text style={[s.startBtnText, { color: C.teal }]}>{total < sessionSize ? `Start ${total} →` : 'Start →'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => withAccordionAnim(() => setExpandedTopic(isExp ? null : topic))} style={s.chevronBtn}>
                      <Ionicons name={isExp ? 'chevron-up' : 'chevron-down'} size={18} color={C.textFaint} />
                    </TouchableOpacity>
                  </View>

                  {isExp && (
                    <View style={{ borderTopWidth: 1, borderTopColor: C.border }}>
                      {sortedCats.map(([catName, count], ci) => (
                        <View key={catName} style={{ borderBottomWidth: ci < sortedCats.length - 1 ? 1 : 0, borderBottomColor: C.border }}>
                          <View style={[s.catRow, { backgroundColor: C.surface2 }]}>
                            <View style={{ flex: 1 }}>
                              <Text style={[s.catName, { color: C.text }]}>{catName}</Text>
                              <Text style={[s.catCount, { color: C.textFaint }]}>{count.toLocaleString()} cases</Text>
                            </View>
                            <TouchableOpacity
                              onPress={() => startCase(topic, catName !== 'General' ? catName : undefined)}
                              style={[s.catStartBtn, { borderColor: C.teal, backgroundColor: C.tealTint }]}>
                              <Text style={[s.startBtnText, { color: C.teal }]}>{count < sessionSize ? `Start ${count} →` : 'Start →'}</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )
            })}
          </>
        )}
        </ScrollView>
        {loadingCases && (
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: C.bg + 'cc', alignItems: 'center', justifyContent: 'center' }]}>
            <ActivityIndicator size="large" color={C.teal} />
          </View>
        )}
      </View>
    )
  }

  const cs = cases[caseIdx]
  if (!cs) return null

  // ── Vignette screen ────────────────────────────────────────────────────────
  if (screen === 'vignette') {
    const diffColor = cs.difficulty === 'easy' ? C.green : cs.difficulty === 'medium' ? C.amber : C.red
    const diffBg = cs.difficulty === 'easy' ? C.greenTint : cs.difficulty === 'medium' ? C.amberTint : C.redTint

    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        {/* Focused session: no TopBar/tab bar — header owns the safe area */}
        <View style={[s.quizHeader, { paddingTop: insets.top + 10, backgroundColor: C.surface, borderBottomColor: C.border }]}>
          <TouchableOpacity onPress={() => confirmAbandon(() => (fromBookmarks ? backToBookmarks() : (smartStart === '1' || startCaseId || caseIds) ? goBack() : setScreen('topics')))} style={[s.backBtn, { backgroundColor: C.surface2, borderColor: C.border }]}>
            <Ionicons name="arrow-back" size={20} color={C.textSoft} />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={[s.headerCaseNum, { color: C.text }]}>Case {caseIdx + 1} of {cases.length}</Text>
            {(profile?.show_question_tags ?? true) && (
              <Text style={[s.headerCaseSub, { color: C.textFaint }]}>{cs.topic}</Text>
            )}
          </View>
          <View style={[s.diffBadge, { backgroundColor: diffBg }]}>
            <Text style={[s.diffText, { color: diffColor }]}>{cs.difficulty ?? 'Medium'}</Text>
          </View>
          <TouchableOpacity onPress={() => toggleCaseBookmark(cs.id)} style={[s.backBtn, { backgroundColor: C.surface2, borderColor: C.border, marginLeft: 8 }]}>
            <Ionicons name={bookmarkedCases.has(cs.id) ? 'bookmark' : 'bookmark-outline'} size={18} color={bookmarkedCases.has(cs.id) ? C.amber : C.textFaint} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 18, paddingBottom: 16, width: '100%', maxWidth: MAX_CONTENT, alignSelf: 'center' }}
          showsVerticalScrollIndicator={false}
        >
          {/* Tag chips */}
          <View style={s.chipRow}>
            {(profile?.show_question_tags ?? true) && cs.subtopic && (
              <View style={[s.tag, { backgroundColor: C.tealTint }]}>
                <Text style={[s.tagText, { color: C.teal }]}>{cs.subtopic}</Text>
              </View>
            )}
            {cs.style && (
              <View style={[s.tag, { backgroundColor: C.surface3 }]}>
                <Text style={[s.tagText, { color: C.textSoft }]}>
                  {cs.style === 'multi_question' ? 'Multi-Question' : cs.style === 'osce' ? 'OSCE' : cs.style}
                </Text>
              </View>
            )}
            {cs.high_yield && (
              <View style={[s.tag, { backgroundColor: C.amberTint }]}>
                <Text style={[s.tagText, { color: C.amber }]}>High Yield</Text>
              </View>
            )}
          </View>

          {/* Title */}
          <Text style={[s.caseTitle, { color: C.text }]}>{cs.title}</Text>

          {/* Clinical Vignette */}
          <View style={[s.vignetteCard, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Text style={[s.vignetteLabel, { color: C.teal }]}>CLINICAL VIGNETTE</Text>
            <Text style={[s.vignetteText, { color: C.text }]}>{cs.clinical_vignette}</Text>
          </View>

          {/* Info cards */}
          {cs.patient_history && <InfoCard label="Patient History" data={cs.patient_history} C={C} />}
          {cs.examination_findings && <InfoCard label="Examination Findings" data={cs.examination_findings} C={C} />}
          {cs.investigations && <InfoCard label="Investigations" data={cs.investigations} C={C} />}

          <Text style={[s.qCountNote, { color: C.textFaint }]}>
            {cs.questions.length} question{cs.questions.length !== 1 ? 's' : ''} follow
          </Text>
        </ScrollView>

        {/* Start questions CTA */}
        <View style={[s.bottomBar, { backgroundColor: C.surface, borderTopColor: C.border, paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity onPress={() => setScreen('case')} activeOpacity={0.88} style={[s.ctaBtn, { backgroundColor: C.teal }]}>
            <Text style={[s.ctaBtnText, { color: C.onTeal }]}>Start questions →</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  // ── Case questions screen ─────────────────────────────────────────────────
  if (screen === 'case') {
    const q = cs.questions[qIdx]
    const shuffled = buildShuffledMcq(q.options, q.correct_answer, `${cs.id}:${qIdx}:${shuffleSalt}`)
    const correctLetter = shuffled.correctLetter
    const answeredCount = cases.slice(0, caseIdx).reduce((s, c) => s + c.questions.length, 0) + qIdx + (revealed ? 1 : 0)
    const progress = answeredCount / totalQ
    const isCorrect = revealed && selected === correctLetter
    const isLast = caseIdx === cases.length - 1 && qIdx + 1 >= cs.questions.length

    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        {/* Focused session: no TopBar/tab bar — header owns the safe area */}
        <View style={[s.quizHeader, { paddingTop: insets.top + 10, backgroundColor: C.surface, borderBottomColor: C.border }]}>
          <TouchableOpacity onPress={() => setScreen('vignette')} accessibilityLabel="Back to case details" accessibilityRole="button" hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }} style={[s.backBtn, { backgroundColor: C.surface2, borderColor: C.border }]}>
            <Ionicons name="arrow-back" size={20} color={C.textSoft} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginHorizontal: 12 }}>
            <ProgressBar progress={progress} height={6} color={C.teal} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[s.qCount, { color: C.textFaint }]}>
                Case {caseIdx + 1} · Q{qIdx + 1} of {cs.questions.length}
              </Text>
              {timedOn && timeLeft != null && (
                <View style={[s.timerPill, { backgroundColor: timeLeft <= URGENT_AT_SEC ? C.redTint : C.tealTint }]}>
                  <Ionicons name="timer-outline" size={12} color={timeLeft <= URGENT_AT_SEC ? C.red : C.teal} />
                  <Text style={[s.timerText, { color: timeLeft <= URGENT_AT_SEC ? C.red : C.teal }]}>{timeLeft}s</Text>
                </View>
              )}
            </View>
          </View>
          <TouchableOpacity onPress={() => toggleCaseBookmark(cs.id)} accessibilityLabel={bookmarkedCases.has(cs.id) ? 'Remove bookmark' : 'Bookmark this case'} accessibilityRole="button" hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }} style={[s.backBtn, { backgroundColor: C.surface2, borderColor: C.border }]}>
            <Ionicons name={bookmarkedCases.has(cs.id) ? 'bookmark' : 'bookmark-outline'} size={18} color={bookmarkedCases.has(cs.id) ? C.amber : C.textFaint} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 8, width: '100%', maxWidth: MAX_CONTENT, alignSelf: 'center' }}
          showsVerticalScrollIndicator={false}
        >
          {/* Ask block — Buddy asks the question (matches MCQ's Cappy bubble);
              the "Case details" chip lets the user cross-check the vignette
              without abandoning the question. */}
          <Entrance key={`ask-${caseIdx}-${qIdx}`} style={s.askBlock}>
            <View style={s.stemRow}>
              <MascotAnimator expr={revealed ? (isCorrect ? 'happy' : 'wrong') : 'idle'}>
                <BuddyHead expr={revealed ? (isCorrect ? 'happy' : 'thinking') : 'idle'} size={110} />
              </MascotAnimator>
              <View style={[s.stemBubble, { backgroundColor: C.surface, borderColor: C.border, ...C.shadow }]}>
                <View style={s.tailWrap} pointerEvents="none">
                  <View style={[s.bubbleTail, { borderRightColor: C.surface }]} />
                </View>
                <Text style={[s.questionLabel, { color: C.teal }]}>QUESTION {q.question_number ?? qIdx + 1}</Text>
                <Text style={[s.stem, { color: C.text }]}>{q.question}</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => setDetailsVisible(true)}
              style={[s.detailsChip, { backgroundColor: C.surface2, borderColor: C.border }]}
              accessibilityRole="button"
              accessibilityLabel="Review case details"
            >
              <Ionicons name="document-text-outline" size={15} color={C.teal} />
              <Text style={[s.detailsChipText, { color: C.teal }]}>Case details</Text>
            </TouchableOpacity>
          </Entrance>

          {/* Options — flexGrow swallows the leftover height (matches MCQ) */}
          <View style={{ gap: 10, marginTop: 4, flexGrow: 1 }}>
            {shuffled.options.map((opt, i) => {
              const letter = LETTERS[i]
              const isSelected = selected === letter
              const isAnswer = letter === correctLetter
              const isChosen = revealed && selected === letter

              let bg = C.surface
              let border = C.border
              let chipBg = C.surface3
              let chipFg = C.textSoft
              let tc = C.text
              let opacity = 1

              if (revealed) {
                if (isAnswer) { bg = C.greenTint; border = C.green; chipBg = C.green; chipFg = C.onTeal; tc = C.green }
                else if (isChosen) { bg = C.redTint; border = C.red; chipBg = C.red; chipFg = C.onTeal; tc = C.red }
                else { opacity = 0.45 }
              } else if (isSelected) {
                bg = C.tealTint; border = C.teal; chipBg = C.teal; chipFg = C.onTeal; tc = C.tealDeep
              }

              return (
                // Keyed by case+question+letter: options cascade in per question
                <Entrance key={`${caseIdx}-${qIdx}-${letter}`} delay={60 + i * 45} style={{ flexGrow: 1 }}>
                  <TouchableOpacity
                    onPress={() => !revealed && setSelected(letter)}
                    activeOpacity={revealed ? 1 : 0.75}
                    style={[s.option, { backgroundColor: bg, borderColor: border, opacity }]}
                  >
                    <View style={[s.optKey, { backgroundColor: chipBg }]}>
                      <Text style={[s.optKeyText, { color: chipFg }]}>
                        {revealed && isAnswer ? '✓' : revealed && isChosen ? '✗' : letter}
                      </Text>
                    </View>
                    <Text style={[s.optText, { color: tc }]}>{opt}</Text>
                  </TouchableOpacity>
                </Entrance>
              )
            })}
          </View>

        </ScrollView>

        {/* Case-details sheet — the vignette, history, exams and investigations,
            available mid-question for cross-checking */}
        {detailsVisible && (
          <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
            <Pressable style={s.sheetScrim} onPress={() => setDetailsVisible(false)} />
            <View style={[s.sheet, { backgroundColor: C.surface, borderColor: C.border, paddingBottom: insets.bottom + 10, ...C.shadowLg }]}>
              <View style={s.sheetHandleWrap}>
                <View style={[s.sheetHandle, { backgroundColor: C.surface3 }]} />
              </View>
              <View style={s.sheetHeadRow}>
                <Text style={[s.questionLabel, { color: C.teal, marginBottom: 0 }]}>CASE DETAILS</Text>
                <View style={{ flex: 1 }} />
                <TouchableOpacity onPress={() => setDetailsVisible(false)} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }} accessibilityRole="button" accessibilityLabel="Hide case details">
                  <Ionicons name="chevron-down" size={24} color={C.textFaint} />
                </TouchableOpacity>
              </View>
              <ScrollView style={{ flexGrow: 0 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
                <Text style={[s.caseTitle, { color: C.text, fontSize: 17, marginBottom: 10 }]}>{cs.title}</Text>
                <View style={[s.vignetteCard, { backgroundColor: C.surface2, borderColor: C.border, marginBottom: 12 }]}>
                  <Text style={[s.vignetteLabel, { color: C.teal }]}>CLINICAL VIGNETTE</Text>
                  <Text style={[s.vignetteText, { color: C.text }]}>{cs.clinical_vignette}</Text>
                </View>
                {cs.patient_history && <InfoCard label="Patient History" data={cs.patient_history} C={C} />}
                {cs.examination_findings && <InfoCard label="Examination Findings" data={cs.examination_findings} C={C} />}
                {cs.investigations && <InfoCard label="Investigations" data={cs.investigations} C={C} />}
              </ScrollView>
            </View>
          </View>
        )}

        {/* Fixed bottom bar — submit (grayed until selection) → next after reveal */}
        <View style={[s.bottomBar, { backgroundColor: C.surface, borderTopColor: C.border, paddingBottom: insets.bottom + 12 }]}>
          {!revealed ? (
            <TouchableOpacity
              onPress={submitAnswer}
              activeOpacity={selected ? 0.88 : 1}
              style={[s.ctaBtn, {
                backgroundColor: selected ? C.teal : C.surface3,
                shadowColor: selected ? C.teal : 'transparent',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: selected ? 0.35 : 0,
                shadowRadius: 16,
                elevation: selected ? 6 : 0,
              }]}
            >
              <Text style={[s.ctaBtnText, { color: selected ? C.onTeal : C.textFaint }]}>Submit answer</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {!overlayVisible && (
                <TouchableOpacity
                  onPress={() => setOverlayVisible(true)}
                  style={[s.whyChip, { borderColor: C.teal, backgroundColor: C.tealTint }]}
                  accessibilityRole="button"
                  accessibilityLabel="Re-open explanation"
                >
                  <Ionicons name="chatbubble-ellipses" size={16} color={C.teal} />
                  <Text style={[s.whyChipText, { color: C.teal }]}>Why?</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={next} activeOpacity={0.88} style={[s.ctaBtn, { backgroundColor: C.teal, flex: 1 }]}>
                <Text style={[s.ctaBtnText, { color: C.onTeal }]}>
                  {isLast ? 'Finish →' : qIdx + 1 >= cs.questions.length ? 'Next case →' : 'Next question →'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Review sheet — bottom-anchored so the vignette + stem stay readable
            (matches MCQ). Tap the dim area to study the question; "Why?" reopens. */}
        {revealed && overlayVisible && (
          <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
            <Pressable style={s.sheetScrim} onPress={() => setOverlayVisible(false)} />
            <Animated.View style={[s.sheet, { backgroundColor: C.surface, borderColor: C.border, paddingBottom: insets.bottom + 10, transform: [{ translateY: sheetAnim }], ...C.shadowLg }]}>
              <View {...sheetDrag.panHandlers}>
              <View style={s.sheetHandleWrap}>
                <View style={[s.sheetHandle, { backgroundColor: C.surface3 }]} />
              </View>

              {/* Header: verdict + collapse — the stem-row Buddy carries the
                  reaction now, so no second mascot in the sheet */}
              <View style={s.sheetHeadRow}>
                <View style={[s.verdictBadge, { backgroundColor: isCorrect ? C.greenTint : C.redTint, marginBottom: 0 }]}>
                  <Text style={[s.verdictText, { color: isCorrect ? C.green : C.red }]}>
                    {isCorrect ? '✓ Correct' : timedOut ? '⏰ Time’s up' : '✗ Not quite'}
                  </Text>
                </View>
                <View style={{ flex: 1 }} />
                <TouchableOpacity
                  onPress={() => setOverlayVisible(false)}
                  hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel="Hide explanation"
                >
                  <Ionicons name="chevron-down" size={24} color={C.textFaint} />
                </TouchableOpacity>
              </View>
              </View>

              <ScrollView style={{ flexGrow: 0 }} showsVerticalScrollIndicator={false}>
                {/* Answer line */}
                {isCorrect ? (
                  <View style={[s.answerRow, { borderColor: C.green }]}>
                    <Text style={[s.answerLabel, { color: C.green }]}>YOUR ANSWER</Text>
                    <Text style={[s.answerText, { color: C.text }]}>
                      {selected}. {shuffled.options[LETTERS.indexOf(selected ?? '')]}
                    </Text>
                  </View>
                ) : (
                  <View style={[s.answerRow, { borderColor: C.red }]}>
                    <Text style={[s.answerLabel, { color: C.teal }]}>CORRECT ANSWER</Text>
                    <Text style={[s.answerText, { color: C.text }]}>
                      {correctLetter}. {shuffled.options[LETTERS.indexOf(correctLetter ?? '')]}
                    </Text>
                  </View>
                )}

                {/* Explanation */}
                <Text style={[s.explainText, { color: C.text, marginTop: 10 }]}>{q.explanation}</Text>

                {/* What you chose (when wrong) */}
                {!isCorrect && selected && (
                  <View style={[s.distractorBox, { borderTopColor: C.red }]}>
                    <Text style={[s.answerLabel, { color: C.red }]}>YOU CHOSE</Text>
                    <Text style={[s.answerText, { color: C.textSoft }]}>
                      {selected}. {shuffled.options[LETTERS.indexOf(selected)]}
                    </Text>
                  </View>
                )}
              </ScrollView>

              <TouchableOpacity onPress={next} style={[s.nextBtn, { backgroundColor: C.teal, maxWidth: undefined, marginTop: 12 }]}>
                <Text style={[s.nextBtnText, { color: C.onTeal }]}>
                  {isLast ? 'Finish →' : qIdx + 1 >= cs.questions.length ? 'Next case →' : 'Next question →'}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        )}
      </View>
    )
  }

  // ── Results screen ─────────────────────────────────────────────────────────
  const pct = totalQ > 0 ? Math.round((score / totalQ) * 100) : 0
  const xpBase = Math.round((score / Math.max(totalQ, 1)) * 50)
  const xpEarned = timedOn ? Math.round(xpBase * 1.1) : xpBase
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <TopBar title="Practice" />
      <ScrollView contentContainerStyle={[s.resultScroll, { paddingTop: 32, paddingBottom: insets.bottom + 80, width: '100%', maxWidth: MAX_CONTENT, alignSelf: 'center' }]}>
        <View style={s.resultMascot}>
          <MascotAnimator expr={pct >= 70 ? 'happy' : 'thinking'}>
            <BuddyHead size={88} expr={pct >= 70 ? 'happy' : 'thinking'} />
          </MascotAnimator>
        </View>
        <Text style={[s.resultTitle, { color: C.text }]}>Cases complete!</Text>
        <Text style={[s.resultSubText, { color: C.textSoft }]}>
          {pct >= 80 ? 'Excellent clinical reasoning!' : pct >= 60 ? 'Good work — keep it up!' : 'Keep practicing these cases!'}
        </Text>
        <Text style={[s.resultPct, { color: C.teal }]}>{pct}%</Text>
        <View style={s.statGrid}>
          <View style={[s.statTile, { backgroundColor: C.surface, borderColor: C.border, ...C.shadow }]}>
            <Text style={[s.statVal, { color: C.green }]}>{score}/{totalQ}</Text>
            <Text style={[s.statLabel, { color: C.textFaint }]}>Correct</Text>
          </View>
          <View style={[s.statTile, { backgroundColor: C.surface, borderColor: C.border, ...C.shadow }]}>
            <Text style={[s.statVal, { color: C.teal }]}>{pct}%</Text>
            <Text style={[s.statLabel, { color: C.textFaint }]}>Accuracy</Text>
          </View>
          <View style={[s.statTile, { backgroundColor: C.surface, borderColor: C.border, ...C.shadow }]}>
            <Text style={[s.statVal, { color: C.coral }]}>+{xpEarned}</Text>
            <Text style={[s.statLabel, { color: C.textFaint }]}>XP</Text>
          </View>
        </View>
        {/* Action buttons — same hierarchy as MCQ results:
            review (tinted) → replay (ghost) → new content (filled) → Dashboard (ghost) */}
        <View style={s.resultActions}>
          {wrongCaseIds.size > 0 && (
            <TouchableOpacity onPress={reviewWrongCases} style={[s.resultBtn, { backgroundColor: C.redTint, borderWidth: 1, borderColor: C.red }]}>
              <Text style={[s.resultBtnText, { color: C.red }]}>Review {wrongCaseIds.size} {wrongCaseIds.size === 1 ? 'case' : 'cases'} missed →</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={retakeCases} style={[s.resultBtn, { backgroundColor: C.surface, borderWidth: 1, borderColor: C.borderStrong }]}>
            <Text style={[s.resultBtnText, { color: C.textSoft }]}>↺  Retake these cases</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              if (lastWasSurprise) surpriseCases()
              else if (lastTopic) startCase(lastTopic, lastCategory)
              else setScreen('topics')
            }}
            style={[s.resultBtn, { backgroundColor: C.teal }]}
          >
            <Text style={[s.resultBtnText, { color: C.onTeal }]}>New cases →</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(app)/dashboard')} style={[s.resultBtn, { backgroundColor: C.surface, borderWidth: 1, borderColor: C.borderStrong }]}>
            <Text style={[s.resultBtnText, { color: C.textSoft }]}>Dashboard</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setScreen('topics')} style={{ alignSelf: 'center', marginTop: 6 }}>
            <Text style={[s.resultBtnText, { color: C.textFaint, fontSize: 13 }]}>Choose a different topic</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  // Topics header
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 20, fontFamily: 'Nunito_800ExtraBold' },
  headerSub: { fontSize: 12, fontFamily: 'Nunito_600SemiBold', marginTop: 1 },
  backBtn: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  filterSection: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 18, borderBottomWidth: 1 },
  filterToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14 },
  filterToggleTitle: { fontSize: 14, fontFamily: 'Nunito_800ExtraBold' },
  filterToggleSummary: { flex: 1, fontSize: 12.5, fontFamily: 'Nunito_600SemiBold', textAlign: 'right' },
  filterLabel: { fontSize: 11, fontFamily: 'Nunito_800ExtraBold', letterSpacing: 0.6, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1.5 },
  chipText: { fontSize: 13, fontFamily: 'Nunito_700Bold' },
  surpriseBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 20 },
  surpriseLeft: { fontSize: 15, fontFamily: 'Nunito_800ExtraBold' },
  surpriseRight: { fontSize: 13, fontFamily: 'Nunito_700Bold', opacity: 0.85 },
  // Topic list
  topicCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  topicRowInner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  topicIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  topicName: { fontSize: 15, fontFamily: 'Nunito_700Bold' },
  topicMeta: { fontSize: 12, fontFamily: 'Nunito_600SemiBold', marginTop: 2 },
  startBtn: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1.5 },
  startBtnText: { fontSize: 13, fontFamily: 'Nunito_800ExtraBold' },
  chevronBtn: { padding: 4 },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: 14 },
  catName: { fontSize: 13, fontFamily: 'Nunito_800ExtraBold' },
  catCount: { fontSize: 11.5, fontFamily: 'Nunito_600SemiBold', marginTop: 1 },
  catStartBtn: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1.5 },
  // Quiz header (shared by vignette + case screens)
  quizHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  headerCaseNum: { fontSize: 15, fontFamily: 'Nunito_800ExtraBold' },
  headerCaseSub: { fontSize: 12, fontFamily: 'Nunito_600SemiBold', marginTop: 1 },
  diffBadge: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 999 },
  diffText: { fontSize: 12, fontFamily: 'Nunito_800ExtraBold', textTransform: 'capitalize' },
  qCount: { fontSize: 12, fontFamily: 'Nunito_600SemiBold', marginTop: 5 },
  timerPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 999, marginTop: 5 },
  timerText: { fontSize: 11, fontFamily: 'Nunito_800ExtraBold', fontVariant: ['tabular-nums'] },
  // Vignette screen
  tag: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 999 },
  tagText: { fontSize: 12, fontFamily: 'Nunito_800ExtraBold' },
  caseTitle: { fontSize: 20, fontFamily: 'Nunito_900Black', lineHeight: 28, letterSpacing: -0.3, marginTop: 12, marginBottom: 14 },
  vignetteCard: { borderRadius: 18, borderWidth: 1, padding: 18, marginBottom: 12 },
  vignetteLabel: { fontSize: 11, fontFamily: 'Nunito_800ExtraBold', letterSpacing: 1, marginBottom: 10 },
  vignetteText: { fontSize: 14, fontFamily: 'Nunito_600SemiBold', lineHeight: 23 },
  qCountNote: { fontSize: 13, fontFamily: 'Nunito_600SemiBold', textAlign: 'center', marginTop: 4 },
  // Case questions screen
  // Ask block (matches MCQ): mascot + speech bubble tight at the top,
  // options below flexGrow to swallow leftover height
  askBlock: { marginBottom: 12 },
  stemRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stemBubble: { flex: 1, borderRadius: 20, borderWidth: 1, padding: 18 },
  tailWrap: { position: 'absolute', left: -10, top: 0, bottom: 0, justifyContent: 'center' },
  bubbleTail: { width: 0, height: 0, borderTopWidth: 9, borderBottomWidth: 9, borderRightWidth: 11, borderTopColor: 'transparent', borderBottomColor: 'transparent' },
  detailsChip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, marginTop: 10, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1 },
  detailsChipText: { fontSize: 13, fontFamily: 'Nunito_800ExtraBold' },
  questionLabel: { fontSize: 11, fontFamily: 'Nunito_800ExtraBold', letterSpacing: 1, marginBottom: 8 },
  stem: { fontSize: 16, fontFamily: 'Nunito_700Bold', lineHeight: 25 },
  // flex:1 fills the Entrance wrapper, which carries flexGrow (gap does spacing)
  option: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1.5, paddingVertical: 16, paddingHorizontal: 14 },
  optKey: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  optKeyText: { fontSize: 13, fontFamily: 'Nunito_800ExtraBold' },
  optText: { fontSize: 14, fontFamily: 'Nunito_600SemiBold', flex: 1, lineHeight: 21 },
  verdictPill: { alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999 },
  verdictText: { fontSize: 13.5, fontFamily: 'Nunito_800ExtraBold' },
  buddyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  speechBubble: { flex: 1, borderRadius: 18, borderTopLeftRadius: 4, padding: 14 },
  explainText: { fontSize: 16, fontFamily: 'Nunito_600SemiBold', lineHeight: 26 },
  // Review bottom sheet (mirrors MCQ — vignette + stem stay visible above)
  sheetScrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.18)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderBottomWidth: 0, paddingHorizontal: 18, paddingTop: 4, maxHeight: '80%' },
  sheetHandleWrap: { alignItems: 'center', paddingVertical: 7 },
  sheetHandle: { width: 42, height: 4.5, borderRadius: 999 },
  sheetHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  sheetMascot: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  whyChip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 18, borderRadius: 999, borderWidth: 1.5 },
  whyChipText: { fontSize: 14, fontFamily: 'Nunito_800ExtraBold' },
  verdictBadge: { paddingVertical: 9, paddingHorizontal: 18, borderRadius: 999, marginBottom: 16 },
  answerRow: { borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 2 },
  answerLabel: { fontSize: 10, fontFamily: 'Nunito_800ExtraBold', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 3 },
  answerText: { fontSize: 14, fontFamily: 'Nunito_700Bold', lineHeight: 20 },
  distractorBox: { marginTop: 14, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth * 2 },
  nextBtn: { marginTop: 18, width: '100%', maxWidth: 340, padding: 16, borderRadius: 999, alignItems: 'center' },
  nextBtnText: { fontSize: 16, fontFamily: 'Nunito_800ExtraBold' },
  // Shared bottom bar
  // In normal flow (matches MCQ): follows content on short questions,
  // sits at the screen edge when content fills the viewport.
  bottomBar: { borderTopWidth: 1, paddingTop: 12, paddingHorizontal: 16 },
  ctaBtn: { width: '100%', padding: 16, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  ctaBtnText: { fontSize: 16, fontFamily: 'Nunito_800ExtraBold' },
  // Results
  resultScroll: { paddingHorizontal: 22, alignItems: 'center' },
  resultMascot: { marginBottom: 16 },
  resultTitle: { fontSize: 26, fontFamily: 'Nunito_900Black', letterSpacing: -0.3, marginBottom: 4 },
  resultSubText: { fontSize: 15, fontFamily: 'Nunito_600SemiBold', marginBottom: 10 },
  resultPct: { fontSize: 64, fontFamily: 'Nunito_900Black', letterSpacing: -3, marginBottom: 20 },
  statGrid: { flexDirection: 'row', gap: 10, width: '100%', marginBottom: 26 },
  statTile: { flex: 1, borderRadius: 18, borderWidth: 1, padding: 16, alignItems: 'center' },
  statVal: { fontSize: 22, fontFamily: 'Nunito_900Black', letterSpacing: -0.5 },
  statLabel: { fontSize: 12, fontFamily: 'Nunito_600SemiBold', marginTop: 3 },
  resultActions: { width: '100%', gap: 10 },
  resultBtn: { padding: 16, borderRadius: 999, alignItems: 'center' },
  resultBtnText: { fontSize: 15, fontFamily: 'Nunito_800ExtraBold' },
})
