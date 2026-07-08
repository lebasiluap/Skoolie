/**
 * Today's Challenge — the daily cohort gauntlet.
 *
 * Five questions, same set for everyone in your cohort (profession × year
 * bucket, materialized server-side in get_daily_challenge), ONE attempt per
 * day. The claim is enforced server-side: credit_xp('daily_challenge')
 * inserts into challenge_claims and returns 0 if today was already claimed.
 *
 * Leaving mid-run does NOT burn the attempt (the claim only lands at
 * results) — the Alert says so explicitly.
 */
import { useEffect, useRef, useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { MAX_CONTENT } from '@/hooks/useResponsive'
import { useFocusSessionWhile } from '@/hooks/useFocusSession'
import { Entrance } from '@/components/ui/Entrance'
import { TopBar } from '@/components/ui/TopBar'
import { CappyHead } from '@/components/mascots/CappyHead'
import { MascotAnimator } from '@/components/mascots/MascotAnimator'
import { buildShuffledMcq, LETTERS } from '@/lib/answers'
import { computeStreakUpdate } from '@/lib/streak'
import { playSound } from '@/lib/sounds'
import { trySave } from '@/lib/reliably'
import { showToast } from '@/lib/toast'

interface ChallengeQ {
  id: string; question_text: string; options: any; correct_answer: string
  explanation: string | null; distractor_explanations: Record<string, string> | null
  topic: string | null; difficulty: string | null; high_yield: boolean | null
  category: string | null; subtopic: string | null
}

type Screen = 'loading' | 'unavailable' | 'done' | 'intro' | 'quiz' | 'results'

export default function ChallengeScreen() {
  const C = useTheme()
  const insets = useSafeAreaInsets()
  const { user, profile, refreshProfile } = useAuth()

  const [screen, setScreen] = useState<Screen>('loading')
  useFocusSessionWhile(screen === 'quiz')
  const [questions, setQuestions] = useState<ChallengeQ[]>([])
  const [day, setDay] = useState('')
  const [priorScore, setPriorScore] = useState(0)      // claimed earlier today
  const [priorTotal, setPriorTotal] = useState(0)
  const [qIndex, setQIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [inReview, setInReview] = useState(false)
  const [score, setScore] = useState(0)
  const [xpEarned, setXpEarned] = useState<number | null>(null)
  const sessionSavedRef = useRef(false)

  const goBack = () => (router.canGoBack() ? router.back() : router.navigate('/(app)/dashboard' as any))

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  async function load() {
    const { data, error } = await supabase.rpc('get_daily_challenge')
    if (error || !data) {
      showToast("Couldn't load today's challenge — check your connection.", 'error')
      setScreen('unavailable')
      return
    }
    if (!data.available) { setScreen('unavailable'); return }
    setDay(String(data.day ?? ''))
    if (data.claimed) {
      setPriorScore(Number(data.score ?? 0))
      setPriorTotal(Number(data.claimed_total ?? data.total ?? 0))
      setScreen('done')
      return
    }
    setQuestions((data.questions ?? []) as ChallengeQ[])
    setScreen('intro')
  }

  // Option order is seeded by day+id — identical for the whole cohort.
  const shuffleSalt = day

  function recordAnswer(q: ChallengeQ, correct: boolean) {
    if (!user) return
    supabase.rpc('record_answer', {
      p_question_id: q.id, p_question_type: 'mcq',
      p_topic: q.topic, p_category: q.category, p_subtopic: q.subtopic,
      p_difficulty: q.difficulty ?? 'medium', p_correct: correct,
    }).then(() => {})
  }

  function handleSubmit() {
    if (!selected || inReview) return
    const q = questions[qIndex]
    const correct = selected === buildShuffledMcq(q.options, q.correct_answer, q.id + shuffleSalt).correctLetter
    playSound(correct ? 'correct' : 'wrong')
    if (correct) setScore(s => s + 1)
    recordAnswer(q, correct)
    setInReview(true)
  }

  function handleNext() {
    if (qIndex + 1 >= questions.length) { setScreen('results'); return }
    setQIndex(i => i + 1)
    setSelected(null)
    setInReview(false)
  }

  function confirmAbandon() {
    Alert.alert(
      'Leave the challenge?',
      "Your attempt isn't used until you finish — but progress on these questions will be lost.",
      [
        { text: 'Keep going', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: goBack },
      ],
    )
  }

  // Save exactly once when results show. credit_xp enforces the daily claim
  // server-side and returns the XP paid (0 = already claimed today).
  useEffect(() => {
    if (screen !== 'results' || sessionSavedRef.current || !user || !profile || questions.length === 0) return
    sessionSavedRef.current = true
    ;(async () => {
      let xp: number | null = null
      for (let attempt = 0; attempt < 2 && xp === null; attempt++) {
        const { data, error } = await supabase.rpc('credit_xp', {
          p_kind: 'daily_challenge', p_score: score, p_total: questions.length,
          p_timed: false, p_bonus: 0, p_slot: 0,
        })
        if (!error) xp = Number(data ?? 0)
        else if (attempt === 1) showToast("Couldn't save your challenge — check your connection. Your XP may not have counted.", 'error')
      }
      setXpEarned(xp ?? 0)
      if (xp !== null && xp > 0) {
        const streakUpd = computeStreakUpdate(profile)
        await trySave(() => supabase.from('quiz_sessions').insert({
          user_id: user.id, score, question_ids: questions.map(q => q.id),
          xp_earned: xp, mode: 'daily_challenge', timed: false, topic: null,
        }))
        if (Object.keys(streakUpd).length > 0) {
          await trySave(() => supabase.from('user_profiles').update({ ...streakUpd }).eq('id', user.id))
        }
        playSound('complete')
        refreshProfile()
      }
    })()
  }, [screen]) // eslint-disable-line react-hooks/exhaustive-deps

  const cohortLabel = profile
    ? (profile.profession.charAt(0).toUpperCase() + profile.profession.slice(1)) +
      (profile.study_year && profile.study_year !== 'practitioner' ? ` · ${profile.study_year.replace('year', 'Year ')}` : profile.study_year === 'practitioner' ? ' · Practitioner' : '')
    : ''

  // ── Loading / unavailable / already-done ─────────────────────────────────
  if (screen === 'loading') {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <TopBar title="Practice" />
        <ActivityIndicator size="large" color={C.teal} style={{ marginTop: 80 }} />
      </View>
    )
  }

  if (screen === 'unavailable') {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <TopBar title="Practice" />
        <View style={s.centerWrap}>
          <MascotAnimator expr="thinking"><CappyHead expr="thinking" size={88} /></MascotAnimator>
          <Text style={[s.bigTitle, { color: C.text }]}>No challenge today</Text>
          <Text style={[s.subText, { color: C.textSoft }]}>We couldn't put a challenge together right now — check back tomorrow.</Text>
          <TouchableOpacity onPress={goBack} style={[s.primaryBtn, { backgroundColor: C.teal, marginTop: 24 }]}>
            <Text style={[s.primaryBtnText, { color: C.onTeal }]}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  if (screen === 'done') {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <TopBar title="Practice" />
        <View style={s.centerWrap}>
          <MascotAnimator expr="happy"><CappyHead expr="happy" size={88} /></MascotAnimator>
          <Text style={[s.bigTitle, { color: C.text }]}>Challenge complete ✓</Text>
          <Text style={[s.subText, { color: C.textSoft }]}>
            You scored <Text style={{ color: C.text, fontFamily: 'Nunito_800ExtraBold' }}>{priorScore}/{priorTotal || 5}</Text> today. A fresh challenge lands at midnight.
          </Text>
          <TouchableOpacity onPress={goBack} style={[s.primaryBtn, { backgroundColor: C.teal, marginTop: 24 }]}>
            <Text style={[s.primaryBtnText, { color: C.onTeal }]}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  // ── Intro — the consent moment before the one attempt ────────────────────
  if (screen === 'intro') {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <TopBar title="Practice" />
        <ScrollView contentContainerStyle={[s.centerWrap, { flexGrow: 1, width: '100%', maxWidth: MAX_CONTENT, alignSelf: 'center' }]} showsVerticalScrollIndicator={false}>
          <MascotAnimator expr="wave"><CappyHead expr="wave" size={96} /></MascotAnimator>
          <Text style={[s.bigTitle, { color: C.text }]}>Today's Challenge</Text>
          {cohortLabel ? <Text style={[s.cohortChipText, { color: C.teal, backgroundColor: C.tealTint }]}>{cohortLabel}</Text> : null}
          <View style={{ marginTop: 18, gap: 10, alignSelf: 'stretch' }}>
            {[
              { icon: 'list' as const, text: `${questions.length} questions, easy to hard — same set as everyone in your year` },
              { icon: 'flame' as const, text: 'One attempt. No retakes until tomorrow.' },
              { icon: 'flash' as const, text: 'Up to +40 XP, counted toward your league' },
            ].map(row => (
              <View key={row.icon} style={[s.factRow, { backgroundColor: C.surface, borderColor: C.border }]}>
                <Ionicons name={row.icon} size={17} color={C.teal} />
                <Text style={[s.factText, { color: C.textSoft }]}>{row.text}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity
            onPress={() => setScreen('quiz')}
            style={[s.primaryBtn, { backgroundColor: C.teal, marginTop: 26, alignSelf: 'stretch' }]}
            accessibilityRole="button" accessibilityLabel="Start today's challenge"
          >
            <Text style={[s.primaryBtnText, { color: C.onTeal }]}>I'm ready →</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={goBack} style={{ marginTop: 14, padding: 6 }} accessibilityRole="button" accessibilityLabel="Not now">
            <Text style={[s.subText, { color: C.textFaint }]}>Not now</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    )
  }

  // ── Results ───────────────────────────────────────────────────────────────
  if (screen === 'results') {
    const total = questions.length
    const pct = total ? Math.round((score / total) * 100) : 0
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <TopBar title="Practice" />
        <ScrollView contentContainerStyle={[s.centerWrap, { flexGrow: 1, width: '100%', maxWidth: MAX_CONTENT, alignSelf: 'center' }]} showsVerticalScrollIndicator={false}>
          <MascotAnimator expr={pct >= 60 ? 'happy' : 'thinking'}><CappyHead expr={pct >= 60 ? 'happy' : 'thinking'} size={96} /></MascotAnimator>
          <Text style={[s.bigTitle, { color: C.text }]}>Challenge complete!</Text>
          <Text style={[s.resultScore, { color: C.teal }]}>{score}/{total}</Text>
          {xpEarned === null ? (
            <ActivityIndicator size="small" color={C.teal} style={{ marginTop: 8 }} />
          ) : xpEarned > 0 ? (
            <View style={[s.xpPill, { backgroundColor: C.tealTint }]}>
              <Ionicons name="flash" size={14} color={C.teal} />
              <Text style={[s.xpPillText, { color: C.teal }]}>+{xpEarned} XP</Text>
            </View>
          ) : (
            <Text style={[s.subText, { color: C.textFaint }]}>Already claimed today — this run was practice only.</Text>
          )}
          <Text style={[s.subText, { color: C.textSoft, marginTop: 14 }]}>Same time tomorrow — a fresh set drops at midnight.</Text>
          <TouchableOpacity onPress={goBack} style={[s.primaryBtn, { backgroundColor: C.teal, marginTop: 24, alignSelf: 'stretch' }]}>
            <Text style={[s.primaryBtnText, { color: C.onTeal }]}>Done</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    )
  }

  // ── Quiz — focused session (no TopBar / tab bar) ──────────────────────────
  const q = questions[qIndex]
  if (!q) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <ActivityIndicator size="large" color={C.teal} style={{ marginTop: insets.top + 80 }} />
      </View>
    )
  }
  const shuffled = buildShuffledMcq(q.options, q.correct_answer, q.id + shuffleSalt)
  const isCorrect = selected === shuffled.correctLetter

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Header — matches MCQ's focused session */}
      <View style={[s.quizHeader, { paddingTop: insets.top + 10, backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={confirmAbandon} accessibilityLabel="Exit challenge" accessibilityRole="button" hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }} style={[s.iconBtn, { backgroundColor: C.surface2, borderColor: C.border }]}>
          <Ionicons name="close" size={20} color={C.textSoft} />
        </TouchableOpacity>
        <View style={s.progressCluster} accessible accessibilityLabel={`Question ${qIndex + 1} of ${questions.length}`}>
          <View style={s.segRow}>
            {questions.map((_, i) => {
              const done = i < qIndex || (i === qIndex && inReview)
              const curr = i === qIndex && !inReview
              return <View key={i} style={[s.seg, { backgroundColor: done || curr ? C.teal : C.surface3, opacity: curr ? 0.35 : 1 }]} />
            })}
          </View>
          <Text style={[s.qCounter, { color: C.textSoft }]}>{qIndex + 1}/{questions.length}</Text>
        </View>
        <View style={[s.challengeChip, { backgroundColor: C.tealTint }]}>
          <Ionicons name="trophy" size={13} color={C.teal} />
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={[s.quizScroll, { flexGrow: 1, paddingBottom: 8, width: '100%', maxWidth: MAX_CONTENT, alignSelf: 'center' }]} showsVerticalScrollIndicator={false}>
        {/* Ask block — Cappy asks, same as MCQ */}
        <Entrance key={`ask-${qIndex}`} style={s.askBlock}>
          <View style={s.badgeRow}>
            {q.topic && (
              <View style={[s.tagChip, { backgroundColor: C.tealTint }]}>
                <Text style={[s.tagText, { color: C.teal }]}>{q.topic}</Text>
              </View>
            )}
            {q.difficulty && (
              <View style={[s.tagChip, { backgroundColor: q.difficulty === 'easy' ? C.greenTint : q.difficulty === 'hard' ? C.redTint : C.amberTint }]}>
                <Text style={[s.tagText, { color: q.difficulty === 'easy' ? C.green : q.difficulty === 'hard' ? C.red : C.amber }]}>{q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1)}</Text>
              </View>
            )}
          </View>
          <View style={s.stemRow}>
            <MascotAnimator expr={inReview ? (isCorrect ? 'happy' : 'wrong') : 'idle'}>
              <CappyHead expr={inReview ? (isCorrect ? 'happy' : 'wrong') : 'idle'} size={110} />
            </MascotAnimator>
            <View style={[s.stemBubble, { backgroundColor: C.surface, borderColor: C.border, ...C.shadow }]}>
              <View style={s.tailWrap} pointerEvents="none">
                <View style={[s.bubbleTail, { borderRightColor: C.surface }]} />
              </View>
              <Text style={[s.stem, { color: C.text }]}>{q.question_text}</Text>
            </View>
          </View>
        </Entrance>

        {/* Options — cascade in, stretch to fill (matches MCQ) */}
        {shuffled.options.map((text, i) => {
          const letter = LETTERS[i]
          const isSel = selected === letter
          const isAns = letter === shuffled.correctLetter
          let bg = C.surface, border = C.border, textColor = C.text, chipBg = C.surface3, chipText = C.textSoft, chipChar = letter
          if (inReview) {
            if (isAns) { bg = C.tealTint; border = C.teal; textColor = C.tealDeep; chipBg = C.teal; chipText = C.onTeal; chipChar = '✓' }
            else if (isSel) { bg = C.redTint; border = C.red; textColor = C.red; chipBg = C.red; chipText = C.onTeal; chipChar = '✗' }
            else { bg = C.surface2 }
          } else if (isSel) {
            bg = C.tealTint; border = C.teal; textColor = C.tealDeep; chipBg = C.teal; chipText = C.onTeal
          }
          return (
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

        {/* Inline review — explanation right below the options */}
        {inReview && (q.explanation || (!isCorrect && selected && q.distractor_explanations?.[shuffled.displayToOriginalLetter[selected] ?? selected])) && (
          <Entrance dy={10} style={[s.explainCard, { backgroundColor: C.surface, borderColor: isCorrect ? C.green : C.red }]}>
            <Text style={[s.explainLabel, { color: isCorrect ? C.green : C.red }]}>{isCorrect ? '✓ CORRECT' : '✗ NOT QUITE'}</Text>
            {q.explanation ? <Text style={[s.explainText, { color: C.text }]}>{q.explanation}</Text> : null}
            {!isCorrect && selected && q.distractor_explanations?.[shuffled.displayToOriginalLetter[selected] ?? selected] ? (
              <>
                <Text style={[s.explainLabel, { color: C.red, marginTop: 10 }]}>WHY {selected} WAS WRONG</Text>
                <Text style={[s.explainText, { color: C.textSoft }]}>{q.distractor_explanations[shuffled.displayToOriginalLetter[selected] ?? selected]}</Text>
              </>
            ) : null}
          </Entrance>
        )}
      </ScrollView>

      {/* Action bar — flows with content */}
      <View style={[s.bottomBar, { paddingBottom: insets.bottom + 12, backgroundColor: C.bg }]}>
        {!inReview ? (
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!selected}
            accessibilityState={{ disabled: !selected }}
            style={[s.primaryBtn, selected ? { backgroundColor: C.teal } : { backgroundColor: C.surface2, borderWidth: 1.5, borderColor: C.border }]}
          >
            <Text style={[s.primaryBtnText, { color: selected ? C.onTeal : C.textFaint }]}>{selected ? 'Submit answer' : 'Pick an answer'}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={handleNext} style={[s.primaryBtn, { backgroundColor: C.teal }]}>
            <Text style={[s.primaryBtnText, { color: C.onTeal }]}>{qIndex + 1 >= questions.length ? 'See results →' : 'Next question →'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 26, paddingVertical: 30 },
  bigTitle: { fontSize: 24, fontFamily: 'Nunito_900Black', marginTop: 14, textAlign: 'left' },
  subText: { fontSize: 14, fontFamily: 'Nunito_600SemiBold', lineHeight: 21, marginTop: 8, textAlign: 'center' },
  cohortChipText: { fontSize: 12.5, fontFamily: 'Nunito_800ExtraBold', paddingVertical: 5, paddingHorizontal: 12, borderRadius: 999, overflow: 'hidden', marginTop: 10 },
  factRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, borderWidth: 1, padding: 14 },
  factText: { flex: 1, fontSize: 13.5, fontFamily: 'Nunito_600SemiBold', lineHeight: 19 },
  primaryBtn: { padding: 16, borderRadius: 999, alignItems: 'center' },
  primaryBtnText: { fontSize: 15.5, fontFamily: 'Nunito_800ExtraBold' },
  resultScore: { fontSize: 44, fontFamily: 'Nunito_900Black', marginTop: 6, fontVariant: ['tabular-nums'] },
  xpPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 7, paddingHorizontal: 14, borderRadius: 999, marginTop: 10 },
  xpPillText: { fontSize: 14, fontFamily: 'Nunito_800ExtraBold' },

  quizHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  iconBtn: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  challengeChip: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  progressCluster: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 14 },
  segRow: { flex: 1, flexDirection: 'row', gap: 3, height: 6 },
  seg: { flex: 1, height: 6, borderRadius: 3 },
  qCounter: { fontSize: 13, fontFamily: 'Nunito_800ExtraBold', fontVariant: ['tabular-nums'] },

  quizScroll: { paddingHorizontal: 18, paddingTop: 18 },
  askBlock: { marginBottom: 16 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  tagChip: { paddingVertical: 4, paddingHorizontal: 11, borderRadius: 999 },
  tagText: { fontSize: 12, fontFamily: 'Nunito_800ExtraBold' },
  stemRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stemBubble: { flex: 1, borderRadius: 20, borderWidth: 1, padding: 18 },
  tailWrap: { position: 'absolute', left: -10, top: 0, bottom: 0, justifyContent: 'center' },
  bubbleTail: { width: 0, height: 0, borderTopWidth: 9, borderBottomWidth: 9, borderRightWidth: 11, borderTopColor: 'transparent', borderBottomColor: 'transparent' },
  stem: { fontSize: 18, fontFamily: 'Nunito_700Bold', lineHeight: 28 },

  option: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 13, borderRadius: 16, borderWidth: 2, paddingVertical: 16, paddingHorizontal: 14 },
  optChip: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  optChipText: { fontSize: 14.5, fontFamily: 'Nunito_800ExtraBold' },
  optText: { flex: 1, fontSize: 15, fontFamily: 'Nunito_600SemiBold', lineHeight: 21 },

  explainCard: { borderRadius: 16, borderWidth: 1.5, padding: 16, marginTop: 4, marginBottom: 12 },
  explainLabel: { fontSize: 11, fontFamily: 'Nunito_800ExtraBold', letterSpacing: 0.8, marginBottom: 6 },
  explainText: { fontSize: 14.5, fontFamily: 'Nunito_600SemiBold', lineHeight: 22 },

  bottomBar: { paddingHorizontal: 18, paddingTop: 12 },
})
