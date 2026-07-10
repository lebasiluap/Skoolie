/**
 * UnitRunner — focused-session question runner for one course unit.
 *
 * Adapted from the MCQ practice screen (app/(app)/practice/mcq.tsx) rather
 * than importing it, per the feature-lab isolation rules: same Cappy stem
 * bubble, cascading options, review bottom sheet, and bottom action bar.
 * Case items (boss/mastery) show their clinical vignette above the stem.
 * The mastery exam runs at rapid pace via unit.timerSeconds.
 */
import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator, Alert, Animated, Pressable, ScrollView, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '@/hooks/useTheme'
import { MAX_CONTENT } from '@/hooks/useResponsive'
import { Entrance } from '@/components/ui/Entrance'
import { CappyHead } from '@/components/mascots/CappyHead'
import { BuddyHead } from '@/components/mascots/BuddyHead'
import { MascotAnimator } from '@/components/mascots/MascotAnimator'
import { buildShuffledMcq, LETTERS } from '@/lib/answers'
import { URGENT_AT_SEC } from '@/lib/timing'
import { playSound } from '@/lib/sounds'
import { haptic } from '@/lib/haptics'
import { composeUnitSession, recordCourseAnswer } from '../lib/engine'
import type { Course, CourseUnit, RunnerItem } from '../lib/types'

type Phase = 'question' | 'review'

interface Props {
  course: Course
  unit: CourseUnit
  accessKey: string | null
  onFinish: (score: number, total: number) => void
  onExit: () => void
}

interface ReviewSnap {
  item: RunnerItem
  selected: string
  isCorrect: boolean
  timedOut?: boolean
}

export function UnitRunner({ course, unit, accessKey, onFinish, onExit }: Props) {
  const C = useTheme()
  const insets = useSafeAreaInsets()

  const [items, setItems] = useState<RunnerItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [idx, setIdx] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('question')
  const [overlayVisible, setOverlayVisible] = useState(false)
  const [score, setScore] = useState(0)
  const [reviewSnap, setReviewSnap] = useState<ReviewSnap | null>(null)

  // Re-shuffles option order each session, stable across renders (mcq.tsx pattern).
  const shuffleSalt = useRef(Math.random().toString(36).slice(2)).current

  // ── Compose the session — the unit RULE is evaluated against the bank NOW ──
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const composed = await composeUnitSession(course, unit, accessKey)
      if (cancelled) return
      if (composed.length === 0) setLoadFailed(true)
      setItems(composed)
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Rapid pace (mastery) — per-question countdown, timeout counts as wrong ──
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const handleTimeoutRef = useRef<() => void>(() => {})
  useEffect(() => {
    if (unit.timerSeconds == null || phase !== 'question' || items.length === 0) {
      setTimeLeft(null)
      return
    }
    let fired = false
    setTimeLeft(unit.timerSeconds)
    const iv = setInterval(() => {
      setTimeLeft(t => {
        if (t == null) return t
        if (t <= 1) {
          clearInterval(iv)
          if (!fired) { fired = true; handleTimeoutRef.current() }
          return 0
        }
        if (t - 1 === URGENT_AT_SEC) haptic('tick')
        return t - 1
      })
    }, 1000)
    return () => clearInterval(iv)
  }, [phase, idx, items.length, unit.timerSeconds])

  // Review sheet slides up each time it (re)opens.
  const sheetAnim = useRef(new Animated.Value(0)).current
  useEffect(() => {
    if (phase === 'review' && overlayVisible) {
      sheetAnim.setValue(420)
      Animated.spring(sheetAnim, { toValue: 0, friction: 10, tension: 70, useNativeDriver: true }).start()
    }
  }, [overlayVisible, phase]) // eslint-disable-line react-hooks/exhaustive-deps

  function submit() {
    const item = items[idx]
    if (!selected || !item) return
    const correct = selected === buildShuffledMcq(item.options, item.correctAnswer, item.id + shuffleSalt).correctLetter
    playSound(correct ? 'correct' : 'wrong')
    recordCourseAnswer(item, correct)      // per-question history (MCQ items only)
    setReviewSnap({ item, selected, isCorrect: correct })
    if (correct) setScore(v => v + 1)
    setPhase('review')
    setOverlayVisible(true)
  }

  handleTimeoutRef.current = () => {
    const item = items[idx]
    if (!item || phase !== 'question') return
    playSound('wrong')
    recordCourseAnswer(item, false)
    setReviewSnap({ item, selected: '', isCorrect: false, timedOut: true })
    setPhase('review')
    setOverlayVisible(true)
  }

  function next() {
    setPhase('question')
    setSelected(null)
    setOverlayVisible(false)
    if (idx + 1 >= items.length) {
      onFinish(score, items.length)
    } else {
      setIdx(i => i + 1)
    }
  }

  function confirmAbandon() {
    const answered = idx > 0 || phase === 'review' || selected !== null
    if (!answered) { onExit(); return }
    Alert.alert(
      'Leave this unit?',
      'Progress is only recorded when you finish the unit — leaving now loses this run.',
      [
        { text: 'Keep going', style: 'cancel' },
        { text: 'Exit unit', style: 'destructive', onPress: onExit },
      ],
    )
  }

  // ── Loading / empty ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={C.teal} />
        <Text style={[s.loadingText, { color: C.textFaint }]}>Composing {unit.title}…</Text>
      </View>
    )
  }
  const item = items[idx]
  if (loadFailed || !item) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={[s.loadingText, { color: C.textSoft, textAlign: 'center' }]}>
          Couldn't build this unit right now — check your connection and try again.
        </Text>
        <TouchableOpacity onPress={onExit} style={[s.submitBtn, { backgroundColor: C.teal, alignSelf: 'stretch', marginTop: 18 }]}>
          <Text style={[s.submitBtnText, { color: C.onTeal }]}>Back to path</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const inReview = phase === 'review'
  const shuffled = buildShuffledMcq(item.options, item.correctAnswer, item.id + shuffleSalt)
  const correctLetter = shuffled.correctLetter
  const reviewShuffle = reviewSnap
    ? buildShuffledMcq(reviewSnap.item.options, reviewSnap.item.correctAnswer, reviewSnap.item.id + shuffleSalt)
    : null
  const isCase = item.kind === 'case'
  const Mascot = isCase ? BuddyHead : CappyHead
  const mascotExpr = inReview && reviewSnap ? (reviewSnap.isCorrect ? 'happy' : 'wrong') : 'idle'
  const accent = unit.kind === 'mastery' ? C.gold : unit.kind === 'boss' ? C.coral : C.teal

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Header — fullscreen focused session (no TopBar/tab bar) */}
      <View style={[s.header, { paddingTop: insets.top + 10, backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={confirmAbandon} accessibilityRole="button" accessibilityLabel="Exit unit"
          hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
          style={[s.iconBtn, { backgroundColor: C.surface2, borderColor: C.border }]}>
          <Ionicons name="close" size={20} color={C.textSoft} />
        </TouchableOpacity>
        <View style={s.progressCluster} accessible accessibilityLabel={`Question ${idx + 1} of ${items.length}`}>
          <View style={s.segRow}>
            {items.map((_, i) => {
              const done = i < idx || (i === idx && inReview)
              const curr = i === idx && !inReview
              return <View key={i} style={[s.seg, { backgroundColor: done || curr ? accent : C.surface3, opacity: curr ? 0.35 : 1 }]} />
            })}
          </View>
          <Text style={[s.qCounter, { color: C.textSoft }]}>{idx + 1}/{items.length}</Text>
          {timeLeft != null && (
            <View style={[s.timerPill, { backgroundColor: timeLeft <= URGENT_AT_SEC ? C.redTint : C.tealTint }]}>
              <Ionicons name="timer-outline" size={13} color={timeLeft <= URGENT_AT_SEC ? C.red : C.teal} />
              <Text style={[s.timerText, { color: timeLeft <= URGENT_AT_SEC ? C.red : C.teal }]}>{timeLeft}s</Text>
            </View>
          )}
        </View>
        <View style={[s.unitChip, { backgroundColor: C.surface2, borderColor: C.border }]}>
          <Text style={[s.unitChipText, { color: accent }]} numberOfLines={1}>{unit.title}</Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.scroll, { flexGrow: 1, paddingBottom: 8, width: '100%', maxWidth: MAX_CONTENT, alignSelf: 'center' }]}
        showsVerticalScrollIndicator={false}
      >
        <Entrance key={`ask-${idx}`} style={{ marginBottom: 16 }}>
          {/* Case vignette — the "boss" context block */}
          {isCase && item.vignette && (
            <View style={[s.vignette, { backgroundColor: C.coralTint, borderColor: C.coral }]}>
              <Text style={[s.vignetteLabel, { color: C.coralDeep }]}>
                {item.caseTitle ? item.caseTitle.toUpperCase() : 'CASE STUDY'}
              </Text>
              <Text style={[s.vignetteText, { color: C.text }]}>{item.vignette}</Text>
            </View>
          )}

          {/* Stem — mascot beside a speech bubble (mcq.tsx pattern) */}
          <View style={s.stemRow}>
            <MascotAnimator expr={mascotExpr}>
              <Mascot expr={mascotExpr} size={100} />
            </MascotAnimator>
            <View style={[s.stemBubble, { backgroundColor: C.surface, borderColor: C.border, ...C.shadow }]}>
              <View style={s.tailWrap} pointerEvents="none">
                <View style={[s.bubbleTail, { borderRightColor: C.surface }]} />
              </View>
              <Text style={[s.stem, { color: C.text }]}>{item.questionText}</Text>
            </View>
          </View>
        </Entrance>

        {/* Options — cascade in per question */}
        {shuffled.options.map((text, i) => {
          const letter = LETTERS[i]
          const isSel = selected === letter
          const isAns = letter === correctLetter
          let bg = C.surface, border = C.border, textColor = C.text
          let chipBg = C.surface3, chipText = C.textSoft, chipChar = letter
          if (inReview) {
            if (isAns) { bg = C.tealTint; border = C.teal; textColor = C.tealDeep; chipBg = C.teal; chipText = C.onTeal; chipChar = '✓' }
            else if (isSel) { bg = C.redTint; border = C.red; textColor = C.red; chipBg = C.red; chipText = C.onTeal; chipChar = '✗' }
            else { bg = C.surface2 }
          } else if (isSel) {
            bg = C.tealTint; border = C.teal; textColor = C.tealDeep; chipBg = C.teal; chipText = C.onTeal
          }
          return (
            <Entrance key={`${idx}-${letter}`} delay={60 + i * 45} style={{ flexGrow: 1, marginBottom: 12 }}>
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

      {/* Submit bar */}
      {!inReview && (
        <View style={[s.bottomBar, { borderTopColor: C.border, paddingBottom: insets.bottom + 12, backgroundColor: C.bg }]}>
          <TouchableOpacity
            onPress={submit}
            disabled={!selected}
            accessibilityState={{ disabled: !selected }}
            style={[s.submitBtn, selected
              ? { backgroundColor: accent }
              : { backgroundColor: C.surface2, borderWidth: 1.5, borderColor: C.border }]}
          >
            <Text style={[s.submitBtnText, { color: selected ? C.onTeal : C.textFaint }]}>
              {selected ? 'Submit answer' : 'Pick an answer'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Next bar — sheet dismissed but still in review */}
      {inReview && !overlayVisible && (
        <View style={[s.bottomBar, { borderTopColor: C.border, paddingBottom: insets.bottom + 12, backgroundColor: C.bg }]}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity onPress={() => setOverlayVisible(true)}
              accessibilityRole="button" accessibilityLabel="Re-open explanation"
              style={[s.whyChip, { borderColor: C.teal, backgroundColor: C.tealTint }]}>
              <Ionicons name="chatbubble-ellipses" size={16} color={C.teal} />
              <Text style={[s.whyChipText, { color: C.teal }]}>Why?</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={next} style={[s.submitBtn, { backgroundColor: accent, flex: 1 }]}>
              <Text style={[s.submitBtnText, { color: C.onTeal }]}>
                {idx + 1 >= items.length ? 'See results →' : 'Next question →'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Review bottom sheet — stem stays readable above; tap scrim to study it */}
      {inReview && overlayVisible && reviewSnap && (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
          <Pressable style={s.sheetScrim} onPress={() => setOverlayVisible(false)} />
          <Animated.View style={[s.sheet, {
            backgroundColor: C.surface, borderColor: C.border,
            paddingBottom: insets.bottom + 10, transform: [{ translateY: sheetAnim }], ...C.shadowLg,
          }]}>
            <View style={s.sheetHandleWrap}>
              <View style={[s.sheetHandle, { backgroundColor: C.surface3 }]} />
            </View>
            <View style={s.sheetHeadRow}>
              <View style={[s.verdictBadge, { backgroundColor: reviewSnap.isCorrect ? C.greenTint : C.redTint }]}>
                <Text style={[s.verdictText, { color: reviewSnap.isCorrect ? C.green : C.red }]}>
                  {reviewSnap.isCorrect ? '✓ Correct' : reviewSnap.timedOut ? '⏰ Time’s up' : '✗ Not quite'}
                </Text>
              </View>
              <View style={{ flex: 1 }} />
              <TouchableOpacity onPress={() => setOverlayVisible(false)}
                hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                accessibilityRole="button" accessibilityLabel="Hide explanation">
                <Ionicons name="chevron-down" size={24} color={C.textFaint} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flexGrow: 0 }} showsVerticalScrollIndicator={false}>
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
                    {reviewShuffle?.correctLetter ? `${reviewShuffle.correctLetter}. ` : ''}
                    {reviewShuffle?.options[LETTERS.indexOf(reviewShuffle?.correctLetter ?? '')] ?? reviewSnap.item.correctAnswer}
                  </Text>
                </View>
              )}

              <Text style={[s.explainText, { color: C.text, marginTop: 10 }]}>{reviewSnap.item.explanation}</Text>

              {/* Why wrong — MCQ items only (cases have no distractor map); skipped on timeout */}
              {!reviewSnap.isCorrect && !reviewSnap.timedOut && (
                <View style={[s.distractorBox, { borderTopColor: C.red }]}>
                  <Text style={[s.answerLabel, { color: C.red }]}>YOU CHOSE</Text>
                  <Text style={[s.answerText, { color: C.textSoft, marginBottom: 8 }]}>
                    {reviewSnap.selected}. {reviewShuffle?.options[LETTERS.indexOf(reviewSnap.selected)]}
                  </Text>
                  {reviewSnap.item.distractorExplanations?.[reviewShuffle?.displayToOriginalLetter[reviewSnap.selected] ?? reviewSnap.selected] && (
                    <>
                      <Text style={[s.distractorLabel, { color: C.red }]}>WHY {reviewSnap.selected} WAS WRONG</Text>
                      <Text style={[s.distractorText, { color: C.text }]}>
                        {reviewSnap.item.distractorExplanations[reviewShuffle?.displayToOriginalLetter[reviewSnap.selected] ?? reviewSnap.selected]}
                      </Text>
                    </>
                  )}
                </View>
              )}
            </ScrollView>

            <TouchableOpacity onPress={next} style={[s.nextBtn, { backgroundColor: accent }]}>
              <Text style={[s.submitBtnText, { color: C.onTeal }]}>
                {idx + 1 >= items.length ? 'See results →' : 'Next question →'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  loadingText: { fontSize: 14, fontFamily: 'Nunito_600SemiBold', marginTop: 14 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  iconBtn: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  progressCluster: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 12 },
  segRow: { flex: 1, flexDirection: 'row', gap: 3, height: 6 },
  seg: { flex: 1, height: 6, borderRadius: 3 },
  qCounter: { fontSize: 13, fontFamily: 'Nunito_800ExtraBold', fontVariant: ['tabular-nums'] },
  timerPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 9, borderRadius: 999 },
  timerText: { fontSize: 12, fontFamily: 'Nunito_800ExtraBold', fontVariant: ['tabular-nums'] },
  unitChip: { maxWidth: 110, paddingVertical: 6, paddingHorizontal: 11, borderRadius: 999, borderWidth: 1 },
  unitChipText: { fontSize: 11.5, fontFamily: 'Nunito_800ExtraBold' },
  scroll: { paddingHorizontal: 18, paddingTop: 18 },
  vignette: { borderRadius: 16, borderWidth: 1.5, padding: 16, marginBottom: 14 },
  vignetteLabel: { fontSize: 10.5, fontFamily: 'Nunito_800ExtraBold', letterSpacing: 0.6, marginBottom: 6 },
  vignetteText: { fontSize: 14, fontFamily: 'Nunito_600SemiBold', lineHeight: 21 },
  stemRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stemBubble: { flex: 1, borderRadius: 20, borderWidth: 1, padding: 18 },
  tailWrap: { position: 'absolute', left: -10, top: 0, bottom: 0, justifyContent: 'center' },
  bubbleTail: { width: 0, height: 0, borderTopWidth: 9, borderBottomWidth: 9, borderRightWidth: 11, borderTopColor: 'transparent', borderBottomColor: 'transparent' },
  stem: { fontSize: 17, fontFamily: 'Nunito_700Bold', lineHeight: 26 },
  option: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 13, borderRadius: 16, borderWidth: 2, paddingVertical: 16, paddingHorizontal: 14 },
  optChip: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  optChipText: { fontSize: 13, fontFamily: 'Nunito_800ExtraBold' },
  optText: { fontSize: 15, fontFamily: 'Nunito_600SemiBold', flex: 1, lineHeight: 22 },
  bottomBar: { paddingHorizontal: 18, paddingTop: 12, borderTopWidth: 1 },
  submitBtn: { padding: 16, borderRadius: 999, alignItems: 'center' },
  submitBtnText: { fontSize: 16, fontFamily: 'Nunito_800ExtraBold' },
  whyChip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 18, borderRadius: 999, borderWidth: 1.5 },
  whyChipText: { fontSize: 14, fontFamily: 'Nunito_800ExtraBold' },
  sheetScrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.18)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderBottomWidth: 0, paddingHorizontal: 18, paddingTop: 4, maxHeight: '80%' },
  sheetHandleWrap: { alignItems: 'center', paddingVertical: 7 },
  sheetHandle: { width: 42, height: 4.5, borderRadius: 999 },
  sheetHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  verdictBadge: { paddingVertical: 9, paddingHorizontal: 18, borderRadius: 999 },
  verdictText: { fontSize: 14, fontFamily: 'Nunito_800ExtraBold' },
  answerRow: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 2 },
  answerLabel: { fontSize: 10, fontFamily: 'Nunito_800ExtraBold', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 3 },
  answerText: { fontSize: 14, fontFamily: 'Nunito_700Bold', lineHeight: 20 },
  explainText: { fontSize: 16, fontFamily: 'Nunito_600SemiBold', lineHeight: 26 },
  distractorBox: { marginTop: 14, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth * 2 },
  distractorLabel: { fontSize: 11, fontFamily: 'Nunito_800ExtraBold', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 },
  distractorText: { fontSize: 14, fontFamily: 'Nunito_600SemiBold', lineHeight: 20 },
  nextBtn: { marginTop: 12, padding: 16, borderRadius: 999, alignItems: 'center' },
})
