import { useEffect, useState, useRef } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Animated, Easing, PanResponder, useWindowDimensions } from 'react-native'
import { router, useLocalSearchParams, useNavigation } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { MAX_CONTENT } from '@/hooks/useResponsive'
import { useFocusSessionWhile } from '@/hooks/useFocusSession'
import { useTheme } from '@/hooks/useTheme'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { TopicIcon } from '@/components/ui/TopicIcon'
import { TopBar } from '@/components/ui/TopBar'
import { SkeletonList } from '@/components/ui/Skeleton'
import { FilterBanner } from '@/components/ui/FilterBanner'
import { NogginHead } from '@/components/mascots/NogginHead'
import { MascotAnimator } from '@/components/mascots/MascotAnimator'
import { topicColor } from '@/constants/topics'
import type { TopicRow } from '@/types'
import { useFilters } from '@/contexts/FiltersContext'
import { useCollapsePracticeStack } from '@/hooks/usePracticeStack'
import { computeStreakUpdate } from '@/lib/streak'
import { withFilterAnim, withAccordionAnim } from '@/lib/anim'
import { orderByInterestAndUnseen } from '@/lib/interests'
import { playSound } from '@/lib/sounds'
import { trySave } from '@/lib/reliably'
import { showToast } from '@/lib/toast'

const CAT_ORDER = ['Anatomy & Physiology', 'Pharmacology', 'Pathophysiology', 'Clinicals']

const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5)
/** Orders a pool so unseen cards come first; seen ones backfill so the deck still fills. */
function orderByUnseen<T extends { id: string }>(pool: T[], seen: Set<string>): T[] {
  if (seen.size === 0) return shuffle(pool)
  return [...shuffle(pool.filter(x => !seen.has(x.id))), ...shuffle(pool.filter(x => seen.has(x.id)))]
}

type Screen = 'topics' | 'quiz' | 'results'

interface Flashcard {
  // back = the answer (correct_answer). note = supplementary explanation,
  // shown in Noggin's bubble. Comprehensive cards have no correct_answer —
  // there the explanation IS the answer, so it becomes `back` and there's
  // no separate note.
  id: string; front: string; back: string; note: string | null; topic: string; category: string | null; subtopic: string | null; difficulty: string | null
}

export default function FlashcardsScreen() {
  useCollapsePracticeStack()
  const C = useTheme()
  const insets = useSafeAreaInsets()
  const { height: screenH } = useWindowDimensions()
  const { user, profile } = useAuth()
  const { cardIds, smartStart, sessionKey, from, startTopic } = useLocalSearchParams<{ cardIds?: string; smartStart?: string; sessionKey?: string; from?: string; startTopic?: string }>()
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
    } else {
      router.navigate('/(app)/practice' as any)
    }
  }

  // Single-card flows (bookmark- or search-opened) return to where they came from AND clear
  // the Practice tab's stack back to its hub, so tapping Practice later doesn't resurface the card.
  const backToBookmarks = () => {
    if (from === 'search') router.navigate('/(app)/search' as any)
    else if (from === 'history') router.navigate('/(app)/history' as any)
    else router.navigate({ pathname: '/(app)/bookmarks', params: { from } } as any)
    setTimeout(() => navigation.reset({ index: 0, routes: [{ name: 'index' as never }] }), 0)
  }
  const autoStarted = useRef(false)
  const prevSessionKeyRef = useRef<string | undefined>(undefined)
  const sessionSavedRef = useRef(false)   // prevents double-save; reset on every new deck start
  const fromBookmarksRef = useRef(false)  // bookmark-review decks don't count toward streak/XP/sessions
  const isRetakeRef = useRef(false)        // "Study again" replay: saves session + XP, but NOT streak
  const isReviewMissedRef = useRef(false)  // "Review missed" re-drill: practice only — no session, XP, or streak

  const [screen, setScreen] = useState<Screen>('topics')
  // Focused session — hide app chrome (tab bar) while the deck is running
  useFocusSessionWhile(screen === 'quiz')
  const [topicRows, setTopicRows] = useState<TopicRow[]>([])
  const [cards, setCards] = useState<Flashcard[]>([])
  const [originalCards, setOriginalCards] = useState<Flashcard[]>([])  // full deck, for "Study again"
  const [missedCards, setMissedCards] = useState<Flashcard[]>([])      // cards marked "still learning", for "Review missed"
  const [cardIndex, setCardIndex] = useState(0)
  const [loadingTopics, setLoadingTopics] = useState(true)
  const [loadingCards, setLoadingCards] = useState(false)
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null)
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [answeredByTopic, setAnsweredByTopic] = useState<Record<string, number>>({})
  const [gotIt, setGotIt] = useState(0)
  const [missed, setMissed] = useState(0)
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set())
  const { fcFilter, setFcFilter } = useFilters()
  const difficulty = fcFilter.difficulty
  const sessionSize = fcFilter.sessionSize
  const allYears = fcFilter.allYears
  const setDifficulty = (v: 'all' | 'easy' | 'medium' | 'hard') => setFcFilter(f => ({ ...f, difficulty: v }))
  const setSessionSize = (v: number) => setFcFilter(f => ({ ...f, sessionSize: v }))
  const setAllYears = (v: boolean) => setFcFilter(f => ({ ...f, allYears: v }))

  // Remember last session params so "New Deck" can re-run with same filters
  const [lastTopic, setLastTopic] = useState<string | null>(null)
  const [lastCategory, setLastCategory] = useState<string | undefined>(undefined)
  const [lastSubtopic, setLastSubtopic] = useState<string | undefined>(undefined)
  const [lastWasSurprise, setLastWasSurprise] = useState(false)

  // Flip animation
  const flipAnim = useRef(new Animated.Value(0)).current

  // Swipe-to-grade (audit #13): once the answer is revealed, fling the card
  // right = Got it, left = Didn't know. Buttons remain for tap users.
  const swipeX = useRef(new Animated.Value(0)).current
  const revealedRef = useRef(false)
  const nextRef = useRef<(didKnow: boolean) => void>(() => {})
  const swipePan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_e, g) =>
      revealedRef.current && Math.abs(g.dx) > 14 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderMove: (_e, g) => swipeX.setValue(g.dx),
    onPanResponderRelease: (_e, g) => {
      const commit = g.dx > 90 || g.vx > 1.1 ? true : g.dx < -90 || g.vx < -1.1 ? false : null
      if (commit === null) {
        Animated.spring(swipeX, { toValue: 0, friction: 7, useNativeDriver: true }).start()
        return
      }
      Animated.timing(swipeX, { toValue: commit ? 520 : -520, duration: 150, useNativeDriver: true }).start(() => {
        nextRef.current(commit)
        swipeX.setValue(0)   // next card arrives centered
      })
    },
    onPanResponderTerminate: () => {
      Animated.spring(swipeX, { toValue: 0, friction: 7, useNativeDriver: true }).start()
    },
  })).current
  const [flipped, setFlipped] = useState(false)
  const [revealed, setRevealed] = useState(false)  // true once answer shown; stays true even if flipped back
  useEffect(() => { revealedRef.current = revealed }, [revealed])
  const [isFlipping, setIsFlipping] = useState(false)

  // Card height: locked to max(front, back) so it never resizes during flip
  const [frontH, setFrontH] = useState(0)
  const [backH, setBackH] = useState(0)

  useEffect(() => {
    if (!profile) return

    // Each Practice tap from bookmarks passes a unique sessionKey (Date.now()).
    // When it changes, reset everything so a cached screen re-runs the quiz fresh.
    if (sessionKey && sessionKey !== prevSessionKeyRef.current) {
      prevSessionKeyRef.current = sessionKey
      sessionSavedRef.current = false
      autoStarted.current = false
      setScreen('quiz')
      setLoadingCards(true)
      setCards([])
      setCardIndex(0); setGotIt(0); setMissed(0); setMissedCards([])
      flipAnim.setValue(0); setFlipped(false); setRevealed(false); setIsFlipping(false)
    }

    // One-shot auto-start — run alongside loadTopics so topics are ready
    // if the user exits back to the topic screen
    if (!autoStarted.current) {
      if (cardIds) {
        autoStarted.current = true
        let ids: string[] = []
        try { ids = JSON.parse(cardIds as string) } catch { ids = [] }
        loadCardsByIds(ids)
      } else if (startTopic) {
        autoStarted.current = true
        setExpandedTopic(startTopic)   // land on the topic list with this topic open (don't auto-start)
      } else if (smartStart === '1') {
        autoStarted.current = true
        surpriseMe()
      }
    }
    setLoadingTopics(true)
    loadTopics()
  }, [profile, difficulty, sessionKey])

  // The "you finished" fanfare — same sound at every results screen, win or lose.
  useEffect(() => { if (screen === 'results') playSound('complete') }, [screen])

  // Save session once results screen renders — only for completed (all cards seen) sessions
  useEffect(() => {
    if (screen !== 'results' || sessionSavedRef.current || !user || !profile || cards.length === 0) return
    // Bookmark-review decks are practice only — they must not count toward streak/XP/sessions.
    if (fromBookmarksRef.current) return
    // "Review missed" re-drills are practice only — no session, XP, or streak.
    if (isReviewMissedRef.current) return
    sessionSavedRef.current = true
    // Flashcards are SELF-GRADED ("Got it"/"Didn't know"), so they earn NO XP — otherwise the
    // leaderboard could be farmed by tapping "Got it" without reading. They still count toward
    // the streak (you studied today) and study stats. Retakes don't re-advance the streak.
    const isRetake = isRetakeRef.current
    const streak = isRetake ? {} : computeStreakUpdate(profile)
    ;(async () => {
      const sessionOk = await trySave(() => supabase.from('quiz_sessions').insert({
        user_id: user.id,
        score: gotIt,
        question_ids: cards.map(c => c.id),
        xp_earned: 0,
        mode: 'flashcard',
        topic: lastTopic ?? null, // null = Surprise me / random
      }))
      let streakOk = true
      if (Object.keys(streak).length > 0) {
        streakOk = await trySave(() => supabase.from('user_profiles').update({ ...streak }).eq('id', user.id))
      }
      if (!sessionOk || !streakOk) {
        showToast("Couldn't save this deck — check your connection. Your streak may not have counted.", 'error')
      }
    })()
  }, [screen]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadTopics() {
    if (!profile) return
    const { data } = await supabase.rpc('get_question_counts', {
      p_profession: profile.profession,
      p_question_type: 'flashcard',
      p_access_key: profile.access_key ?? null,
      p_difficulty: difficulty !== 'all' ? difficulty : null,
    })
    setTopicRows((data ?? []).map((r: any) => ({ topic: r.topic, category: r.category, subtopic: r.subtopic, count: Number(r.cnt) })))
    setLoadingTopics(false)
    // Coverage per topic — history holds one row per distinct card reviewed
    if (user) {
      const { data: hist } = await supabase.from('user_question_history')
        .select('topic').eq('user_id', user.id).eq('question_type', 'flashcard').limit(10000)
      const byTopic: Record<string, number> = {}
      for (const r of (hist ?? []) as any[]) if (r.topic) byTopic[r.topic] = (byTopic[r.topic] ?? 0) + 1
      setAnsweredByTopic(byTopic)
    }
  }

  /** Seen flashcard ids for this user — empty when repeats are allowed (→ no exclusion). */
  async function fetchSeenFcIds(): Promise<Set<string>> {
    if (!user || profile?.allow_repeat_questions) return new Set()
    const { data } = await supabase
      .from('user_question_history')
      .select('question_id')
      .eq('user_id', user.id)
      .eq('question_type', 'flashcard')
    return new Set((data ?? []).map((r: any) => r.question_id as string))
  }

  async function startCards(topic: string, category?: string, subtopic?: string) {
    if (!profile) return
    // Switch away from results BEFORE the await — prevents zero-flash on results screen
    setCardIndex(0); setGotIt(0); setMissed(0); setMissedCards([]); flipAnim.setValue(0); setFlipped(false); setRevealed(false); setIsFlipping(false)
    setLastTopic(topic); setLastCategory(category); setLastSubtopic(subtopic); setLastWasSurprise(false)
    sessionSavedRef.current = false
    fromBookmarksRef.current = false
    isRetakeRef.current = false; isReviewMissedRef.current = false
    setLoadingCards(true)
    setScreen('quiz')

    const { data } = await supabase.rpc('get_questions_by_topic', {
      p_profession: profile.profession,
      p_question_type: 'flashcard',
      p_topic: topic,
      p_category: category ?? null,
      p_subtopic: subtopic ?? null,
      p_difficulty: difficulty !== 'all' ? difficulty : null,
      p_year: profile.study_year && !allYears ? profile.study_year : null,
      p_access_key: profile.access_key ?? null,
      p_limit: sessionSize * 3,
    })
    if (!data || data.length === 0) { setLoadingCards(false); setScreen('topics'); return }

    const seen = await fetchSeenFcIds()
    const shuffled = orderByUnseen(data, seen).slice(0, sessionSize)
    const mapped = shuffled.map((r: any) => ({ id: r.id, front: r.question_text, back: (r.correct_answer && String(r.correct_answer).trim()) ? r.correct_answer : r.explanation, note: (r.correct_answer && String(r.correct_answer).trim()) ? r.explanation : null, topic: r.topic, category: r.category, subtopic: r.subtopic, difficulty: r.difficulty }))
    setCards(mapped); setOriginalCards(mapped)
    if (user) {
      const { data: bk } = await supabase.from('bookmarks').select('question_id').eq('user_id', user.id)
      setBookmarked(new Set((bk ?? []).map((b: any) => b.question_id)))
    }
    setLoadingCards(false)
  }

  async function surpriseMe() {
    if (!profile) return
    // Switch away from results BEFORE the await — prevents zero-flash on results screen
    setCardIndex(0); setGotIt(0); setMissed(0); setMissedCards([]); flipAnim.setValue(0); setFlipped(false); setRevealed(false); setIsFlipping(false)
    setLastTopic(null); setLastCategory(undefined); setLastSubtopic(undefined); setLastWasSurprise(true)
    sessionSavedRef.current = false
    fromBookmarksRef.current = false
    isRetakeRef.current = false; isReviewMissedRef.current = false
    setLoadingCards(true)
    setScreen('quiz')

    // Surprise me = truly random across topics (server-side), within the set filters.
    const { data } = await supabase.rpc('get_random_flashcards', {
      p_profession: profile.profession,
      p_limit: sessionSize * 3,
      p_difficulty: difficulty !== 'all' ? difficulty : null,
      p_access_key: profile.access_key ?? null,
      p_year: profile.study_year && !allYears ? profile.study_year : null,
    })
    if (!data || data.length === 0) { setLoadingCards(false); setScreen('topics'); return }

    const seen = await fetchSeenFcIds()
    // Areas of interest bias the surprise pool (unseen-interest first); empty = decide for me
    const shuffled = orderByInterestAndUnseen(data as any[], profile.interests, seen).slice(0, sessionSize)
    const mapped = shuffled.map((r: any) => ({ id: r.id, front: r.question_text, back: (r.correct_answer && String(r.correct_answer).trim()) ? r.correct_answer : r.explanation, note: (r.correct_answer && String(r.correct_answer).trim()) ? r.explanation : null, topic: r.topic, category: r.category, subtopic: r.subtopic, difficulty: r.difficulty }))
    setCards(mapped); setOriginalCards(mapped)
    if (user) {
      const { data: bk } = await supabase.from('bookmarks').select('question_id').eq('user_id', user.id)
      setBookmarked(new Set((bk ?? []).map((b: any) => b.question_id)))
    }
    setLoadingCards(false)
  }

  async function loadCardsByIds(ids: string[]) {
    if (!profile) return
    sessionSavedRef.current = false
    fromBookmarksRef.current = true
    isRetakeRef.current = false; isReviewMissedRef.current = false
    setLoadingCards(true)
    const { data } = await supabase.rpc('get_questions_by_ids', { p_ids: ids, p_limit: 200 })
    if (!data || data.length === 0) { setLoadingCards(false); return }
    const shuffled = [...data].sort(() => Math.random() - 0.5)
    const mapped = shuffled.map((r: any) => ({ id: r.id, front: r.question_text, back: (r.correct_answer && String(r.correct_answer).trim()) ? r.correct_answer : r.explanation, note: (r.correct_answer && String(r.correct_answer).trim()) ? r.explanation : null, topic: r.topic, category: r.category, subtopic: r.subtopic, difficulty: r.difficulty }))
    setCards(mapped); setOriginalCards(mapped)
    setCardIndex(0); setGotIt(0); setMissed(0); setMissedCards([]); flipAnim.setValue(0); setFlipped(false); setRevealed(false); setIsFlipping(false)
    if (user) {
      const { data: bk } = await supabase.from('bookmarks').select('question_id').eq('user_id', user.id)
      setBookmarked(new Set((bk ?? []).map((b: any) => b.question_id)))
    }
    setLoadingCards(false)
    setScreen('quiz')
  }

  async function toggleBookmark(cardId: string) {
    if (!user) return
    if (bookmarked.has(cardId)) {
      await supabase.from('bookmarks').delete().eq('user_id', user.id).eq('question_id', cardId)
      setBookmarked(b => { const s = new Set(b); s.delete(cardId); return s })
    } else {
      await supabase.from('bookmarks').insert({ user_id: user.id, question_id: cardId })
      setBookmarked(b => new Set(b).add(cardId))
    }
  }

  function flip() {
    if (isFlipping) return // block taps mid-animation only
    playSound('flip')
    const toValue = flipped ? 0 : 1
    setIsFlipping(true)
    Animated.timing(flipAnim, {
      toValue,
      duration: 520,
      useNativeDriver: true,
      easing: Easing.inOut(Easing.ease),
    }).start(() => {
      setIsFlipping(false)
      if (!flipped) setRevealed(true) // first forward flip reveals answer
    })
    // Switch card face at midpoint (when edge-on)
    setTimeout(() => setFlipped(f => !f), 260)
  }

  function next(didKnow: boolean) {
    // Record that this card has been reviewed (powers "Allow repeat questions").
    const card = cards[cardIndex]
    if (user && card) {
      supabase.rpc('record_answer', {
        p_question_id: card.id, p_question_type: 'flashcard',
        p_topic: card.topic, p_category: card.category, p_subtopic: card.subtopic,
        p_difficulty: card.difficulty ?? 'medium', p_correct: didKnow,
      }).then(() => {})
    }
    if (didKnow) setGotIt(k => k + 1)
    else { setMissed(m => m + 1); if (card) setMissedCards(prev => [...prev, card]) }
    flipAnim.setValue(0)
    setFlipped(false)
    setRevealed(false)
    setIsFlipping(false)
    if (cardIndex + 1 >= cards.length) setScreen('results')
    else setCardIndex(i => i + 1)
  }

  nextRef.current = next

  // Replay the full deck — saves a session + XP but does NOT advance the streak.
  function studyAgain() {
    sessionSavedRef.current = false; isRetakeRef.current = true; isReviewMissedRef.current = false
    setCards(shuffle(originalCards.length ? originalCards : cards))
    setCardIndex(0); setGotIt(0); setMissed(0); setMissedCards([])
    flipAnim.setValue(0); setFlipped(false); setRevealed(false); setIsFlipping(false)
    setScreen('quiz')
  }

  // Re-drill only the cards marked "still learning" — pure practice (no session, XP, or streak).
  function reviewMissed() {
    if (missedCards.length === 0) return
    sessionSavedRef.current = false; isReviewMissedRef.current = true; isRetakeRef.current = false
    setCards(shuffle(missedCards))
    setCardIndex(0); setGotIt(0); setMissed(0); setMissedCards([])
    flipAnim.setValue(0); setFlipped(false); setRevealed(false); setIsFlipping(false)
    setScreen('quiz')
  }

  // Single-card fold: rotateY 0° → 90° → 0° with content swap at midpoint
  const rotateY = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '90deg', '0deg'],
  })

  // Strip "Flashcard:" / "Flash card:" prefix inserted during content generation
  // Data hygiene guards: some imports carried literal "Front:"/"Back:"/
  // "Flashcard:" prefixes (the DB was cleaned July 2026, these protect
  // against regressions from future question-bank imports).
  const cleanBack = (text: string) => text.replace(/^\s*back\s*:\s*/i, '').replace(/^flash\s*card[s]?[:\s]+/i, '').trim()
  const cleanFront = (text: string) => text.replace(/^\s*front\s*:\s*/i, '').trim()

  // Dynamic card top offset — adapts to card height so Noggin always fits below
  // Header (~104px) + action bar (~88px) + safe area = fixed chrome
  // Remaining space split: 30% above card, 70% below (card + noggin + breathing room)
  // Card fills the focused-session screen (same principle as MCQ's stretch
  // layout): at least ~45% of the free height, growing further for long text.
  const availableH = Math.max(200, screenH - 104 - 88 - insets.bottom)
  const minCardH = Math.round(availableH * 0.45)
  const cardH = Math.max(minCardH, frontH, backH)
  const cardTopOffset = Math.max(12, (availableH - cardH - 88) * 0.30)

  // ── Topics screen ──────────────────────────────────────────────────────────
  if (screen === 'topics') {
    const grouped = topicRows.reduce((acc: Record<string, TopicRow[]>, r) => {
      if (!r.topic) return acc
      if (!acc[r.topic]) acc[r.topic] = []
      acc[r.topic].push(r)
      return acc
    }, {})

    const totalCards = topicRows.reduce((s, r) => s + r.count, 0)
    const DIFF_OPTS = [
      { id: 'all' as const,    label: 'All levels', activeBg: C.text,    activeFg: C.bg },
      { id: 'easy' as const,   label: 'Easy',       activeBg: C.green,   activeFg: C.onTeal },
      { id: 'medium' as const, label: 'Medium',     activeBg: C.amber,   activeFg: C.onTeal },
      { id: 'hard' as const,   label: 'Hard',       activeBg: C.red,     activeFg: C.onTeal },
    ]

    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <TopBar title="Practice" />
        <View style={[s.header, { paddingTop: 14, backgroundColor: C.surface, borderBottomColor: C.border }]}>
          <TouchableOpacity
            onPress={goBack}
            style={[s.iconBtn, { backgroundColor: C.surface2, borderColor: C.border }]}>
            <Ionicons name="arrow-back" size={20} color={C.textSoft} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[s.headerTitle, { color: C.text }]}>Flashcards</Text>
            {!loadingTopics && <Text style={[s.headerSub, { color: C.textFaint }]}>{totalCards.toLocaleString()} cards available</Text>}
          </View>
        </View>

        {/* Pinned: active filters survive across visits — keep them visible with one-tap clear */}
        <FilterBanner kind="fc" />
        <ScrollView contentContainerStyle={{ paddingBottom: 100, width: '100%', maxWidth: MAX_CONTENT, alignSelf: 'center' }} showsVerticalScrollIndicator={false}>
        {/* Filters */}
        <View style={[s.filterSection, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
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
            {([5, 10, 20, 40] as const).map(n => {
              const disabled = totalCards > 0 && n > totalCards
              return (
              <TouchableOpacity key={n} disabled={disabled} onPress={() => withFilterAnim(() => setSessionSize(n))} activeOpacity={0.75}
                style={[s.chip, { backgroundColor: sessionSize === n ? C.teal : C.surface2, borderColor: sessionSize === n ? C.teal : C.border, opacity: disabled ? 0.4 : 1 }]}>
                <Text style={[s.chipText, { color: sessionSize === n ? C.onTeal : C.textSoft }]}>{n}</Text>
              </TouchableOpacity>
              )
            })}
          </View>

          {profile?.study_year ? (
            <>
              <Text style={[s.filterLabel, { color: C.textFaint, marginTop: 14 }]}>FOCUS</Text>
              <View style={s.chipRow}>
                <TouchableOpacity onPress={() => withFilterAnim(() => setAllYears(!allYears))} activeOpacity={0.75}
                  style={[s.chip, s.chipIcon, { backgroundColor: allYears ? C.text : C.surface2, borderColor: allYears ? C.text : C.border }]}>
                  <Ionicons name="calendar-outline" size={14} color={allYears ? C.bg : C.textSoft} />
                  <Text style={[s.chipText, { color: allYears ? C.bg : C.textSoft }]}>All Years</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : null}
        </View>

        {/* Surprise me */}
        <TouchableOpacity onPress={surpriseMe} activeOpacity={0.85}
          style={[s.surpriseBanner, { backgroundColor: C.teal, marginHorizontal: 16, marginTop: 14, marginBottom: 4 }]}>
          <Text style={[s.surpriseLeft, { color: C.onTeal }]}>🎲 Surprise me</Text>
          <Text style={[s.surpriseRight, { color: C.onTeal }]}>Random {sessionSize} cards →</Text>
        </TouchableOpacity>

        {loadingTopics ? <SkeletonList rows={7} style={{ marginHorizontal: 16, marginTop: 16 }} /> : (
          <>
            {Object.entries(grouped).map(([topic, rows]) => {
              const total = rows.reduce((s, r) => s + r.count, 0)
              const isExpanded = expandedTopic === topic
              const { color: iconColor, bgLight: iconBg } = topicColor(topic)

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
                <View key={topic} style={[s.topicCard, { backgroundColor: C.surface, borderColor: C.border, ...C.shadow, marginHorizontal: 16, marginBottom: 10 }]}>
                  <View style={s.topicRowInner}>
                    <View style={[s.topicIcon, { backgroundColor: iconBg }]}>
                      <TopicIcon topic={topic} size={20} color={iconColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.topicName, { color: C.text }]}>{topic}</Text>
                      <Text style={[s.topicMeta, { color: C.textFaint }]}>
                        {total.toLocaleString()} cards · {sortedCats.length} {sortedCats.length === 1 ? 'category' : 'categories'}
                      </Text>
                      {(() => {
                        const done = Math.min(answeredByTopic[topic] ?? 0, total)
                        if (done === 0) return null
                        return (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 }}>
                            <ProgressBar progress={done / Math.max(total, 1)} height={4} color={C.green} style={{ flex: 1 }} />
                            <Text style={{ fontSize: 10.5, fontFamily: 'Nunito_700Bold', color: C.textFaint }}>{done}/{total}</Text>
                          </View>
                        )
                      })()}
                    </View>
                    <TouchableOpacity onPress={() => startCards(topic)} activeOpacity={0.75}
                      style={[s.startBtn, { backgroundColor: C.tealTint, borderColor: C.teal }]}>
                      <Text style={[s.startBtnText, { color: C.teal }]}>{total < sessionSize ? `Start ${total} →` : 'Start →'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => withAccordionAnim(() => { setExpandedTopic(isExpanded ? null : topic); setExpandedCategory(null) })} style={s.chevronBtn}>
                      <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={C.textFaint} />
                    </TouchableOpacity>
                  </View>

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
                                <Text style={[s.catCount, { color: C.textFaint }]}>{catData.total.toLocaleString()} cards</Text>
                              </View>
                              <TouchableOpacity
                                onPress={() => startCards(topic, catName !== 'General' ? catName : undefined)}
                                style={[s.catStartBtn, { borderColor: C.teal, backgroundColor: C.tealTint }]}>
                                <Text style={[s.startBtnText, { color: C.teal }]}>{catData.total < sessionSize ? `Start ${catData.total} →` : 'Start →'}</Text>
                              </TouchableOpacity>
                              {hasSubtopics && (
                                <TouchableOpacity onPress={() => withAccordionAnim(() => setExpandedCategory(isCatExpanded ? null : ck))} style={s.chevronBtn}>
                                  <Ionicons name={isCatExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={C.textFaint} />
                                </TouchableOpacity>
                              )}
                            </View>
                            {isCatExpanded && catData.subtopics.sort((a, b) => b.count - a.count).map((sub) => (
                              <TouchableOpacity key={sub.name}
                                onPress={() => startCards(topic, catName !== 'General' ? catName : undefined, sub.name)}
                                style={[s.subtopicRow, { backgroundColor: C.surface, borderTopColor: C.border, borderTopWidth: 1 }]}>
                                <Text style={[s.subtopicName, { color: C.textSoft }]}>{sub.name}</Text>
                                <Text style={[s.subtopicCount, { color: C.textFaint }]}>{sub.count}</Text>
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
            })}
          </>
        )}
        </ScrollView>
        {loadingCards && (
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: C.bg + 'cc', alignItems: 'center', justifyContent: 'center' }]}>
            <ActivityIndicator size="large" color={C.coral} />
          </View>
        )}
      </View>
    )
  }

  // ── Quiz screen ────────────────────────────────────────────────────────────
  if (screen === 'quiz') {
    // Cards may not be loaded yet (switched screen early to avoid zero-flash on results)
    if (loadingCards || !cards[cardIndex]) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}>
          <ActivityIndicator size="large" color={C.teal} />
        </View>
      )
    }

    const card = cards[cardIndex]
    const total = cards.length
    const isBookmarked = bookmarked.has(card.id)
    const diffColor = card.difficulty === 'easy' ? C.green : card.difficulty === 'hard' ? C.red : C.amber
    const diffTint = card.difficulty === 'easy' ? C.greenTint : card.difficulty === 'hard' ? C.redTint : C.amberTint

    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        {/* Focused session: no TopBar/tab bar — header owns the safe area */}
        <View style={[s.quizHeader, { paddingTop: insets.top + 10, backgroundColor: C.surface, borderBottomColor: C.border }]}>
          <TouchableOpacity
            onPress={() => cardIds ? backToBookmarks() : smartStart === '1' ? goBack() : setScreen('topics')}
            style={[s.iconBtn, { backgroundColor: C.surface2, borderColor: C.border }]}>
            <Ionicons name="arrow-back" size={20} color={C.textSoft} />
          </TouchableOpacity>
          <View style={{ alignItems: 'center', gap: 4 }}>
            <Text style={[s.qCount, { color: C.text }]}>{cardIndex + 1} / {total}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              {(profile?.show_question_tags ?? true) && card.topic && (
                <View style={[s.fcDiff, { backgroundColor: C.tealTint }]}>
                  <Text style={[s.fcDiffText, { color: C.teal }]} numberOfLines={1}>{card.topic}</Text>
                </View>
              )}
              {card.difficulty && (
                <View style={[s.fcDiff, { backgroundColor: diffTint }]}>
                  <Text style={[s.fcDiffText, { color: diffColor }]}>{card.difficulty}</Text>
                </View>
              )}
            </View>
          </View>
          <TouchableOpacity onPress={() => toggleBookmark(card.id)} style={[s.iconBtn, { backgroundColor: C.surface2, borderColor: C.border }]}>
            <Ionicons name={isBookmarked ? 'bookmark' : 'bookmark-outline'} size={19} color={isBookmarked ? C.teal : C.textFaint} />
          </TouchableOpacity>
        </View>
        {/* Progress bar */}
        <ProgressBar progress={(cardIndex) / total} height={3} color={C.teal} />

        {/* Score pills row */}
        <View style={s.scoreRow}>
          <View style={[s.scorePill, { backgroundColor: C.redTint }]}>
            <Ionicons name="close" size={14} color={C.red} />
            <Text style={[s.scorePillText, { color: C.red }]}>{missed} missed</Text>
          </View>
          <View style={[s.scorePill, { backgroundColor: C.greenTint }]}>
            <Ionicons name="checkmark" size={14} color={C.green} />
            <Text style={[s.scorePillText, { color: C.green }]}>{gotIt} got it</Text>
          </View>
        </View>

        {/* Card + explanation in a scroll view */}
        <ScrollView
          contentContainerStyle={[s.quizScroll, { paddingBottom: revealed ? 130 : 40, width: '100%', maxWidth: MAX_CONTENT, alignSelf: 'center' }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Dynamic top offset — keeps the card position stable across flip */}
          <View style={{ height: cardTopOffset }} />

          {/* Invisible sizers — measure each face's natural height, take the max */}
          <View pointerEvents="none" style={{ position: 'absolute', opacity: 0, width: '100%' }}>
            <View
              key={`sf-${cardIndex}`}
              style={s.cardSizer}
              onLayout={e => setFrontH(e.nativeEvent.layout.height)}
            >
              <View style={{ alignItems: 'center' }}>
                <Text style={s.cardLabel}>QUESTION</Text>
                <Text style={s.cardText}>{cleanFront(card.front)}</Text>
              </View>
              <View style={s.tapReveal}>
                <Text style={s.tapRevealText}>Tap to reveal</Text>
              </View>
            </View>
            <View
              key={`sb-${cardIndex}`}
              style={s.cardSizer}
              onLayout={e => setBackH(e.nativeEvent.layout.height)}
            >
              <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                <Text style={s.cardLabel}>ANSWER</Text>
                <Text style={s.cardText}>{cleanBack(card.back)}</Text>
              </View>
            </View>
          </View>

          {/* Flip card — height locked to max(front, back); swipeable once revealed */}
          <Animated.View
            {...swipePan.panHandlers}
            style={{
              width: '100%',
              transform: [
                { translateX: swipeX },
                { rotate: swipeX.interpolate({ inputRange: [-300, 0, 300], outputRange: ['-9deg', '0deg', '9deg'] }) },
              ],
            }}
          >
            {/* Grade badges fade in as the card is dragged */}
            <Animated.View pointerEvents="none" style={[s.swipeBadge, { left: 14, backgroundColor: C.greenTint, borderColor: C.green, opacity: swipeX.interpolate({ inputRange: [0, 70], outputRange: [0, 1], extrapolate: 'clamp' }) }]}>
              <Text style={[s.swipeBadgeText, { color: C.green }]}>✓ Got it</Text>
            </Animated.View>
            <Animated.View pointerEvents="none" style={[s.swipeBadge, { right: 14, backgroundColor: C.redTint, borderColor: C.red, opacity: swipeX.interpolate({ inputRange: [-70, 0], outputRange: [1, 0], extrapolate: 'clamp' }) }]}>
              <Text style={[s.swipeBadgeText, { color: C.red }]}>✗ Didn't know</Text>
            </Animated.View>
          <TouchableOpacity onPress={flip} activeOpacity={0.92} style={s.cardTouchable} disabled={isFlipping}>
            <Animated.View style={[
              s.card,
              C.shadowLg,
              { height: cardH },
              flipped
                ? { backgroundColor: C.teal, borderColor: C.teal }
                : { backgroundColor: C.surface, borderColor: C.border },
              { transform: [{ perspective: 900 }, { rotateY }] },
            ]}>
              {!flipped ? (
                <>
                  {/* Centered vertically now the card is taller */}
                  <View style={{ alignSelf: 'stretch', alignItems: 'center', flex: 1, justifyContent: 'center' }}>
                    <Text style={[s.cardLabel, { color: C.textFaint }]}>QUESTION</Text>
                    <Text style={[s.cardText, { color: C.text }]}>{cleanFront(card.front)}</Text>
                  </View>
                  <View style={s.tapReveal}>
                    <Ionicons name="arrow-up-circle-outline" size={17} color={C.textFaint} />
                    <Text style={[s.tapRevealText, { color: C.textFaint }]}>Tap to reveal</Text>
                  </View>
                </>
              ) : (
                <View style={{ alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                  <Text style={[s.cardLabel, { color: C.onTeal, opacity: 0.75 }]}>ANSWER</Text>
                  <Text style={[s.cardText, { color: C.onTeal }]}>{cleanBack(card.back)}</Text>
                </View>
              )}
            </Animated.View>
          </TouchableOpacity>
          </Animated.View>

          {/* Below-card: hint before reveal, Noggin explains after — same
              Duolingo treatment as MCQ/cases: big mascot, bubble with a
              tail centered on the face */}
          {!revealed ? (
            <Text style={[s.tapHint, { color: C.textFaint }]}>Tap the card to flip it</Text>
          ) : card.note && cleanBack(card.note).trim() ? (
            // Noggin adds the supplementary explanation — only when there's a
            // note distinct from the answer already on the card.
            <View style={s.nogginBubbleRow}>
              <MascotAnimator expr="happy">
                <NogginHead size={92} expr="happy" />
              </MascotAnimator>
              <View style={[s.speechBubble, { backgroundColor: C.surface, borderColor: C.border, ...C.shadow }]}>
                <View style={s.tailWrap} pointerEvents="none">
                  <View style={[s.bubbleTail, { borderRightColor: C.surface }]} />
                </View>
                <Text style={[s.explainLabel, { color: C.teal }]}>WHY</Text>
                <Text style={[s.explanationText, { color: C.text }]}>{cleanBack(card.note)}</Text>
              </View>
            </View>
          ) : null}

          {/* Bottom spacer — flex so it absorbs remaining space without affecting card position */}
          <View style={{ flex: 1 }} />
        </ScrollView>

        {/* Fixed bottom action bar — appears after answer revealed; stays even if flipped back */}
        {revealed && (
          <View style={[s.actionBar, {
            backgroundColor: C.bg,
            borderTopColor: C.border,
            paddingBottom: insets.bottom + 12,
          }]}>
            <Text style={[s.actionPrompt, { color: C.textSoft }]}>How did you do? Swipe the card → or ←, or tap</Text>
            <View style={s.actionBtns}>
              <TouchableOpacity onPress={() => next(false)} style={[s.actionBtn, { backgroundColor: C.redTint, borderColor: C.red }]}>
                <Ionicons name="close" size={20} color={C.red} />
                <Text style={[s.actionText, { color: C.red }]}>Didn't know</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => next(true)} style={[s.actionBtn, { backgroundColor: C.greenTint, borderColor: C.green }]}>
                <Ionicons name="checkmark" size={20} color={C.green} />
                <Text style={[s.actionText, { color: C.green }]}>Got it</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    )
  }

  // ── Results screen ─────────────────────────────────────────────────────────
  const total = cards.length
  const pct = total > 0 ? Math.round((gotIt / total) * 100) : 0

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <TopBar title="Practice" />
      <ScrollView contentContainerStyle={[s.resultScroll, { paddingTop: 32, paddingBottom: 100, width: '100%', maxWidth: MAX_CONTENT, alignSelf: 'center' }]}>
        {/* Mascot */}
        <View style={s.resultMascot}>
          <MascotAnimator expr={pct >= 70 ? 'happy' : 'thinking'}>
            <NogginHead size={88} expr={pct >= 70 ? 'happy' : 'thinking'} />
          </MascotAnimator>
        </View>

        <Text style={[s.resultTitle, { color: C.text }]}>Session complete!</Text>
        <Text style={[s.resultSub, { color: C.textSoft }]}>
          {pct >= 80 ? 'Excellent recall!' : pct >= 60 ? 'Good effort — keep going!' : 'Keep practicing!'}
        </Text>

        {/* Big accuracy */}
        <Text style={[s.resultPct, { color: C.coral }]}>{pct}%</Text>

        {/* Stat tiles */}
        <View style={s.statGrid}>
          <View style={[s.statTile, { backgroundColor: C.surface, borderColor: C.border, ...C.shadow }]}>
            <Text style={[s.statVal, { color: C.green }]}>{gotIt}</Text>
            <Text style={[s.statLabel, { color: C.textFaint }]}>Got it</Text>
          </View>
          <View style={[s.statTile, { backgroundColor: C.surface, borderColor: C.border, ...C.shadow }]}>
            <Text style={[s.statVal, { color: C.red }]}>{missed}</Text>
            <Text style={[s.statLabel, { color: C.textFaint }]}>Missed</Text>
          </View>
          <View style={[s.statTile, { backgroundColor: C.surface, borderColor: C.border, ...C.shadow }]}>
            <Text style={[s.statVal, { color: C.coral }]}>{total}</Text>
            <Text style={[s.statLabel, { color: C.textFaint }]}>Reviewed</Text>
          </View>
        </View>

        {/* Action buttons — same hierarchy as MCQ results:
            review (tinted) → replay (ghost) → new content (filled) → Dashboard (ghost) */}
        <View style={s.resultActions}>
          {missed > 0 && (
            <TouchableOpacity
              onPress={reviewMissed}
              style={[s.resultBtn, { backgroundColor: C.redTint, borderWidth: 1, borderColor: C.red }]}
            >
              <Text style={[s.resultBtnText, { color: C.red }]}>Review {missed} still learning →</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={studyAgain}
            style={[s.resultBtn, { backgroundColor: C.surface, borderWidth: 1, borderColor: C.borderStrong }]}
          >
            <Text style={[s.resultBtnText, { color: C.textSoft }]}>↺  Study again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              if (lastWasSurprise) surpriseMe()
              else if (lastTopic) startCards(lastTopic, lastCategory, lastSubtopic)
              else router.back()   // launched from bookmarks — pop back there
            }}
            style={[s.resultBtn, { backgroundColor: C.coral }]}
          >
            <Text style={[s.resultBtnText, { color: C.onTeal }]}>New deck →</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(app)/dashboard')} style={[s.resultBtn, { backgroundColor: C.surface, borderWidth: 1, borderColor: C.borderStrong }]}>
            <Text style={[s.resultBtnText, { color: C.textSoft }]}>Dashboard</Text>
          </TouchableOpacity>
          {cardIds && (
            <TouchableOpacity onPress={() => backToBookmarks()} style={{ alignSelf: 'center', marginTop: 6 }}>
              <Text style={[s.resultBtnText, { color: C.textFaint, fontSize: 13 }]}>← Back to bookmarks</Text>
            </TouchableOpacity>
          )}
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
  iconBtn: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },

  // Filters
  filterSection: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 18, borderBottomWidth: 1 },
  filterLabel: { fontSize: 11, fontFamily: 'Nunito_800ExtraBold', letterSpacing: 0.6, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1.5 },
  chipIcon: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipText: { fontSize: 13, fontFamily: 'Nunito_700Bold' },

  // Surprise me
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
  catStartBtn: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1 },
  subtopicRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingLeft: 48, paddingRight: 14 },
  subtopicName: { fontSize: 13.5, fontFamily: 'Nunito_600SemiBold', flex: 1 },
  subtopicCount: { fontSize: 12, fontFamily: 'Nunito_600SemiBold' },
  badge: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: 999 },
  badgeText: { fontSize: 13, fontFamily: 'Nunito_800ExtraBold' },

  // Quiz header
  quizHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  qCount: { fontSize: 17, fontFamily: 'Nunito_800ExtraBold', textAlign: 'center' },

  // Score pills
  scoreRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, paddingVertical: 12 },
  scorePill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 14, borderRadius: 999 },
  scorePillText: { fontSize: 13, fontFamily: 'Nunito_700Bold' },

  // Flip card
  quizScroll: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 20 },
  tapHint: { fontSize: 13, fontFamily: 'Nunito_600SemiBold', marginTop: 14, textAlign: 'center' },
  cardTouchable: { width: '100%' },
  swipeBadge: { position: 'absolute', top: 12, zIndex: 3, borderWidth: 1.5, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 13 },
  swipeBadgeText: { fontSize: 13, fontFamily: 'Nunito_800ExtraBold' },
  // cardSizer: invisible twin used only for onLayout measurement — must match card padding exactly
  cardSizer: { width: '100%', paddingHorizontal: 28, paddingTop: 24, paddingBottom: 20, alignItems: 'center', justifyContent: 'space-between' },
  card: { width: '100%', borderRadius: 24, borderWidth: 1.5, paddingHorizontal: 28, paddingTop: 24, paddingBottom: 20, alignItems: 'center', justifyContent: 'space-between' },
  cardLabel: { fontSize: 11, fontFamily: 'Nunito_800ExtraBold', letterSpacing: 1.4, marginBottom: 16 },
  cardText: { fontSize: 16, fontFamily: 'Nunito_700Bold', textAlign: 'center', lineHeight: 25 },
  tapReveal: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 16 },
  tapRevealText: { fontSize: 13, fontFamily: 'Nunito_600SemiBold' },

  // Noggin speech bubble (below card, after flip)
  fcDiff: { paddingVertical: 2, paddingHorizontal: 9, borderRadius: 999 },
  fcDiffText: { fontSize: 11, fontFamily: 'Nunito_800ExtraBold', textTransform: 'capitalize' },
  nogginBubbleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, width: '100%', gap: 6 },
  speechBubble: { flex: 1, borderRadius: 20, borderWidth: 1, padding: 18 },
  // Full-height wrapper vertically centers the tail on the bubble (and Noggin)
  tailWrap: { position: 'absolute', left: -10, top: 0, bottom: 0, justifyContent: 'center' },
  bubbleTail: { width: 0, height: 0, borderTopWidth: 9, borderBottomWidth: 9, borderRightWidth: 11, borderTopColor: 'transparent', borderBottomColor: 'transparent' },
  explainLabel: { fontSize: 11, fontFamily: 'Nunito_800ExtraBold', letterSpacing: 1, marginBottom: 6 },
  explanationText: { fontSize: 15, fontFamily: 'Nunito_600SemiBold', lineHeight: 23 },

  // Action bar (fixed bottom, after flip)
  actionBar: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1, paddingTop: 12, paddingHorizontal: 16 },
  actionPrompt: { fontSize: 13, fontFamily: 'Nunito_700Bold', textAlign: 'center', marginBottom: 10 },
  actionBtns: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 15, borderRadius: 16, borderWidth: 1.5 },
  actionText: { fontSize: 15, fontFamily: 'Nunito_800ExtraBold' },

  // Results
  resultScroll: { paddingHorizontal: 22, alignItems: 'center' },
  resultMascot: { marginBottom: 16 },
  resultTitle: { fontSize: 26, fontFamily: 'Nunito_900Black', letterSpacing: -0.3, marginBottom: 4 },
  resultSub: { fontSize: 15, fontFamily: 'Nunito_600SemiBold', marginBottom: 10 },
  resultPct: { fontSize: 64, fontFamily: 'Nunito_900Black', letterSpacing: -3, marginBottom: 20 },
  statGrid: { flexDirection: 'row', gap: 10, width: '100%', marginBottom: 26 },
  statTile: { flex: 1, borderRadius: 18, borderWidth: 1, padding: 16, alignItems: 'center' },
  statVal: { fontSize: 24, fontFamily: 'Nunito_900Black', letterSpacing: -0.5 },
  statLabel: { fontSize: 12, fontFamily: 'Nunito_600SemiBold', marginTop: 3 },
  resultActions: { width: '100%', gap: 10 },
  resultBtn: { padding: 16, borderRadius: 999, alignItems: 'center' },
  resultBtnText: { fontSize: 15, fontFamily: 'Nunito_800ExtraBold' },
  dashLink: { fontSize: 13, fontFamily: 'Nunito_600SemiBold' },
})
