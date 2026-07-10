/**
 * DuelRunner — the rapid-fire-style timed run for one duel.
 *
 * Adapts the Rapid Fire UX (countdown ring on the question card, quick answer
 * pills, timeout counts wrong) for the frozen 10-question duel set. Total time
 * is the tiebreaker, so every question's elapsed time accumulates — a timeout
 * banks the full window.
 *
 * Anti-peek: leaving mid-run AUTO-SUBMITS the current score (remaining
 * questions count as wrong, elapsed time banked). Backgrounding does the same.
 * A force-kill can still dodge this (documented in the README) — acceptable
 * because duels pay no XP.
 *
 * Option order is seeded by duel id + question id — identical for BOTH
 * players, so neither side gets an easier layout.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Animated, Easing, Alert, AppState } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Circle } from 'react-native-svg'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { MAX_CONTENT } from '@/hooks/useResponsive'
import { buildShuffledMcq, LETTERS } from '@/lib/answers'
import { playSound, playCombo } from '@/lib/sounds'
import { haptic } from '@/lib/haptics'
import { showToast } from '@/lib/toast'
import { duelGet, duelSubmit, fmtMs } from './api'
import type { Duel, DuelQuestion } from './types'

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

const SECONDS_PER_Q = 15
const ADVANCE_DELAY_MS = 700
const TAP_GRACE_MS = 350   // taps this soon after a question appear were aimed at the previous one

interface Props {
  duelId: string
  /** Run submitted (or duel found already-played/expired) — show the result */
  onDone: (duel: Duel) => void
  onExit: () => void
}

export function DuelRunner({ duelId, onDone, onExit }: Props) {
  const C = useTheme()
  const insets = useSafeAreaInsets()
  const { user } = useAuth()

  const [duel, setDuel] = useState<Duel | null>(null)
  const [questions, setQuestions] = useState<DuelQuestion[]>([])
  const [phase, setPhase] = useState<'loading' | 'intro' | 'run' | 'submitting'>('loading')
  const [qIndex, setQIndex] = useState(0)
  const [answered, setAnswered] = useState<string | null>(null)   // letter, '' = timeout, null = live
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)

  const scoreRef = useRef(0)
  const totalMsRef = useRef(0)
  const submittedRef = useRef(false)
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Countdown ring (mirrors rapidfire.tsx) ─────────────────────────────────
  const barAnim = useRef(new Animated.Value(1)).current
  const [secsLeft, setSecsLeft] = useState(SECONDS_PER_Q)
  useEffect(() => {
    const id = barAnim.addListener(({ value }) => {
      const sLeft = Math.ceil(value * SECONDS_PER_Q)
      setSecsLeft(prev => (prev === sLeft ? prev : sLeft))
    })
    return () => barAnim.removeListener(id)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load()
    return () => { if (advanceTimer.current) clearTimeout(advanceTimer.current) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    const { duel: d, error } = await duelGet(duelId)
    if (error || !d) {
      showToast("Couldn't load the duel — check your connection.", 'error')
      onExit()
      return
    }
    if (d.you.done || d.status === 'complete' || d.status === 'expired') {
      onDone(d)   // nothing to run — straight to results
      return
    }
    setDuel(d)
    setQuestions((d.questions ?? []) as DuelQuestion[])
    setPhase('intro')
  }

  // ── Auto-submit on leave/background (anti-peek) ───────────────────────────
  const finishRun = useCallback(async (finalScore: number, finalMs: number) => {
    if (submittedRef.current) return
    submittedRef.current = true
    if (advanceTimer.current) clearTimeout(advanceTimer.current)
    barAnim.stopAnimation()
    setPhase('submitting')
    const { duel: d, error } = await duelSubmit(duelId, finalScore, Math.round(finalMs))
    if (error || !d) {
      // Submit failures must be visible — the run is spent either way.
      showToast("Couldn't save your duel run — check your connection.", 'error')
      onExit()
      return
    }
    onDone(d)
  }, [duelId, onDone, onExit]) // eslint-disable-line react-hooks/exhaustive-deps

  const phaseRef = useRef(phase)
  phaseRef.current = phase
  useEffect(() => {
    const sub = AppState.addEventListener('change', st => {
      if (st !== 'active' && phaseRef.current === 'run') {
        // Backgrounding mid-run: bank what's done, remaining count wrong.
        finishRun(scoreRef.current, totalMsRef.current)
      }
    })
    return () => sub.remove()
  }, [finishRun])

  function confirmAbandon() {
    Alert.alert(
      'Leave the duel?',
      'Leaving submits your run as-is — unanswered questions count as wrong. No retries: your rival gets this exact set too.',
      [
        { text: 'Keep going', style: 'cancel' },
        { text: 'Submit & leave', style: 'destructive', onPress: () => finishRun(scoreRef.current, totalMsRef.current) },
      ],
    )
  }

  // ── Per-question timer ─────────────────────────────────────────────────────
  const questionShownAt = useRef(0)
  useEffect(() => {
    if (phase !== 'run' || answered !== null || questions.length === 0) return
    questionShownAt.current = Date.now()
    barAnim.setValue(1)
    const anim = Animated.timing(barAnim, {
      toValue: 0,
      duration: SECONDS_PER_Q * 1000,
      easing: Easing.linear,
      useNativeDriver: false,
    })
    anim.start(({ finished }) => { if (finished) onTimeout() })
    const tickAt = setTimeout(() => haptic('tick'), SECONDS_PER_Q * 750)
    return () => { anim.stop(); clearTimeout(tickAt) }
  }, [phase, qIndex, answered, questions.length]) // eslint-disable-line react-hooks/exhaustive-deps

  function recordHistory(q: DuelQuestion, correct: boolean) {
    if (!user) return
    supabase.rpc('record_answer', {
      p_question_id: q.id, p_question_type: 'mcq',
      p_topic: q.topic, p_category: q.category, p_subtopic: q.subtopic,
      p_difficulty: q.difficulty ?? 'medium', p_correct: correct,
    }).then(() => {})
  }

  function advance(nextScore: number) {
    advanceTimer.current = setTimeout(() => {
      if (qIndex + 1 >= questions.length) {
        finishRun(nextScore, totalMsRef.current)
      } else {
        setAnswered(null)
        setQIndex(i => i + 1)
      }
    }, ADVANCE_DELAY_MS)
  }

  function onAnswer(letter: string) {
    if (answered !== null || phase !== 'run') return
    const elapsed = Date.now() - questionShownAt.current
    if (elapsed < TAP_GRACE_MS) return
    const q = questions[qIndex]
    const correct = letter === buildShuffledMcq(q.options, q.correct_answer, duelId + q.id).correctLetter
    totalMsRef.current += Math.min(elapsed, SECONDS_PER_Q * 1000)
    setAnswered(letter)
    recordHistory(q, correct)
    let next = scoreRef.current
    if (correct) {
      next = scoreRef.current + 1
      scoreRef.current = next
      setScore(next)
      setStreak(st => st + 1)
      playCombo(streak + 1)
    } else {
      setStreak(0)
      playSound('wrong')
    }
    advance(next)
  }

  function onTimeout() {
    if (answered !== null || phaseRef.current !== 'run') return
    const q = questions[qIndex]
    totalMsRef.current += SECONDS_PER_Q * 1000   // a timeout banks the full window
    playSound('wrong')
    setAnswered('')
    setStreak(0)
    recordHistory(q, false)
    advance(scoreRef.current)
  }

  // ── Loading / submitting ───────────────────────────────────────────────────
  if (phase === 'loading' || phase === 'submitting') {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={C.coral} />
        {phase === 'submitting' && <Text style={[s.savingNote, { color: C.textFaint }]}>Locking in your run…</Text>}
      </View>
    )
  }

  // ── Intro ──────────────────────────────────────────────────────────────────
  if (phase === 'intro' && duel) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <View style={[s.header, { paddingTop: insets.top + 10, backgroundColor: C.surface, borderBottomColor: C.border }]}>
          <TouchableOpacity onPress={onExit} accessibilityRole="button" accessibilityLabel="Back" style={[s.iconBtn, { backgroundColor: C.surface2, borderColor: C.border }]}>
            <Ionicons name="arrow-back" size={20} color={C.textSoft} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: C.text, flex: 1 }]}>Duel vs {duel.them.name}</Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', padding: 24, width: '100%', maxWidth: MAX_CONTENT, alignSelf: 'center' }}>
          <Text style={[s.introEmoji]}>⚔️</Text>
          <Text style={[s.introTitle, { color: C.text }]}>{duel.total} questions. One shot.</Text>
          <Text style={[s.introSub, { color: C.textSoft }]}>
            {duel.them.name} gets the exact same set. Higher score wins — ties go to the faster time. {SECONDS_PER_Q}s per question; leaving mid-run submits as-is.
          </Text>
          <TouchableOpacity onPress={() => setPhase('run')} style={[s.cta, { backgroundColor: C.coral }]} activeOpacity={0.85}>
            <Text style={s.ctaText}>Start the duel</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  // ── Run ────────────────────────────────────────────────────────────────────
  const q = questions[qIndex]
  if (!q) return <View style={{ flex: 1, backgroundColor: C.bg }} />
  const shuffled = buildShuffledMcq(q.options, q.correct_answer, duelId + q.id)
  const barColor = barAnim.interpolate({
    inputRange: [0, 0.15, 0.5, 0.62, 1],
    outputRange: [C.red, C.red, C.amber, C.green, C.green],
  })
  const RING_R = 21, RING_SW = 4
  const RING_CIRC = 2 * Math.PI * RING_R
  const ringOffset = barAnim.interpolate({ inputRange: [0, 1], outputRange: [RING_CIRC, 0] })

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={[s.runHeader, { paddingTop: insets.top + 10, backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={confirmAbandon} accessibilityLabel="Exit duel" accessibilityRole="button" style={[s.iconBtn, { backgroundColor: C.surface2, borderColor: C.border }]}>
          <Ionicons name="close" size={20} color={C.textSoft} />
        </TouchableOpacity>
        <Text style={[s.counter, { color: C.textSoft }]}>{qIndex + 1} / {questions.length}</Text>
        <View style={[s.timeChip, { backgroundColor: C.coralTint }]}>
          <Ionicons name="stopwatch-outline" size={13} color={C.coralDeep} />
          <Text style={[s.timeChipText, { color: C.coralDeep }]}>{fmtMs(totalMsRef.current)}</Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 18, paddingBottom: 40, width: '100%', maxWidth: MAX_CONTENT, alignSelf: 'center' }} showsVerticalScrollIndicator={false}>
        <View style={[s.stemCard, { backgroundColor: C.coralTint, borderColor: C.coral }]}>
          <View style={{ flex: 1 }}>
            <View style={s.stemLabelRow}>
              <Ionicons name="flash" size={13} color={C.coralDeep} />
              <Text style={[s.stemLabel, { color: C.coralDeep }]}>DUEL QUESTION</Text>
            </View>
            <Text style={[s.stem, { color: C.text }]}>{q.question_text}</Text>
          </View>
          <View style={s.ringWrap} accessible accessibilityLabel={`${secsLeft} seconds left`}>
            <Svg width={54} height={54} viewBox="0 0 54 54">
              <Circle cx={27} cy={27} r={RING_R} stroke={C.surface3} strokeWidth={RING_SW} fill="none" />
              <AnimatedCircle
                cx={27} cy={27} r={RING_R}
                stroke={barColor as any} strokeWidth={RING_SW} fill="none"
                strokeLinecap="round"
                strokeDasharray={`${RING_CIRC}`}
                strokeDashoffset={ringOffset as any}
                transform="rotate(-90 27 27)"
              />
            </Svg>
            <Text style={[s.ringSecs, { color: secsLeft <= 3 ? C.red : C.text }]}>{secsLeft}</Text>
          </View>
        </View>

        <Text style={[s.pickLabel, { color: C.textFaint }]}>TAP THE ANSWER</Text>
        {shuffled.options.map((text, i) => {
          const letter = LETTERS[i]
          const isAns = letter === shuffled.correctLetter
          const isPick = answered === letter
          let bg = C.surface, border = C.border, fg = C.text
          if (answered !== null) {
            if (isAns) { bg = C.greenTint; border = C.green; fg = C.green }
            else if (isPick) { bg = C.redTint; border = C.red; fg = C.red }
          }
          return (
            <TouchableOpacity key={letter} disabled={answered !== null} onPress={() => onAnswer(letter)}
              activeOpacity={0.7}
              style={[s.pill, { backgroundColor: bg, borderColor: border, opacity: answered !== null && !isAns && !isPick ? 0.4 : 1, ...C.shadow }]}>
              {answered !== null && isAns && <Ionicons name="checkmark-circle" size={17} color={C.green} />}
              {answered !== null && isPick && !isAns && <Ionicons name="close-circle" size={17} color={C.red} />}
              <Text style={[s.pillText, { color: fg }]} numberOfLines={2}>{text}</Text>
            </TouchableOpacity>
          )
        })}

        {answered === '' && (
          <Text style={[s.timeoutNote, { color: C.red }]}>⏰ Time's up — full window banked</Text>
        )}
        <Text style={[s.scoreNote, { color: C.textFaint }]}>Score so far: {score}</Text>
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  runHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 1 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  headerTitle: { fontSize: 18, fontFamily: 'Nunito_900Black' },
  counter: { fontSize: 14, fontFamily: 'Nunito_800ExtraBold' },
  timeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 11, borderRadius: 999 },
  timeChipText: { fontSize: 13, fontFamily: 'Nunito_900Black', fontVariant: ['tabular-nums'] },
  savingNote: { marginTop: 12, fontSize: 13, fontFamily: 'Nunito_700Bold' },

  introEmoji: { fontSize: 56, textAlign: 'center', marginBottom: 14 },
  introTitle: { fontSize: 24, fontFamily: 'Nunito_900Black', textAlign: 'center' },
  introSub: { fontSize: 14, fontFamily: 'Nunito_600SemiBold', textAlign: 'center', marginTop: 10, lineHeight: 21, marginBottom: 26 },
  cta: { paddingVertical: 15, borderRadius: 999, alignItems: 'center' },
  ctaText: { fontSize: 15, fontFamily: 'Nunito_800ExtraBold', color: '#FFFFFF' },

  stemCard: { flexGrow: 1, maxHeight: 280, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, borderWidth: 1.5, padding: 18, marginBottom: 18 },
  ringWrap: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center' },
  ringSecs: { position: 'absolute', fontSize: 15, fontFamily: 'Nunito_900Black', fontVariant: ['tabular-nums'] },
  stemLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  stemLabel: { fontSize: 11, fontFamily: 'Nunito_800ExtraBold', letterSpacing: 1 },
  stem: { fontSize: 18, fontFamily: 'Nunito_800ExtraBold', lineHeight: 26 },
  pickLabel: { fontSize: 10.5, fontFamily: 'Nunito_800ExtraBold', letterSpacing: 0.8, marginBottom: 10 },
  pill: { flexGrow: 1, maxHeight: 80, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 26, borderWidth: 1.5, paddingVertical: 14, paddingHorizontal: 18, marginBottom: 10 },
  pillText: { fontSize: 15.5, fontFamily: 'Nunito_800ExtraBold', textAlign: 'center', flexShrink: 1 },
  timeoutNote: { textAlign: 'center', marginTop: 6, fontSize: 13, fontFamily: 'Nunito_800ExtraBold' },
  scoreNote: { textAlign: 'center', marginTop: 10, fontSize: 12, fontFamily: 'Nunito_700Bold' },
})
