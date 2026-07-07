/**
 * Rapid Fire — fast recall mode.
 *
 * 5 questions per run. Each question has an automatic, smoothly-depleting time
 * bar (green → orange past halfway → red near the end). Tap an option for
 * instant right/wrong feedback and auto-advance — no submit, no review overlay.
 * Timeout counts as wrong (the run continues). Consecutive correct answers grow
 * a combo multiplier; a miss or timeout resets it. Faster answers earn a speed
 * bonus. XP = accuracy base (max 50) + combo/speed bonus — the bonus is clamped
 * server-side in credit_xp so the league can't be farmed.
 *
 * Content comes from get_rapid_fire_questions: curated `rapid_fire` rows first,
 * else short recall MCQs derived from the existing bank.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Animated, Easing, Alert, AppState } from 'react-native'
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { MAX_CONTENT } from '@/hooks/useResponsive'
import { useFocusSessionWhile } from '@/hooks/useFocusSession'
import { useTheme } from '@/hooks/useTheme'
import { useThemeMode } from '@/contexts/ThemeContext'
import { TopBar } from '@/components/ui/TopBar'
import { TopicIcon } from '@/components/ui/TopicIcon'
import { topicColor } from '@/constants/topics'
import { buildShuffledMcq, LETTERS } from '@/lib/answers'
import { computeStreakUpdate } from '@/lib/streak'
import { CappyHead } from '@/components/mascots/CappyHead'
import { MascotAnimator } from '@/components/mascots/MascotAnimator'
import { preferInterests } from '@/lib/interests'
import { playSound, playCombo } from '@/lib/sounds'
import { haptic } from '@/lib/haptics'
import { trySave } from '@/lib/reliably'
import { showToast } from '@/lib/toast'
import type { Question } from '@/types'

const RUN_SIZE = 5
const SECONDS_PER_Q = 12
const ADVANCE_DELAY_MS = 700
// Taps landing within this window of a question appearing are ignored — they
// were almost certainly aimed at the PREVIOUS question (post-timeout cascade:
// the user grades one question behind and everything counts wrong).
const TAP_GRACE_MS = 350

/** Combo multiplier for the NEXT correct answer, given the current streak. */
const comboMult = (streak: number) => 1 + 0.2 * Math.min(streak, 5)   // ×1.0 → ×2.0

type Screen = 'topics' | 'run' | 'results'

// Rapid Fire brand accent — purple (theme has no purple token; dark mode gets a
// lighter violet, with dark on-purple text, mirroring the teal/onTeal convention).
export default function RapidFireScreen() {
  const C = useTheme()
  const { isDark } = useThemeMode()
  const P = C.rf
  const PTint = P + '22'
  const onP = C.onRf
  const { user, profile, refreshProfile } = useAuth()
  const { smartStart, barrage, slot } = useLocalSearchParams<{ smartStart?: string; barrage?: string; slot?: string }>()
  // Barrage entry: the FIRST run of this visit is the 2× blitz; "Go again" runs
  // afterwards are normal rapid fire (the daily claim is spent server-side anyway).
  const barragePendingRef = useRef(barrage === '1')
  const barrageSlotRef = useRef(Number(slot ?? 0))
  const [isBarrageRun, setIsBarrageRun] = useState(false)

  const insets = useSafeAreaInsets()
  const [screen, setScreen] = useState<Screen>('topics')
  // Focused session — hide app chrome (tab bar) while a run is live
  useFocusSessionWhile(screen === 'run')
  const [topics, setTopics] = useState<{ topic: string; count: number }[]>([])
  const [loadingTopics, setLoadingTopics] = useState(true)
  const [loadingQs, setLoadingQs] = useState(false)
  const [questions, setQuestions] = useState<Question[]>([])
  const [qIndex, setQIndex] = useState(0)
  const [runTopic, setRunTopic] = useState<string | null>(null)

  // Per-question answer state: null = live, else the letter tapped ('' = timeout)
  const [answered, setAnswered] = useState<string | null>(null)
  const [wasCorrect, setWasCorrect] = useState(false)

  // Scoring
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [bonusPts, setBonusPts] = useState(0)
  // Total completed barrages (for "N more to a streak freeze"); fetched at results
  const [barrageTotal, setBarrageTotal] = useState<number | null>(null)

  // Fresh option order each app session (stable across renders) — see mcq.tsx.
  const shuffleSalt = useRef(Math.random().toString(36).slice(2)).current
  const autoStarted = useRef(false)
  const sessionSavedRef = useRef(false)
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Time bar ──────────────────────────────────────────────────────────────
  // 1 → 0 over SECONDS_PER_Q. Width + interpolated color animate together
  // (non-native driver — both are layout/color props).
  const barAnim = useRef(new Animated.Value(1)).current
  const barValueRef = useRef(1)
  const [secsLeft, setSecsLeft] = useState(SECONDS_PER_Q)
  useEffect(() => {
    const id = barAnim.addListener(({ value }) => {
      barValueRef.current = value
      const s = Math.ceil(value * SECONDS_PER_Q)
      setSecsLeft(prev => (prev === s ? prev : s))   // update only on whole-second change
    })
    return () => barAnim.removeListener(id)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Combo chip pop on change
  const comboPop = useRef(new Animated.Value(1)).current
  function popCombo() {
    comboPop.setValue(1.35)
    Animated.spring(comboPop, { toValue: 1, friction: 4, useNativeDriver: true }).start()
  }

  useEffect(() => {
    loadTopics()
    if ((smartStart === '1' || barrage === '1') && !autoStarted.current) { autoStarted.current = true; startRun(null) }
    return () => { if (advanceTimer.current) clearTimeout(advanceTimer.current) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── No background runs ─────────────────────────────────────────────────────
  // Expo-router keeps pushed screens mounted, and RN flushes paused timers in
  // one tick on app resume — a mid-run screen left in the stack would keep
  // timing out questions, recording wrong answers, and even SAVING phantom
  // sessions. Abandon any active run the moment this screen loses focus or the
  // app leaves the foreground.
  const isFocusedRef = useRef(true)
  const abandonRun = useCallback(() => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current)
    barAnim.stopAnimation()
    setAnswered(null)
    setScreen(prev => (prev === 'run' ? 'topics' : prev))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useFocusEffect(useCallback(() => {
    isFocusedRef.current = true
    return () => {
      isFocusedRef.current = false
      abandonRun()
    }
  }, [abandonRun]))
  useEffect(() => {
    const sub = AppState.addEventListener('change', st => {
      if (st !== 'active') abandonRun()
    })
    return () => sub.remove()
  }, [abandonRun])

  // The "you finished" fanfare — same sound at every results screen, win or lose.
  useEffect(() => { if (screen === 'results') playSound('complete') }, [screen])

  // Save the completed run exactly once when results show (mirrors MCQ flow).
  // Never save from an unfocused screen — a backgrounded zombie run must not
  // be able to record sessions even if it somehow reaches 'results'.
  useEffect(() => {
    if (screen !== 'results' || sessionSavedRef.current || !user || !profile || questions.length === 0) return
    if (!isFocusedRef.current) return
    sessionSavedRef.current = true
    const base = Math.round((score / questions.length) * 50)
    const bonus = Math.min(25, Math.max(0, bonusPts))
    const streakUpd = computeStreakUpdate(profile)
    ;(async () => {
      const sessionOk = await trySave(() => supabase.from('quiz_sessions').insert({
        user_id: user.id,
        score,
        question_ids: questions.map(q => q.id),
        // Mirrors the server formula: barrage pays 2× base; claim is enforced there.
        xp_earned: (isBarrageRun ? base * 2 : base) + bonus,
        mode: isBarrageRun ? 'barrage' : 'rapid_fire',
        timed: true,
        topic: runTopic,
      }))
      // XP + level + weekly league standing credited server-side; bonus is clamped there too.
      const xpOk = await trySave(() => supabase.rpc('credit_xp', { p_kind: isBarrageRun ? 'barrage' : 'rapid_fire', p_score: score, p_total: questions.length, p_timed: false, p_bonus: bonus, p_slot: barrageSlotRef.current }))
      if (isBarrageRun) {
        const { count } = await supabase.from('barrage_claims').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
        setBarrageTotal(count ?? null)
      }
      let streakOk = true
      if (Object.keys(streakUpd).length > 0) {
        streakOk = await trySave(() => supabase.from('user_profiles').update({ ...streakUpd }).eq('id', user.id))
      }
      if (!sessionOk || !xpOk || !streakOk) {
        showToast(isBarrageRun
          ? "Couldn't save your barrage — check your connection. Your 2× XP may not have counted."
          : "Couldn't save your progress — check your connection. This run's XP may not have counted.", 'error')
      }
      refreshProfile()
    })()
  }, [screen]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadTopics() {
    if (!profile) return
    const { data } = await supabase.rpc('get_question_counts', {
      p_profession: profile.profession,
      p_question_type: 'mcq',
      p_access_key: profile.access_key ?? null,
      p_cognitive_type: 'recall',
    })
    const byTopic: Record<string, number> = {}
    for (const r of (data ?? []) as any[]) byTopic[r.topic] = (byTopic[r.topic] ?? 0) + Number(r.cnt)
    setTopics(Object.entries(byTopic).map(([topic, count]) => ({ topic, count })).sort((a, b) => b.count - a.count))
    setLoadingTopics(false)
  }

  async function startRun(topic: string | null) {
    if (loadingQs) return   // double-tap guard — one fetch at a time
    // Every early exit must be VISIBLE (audit: post-barrage 'Go again' appeared
    // dead because failures here were silent).
    if (!profile) {
      showToast('Your profile is still loading — try again in a second.', 'error')
      return
    }
    setLoadingQs(true)
    const { data, error } = await supabase.rpc('get_rapid_fire_questions', {
      p_profession: profile.profession,
      // Over-fetch so areas of interest can lead the run (empty interests = as-is)
      p_limit: topic ? RUN_SIZE : RUN_SIZE * 3,
      p_topic: topic,
      p_access_key: profile.access_key ?? null,
    })
    setLoadingQs(false)
    if (error) {
      showToast("Couldn't load questions — check your connection and try again.", 'error')
      return
    }
    const qs = preferInterests((data ?? []) as Question[], topic ? [] : profile.interests).slice(0, RUN_SIZE)
    if (qs.length === 0) {
      Alert.alert('No rapid-fire questions', 'This topic has no quick-recall questions yet — try another one.')
      return
    }
    sessionSavedRef.current = false
    setIsBarrageRun(barragePendingRef.current)
    barragePendingRef.current = false   // consume — only the first run is the blitz
    setRunTopic(topic)
    setQuestions(qs)
    setQIndex(0); setAnswered(null); setWasCorrect(false)
    setScore(0); setStreak(0); setBestStreak(0); setBonusPts(0)
    setScreen('run')
  }

  // Start/restart the bar whenever a new question goes live
  const questionShownAt = useRef(0)
  useEffect(() => {
    if (screen !== 'run' || answered !== null || questions.length === 0) return
    questionShownAt.current = Date.now()
    barAnim.setValue(1)
    const anim = Animated.timing(barAnim, {
      toValue: 0,
      duration: SECONDS_PER_Q * 1000,
      easing: Easing.linear,
      useNativeDriver: false,
    })
    anim.start(({ finished }) => { if (finished) onTimeout() })
    // Physical nudge as the bar goes red (last quarter) — mirrors the color shift.
    const tickAt = setTimeout(() => haptic('tick'), SECONDS_PER_Q * 750)
    return () => { anim.stop(); clearTimeout(tickAt) }
  }, [screen, qIndex, answered, questions.length]) // eslint-disable-line react-hooks/exhaustive-deps

  function recordHistory(q: Question, correct: boolean) {
    if (!user) return
    supabase.rpc('record_answer', {
      p_question_id: q.id, p_question_type: 'mcq',
      p_topic: q.topic, p_category: q.category, p_subtopic: q.subtopic,
      p_difficulty: q.difficulty ?? 'medium', p_correct: correct,
    }).then(() => {})
  }

  function advance() {
    advanceTimer.current = setTimeout(() => {
      setAnswered(null)
      setWasCorrect(false)
      if (qIndex + 1 >= questions.length) setScreen('results')
      else setQIndex(i => i + 1)
    }, ADVANCE_DELAY_MS)
  }

  /** Confirm before abandoning a live run — a barrage window especially. */
  function confirmAbandon() {
    const answeredCount = qIndex + (answered !== null ? 1 : 0)
    if (answeredCount === 0) { setScreen('topics'); return }
    Alert.alert(
      isBarrageRun ? 'Leave the barrage?' : 'Leave this run?',
      isBarrageRun
        ? 'Your 2× XP only banks when you finish. Leaving now loses this run (your window stays open).'
        : `You've answered ${answeredCount} of ${questions.length}. Progress only saves when you finish.`,
      [
        { text: 'Keep going', style: 'cancel' },
        { text: 'Exit', style: 'destructive', onPress: () => setScreen('topics') },
      ],
    )
  }

  function onAnswer(letter: string) {
    if (answered !== null) return
    if (Date.now() - questionShownAt.current < TAP_GRACE_MS) return   // aimed at the previous question
    const q = questions[qIndex]
    const correct = letter === buildShuffledMcq(q.options, q.correct_answer, q.id + shuffleSalt).correctLetter
    setAnswered(letter)
    setWasCorrect(correct)
    recordHistory(q, correct)
    if (correct) {
      playCombo(streak + 1)   // pitch rises as the combo builds
      // combo (based on streak BEFORE this answer) + speed (bar remaining at tap)
      const extra = Math.round(10 * (comboMult(streak) - 1)) + Math.round(3 * barValueRef.current)
      setBonusPts(b => b + extra)
      setScore(s => s + 1)
      setStreak(st => { const n = st + 1; setBestStreak(b => Math.max(b, n)); return n })
      popCombo()
    } else {
      playSound('wrong')
      setStreak(0)
    }
    advance()
  }

  function onTimeout() {
    if (answered !== null) return
    if (!isFocusedRef.current) return   // never progress a run in the background
    const q = questions[qIndex]
    playSound('wrong')
    setAnswered('')          // '' = timed out, no option chosen
    setWasCorrect(false)
    setStreak(0)
    recordHistory(q, false)
    advance()
  }

  // ── Topics screen ─────────────────────────────────────────────────────────
  if (screen === 'topics') {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <TopBar title="Practice" />
        <View style={[s.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
          <TouchableOpacity onPress={() => router.navigate('/(app)/practice' as any)} style={[s.iconBtn, { backgroundColor: C.surface2, borderColor: C.border }]}>
            <Ionicons name="arrow-back" size={20} color={C.textSoft} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[s.headerTitle, { color: C.text }]}>Rapid Fire</Text>
            <Text style={[s.headerSub, { color: C.textFaint }]}>{RUN_SIZE} questions · beat the bar · build your combo</Text>
          </View>
        </View>

        {loadingQs && <ActivityIndicator style={{ marginTop: 30 }} size="large" color={P} />}
        {!loadingQs && (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, width: '100%', maxWidth: MAX_CONTENT, alignSelf: 'center' }} showsVerticalScrollIndicator={false}>
          <TouchableOpacity onPress={() => startRun(null)} activeOpacity={0.85}
            style={[s.surpriseBanner, { backgroundColor: P }]}>
            <Text style={[s.surpriseLeft, { color: onP }]}>🎲 Surprise me</Text>
            <Text style={[s.surpriseRight, { color: onP }]}>Random mix →</Text>
          </TouchableOpacity>

          <Text style={[s.secLabel, { color: C.textFaint }]}>OR PICK A TOPIC</Text>
          {loadingTopics && <ActivityIndicator style={{ marginTop: 16 }} color={P} />}
          {topics.map(t => {
            const tc = topicColor(t.topic)
            return (
              <TouchableOpacity key={t.topic} onPress={() => startRun(t.topic)} activeOpacity={0.75}
                style={[s.topicRow, { backgroundColor: C.surface, borderColor: C.border, ...C.shadow }]}>
                <View style={[s.topicIcon, { backgroundColor: tc.bgLight }]}>
                  <TopicIcon topic={t.topic} size={18} color={tc.color} />
                </View>
                <Text style={[s.topicName, { color: C.text }]} numberOfLines={1}>{t.topic}</Text>
                <Text style={[s.topicCount, { color: C.textFaint }]}>{t.count}</Text>
                <Ionicons name="chevron-forward" size={16} color={C.textFaint} />
              </TouchableOpacity>
            )
          })}
        </ScrollView>
        )}
      </View>
    )
  }

  // ── Run screen ────────────────────────────────────────────────────────────
  if (screen === 'run') {
    const q = questions[qIndex]
    if (!q) return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <ActivityIndicator size="large" color={P} style={{ marginTop: insets.top + 80 }} />
      </View>
    )
    const shuffled = buildShuffledMcq(q.options, q.correct_answer, q.id + shuffleSalt)
    const barColor = barAnim.interpolate({
      // green while >60%, blends to orange around half, red near the end
      inputRange: [0, 0.15, 0.5, 0.62, 1],
      outputRange: [C.red, C.red, C.amber, C.green, C.green],
    })
    const barWidth = barAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })

    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        {/* Focused session: no TopBar/tab bar — header owns the safe area */}
        <View style={[s.runHeader, { paddingTop: insets.top + 10, backgroundColor: C.surface, borderBottomColor: C.border }]}>
          <TouchableOpacity onPress={confirmAbandon} accessibilityLabel="Exit run" accessibilityRole="button" style={[s.iconBtn, { backgroundColor: C.surface2, borderColor: C.border }]}>
            <Ionicons name="close" size={20} color={C.textSoft} />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[s.counter, { color: C.textSoft }]}>{qIndex + 1} / {questions.length}</Text>
            <Text style={[s.secsReadout, { color: secsLeft <= 3 ? C.red : C.textFaint }]} accessibilityLabel={`${secsLeft} seconds left`}>{secsLeft}s</Text>
            {isBarrageRun && (
              <View style={[s.barragePill, { backgroundColor: P }]}>
                <Text style={[s.barragePillText, { color: onP }]}>⚡ 2×</Text>
              </View>
            )}
          </View>
          <Animated.View style={[s.comboChip, {
            backgroundColor: streak > 0 ? PTint : C.surface3,
            transform: [{ scale: comboPop }],
          }]}>
            <Ionicons name="flame" size={13} color={streak > 0 ? P : C.textFaint} />
            <Text style={[s.comboText, { color: streak > 0 ? P : C.textFaint }]}>×{comboMult(streak).toFixed(1)}</Text>
          </Animated.View>
        </View>

        {/* Depleting time bar */}
        <View style={[s.barTrack, { backgroundColor: C.surface3 }]}>
          <Animated.View style={[s.barFill, { width: barWidth, backgroundColor: barColor }]} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 60, width: '100%', maxWidth: MAX_CONTENT, alignSelf: 'center' }} showsVerticalScrollIndicator={false}>
          {/* Question — tinted + labelled so it can't be mistaken for an option */}
          <View style={[s.stemCard, { backgroundColor: PTint, borderColor: P }]}>
            <View style={s.stemLabelRow}>
              <Ionicons name="flash" size={13} color={P} />
              <Text style={[s.stemLabel, { color: P }]}>QUESTION</Text>
            </View>
            <Text style={[s.stem, { color: C.text }]}>{q.question_text}</Text>
          </View>

          <Text style={[s.pickLabel, { color: C.textFaint }]}>TAP THE ANSWER</Text>
          {/* Deliberately NOT MCQ-styled — no letters, just quick centered pills */}
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
                <Text style={[s.pillText, { color: fg }]} numberOfLines={1}>{text}</Text>
              </TouchableOpacity>
            )
          })}

          {answered === '' && (
            <Text style={[s.timeoutNote, { color: C.red }]}>⏰ Time's up — combo reset</Text>
          )}
        </ScrollView>
      </View>
    )
  }

  // ── Results ───────────────────────────────────────────────────────────────
  const total = questions.length
  const pct = total ? Math.round((score / total) * 100) : 0
  const rawBase = Math.round((score / (total || 1)) * 50)
  const base = isBarrageRun ? rawBase * 2 : rawBase
  const bonus = Math.min(25, Math.max(0, bonusPts))
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <TopBar title="Practice" />
      <ScrollView contentContainerStyle={[s.resultScroll, { flexGrow: 1, justifyContent: 'center', width: '100%', maxWidth: MAX_CONTENT, alignSelf: 'center' }]} showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: 'center', marginBottom: 16 }}>
          <MascotAnimator expr={isBarrageRun ? 'happy' : pct >= 60 ? 'happy' : 'wrong'}>
            <CappyHead expr={isBarrageRun ? 'happy' : pct >= 60 ? 'happy' : 'wrong'} size={88} />
          </MascotAnimator>
        </View>
        <Text style={[s.resultTitle, { color: C.text }]}>{isBarrageRun ? '⚡ Barrage complete!' : 'Rapid Fire done!'}</Text>
        <Text style={[s.resultSub, { color: C.textSoft }]}>
          {isBarrageRun
            ? 'You showed up for the blitz — 2× XP banked. That\u2019s a win every time! 🎉'
            : pct >= 80 ? 'Lightning fast!' : pct >= 60 ? 'Quick thinking — keep at it!' : 'Speed comes with reps!'}
        </Text>
        {isBarrageRun && barrageTotal != null && (
          <View style={[s.freezeEarned, { backgroundColor: '#38BDF826' }]}>
            <Ionicons name="snow" size={14} color="#38BDF8" />
            <Text style={s.freezeEarnedText}>
              {barrageTotal % 5 === 0
                ? 'Streak Freeze earned! 5 barrages done 🎉'
                : `${5 - (barrageTotal % 5)} more barrage${5 - (barrageTotal % 5) === 1 ? '' : 's'} to a Streak Freeze`}
            </Text>
          </View>
        )}

        <View style={s.resultGrid}>
          {[
            { val: `${score}/${total}`, label: 'Correct', color: C.teal },
            { val: `×${comboMult(Math.max(0, bestStreak - 1)).toFixed(1)}`, label: 'Best combo', color: P },
            { val: `+${base + bonus}`, label: `XP (incl. +${bonus} bonus)`, color: C.green },
          ].map(t => (
            <View key={t.label} style={[s.resultStat, { backgroundColor: C.surface, borderColor: C.border, ...C.shadow }]}>
              <Text style={[s.resultVal, { color: t.color }]}>{t.val}</Text>
              <Text style={[s.resultLabel, { color: C.textFaint }]}>{t.label}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity onPress={() => startRun(runTopic)} style={[s.cta, { backgroundColor: P, opacity: loadingQs ? 0.7 : 1 }]} activeOpacity={0.85} disabled={loadingQs}>
          {loadingQs
            ? <ActivityIndicator size="small" color={onP} />
            : <Text style={[s.ctaText, { color: onP }]}>⚡ Go again</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setScreen('topics')} style={[s.ctaGhost, { borderColor: C.border }]} activeOpacity={0.8}>
          <Text style={[s.ctaGhostText, { color: C.text }]}>Change topic</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.navigate('/(app)/practice' as any)} activeOpacity={0.8}>
          <Text style={[s.doneLink, { color: C.textFaint }]}>Done</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  headerTitle: { fontSize: 18, fontFamily: 'Nunito_900Black' },
  headerSub: { fontSize: 12.5, fontFamily: 'Nunito_600SemiBold', marginTop: 1 },

  surpriseBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 16, padding: 18 },
  surpriseLeft: { fontSize: 16, fontFamily: 'Nunito_900Black' },
  surpriseRight: { fontSize: 13, fontFamily: 'Nunito_700Bold' },
  secLabel: { fontSize: 11, fontFamily: 'Nunito_800ExtraBold', letterSpacing: 0.8, marginTop: 22, marginBottom: 10 },
  topicRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 8 },
  topicIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  topicName: { flex: 1, fontSize: 14, fontFamily: 'Nunito_700Bold' },
  topicCount: { fontSize: 12, fontFamily: 'Nunito_700Bold' },

  runHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  counter: { fontSize: 14, fontFamily: 'Nunito_800ExtraBold' },
  secsReadout: { fontSize: 13, fontFamily: 'Nunito_800ExtraBold', fontVariant: ['tabular-nums'], minWidth: 30 },
  comboChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 11, borderRadius: 999 },
  comboText: { fontSize: 13, fontFamily: 'Nunito_900Black', fontVariant: ['tabular-nums'] },
  barragePill: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 999 },
  barragePillText: { fontSize: 11, fontFamily: 'Nunito_900Black' },

  barTrack: { height: 10 },
  barFill: { height: 10 },

  stemCard: { borderRadius: 18, borderWidth: 1.5, padding: 18, marginBottom: 18 },
  stemLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  stemLabel: { fontSize: 11, fontFamily: 'Nunito_800ExtraBold', letterSpacing: 1 },
  stem: { fontSize: 18, fontFamily: 'Nunito_800ExtraBold', lineHeight: 26 },
  pickLabel: { fontSize: 10.5, fontFamily: 'Nunito_800ExtraBold', letterSpacing: 0.8, marginBottom: 10 },
  pill: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 999, borderWidth: 1.5, paddingVertical: 14, paddingHorizontal: 18, marginBottom: 10 },
  pillText: { fontSize: 15.5, fontFamily: 'Nunito_800ExtraBold', textAlign: 'center', flexShrink: 1 },
  timeoutNote: { textAlign: 'center', marginTop: 6, fontSize: 13, fontFamily: 'Nunito_800ExtraBold' },

  resultScroll: { paddingHorizontal: 24, paddingVertical: 30 },
  resultTitle: { fontSize: 24, fontFamily: 'Nunito_900Black', textAlign: 'center' },
  resultSub: { fontSize: 14, fontFamily: 'Nunito_600SemiBold', textAlign: 'center', marginTop: 4, marginBottom: 20 },
  freezeEarned: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, alignSelf: 'center', paddingVertical: 7, paddingHorizontal: 14, borderRadius: 999, marginBottom: 16 },
  freezeEarnedText: { fontSize: 13, fontFamily: 'Nunito_800ExtraBold', color: '#38BDF8' },
  resultGrid: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  resultStat: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 14, alignItems: 'center' },
  resultVal: { fontSize: 20, fontFamily: 'Nunito_900Black' },
  resultLabel: { fontSize: 10.5, fontFamily: 'Nunito_600SemiBold', marginTop: 3, textAlign: 'center' },
  cta: { paddingVertical: 15, borderRadius: 999, alignItems: 'center', marginBottom: 10 },
  ctaText: { fontSize: 15, fontFamily: 'Nunito_800ExtraBold' },
  ctaGhost: { paddingVertical: 14, borderRadius: 999, alignItems: 'center', borderWidth: 1.5, marginBottom: 14 },
  ctaGhostText: { fontSize: 14, fontFamily: 'Nunito_800ExtraBold' },
  doneLink: { textAlign: 'center', fontSize: 14, fontFamily: 'Nunito_700Bold' },
})
