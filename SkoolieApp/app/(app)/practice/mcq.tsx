import { useEffect, useRef, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, Pressable, StyleSheet,
  ActivityIndicator, Alert, Animated, PanResponder, LayoutAnimation,
  Platform, UIManager
} from 'react-native'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}
import Svg, { Path, Polygon, Rect, Line } from 'react-native-svg'
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
import { CappyHead } from '@/components/mascots/CappyHead'
import { MascotAnimator } from '@/components/mascots/MascotAnimator'
import { TopBar } from '@/components/ui/TopBar'
import { SkeletonList } from '@/components/ui/Skeleton'
import { FilterBanner } from '@/components/ui/FilterBanner'
import { topicColor } from '@/constants/topics'
import type { Question, TopicRow } from '@/types'
import { buildShuffledMcq, LETTERS } from '@/lib/answers'
import { computeStreakUpdate } from '@/lib/streak'
import { useFilters } from '@/contexts/FiltersContext'
import { useCollapsePracticeStack } from '@/hooks/usePracticeStack'
import { MCQ_QUESTION_SEC, URGENT_AT_SEC } from '@/lib/timing'
import { orderByInterestAndUnseen } from '@/lib/interests'
import { playSound } from '@/lib/sounds'
import { haptic } from '@/lib/haptics'
import { trySave } from '@/lib/reliably'
import { IntroGate } from '@/components/ui/IntroGate'
import { showToast } from '@/lib/toast'

type Screen = 'topics' | 'quiz' | 'results'
type Phase = 'question' | 'review'
type Filter = { cognitiveType: string; highYield: boolean; difficulty: string; sessionSize: number }
type QuizSource =
  | { type: 'topic'; topic: string; category?: string; subtopic?: string }
  | { type: 'surprise' }
  | { type: 'ids'; ids: string[] }

const CAT_ORDER = ['Anatomy & Physiology', 'Pharmacology', 'Pathophysiology', 'Clinicals']

const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5)
/** Orders a pool so unseen questions come first; seen ones backfill so the session still fills. */
function orderByUnseen(pool: Question[], seen: Set<string>): Question[] {
  if (seen.size === 0) return shuffle(pool)
  return [...shuffle(pool.filter(q => !seen.has(q.id))), ...shuffle(pool.filter(q => seen.has(q.id)))]
}

export default function MCQScreen() {
  useCollapsePracticeStack()
  const C = useTheme()
  const insets = useSafeAreaInsets()
  const { user, profile } = useAuth()
  const { questionIds, smartStart, sessionKey, from, startTopic } = useLocalSearchParams<{ questionIds?: string; smartStart?: string; sessionKey?: string; from?: string; startTopic?: string }>()
  const navigation = useNavigation<any>()
  // Back returns to wherever the mode was launched from. When launched from the
  // dashboard, also reset the Practice tab to its hub so this mode isn't left
  // "resting" on the Practice tab afterwards.
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
    } else {
      router.navigate('/(app)/practice' as any)
    }
  }

  // Single-question flows (bookmark- or search-opened) return to where they came from
  // AND clear the Practice tab's stack so tapping Practice later doesn't resurface the question.
  const backToBookmarks = () => {
    if (from === 'search') router.navigate('/(app)/search' as any)
    else if (from === 'history') router.navigate('/(app)/history' as any)
    else router.navigate({ pathname: '/(app)/bookmarks', params: { from } } as any)
    setTimeout(() => navigation.reset({ index: 0, routes: [{ name: 'index' as never }] }), 0)
  }
  // Re-shuffles option order each app session while staying stable across
  // renders (buildShuffledMcq is recomputed every render, so the seed must not
  // change mid-quiz). Without this, a repeated question kept the SAME order forever.
  const shuffleSalt = useRef(Math.random().toString(36).slice(2)).current
  const autoStarted = useRef(false)
  const prevSessionKeyRef = useRef<string | undefined>(undefined)
  const sessionSavedRef = useRef(false)   // prevents double-save; reset on every new quiz start
  const isRetakeRef = useRef(false)       // "Retake this quiz" run: saves session + XP, but NOT streak
  const isReviewWrongRef = useRef(false)  // "Review wrong answers" run: practice only — no session, XP, or streak

  // If launched with questionIds (from bookmarks), start straight on the quiz spinner — no topics flash
  const [screen, setScreen] = useState<Screen>(questionIds ? 'quiz' : 'topics')
  const [topicRows, setTopicRows] = useState<TopicRow[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [originalQuestions, setOriginalQuestions] = useState<Question[]>([])
  const [loadingTopics, setLoadingTopics] = useState(true)
  const [loadingQ, setLoadingQ] = useState(!!questionIds)
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null)
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const { mcqFilter: filter, setMcqFilter: setFilter } = useFilters()
  // Per-topic coverage (distinct questions answered) + seen set for the in-quiz tag
  const [answeredByTopic, setAnsweredByTopic] = useState<Record<string, number>>({})
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set())

  // Focused session — hide app chrome (tab bar) while a run is active
  useFocusSessionWhile(screen === 'quiz')

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

  // Quiz state
  const [qIndex, setQIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('question')
  const [overlayVisible, setOverlayVisible] = useState(false)
  const [score, setScore] = useState(0)
  const [wrongQuestions, setWrongQuestions] = useState<Question[]>([])
  const [quizSource, setQuizSource] = useState<QuizSource | null>(null)
  // Snapshot of the last submitted answer — keeps overlay stable while state changes
  const [reviewSnap, setReviewSnap] = useState<{ question: Question; selected: string; isCorrect: boolean; timedOut?: boolean } | null>(null)
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set())

  // ── Timed mode ────────────────────────────────────────────────────────────
  // Preference lives on the profile — set from the TopBar clock button,
  // the Practice-hub banner, or Profile settings (TimedModeSheet).
  const timedOn = profile?.timed_mode ?? false
  const timedSecs = profile?.timed_seconds ?? MCQ_QUESTION_SEC

  // Per-question countdown — runs only while a timed question is on screen.
  // Timeout fires through a ref so the interval never captures stale state.
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const handleTimeoutRef = useRef<() => void>(() => {})
  useEffect(() => {
    if (screen !== 'quiz' || !timedOn || phase !== 'question' || questions.length === 0) {
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
        if (t - 1 === URGENT_AT_SEC) haptic('tick')   // physical nudge as the pill turns red
        return t - 1
      })
    }, 1000)
    return () => clearInterval(iv)
  }, [screen, timedOn, timedSecs, phase, qIndex, questions.length])

  // ── Animations ────────────────────────────────────────────────────────────
  const fadeAnim = useRef(new Animated.Value(1)).current
  // Review sheet slides up from the bottom each time it (re)opens.
  const sheetAnim = useRef(new Animated.Value(0)).current
  useEffect(() => {
    if (phase === 'review' && overlayVisible) {
      sheetAnim.setValue(420)
      Animated.spring(sheetAnim, { toValue: 0, friction: 10, tension: 70, useNativeDriver: true }).start()
    }
  }, [overlayVisible, phase]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const slideAnim = useRef(new Animated.Value(0)).current
  const animStyle = { opacity: fadeAnim, transform: [{ translateY: slideAnim }] as const }

  /** Fade-out → run onSwitch callback → setScreen → fade-in+spring */
  function animateToScreen(newScreen: Screen, onSwitch?: () => void) {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 140, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -10, duration: 140, useNativeDriver: true }),
    ]).start(() => {
      slideAnim.setValue(10)
      onSwitch?.()
      setScreen(newScreen)
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 16, stiffness: 320 }),
      ]).start()
    })
  }

  /** Smooth spring layout animation for accordions */
  function withAccordionAnim(fn: () => void) {
    LayoutAnimation.configureNext({
      duration: 280,
      create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
      update: { type: LayoutAnimation.Types.spring, springDamping: 0.8 },
      delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
    })
    fn()
  }

  /** Smooth easeInOut layout animation for filter chip changes */
  function withFilterAnim(fn: () => void) {
    LayoutAnimation.configureNext({
      duration: 180,
      update: { type: LayoutAnimation.Types.easeInEaseOut },
      create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
      delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
    })
    fn()
  }

  useEffect(() => {
    if (!profile) return

    // Each Practice tap from bookmarks passes a unique sessionKey (Date.now()).
    // When it changes, the MCQ screen may be a cached instance still showing results —
    // reset everything and restart the quiz fresh.
    if (sessionKey && sessionKey !== prevSessionKeyRef.current) {
      prevSessionKeyRef.current = sessionKey
      autoStarted.current = false
      sessionSavedRef.current = false
      setScreen('quiz')
      setLoadingQ(true)
      setQuestions([])
      setQIndex(0); setScore(0); setWrongQuestions([])
      setSelected(null); setPhase('question'); setOverlayVisible(false); setReviewSnap(null)
    }

    // One-shot auto-start (smartStart / bookmarks IDs) — run alongside loadTopics
    // so topics are ready if the user exits back to the topic screen
    if (!autoStarted.current) {
      if (questionIds) {
        autoStarted.current = true
        let ids: string[] = []
        try { ids = JSON.parse(questionIds as string) } catch { ids = [] }
        loadQuestionsByIds(ids)
      } else if (startTopic) {
        autoStarted.current = true
        setExpandedTopic(startTopic)   // land on the topic list with this topic open (don't auto-start)
      } else if (smartStart === '1') {
        autoStarted.current = true
        surpriseMe()
      }
    }
    loadTopics()
  }, [filter, profile, sessionKey])

  // The "you finished" fanfare — same sound at every results screen, win or lose.
  useEffect(() => { if (screen === 'results') playSound('complete') }, [screen])

  // Save session exactly once when the results screen is first shown.
  // Fired by screen state change — NOT by handleNext — so a session is only
  // counted when the user has genuinely seen their results.
  useEffect(() => {
    if (screen !== 'results' || sessionSavedRef.current || !user || !profile || questions.length === 0) return
    // Bookmark-review sessions are practice only — they must not count toward streak/XP/sessions.
    if (quizSource?.type === 'ids') return
    // "Review wrong answers" re-drills are practice only — no session, XP, or streak.
    if (isReviewWrongRef.current) return
    sessionSavedRef.current = true
    // "Retake this quiz" saves the session + XP, but must NOT advance the streak (already credited on the first completion).
    const isRetake  = isRetakeRef.current
    // Mirror of the server formula (credit_xp): base = score/total x 50, +10% timed.
    // Kept for the session record; the authoritative award happens server-side.
    const base      = Math.round((score / questions.length) * 50)
    const xp        = timedOn ? Math.round(base * 1.1) : base
    const saveScore = score
    const saveQIds  = questions.map(q => q.id)
    const streak    = isRetake ? {} : computeStreakUpdate(profile)
    // Retry-once on every critical write; surface failure instead of silently
    // losing earned progress (audit: write-failure feedback).
    ;(async () => {
      const sessionOk = await trySave(() => supabase.from('quiz_sessions').insert({
        user_id: user.id,
        score: saveScore,
        question_ids: saveQIds,
        xp_earned: xp,
        mode: 'mcq',
        timed: timedOn,
        topic: quizSource?.type === 'topic' ? quizSource.topic : null, // null = Surprise me / random
      }))
      // XP + level + weekly league standing are credited SERVER-SIDE (credit_xp);
      // the profile update carries only the streak.
      const xpOk = await trySave(() => supabase.rpc('credit_xp', { p_kind: 'mcq', p_score: saveScore, p_total: questions.length, p_timed: timedOn }))
      let streakOk = true
      if (Object.keys(streak).length > 0) {
        streakOk = await trySave(() => supabase.from('user_profiles').update({ ...streak }).eq('id', user.id))
      }
      if (!sessionOk || !xpOk || !streakOk) {
        showToast("Couldn't save your progress — check your connection. This session's XP may not have counted.", 'error')
      }
    })()
  }, [screen]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadTopics() {
    if (!profile) return
    setLoadingTopics(true)
    const { data } = await supabase.rpc('get_question_counts', {
      p_profession: profile.profession,
      p_question_type: 'mcq',
      p_access_key: profile.access_key ?? null,
      p_cognitive_type: filter.cognitiveType !== 'all' ? filter.cognitiveType : null,
      p_high_yield: filter.highYield ? true : null,
      p_difficulty: filter.difficulty !== 'all' ? filter.difficulty : null,
    })
    setTopicRows((data ?? []).map((r: any) => ({ topic: r.topic, category: r.category, subtopic: r.subtopic, count: Number(r.cnt) })))
    setLoadingTopics(false)
    // Coverage per topic — history holds one row per distinct question answered
    if (user) {
      const { data: hist } = await supabase.from('user_question_history')
        .select('topic').eq('user_id', user.id).eq('question_type', 'mcq').limit(10000)
      const byTopic: Record<string, number> = {}
      for (const r of (hist ?? []) as any[]) if (r.topic) byTopic[r.topic] = (byTopic[r.topic] ?? 0) + 1
      setAnsweredByTopic(byTopic)
    }
  }

  /** All seen MCQ ids for this user (also powers the in-quiz "answered before" tag). */
  async function fetchSeenMcqIds(): Promise<Set<string>> {
    if (!user) return new Set()
    const { data } = await supabase
      .from('user_question_history')
      .select('question_id')
      .eq('user_id', user.id)
      .eq('question_type', 'mcq')
    const all = new Set((data ?? []).map((r: any) => r.question_id as string))
    setSeenIds(all)
    // Ordering still respects "Repeat questions": when repeats are allowed the
    // pool is not unseen-biased (matches previous behaviour).
    return profile?.allow_repeat_questions ? new Set() : all
  }

  async function startQuiz(topic: string, category?: string, subtopic?: string) {
    if (!profile || !user) return
    setQuizSource({ type: 'topic', topic, category, subtopic })
    sessionSavedRef.current = false; isRetakeRef.current = false; isReviewWrongRef.current = false
    setLoadingQ(true)
    // Fetch a large pool (10× session size, min 100) so random sampling gives genuine variety
    const fetchLimit = Math.max(filter.sessionSize * 10, 100)
    const { data } = await supabase.rpc('get_questions_by_topic', {
      p_profession: profile.profession,
      p_question_type: 'mcq',
      p_topic: topic,
      p_category: category ?? null,
      p_subtopic: subtopic ?? null,
      p_difficulty: filter.difficulty !== 'all' ? filter.difficulty : null,
      p_cognitive_type: filter.cognitiveType !== 'all' ? filter.cognitiveType : null,
      p_high_yield: filter.highYield ? true : null,
      p_access_key: profile.access_key ?? null,
      p_limit: fetchLimit,
    })
    if (!data || data.length === 0) {
      setLoadingQ(false)
      Alert.alert('No questions', 'No questions found for these filters.')
      return
    }
    const seen = await fetchSeenMcqIds()
    const shuffled = orderByUnseen(data, seen).slice(0, filter.sessionSize)
    setLoadingQ(false)
    animateToScreen('quiz', () => {
      setQuestions(shuffled); setOriginalQuestions(shuffled)
      setQIndex(0); setSelected(null); setPhase('question'); setOverlayVisible(false)
      setScore(0); setWrongQuestions([])
    })
    // Bookmarks load concurrently with animation
    const { data: bk } = await supabase.from('bookmarks').select('question_id').eq('user_id', user.id)
    setBookmarked(new Set((bk ?? []).map((b: any) => b.question_id)))
  }

  function handleSubmit() {
    if (!selected) return
    const q = questions[qIndex]
    const correct = selected === buildShuffledMcq(q.options, q.correct_answer, q.id + shuffleSalt).correctLetter
    playSound(correct ? 'correct' : 'wrong')
    // Record the attempt server-side (increments times_seen/times_correct;
    // powers "Allow repeat questions", topic progress, and the seen tag).
    if (user) {
      supabase.rpc('record_answer', {
        p_question_id: q.id, p_question_type: 'mcq',
        p_topic: q.topic, p_category: q.category, p_subtopic: q.subtopic,
        p_difficulty: q.difficulty ?? 'medium', p_correct: correct,
      }).then(() => {})
    }
    // Snapshot now — overlay renders from this, never from live state
    setReviewSnap({ question: q, selected, isCorrect: correct })
    if (correct) {
      setScore(s => s + 1)
    } else {
      setWrongQuestions(wq => [...wq, q])
    }
    setPhase('review')
    setOverlayVisible(true)
  }

  /** Timed-mode timeout: counts as wrong, opens the same review overlay. */
  handleTimeoutRef.current = () => {
    const q = questions[qIndex]
    if (!q || phase !== 'question') return
    if (user) {
      supabase.rpc('record_answer', {
        p_question_id: q.id, p_question_type: 'mcq',
        p_topic: q.topic, p_category: q.category, p_subtopic: q.subtopic,
        p_difficulty: q.difficulty ?? 'medium', p_correct: false,
      }).then(() => {})
    }
    playSound('wrong')
    setReviewSnap({ question: q, selected: '', isCorrect: false, timedOut: true })
    setWrongQuestions(wq => [...wq, q])
    setPhase('review')
    setOverlayVisible(true)
  }

  /** Confirm before abandoning an active session — progress isn't saved until
   *  the results screen, so an accidental tap on X would silently lose it. */
  function confirmAbandon(onExit: () => void) {
    const hasProgress = qIndex > 0 || selected !== null || phase === 'review' || score > 0
    if (!hasProgress) { onExit(); return }
    Alert.alert(
      'Leave this session?',
      `You've answered ${score + wrongQuestions.length} of ${questions.length} questions. Progress is only saved when you finish — leaving now loses it.`,
      [
        { text: 'Continue quiz', style: 'cancel' },
        { text: 'Exit session', style: 'destructive', onPress: onExit },
      ],
    )
  }

  function handleNext() {
    // Clear ALL overlay state immediately — prevents any flash between questions
    setPhase('question')
    setSelected(null)
    setOverlayVisible(false)
    if (qIndex + 1 >= questions.length) {
      // Session is saved by the useEffect that fires when screen becomes 'results'
      animateToScreen('results')
    } else {
      setQIndex(i => i + 1)
    }
  }

  async function toggleBookmark(qId: string) {
    if (!user) return
    if (bookmarked.has(qId)) {
      await supabase.from('bookmarks').delete().eq('user_id', user.id).eq('question_id', qId)
      setBookmarked(b => { const s = new Set(b); s.delete(qId); return s })
    } else {
      await supabase.from('bookmarks').insert({ user_id: user.id, question_id: qId })
      setBookmarked(b => new Set(b).add(qId))
    }
  }

  async function surpriseMe() {
    if (!profile || !user) return
    setQuizSource({ type: 'surprise' })
    sessionSavedRef.current = false; isRetakeRef.current = false; isReviewWrongRef.current = false
    setLoadingQ(true)
    const { data } = await supabase.rpc('get_random_mcqs', {
      p_profession: profile.profession,
      p_limit: Math.max(filter.sessionSize * 4, 40),
      p_difficulty: filter.difficulty !== 'all' ? filter.difficulty : null,
      p_access_key: profile.access_key ?? null,
      // Surprise me respects the set filters (random across topics); no filters = fully random.
      p_cognitive_type: filter.cognitiveType !== 'all' ? filter.cognitiveType : null,
      p_high_yield: filter.highYield ? true : null,
    })
    if (!data || data.length === 0) { setLoadingQ(false); Alert.alert('No questions', 'No questions found for these filters.'); return }
    const seen = await fetchSeenMcqIds()
    // Areas of interest bias the surprise pool (unseen-interest first); empty = decide for me
    const shuffled = orderByInterestAndUnseen(data as any[], profile.interests, seen).slice(0, filter.sessionSize)
    setLoadingQ(false)
    animateToScreen('quiz', () => {
      setQuestions(shuffled); setOriginalQuestions(shuffled)
      setQIndex(0); setSelected(null); setPhase('question'); setOverlayVisible(false); setScore(0); setWrongQuestions([])
    })
    const { data: bk } = await supabase.from('bookmarks').select('question_id').eq('user_id', user.id)
    setBookmarked(new Set((bk ?? []).map((b: any) => b.question_id)))
  }

  async function loadQuestionsByIds(ids: string[]) {
    if (!profile || !user) return
    setQuizSource({ type: 'ids', ids })
    sessionSavedRef.current = false; isRetakeRef.current = false; isReviewWrongRef.current = false
    setLoadingQ(true)
    const { data } = await supabase.rpc('get_questions_by_ids', { p_ids: ids, p_limit: 200 })
    if (!data || data.length === 0) { setLoadingQ(false); Alert.alert('No questions', 'Could not load bookmarked questions.'); return }
    const shuffled = [...data].sort(() => Math.random() - 0.5)
    setLoadingQ(false)
    animateToScreen('quiz', () => {
      setQuestions(shuffled); setOriginalQuestions(shuffled)
      setQIndex(0); setSelected(null); setPhase('question'); setOverlayVisible(false); setScore(0); setWrongQuestions([])
    })
    const { data: bk } = await supabase.from('bookmarks').select('question_id').eq('user_id', user.id)
    setBookmarked(new Set((bk ?? []).map((b: any) => b.question_id)))
  }

  function handleRetake() {
    sessionSavedRef.current = false; isRetakeRef.current = true; isReviewWrongRef.current = false
    const reshuffled = [...(originalQuestions.length ? originalQuestions : questions)].sort(() => Math.random() - 0.5)
    animateToScreen('quiz', () => {
      setQuestions(reshuffled)
      setQIndex(0); setSelected(null); setPhase('question'); setOverlayVisible(false); setScore(0); setWrongQuestions([])
    })
  }

  function handleReviewWrong() {
    sessionSavedRef.current = false; isReviewWrongRef.current = true; isRetakeRef.current = false
    const toReview = [...wrongQuestions].sort(() => Math.random() - 0.5)
    animateToScreen('quiz', () => {
      setQuestions(toReview)
      setQIndex(0); setSelected(null); setPhase('question'); setOverlayVisible(false); setScore(0); setWrongQuestions([])
    })
  }

  function handleNewQuestions() {
    if (!quizSource) { animateToScreen('topics'); return }
    if (quizSource.type === 'surprise') {
      surpriseMe()
    } else if (quizSource.type === 'topic') {
      startQuiz(quizSource.topic, quizSource.category, quizSource.subtopic)
    } else {
      // Came from bookmarks — return there.
      backToBookmarks()
    }
  }

  // ── Topic selector ──────────────────────────────────────────────────────
  if (screen === 'topics') {
    const grouped = topicRows.reduce((acc: Record<string, TopicRow[]>, r) => {
      if (!r.topic) return acc  // skip blank topic rows
      if (!acc[r.topic]) acc[r.topic] = []
      acc[r.topic].push(r)
      return acc
    }, {})
    const totalQuestions = topicRows.reduce((s, r) => s + r.count, 0)

    const DIFFICULTIES: { id: string; label: string; activeBg: string; activeFg: string }[] = [
      { id: 'all',    label: 'All levels', activeBg: C.text,    activeFg: C.bg },
      { id: 'easy',   label: 'Easy',       activeBg: C.green,   activeFg: C.onTeal },
      { id: 'medium', label: 'Medium',     activeBg: C.amber,   activeFg: C.onTeal },
      { id: 'hard',   label: 'Hard',       activeBg: C.red,     activeFg: C.onTeal },
    ]
    const SESSION_SIZES = [5, 10, 20, 40]
    const COGNITIVE: { id: string; label: string; activeBg: string; activeFg: string }[] = [
      { id: 'all',            label: 'All',       activeBg: C.text,    activeFg: C.bg },
      { id: 'recall',         label: 'Recall',    activeBg: '#2563EB', activeFg: '#fff' },
      { id: 'mechanism',      label: 'Mechanism', activeBg: '#7C3AED', activeFg: '#fff' },
      { id: 'application',    label: 'Apply',     activeBg: '#D97706', activeFg: '#fff' },
      { id: 'calculation',    label: 'Calculate', activeBg: C.teal,    activeFg: C.onTeal },
      { id: 'interpretation', label: 'Interpret', activeBg: '#059669', activeFg: '#fff' },
    ]

    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <TopBar title="Practice" />
        <Animated.View style={[{ flex: 1 }, animStyle]}>
        {/* Sub-header */}
        <View style={[s.header, { paddingTop: 14, backgroundColor: C.surface, borderBottomColor: C.border }]}>
          <TouchableOpacity onPress={() => questionIds ? backToBookmarks() : goBack()} style={[s.iconBtn, { backgroundColor: C.surface2, borderColor: C.border }]}>
            <Ionicons name="arrow-back" size={20} color={C.textSoft} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[s.headerTitle, { color: C.text }]}>MCQ Practice</Text>
            <Text style={[s.headerSub, { color: C.textFaint }]}>{totalQuestions.toLocaleString()} questions available</Text>
          </View>
        </View>

        {/* Pinned: active filters survive across visits — keep them visible with one-tap clear */}
        <FilterBanner kind="mcq" />
        <ScrollView ref={topicsScrollRef} contentContainerStyle={{ paddingBottom: 32, width: '100%', maxWidth: MAX_CONTENT, alignSelf: 'center' }} showsVerticalScrollIndicator={false}>
          {/* Filters — collapsed to one summary row by default so the topic
              list starts above the fold; tap to expand the full controls. */}
          <View style={[s.filterSection, { backgroundColor: C.surface, borderBottomColor: C.border, paddingTop: 0, paddingBottom: filtersOpen ? 18 : 0 }]}>
            <TouchableOpacity
              onPress={() => withAccordionAnim(() => setFiltersOpen(o => !o))}
              style={[s.filterToggle, { backgroundColor: C.tealTint, borderColor: C.teal }]}
              accessibilityRole="button"
              accessibilityState={{ expanded: filtersOpen }}
              accessibilityLabel="Session filters"
            >
              <View style={[s.filterToggleIcon, { backgroundColor: C.teal }]}>
              <Ionicons name="options" size={15} color={C.onTeal} />
            </View>
              <Text style={[s.filterToggleTitle, { color: C.teal }]}>Filters</Text>
              <Text style={[s.filterToggleSummary, { color: C.textFaint }]} numberOfLines={1}>
                {filter.difficulty === 'all' ? 'All levels' : filter.difficulty.charAt(0).toUpperCase() + filter.difficulty.slice(1)} · {filter.sessionSize} Qs · {filter.cognitiveType === 'all' ? 'All types' : filter.cognitiveType.charAt(0).toUpperCase() + filter.cognitiveType.slice(1)}{filter.highYield ? ' · ⭐' : ''}
              </Text>
              <Ionicons name={filtersOpen ? 'chevron-up' : 'chevron-down'} size={17} color={C.teal} />
            </TouchableOpacity>
            {filtersOpen && (<Entrance dy={-8}>
            {/* DIFFICULTY */}
            <Text style={[s.filterLabel, { color: C.textFaint }]}>DIFFICULTY</Text>
            <View style={s.chipRow}>
              {DIFFICULTIES.map(d => {
                const active = filter.difficulty === d.id
                return (
                  <TouchableOpacity key={d.id} onPress={() => withFilterAnim(() => setFilter(f => ({ ...f, difficulty: d.id })))}
                    style={[s.chip, { backgroundColor: active ? d.activeBg : C.surface2, borderColor: active ? d.activeBg : C.border }]}>
                    <Text style={[s.chipText, { color: active ? d.activeFg : C.textSoft }]}>{d.label}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            {/* SESSION SIZE */}
            <Text style={[s.filterLabel, { color: C.textFaint, marginTop: 14 }]}>SESSION SIZE</Text>
            <View style={s.chipRow}>
              {SESSION_SIZES.map(n => {
                const active = filter.sessionSize === n
                const disabled = totalQuestions > 0 && n > totalQuestions
                return (
                  <TouchableOpacity key={n} disabled={disabled} onPress={() => withFilterAnim(() => setFilter(f => ({ ...f, sessionSize: n })))}
                    style={[s.chip, { backgroundColor: active ? C.teal : C.surface2, borderColor: active ? C.teal : C.border, opacity: disabled ? 0.4 : 1 }]}>
                    <Text style={[s.chipText, { color: active ? C.onTeal : C.textSoft }]}>{n}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            {/* QUESTION TYPE */}
            <Text style={[s.filterLabel, { color: C.textFaint, marginTop: 14 }]}>QUESTION TYPE</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={[s.chipRow, { flexWrap: 'nowrap' }]}>
                {COGNITIVE.map(c => {
                  const active = filter.cognitiveType === c.id
                  return (
                    <TouchableOpacity key={c.id} onPress={() => withFilterAnim(() => setFilter(f => ({ ...f, cognitiveType: c.id })))}
                      style={[s.chip, { backgroundColor: active ? c.activeBg : C.surface2, borderColor: active ? c.activeBg : C.border }]}>
                      <Text style={[s.chipText, { color: active ? c.activeFg : C.textSoft }]}>{c.label}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </ScrollView>

            {/* FOCUS */}
            <Text style={[s.filterLabel, { color: C.textFaint, marginTop: 14 }]}>FOCUS</Text>
            <View style={s.chipRow}>
              <TouchableOpacity
                onPress={() => withFilterAnim(() => setFilter(f => ({ ...f, highYield: !f.highYield })))}
                style={[s.chip, s.chipIcon, { backgroundColor: filter.highYield ? '#F59E0B' : C.surface2, borderColor: filter.highYield ? '#F59E0B' : C.border }]}>
                <Svg width={14} height={14} viewBox="0 0 24 24" fill={filter.highYield ? '#fff' : 'none'} stroke={filter.highYield ? '#fff' : C.textSoft} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <Polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </Svg>
                <Text style={[s.chipText, { color: filter.highYield ? '#fff' : C.textSoft }]}>High Yield</Text>
              </TouchableOpacity>
              {/* (dead "All Years" chip removed — MCQ filters have no allYears
                  mechanic; the working version lives in flashcards, gated by
                  study_year) */}
            </View>
            </Entrance>)}
          </View>

          {/* Surprise me banner */}
          <TouchableOpacity
            onPress={surpriseMe}
            activeOpacity={0.85}
            style={[s.surpriseBanner, { backgroundColor: C.teal, marginHorizontal: 16, marginTop: 16, marginBottom: 4 }]}
          >
            <Text style={[s.surpriseLeft, { color: C.onTeal }]}>🎲 Surprise me</Text>
            <Text style={[s.surpriseRight, { color: C.onTeal }]}>Random {filter.sessionSize} questions →</Text>
          </TouchableOpacity>

          {/* Topic list */}
          <Text style={[s.sectionLabel, { color: C.textFaint, marginHorizontal: 16, marginTop: 18, marginBottom: 10 }]}>CHOOSE A TOPIC</Text>

          {loadingTopics ? (
            <SkeletonList rows={7} style={{ marginHorizontal: 16, marginTop: 4 }} />
          ) : (
            Object.entries(grouped).map(([topic, rows]) => {
              const topicTotal = rows.reduce((sum, r) => sum + r.count, 0)
              const isExpanded = expandedTopic === topic
              const { color: iconColor, bgLight: iconBg } = topicColor(topic)

              // Build category → subtopics map
              const catMap = new Map<string, { total: number; subtopics: { name: string; count: number }[] }>()
              for (const r of rows) {
                const catKey = r.category ?? 'General'
                if (!catMap.has(catKey)) catMap.set(catKey, { total: 0, subtopics: [] })
                const entry = catMap.get(catKey)!
                entry.total += r.count
                if (r.subtopic) entry.subtopics.push({ name: r.subtopic, count: r.count })
              }
              const sortedCats = Array.from(catMap.entries()).sort(([a], [b]) => {
                const ai = CAT_ORDER.indexOf(a); const bi = CAT_ORDER.indexOf(b)
                return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
              })

              return (
                <View key={topic} onLayout={e => scrollToStartTopic(topic, e.nativeEvent.layout.y)} style={[s.topicCard, { backgroundColor: C.surface, borderColor: C.border, ...C.shadow, marginHorizontal: 16, marginBottom: 8 }]}>
                  {/* Topic row */}
                  <View style={s.topicRowInner}>
                    <View style={[s.topicIcon, { backgroundColor: iconBg }]}>
                      <TopicIcon topic={topic} size={20} color={iconColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.topicName, { color: C.text }]}>{topic}</Text>
                      <Text style={[s.topicMeta, { color: C.textFaint }]}>
                        {topicTotal.toLocaleString()} questions · {sortedCats.length} {sortedCats.length === 1 ? 'category' : 'categories'}
                      </Text>
                      {(() => {
                        const done = Math.min(answeredByTopic[topic] ?? 0, topicTotal)
                        if (done === 0) return null
                        return (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 }}>
                            <ProgressBar progress={done / Math.max(topicTotal, 1)} height={4} color={C.green} style={{ flex: 1 }} />
                            <Text style={{ fontSize: 10.5, fontFamily: 'Nunito_700Bold', color: C.textFaint }}>{done}/{topicTotal}</Text>
                          </View>
                        )
                      })()}
                    </View>
                    <TouchableOpacity onPress={() => startQuiz(topic)} activeOpacity={0.75}
                      style={[s.startBtn, { backgroundColor: C.tealTint, borderColor: C.teal }]}>
                      <Text style={[s.startBtnText, { color: C.teal }]}>{topicTotal < filter.sessionSize ? `Start ${topicTotal} →` : 'Start →'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => withAccordionAnim(() => { setExpandedTopic(isExpanded ? null : topic); setExpandedCategory(null) })} style={s.chevronBtn}>
                      <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={C.textFaint} />
                    </TouchableOpacity>
                  </View>

                  {/* Category rows */}
                  {isExpanded && (
                    <View style={{ borderTopWidth: 1, borderTopColor: C.border }}>
                      {sortedCats.map(([catName, catData], ci) => {
                        const ck = `${topic}::${catName}`
                        const isCatExpanded = expandedCategory === ck
                        const hasSubtopics = catData.subtopics.length > 0
                        return (
                          <View key={catName} style={{ borderBottomWidth: ci < sortedCats.length - 1 ? 1 : 0, borderBottomColor: C.border }}>
                            <View style={[s.catRow, { backgroundColor: C.surface2 }]}>
                              <View style={{ flex: 1 }}>
                                <Text style={[s.catName, { color: C.text }]}>{catName}</Text>
                                <Text style={[s.catCount, { color: C.textFaint }]}>{catData.total.toLocaleString()} questions</Text>
                              </View>
                              <TouchableOpacity
                                onPress={() => startQuiz(topic, catName !== 'General' ? catName : undefined)}
                                style={[s.catStartBtn, { borderColor: C.border, backgroundColor: C.surface }]}>
                                <Text style={[s.startBtnText, { color: C.teal }]}>{catData.total < filter.sessionSize ? `Start ${catData.total} →` : 'Start →'}</Text>
                              </TouchableOpacity>
                              {hasSubtopics && (
                                <TouchableOpacity onPress={() => withAccordionAnim(() => setExpandedCategory(isCatExpanded ? null : ck))} style={s.chevronBtn}>
                                  <Ionicons name={isCatExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={C.textFaint} />
                                </TouchableOpacity>
                              )}
                            </View>
                            {isCatExpanded && catData.subtopics.sort((a, b) => b.count - a.count).map((sub) => (
                              <TouchableOpacity key={sub.name}
                                onPress={() => startQuiz(topic, catName !== 'General' ? catName : undefined, sub.name)}
                                style={[s.subtopicRow, { backgroundColor: C.surface, borderTopColor: C.border, borderTopWidth: 1 }]}>
                                <Text style={[s.subtopicName, { color: C.textSoft }]}>{sub.name}</Text>
                                <Text style={[s.subtopicCount, { color: C.textFaint }]}>{sub.count}q</Text>
                                <Text style={[s.startBtnText, { color: C.teal }]}>→</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )
                      })}
                    </View>
                  )}
                </View>
              )
            })
          )}
        </ScrollView>

        {loadingQ && (
          <View style={[s.loadingOverlay, { backgroundColor: C.bg + 'cc' }]}>
            <ActivityIndicator size="large" color={C.teal} />
          </View>
        )}
        </Animated.View>
      </View>
    )
  }

  // ── Quiz screen ─────────────────────────────────────────────────────────
  if (screen === 'quiz') {
    const q = questions[qIndex]

    // Questions haven't loaded yet (e.g. launched from bookmarks) — show spinner
    if (!q) {
      return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
          <ActivityIndicator size="large" color={C.teal} style={{ marginTop: insets.top + 80 }} />
        </View>
      )
    }

    const isBookmarked = bookmarked.has(q.id)
    const shuffled = buildShuffledMcq(q.options, q.correct_answer, q.id + shuffleSalt)
    const correctLetter = shuffled.correctLetter
    const reviewShuffle = reviewSnap
      ? buildShuffledMcq(reviewSnap.question.options, reviewSnap.question.correct_answer, reviewSnap.question.id + shuffleSalt)
      : null
    const isCorrect = selected === correctLetter
    const inReview = phase === 'review'

    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <Animated.View style={[{ flex: 1 }, animStyle]}>
        {/* Quiz sub-header — fullscreen focused session: no TopBar, no tab bar.
            The segmented bar replaces both the dead "1 / 10" text and the old
            continuous strip: answered = filled, current = tinted, rest = track. */}
        <View style={[s.quizHeader, { paddingTop: insets.top + 10, backgroundColor: C.surface, borderBottomColor: C.border }]}>
          <TouchableOpacity
            onPress={() => confirmAbandon(() => (questionIds ? backToBookmarks() : smartStart === '1' ? goBack() : animateToScreen('topics')))}
            accessibilityLabel="Exit quiz" accessibilityRole="button" hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
            style={[s.iconBtn, { backgroundColor: C.surface2, borderColor: C.border }]}>
            <Ionicons name="close" size={20} color={C.textSoft} />
          </TouchableOpacity>
          <View style={s.progressCluster} accessible accessibilityLabel={`Question ${qIndex + 1} of ${questions.length}`}>
            {questions.length <= 25 ? (
              <View style={s.segRow}>
                {questions.map((_, i) => {
                  const done = i < qIndex || (i === qIndex && inReview)
                  const curr = i === qIndex && !inReview
                  return (
                    <View key={i} style={[s.seg, { backgroundColor: done || curr ? C.teal : C.surface3, opacity: curr ? 0.35 : 1 }]} />
                  )
                })}
              </View>
            ) : (
              <View style={[s.segRow, { backgroundColor: C.surface3, borderRadius: 3, overflow: 'hidden' }]}>
                <View style={{ width: `${Math.round(((qIndex + (inReview ? 1 : 0)) / questions.length) * 100)}%`, height: '100%', backgroundColor: C.teal }} />
              </View>
            )}
            <Text style={[s.qCounter, { color: C.textSoft }]}>{qIndex + 1}/{questions.length}</Text>
            {timedOn && timeLeft != null && (
              <View style={[s.timerPill, { backgroundColor: timeLeft <= URGENT_AT_SEC ? C.redTint : C.tealTint }]}>
                <Ionicons name="timer-outline" size={13} color={timeLeft <= URGENT_AT_SEC ? C.red : C.teal} />
                <Text style={[s.timerText, { color: timeLeft <= URGENT_AT_SEC ? C.red : C.teal }]}>{timeLeft}s</Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={() => toggleBookmark(q.id)} accessibilityLabel={isBookmarked ? 'Remove bookmark' : 'Bookmark this question'} accessibilityRole="button" hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }} style={[s.iconBtn, { backgroundColor: C.surface2, borderColor: C.border }]}>
            <Ionicons name={isBookmarked ? 'bookmark' : 'bookmark-outline'} size={20} color={isBookmarked ? C.teal : C.textFaint} />
          </TouchableOpacity>
        </View>

        {/* flexGrow:1 on the content + flexGrow on the stem card: on tall
            screens the question card absorbs the slack, pulling options and
            the action bar down toward the thumb — no dead space at the
            bottom. Long content simply scrolls as before. */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={[s.quizScroll, { flexGrow: 1, paddingBottom: 8, width: '100%', maxWidth: MAX_CONTENT, alignSelf: 'center' }]} showsVerticalScrollIndicator={false}>
          {/* Ask block: badges + Cappy + bubble travel together, centered in
              the vertical slack. Keyed by question so each new question
              rises in fresh. */}
          <Entrance key={`ask-${qIndex}`} style={s.askBlock}>
          {/* Badges — hidden when the user disables "Show question tags" in Profile */}
          {(profile?.show_question_tags ?? true) && (
          <View style={s.badgeRow}>
            {q.topic && (
              <View style={[s.tagChip, { backgroundColor: C.tealTint }]}>
                <Text style={[s.tagText, { color: C.teal }]}>{q.topic}</Text>
              </View>
            )}
            {q.difficulty && (
              // Semantic difficulty (matches flashcards/cases): easy=green, medium=amber, hard=red
              <View style={[s.tagChip, { backgroundColor: q.difficulty === 'easy' ? C.greenTint : q.difficulty === 'hard' ? C.redTint : C.amberTint }]}>
                <Text style={[s.tagText, { color: q.difficulty === 'easy' ? C.green : q.difficulty === 'hard' ? C.red : C.amber }]}>{q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1)}</Text>
              </View>
            )}
            {q.high_yield && (
              <View style={[s.tagChip, { backgroundColor: C.amberTint }]}>
                <Text style={[s.tagText, { color: C.amber }]}>⭐ High yield</Text>
              </View>
            )}
            {seenIds.has(q.id) && (
              <View style={[s.tagChip, { backgroundColor: C.surface3 }]}>
                <Text style={[s.tagText, { color: C.textSoft }]}>↻ Answered before</Text>
              </View>
            )}
          </View>
          )}

          {/* Stem — Cappy asks the question, Duolingo-style: mascot beside a
              speech bubble. The row absorbs the vertical slack so options and
              the CTA stay pulled toward the thumb. */}
          <View style={s.stemRow}>
            <MascotAnimator expr={inReview && reviewSnap ? (reviewSnap.isCorrect ? 'happy' : 'wrong') : 'idle'}>
              <CappyHead expr={inReview && reviewSnap ? (reviewSnap.isCorrect ? 'happy' : 'wrong') : 'idle'} size={110} />
            </MascotAnimator>
            <View style={[s.stemBubble, { backgroundColor: C.surface, borderColor: C.border, ...C.shadow }]}>
              {/* Tail wrapper spans the bubble's full height and centers the
                  triangle, so it always points at Cappy regardless of how
                  tall the question text makes the bubble. */}
              <View style={s.tailWrap} pointerEvents="none">
                <View style={[s.bubbleTail, { borderRightColor: C.surface }]} />
              </View>
              <Text style={[s.stem, { color: C.text }]}>{q.question_text}</Text>
            </View>
          </View>
          </Entrance>

          {/* Options */}
          {shuffled.options.map((text, i) => {
            const letter = LETTERS[i]
            const isSel = selected === letter
            const isAns = letter === correctLetter
            let bg = C.surface
            let border = C.border
            let textColor = C.text
            let chipBg = C.surface3
            let chipText = C.textSoft
            let chipChar = letter

            if (inReview) {
              if (isAns) { bg = C.tealTint; border = C.teal; textColor = C.tealDeep; chipBg = C.teal; chipText = C.onTeal; chipChar = '✓' }
              else if (isSel) { bg = C.redTint; border = C.red; textColor = C.red; chipBg = C.red; chipText = C.onTeal; chipChar = '✗' }
              else { bg = C.surface2; border = C.border }
            } else if (isSel) {
              bg = C.tealTint; border = C.teal; textColor = C.tealDeep; chipBg = C.teal; chipText = C.onTeal
            }

            return (
              // Keyed by question + letter: each new question's options
              // cascade in with a small stagger (Duolingo-style).
              <Entrance key={`${qIndex}-${letter}`} delay={60 + i * 45} style={{ flexGrow: 1, marginBottom: 12 }}>
                <TouchableOpacity
                  onPress={() => { if (!inReview) setSelected(letter) }}
                  activeOpacity={inReview ? 1 : 0.75}
                  accessibilityRole="button"
                  accessibilityLabel={`Option ${letter}: ${text}`}
                  accessibilityState={{ selected: isSel, disabled: inReview }}
                  style={[s.option, { backgroundColor: bg, borderColor: border, opacity: inReview && !isAns && !isSel ? 0.5 : 1 }]}
                >
                  <View style={[s.optChip, { backgroundColor: chipBg }]}>
                    <Text style={[s.optChipText, { color: chipText }]}>{chipChar}</Text>
                  </View>
                  <Text style={[s.optText, { color: textColor }]}>{text}</Text>
                </TouchableOpacity>
              </Entrance>
            )
          })}
        </ScrollView>

        {/* Submit bar — pre-submission */}
        {!inReview && (
          <View style={[s.bottomBar, { borderTopColor: C.border, paddingBottom: insets.bottom + 12, backgroundColor: C.bg }]}>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!selected}
              accessibilityState={{ disabled: !selected }}
              // Disabled state gets a visible border so it reads as a waiting
              // button, not an empty card blending into the background.
              style={[s.submitBtn, selected
                ? { backgroundColor: C.teal }
                : { backgroundColor: C.surface2, borderWidth: 1.5, borderColor: C.border }]}
            >
              <Text style={[s.submitBtnText, { color: selected ? C.onTeal : C.textFaint }]}>
                {selected ? 'Submit answer' : 'Pick an answer'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Next bar — overlay dismissed but still in review */}
        {inReview && !overlayVisible && (
          <View style={[s.bottomBar, { borderTopColor: C.border, paddingBottom: insets.bottom + 12, backgroundColor: C.bg }]}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setOverlayVisible(true)}
                style={[s.whyChip, { borderColor: C.teal, backgroundColor: C.tealTint }]}
                accessibilityRole="button"
                accessibilityLabel="Re-open explanation"
              >
                <Ionicons name="chatbubble-ellipses" size={16} color={C.teal} />
                <Text style={[s.whyChipText, { color: C.teal }]}>Why?</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleNext} style={[s.submitBtn, { backgroundColor: C.teal, flex: 1 }]}>
                <Text style={[s.submitBtnText, { color: C.onTeal }]}>
                  {qIndex + 1 >= questions.length ? 'See results →' : 'Next question →'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        </Animated.View>
        {/* Review sheet — bottom-anchored so the stem stays readable above it
            (audit #8: the old full-screen blur hid the very question being
            explained). Tap the dim area to study the stem; "Why?" reopens. */}
        {inReview && overlayVisible && reviewSnap && (
          <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
            <Pressable style={s.sheetScrim} onPress={() => setOverlayVisible(false)} />
            <Animated.View style={[s.sheet, { backgroundColor: C.surface, borderColor: C.border, paddingBottom: insets.bottom + 10, transform: [{ translateY: sheetAnim }], ...C.shadowLg }]}>
              <View {...sheetDrag.panHandlers}>
              <View style={s.sheetHandleWrap}>
                <View style={[s.sheetHandle, { backgroundColor: C.surface3 }]} />
              </View>

              {/* Header: verdict + collapse — the stem-row Cappy carries the
                  reaction now, so no second mascot in the sheet */}
              <View style={s.sheetHeadRow}>
                <View style={[s.verdictBadge, { backgroundColor: reviewSnap.isCorrect ? C.greenTint : C.redTint, marginBottom: 0 }]}>
                  <Text style={[s.verdictText, { color: reviewSnap.isCorrect ? C.green : C.red }]}>
                    {reviewSnap.isCorrect ? '✓ Correct' : reviewSnap.timedOut ? '⏰ Time’s up' : '✗ Not quite'}
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
                {reviewSnap.isCorrect ? (
                  <View style={[s.answerRow, { borderColor: C.green }]}>
                    <Text style={[s.answerLabel, { color: C.green }]}>YOUR ANSWER</Text>
                    <Text style={[s.answerText, { color: C.text }]}>
                      {reviewSnap.selected}. {reviewShuffle?.options[LETTERS.indexOf(reviewSnap.selected)]}
                    </Text>
                  </View>
                ) : (
                  <View style={[s.answerRow, { borderColor: C.red }]}>
                    <Text style={[s.answerLabel, { color: C.teal }]}>CORRECT ANSWER</Text>
                    <Text style={[s.answerText, { color: C.text }]}>
                      {reviewShuffle?.correctLetter ? `${reviewShuffle.correctLetter}. ` : ''}{reviewShuffle?.options[LETTERS.indexOf(reviewShuffle?.correctLetter ?? '')] ?? reviewSnap.question.correct_answer}
                    </Text>
                  </View>
                )}

                {/* Explanation */}
                <Text style={[s.explainText, { color: C.text, marginTop: 10 }]}>{reviewSnap.question.explanation}</Text>

                {/* Why wrong — skipped on timeout (nothing was chosen) */}
                {!reviewSnap.isCorrect && !reviewSnap.timedOut && (
                  <View style={[s.distractorBox, { borderTopColor: C.red }]}>
                    <Text style={[s.answerLabel, { color: C.red }]}>YOU CHOSE</Text>
                    <Text style={[s.answerText, { color: C.textSoft, marginBottom: 8 }]}>
                      {reviewSnap.selected}. {reviewShuffle?.options[LETTERS.indexOf(reviewSnap.selected)]}
                    </Text>
                    {reviewSnap.question.distractor_explanations?.[reviewShuffle?.displayToOriginalLetter[reviewSnap.selected] ?? reviewSnap.selected] && (
                      <>
                        <Text style={[s.distractorLabel, { color: C.red }]}>WHY {reviewSnap.selected} WAS WRONG</Text>
                        <Text style={[s.distractorText, { color: C.text }]}>{reviewSnap.question.distractor_explanations[reviewShuffle?.displayToOriginalLetter[reviewSnap.selected] ?? reviewSnap.selected]}</Text>
                      </>
                    )}
                  </View>
                )}
              </ScrollView>

              <TouchableOpacity onPress={handleNext} style={[s.nextBtn, { backgroundColor: C.teal, maxWidth: undefined, marginTop: 12 }]}>
                <Text style={[s.nextBtnText, { color: C.onTeal }]}>
                  {qIndex + 1 >= questions.length ? 'See results →' : 'Next question →'}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        )}
      </View>
    )
  }

  // ── Results screen ──────────────────────────────────────────────────────
  const pct = questions.length ? Math.round((score / questions.length) * 100) : 0
  const xpBase = Math.round((score / (questions.length || 1)) * 50)
  const xpEarned = timedOn ? Math.round(xpBase * 1.1) : xpBase
  const missedCount = wrongQuestions.length
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <TopBar title="Practice" />
      <IntroGate introKey="xp" when={true} />
      <Animated.View style={[{ flex: 1 }, animStyle]}>
      <ScrollView
        contentContainerStyle={[s.resultScroll, { paddingTop: 24, paddingBottom: 40, flexGrow: 1, justifyContent: 'center', width: '100%', maxWidth: MAX_CONTENT, alignSelf: 'center' }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.resultMascot}>
          <MascotAnimator expr={pct >= 60 ? 'happy' : 'wrong'}>
            <CappyHead expr={pct >= 60 ? 'happy' : 'wrong'} size={88} />
          </MascotAnimator>
        </View>
        <Text style={[s.resultTitle, { color: C.text }]}>Session complete!</Text>
        <Text style={[s.resultSub, { color: C.textSoft }]}>
          {pct >= 80 ? 'Excellent work!' : pct >= 60 ? 'Good effort — keep going!' : 'Review and try again!'}
        </Text>

        <View style={s.resultGrid}>
          <View style={[s.resultStat, { backgroundColor: C.surface, borderColor: C.border, ...C.shadow }]}>
            <Text style={[s.resultStatVal, { color: C.teal }]}>{score}/{questions.length}</Text>
            <Text style={[s.resultStatLabel, { color: C.textFaint }]}>Correct</Text>
          </View>
          <View style={[s.resultStat, { backgroundColor: C.surface, borderColor: C.border, ...C.shadow }]}>
            <Text style={[s.resultStatVal, { color: C.green }]}>{pct}%</Text>
            <Text style={[s.resultStatLabel, { color: C.textFaint }]}>Accuracy</Text>
          </View>
          <View style={[s.resultStat, { backgroundColor: C.surface, borderColor: C.border, ...C.shadow }]}>
            <Text style={[s.resultStatVal, { color: C.coral }]}>+{xpEarned}</Text>
            <Text style={[s.resultStatLabel, { color: C.textFaint }]}>XP earned</Text>
          </View>
        </View>

        <View style={s.resultActions}>
          {missedCount > 0 && (
            <TouchableOpacity onPress={handleReviewWrong} style={[s.resultBtn, { backgroundColor: C.redTint, borderWidth: 1, borderColor: C.red }]}>
              <Text style={[s.resultBtnText, { color: C.red }]}>Review {missedCount} wrong {missedCount === 1 ? 'answer' : 'answers'} →</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleRetake} style={[s.resultBtn, { backgroundColor: C.surface, borderWidth: 1, borderColor: C.borderStrong }]}>
            <Text style={[s.resultBtnText, { color: C.textSoft }]}>↺  Retake this quiz</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleNewQuestions} style={[s.resultBtn, { backgroundColor: C.teal }]}>
            <Text style={[s.resultBtnText, { color: C.onTeal }]}>New questions →</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(app)/dashboard')} style={[s.resultBtn, { backgroundColor: C.surface, borderWidth: 1, borderColor: C.borderStrong }]}>
            <Text style={[s.resultBtnText, { color: C.textSoft }]}>Dashboard</Text>
          </TouchableOpacity>
          {questionIds && (
            <TouchableOpacity onPress={() => backToBookmarks()} style={{ alignSelf: 'center', marginTop: 6 }}>
              <Text style={[s.resultBtnText, { color: C.textFaint, fontSize: 13 }]}>
                ← Back to {from === 'search' ? 'search' : from === 'history' ? 'Time Capsule' : 'bookmarks'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
      </Animated.View>
    </View>
  )
}

const s = StyleSheet.create({
  // Header
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontFamily: 'Nunito_800ExtraBold' },
  headerSub: { fontSize: 12, fontFamily: 'Nunito_600SemiBold', marginTop: 1 },
  iconBtn: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  // Filter section
  filterSection: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 18, borderBottomWidth: 1 },
  filterToggle: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 12, paddingVertical: 11, paddingHorizontal: 13, borderRadius: 14, borderWidth: 1.5 },
  filterToggleIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  filterToggleTitle: { fontSize: 14.5, fontFamily: 'Nunito_800ExtraBold' },
  filterToggleSummary: { flex: 1, fontSize: 12.5, fontFamily: 'Nunito_600SemiBold', textAlign: 'right' },
  filterLabel: { fontSize: 11, fontFamily: 'Nunito_800ExtraBold', letterSpacing: 0.6, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1.5 },
  chipIcon: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipText: { fontSize: 13, fontFamily: 'Nunito_700Bold' },
  // Surprise me
  surpriseBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 20 },
  surpriseLeft: { fontSize: 15, fontFamily: 'Nunito_800ExtraBold' },
  surpriseRight: { fontSize: 13, fontFamily: 'Nunito_700Bold', opacity: 0.85 },
  // Section label
  sectionLabel: { fontSize: 11, fontFamily: 'Nunito_800ExtraBold', letterSpacing: 0.6 },
  // Topic list
  topicCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  topicRowInner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  topicIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  topicName: { fontSize: 15, fontFamily: 'Nunito_700Bold' },
  topicMeta: { fontSize: 12, fontFamily: 'Nunito_600SemiBold', marginTop: 2 },
  startBtn: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1.5 },
  startBtnText: { fontSize: 13, fontFamily: 'Nunito_800ExtraBold' },
  chevronBtn: { padding: 4 },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: 14 },
  catName: { fontSize: 13, fontFamily: 'Nunito_800ExtraBold' },
  catCount: { fontSize: 11.5, fontFamily: 'Nunito_600SemiBold', marginTop: 1 },
  catStartBtn: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1 },
  subtopicRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingLeft: 48, paddingRight: 14 },
  subtopicName: { fontSize: 13.5, fontFamily: 'Nunito_600SemiBold', flex: 1 },
  subtopicCount: { fontSize: 12, fontFamily: 'Nunito_600SemiBold' },
  countBadge: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: 999 },
  countText: { fontSize: 13, fontFamily: 'Nunito_800ExtraBold' },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  // Quiz header
  quizHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  timerPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 9, borderRadius: 999 },
  timerText: { fontSize: 12, fontFamily: 'Nunito_800ExtraBold', fontVariant: ['tabular-nums'] },
  qCounter: { fontSize: 13, fontFamily: 'Nunito_800ExtraBold', fontVariant: ['tabular-nums'] },
  progressCluster: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 14 },
  segRow: { flex: 1, flexDirection: 'row', gap: 3, height: 6 },
  seg: { flex: 1, height: 6, borderRadius: 3 },
  // Progress bar
  // Quiz body
  quizScroll: { paddingHorizontal: 18, paddingTop: 18 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  tagChip: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 999 },
  tagText: { fontSize: 12, fontFamily: 'Nunito_800ExtraBold' },
  // Ask block stays tight at the top; the option cards below flexGrow to
  // swallow ALL leftover height (Duolingo/Kahoot style) — no dead zones.
  askBlock: { marginBottom: 16 },
  stemRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stemBubble: { flex: 1, borderRadius: 20, borderWidth: 1, padding: 18 },
  // Full-height wrapper vertically centers the tail on the bubble (and Cappy)
  tailWrap: { position: 'absolute', left: -10, top: 0, bottom: 0, justifyContent: 'center' },
  bubbleTail: { width: 0, height: 0, borderTopWidth: 9, borderBottomWidth: 9, borderRightWidth: 11, borderTopColor: 'transparent', borderBottomColor: 'transparent' },
  stem: { fontSize: 18, fontFamily: 'Nunito_700Bold', lineHeight: 28 },
  // flex:1 fills the Entrance wrapper, which carries flexGrow + margin
  option: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 13, borderRadius: 16, borderWidth: 2, paddingVertical: 16, paddingHorizontal: 14 },
  optChip: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  optChipText: { fontSize: 13, fontFamily: 'Nunito_800ExtraBold' },
  optText: { fontSize: 15, fontFamily: 'Nunito_600SemiBold', flex: 1, lineHeight: 22 },
  // Submit bar
  // In normal flow (not absolute): follows the options on short questions,
  // sits at the screen edge when content fills the viewport.
  bottomBar: { paddingHorizontal: 18, paddingTop: 12 },
  submitBtn: { padding: 16, borderRadius: 999, alignItems: 'center' },
  submitBtnText: { fontSize: 16, fontFamily: 'Nunito_800ExtraBold' },
  // Review bottom sheet (stem stays visible above)
  sheetScrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.18)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderBottomWidth: 0, paddingHorizontal: 18, paddingTop: 4, maxHeight: '80%' },
  sheetHandleWrap: { alignItems: 'center', paddingVertical: 7 },
  sheetHandle: { width: 42, height: 4.5, borderRadius: 999 },
  sheetHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  whyChip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 18, borderRadius: 999, borderWidth: 1.5 },
  whyChipText: { fontSize: 14, fontFamily: 'Nunito_800ExtraBold' },
  verdictBadge: { paddingVertical: 9, paddingHorizontal: 18, borderRadius: 999, marginBottom: 16 },
  verdictText: { fontSize: 14, fontFamily: 'Nunito_800ExtraBold' },
  explainText: { fontSize: 16, fontFamily: 'Nunito_600SemiBold', lineHeight: 26 },
  answerRow: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 2 },
  answerLabel: { fontSize: 10, fontFamily: 'Nunito_800ExtraBold', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 3 },
  answerText: { fontSize: 14, fontFamily: 'Nunito_700Bold', lineHeight: 20 },
  distractorBox: { marginTop: 14, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth * 2 },
  distractorLabel: { fontSize: 11, fontFamily: 'Nunito_800ExtraBold', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 },
  distractorText: { fontSize: 14, fontFamily: 'Nunito_600SemiBold', lineHeight: 20 },
  nextBtn: { marginTop: 18, width: '100%', maxWidth: 340, padding: 16, borderRadius: 999, alignItems: 'center' },
  nextBtnText: { fontSize: 16, fontFamily: 'Nunito_800ExtraBold' },
  // Results
  resultScroll: { paddingHorizontal: 20, alignItems: 'center' },
  resultMascot: { marginBottom: 18 },
  resultTitle: { fontSize: 28, fontFamily: 'Nunito_800ExtraBold', letterSpacing: -0.5, marginBottom: 6, textAlign: 'center', alignSelf: 'stretch' },
  resultSub: { fontSize: 15, fontFamily: 'Nunito_600SemiBold', marginBottom: 24, textAlign: 'center', alignSelf: 'stretch' },
  resultGrid: { flexDirection: 'row', gap: 12, marginBottom: 28, width: '100%' },
  resultStat: { flex: 1, borderRadius: 18, borderWidth: 1, padding: 16, alignItems: 'center' },
  resultStatVal: { fontSize: 24, fontFamily: 'Nunito_900Black', letterSpacing: -0.5 },
  resultStatLabel: { fontSize: 12, fontFamily: 'Nunito_600SemiBold', marginTop: 3 },
  resultActions: { width: '100%', gap: 12 },
  resultBtn: { padding: 15, borderRadius: 999, alignItems: 'center' },
  resultBtnText: { fontSize: 15, fontFamily: 'Nunito_800ExtraBold' },
})
