/**
 * UnitResults — pass/fail against the unit's 80% bar.
 *
 * Saving happens HERE, exactly once, when the screen first shows (mirrors the
 * app-wide "save on results" convention): best score + unlock pointer into
 * course_progress, XP through the existing credit_xp RPC ('mcq' for standard
 * units, 'case_study' for boss/mastery — no new XP paths).
 */
import { useEffect, useRef, useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/hooks/useTheme'
import { MAX_CONTENT } from '@/hooks/useResponsive'
import { TopBar } from '@/components/ui/TopBar'
import { CappyHead } from '@/components/mascots/CappyHead'
import { MascotAnimator } from '@/components/mascots/MascotAnimator'
import { playSound } from '@/lib/sounds'
import { showToast } from '@/lib/toast'
import { creditUnitXp, saveUnitResult } from '../lib/engine'
import type { Course, CourseProgress, CourseUnit, UnitOutcome } from '../lib/types'

interface Props {
  course: Course
  unit: CourseUnit
  score: number
  total: number
  userId: string | null
  progress: CourseProgress | null
  /** Called after a successful save so the parent can refresh its progress map. */
  onSaved: () => void
  onRetry: () => void
  onBackToPath: () => void
}

export function UnitResults({ course, unit, score, total, userId, progress, onSaved, onRetry, onBackToPath }: Props) {
  const C = useTheme()
  const pct = total > 0 ? Math.round((score / total) * 100) : 0
  const passed = pct >= unit.passPct
  const isFinal = unit.index === course.units.length - 1

  const savedRef = useRef(false)   // save exactly once per results view
  const [outcome, setOutcome] = useState<UnitOutcome | null>(null)

  useEffect(() => { playSound('complete') }, [])

  useEffect(() => {
    if (savedRef.current || !userId || total === 0) return
    savedRef.current = true
    ;(async () => {
      const [saveResult, xpOk] = await Promise.all([
        saveUnitResult(userId, course, unit, score, total, progress),
        creditUnitXp(unit, score, total),
      ])
      setOutcome(saveResult)
      if (!saveResult.saved || !xpOk) {
        showToast("Couldn't save your progress — check your connection.", 'error')
      } else {
        onSaved()
      }
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const newlyMastered = outcome?.newlyMastered ?? false
  const title = newlyMastered ? 'Course mastered!' : passed ? (unit.kind === 'boss' ? 'Checkpoint cleared!' : 'Unit passed!') : 'Not quite there'
  const sub = newlyMastered
    ? `You conquered every unit of ${course.topic}.`
    : passed
      ? isFinal ? 'That was the final exam — one more push!' : 'The next unit is unlocked.'
      : `You need ${unit.passPct}% to pass this unit — review and go again.`

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <TopBar title="Courses" />
      <ScrollView
        contentContainerStyle={[s.scroll, { flexGrow: 1, justifyContent: 'center', width: '100%', maxWidth: MAX_CONTENT, alignSelf: 'center' }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: 'center', marginBottom: 18 }}>
          <MascotAnimator expr={passed ? 'happy' : 'wrong'}>
            <CappyHead expr={passed ? 'happy' : 'wrong'} size={88} />
          </MascotAnimator>
        </View>
        <Text style={[s.title, { color: C.text }]}>{title}</Text>
        <Text style={[s.sub, { color: C.textSoft }]}>{sub}</Text>

        <View style={s.grid}>
          <View style={[s.stat, { backgroundColor: C.surface, borderColor: C.border, ...C.shadow }]}>
            <Text style={[s.statVal, { color: C.teal }]}>{score}/{total}</Text>
            <Text style={[s.statLabel, { color: C.textFaint }]}>Correct</Text>
          </View>
          <View style={[s.stat, { backgroundColor: C.surface, borderColor: passed ? C.green : C.red, ...C.shadow }]}>
            <Text style={[s.statVal, { color: passed ? C.green : C.red }]}>{pct}%</Text>
            <Text style={[s.statLabel, { color: C.textFaint }]}>vs {unit.passPct}% to pass</Text>
          </View>
          <View style={[s.stat, { backgroundColor: C.surface, borderColor: C.border, ...C.shadow }]}>
            <Text style={[s.statVal, { color: C.coral }]}>
              {unit.kind === 'standard' ? '⚡ MCQ' : '⚡ Case'}
            </Text>
            <Text style={[s.statLabel, { color: C.textFaint }]}>XP credited</Text>
          </View>
        </View>

        {newlyMastered && (
          <View style={[s.masteryBanner, { backgroundColor: C.amberTint, borderColor: C.gold }]}>
            <Ionicons name="trophy" size={20} color={C.gold} />
            <Text style={[s.masteryText, { color: C.gold }]}>
              {course.topic} — mastered
            </Text>
          </View>
        )}

        <View style={{ gap: 12, width: '100%' }}>
          {!passed && (
            <TouchableOpacity onPress={onRetry} style={[s.btn, { backgroundColor: C.teal }]}>
              <Text style={[s.btnText, { color: C.onTeal }]}>↺  Try this unit again</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={onBackToPath}
            style={[s.btn, passed
              ? { backgroundColor: C.teal }
              : { backgroundColor: C.surface, borderWidth: 1, borderColor: C.borderStrong }]}
          >
            <Text style={[s.btnText, { color: passed ? C.onTeal : C.textSoft }]}>
              {passed ? 'Continue →' : 'Back to path'}
            </Text>
          </TouchableOpacity>
          {passed && (
            <TouchableOpacity onPress={onRetry} style={[s.btn, { backgroundColor: C.surface, borderWidth: 1, borderColor: C.borderStrong }]}>
              <Text style={[s.btnText, { color: C.textSoft }]}>↺  Replay for a better score</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40, alignItems: 'center' },
  title: { fontSize: 28, fontFamily: 'Nunito_800ExtraBold', letterSpacing: -0.5, marginBottom: 6, textAlign: 'center', alignSelf: 'stretch' },
  sub: { fontSize: 15, fontFamily: 'Nunito_600SemiBold', marginBottom: 24, textAlign: 'center', alignSelf: 'stretch' },
  grid: { flexDirection: 'row', gap: 12, marginBottom: 24, width: '100%' },
  stat: { flex: 1, borderRadius: 18, borderWidth: 1, padding: 16, alignItems: 'center' },
  statVal: { fontSize: 20, fontFamily: 'Nunito_900Black', letterSpacing: -0.5 },
  statLabel: { fontSize: 11.5, fontFamily: 'Nunito_600SemiBold', marginTop: 3, textAlign: 'center' },
  masteryBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, borderWidth: 1.5, paddingVertical: 14, paddingHorizontal: 18, marginBottom: 24, alignSelf: 'stretch', justifyContent: 'center' },
  masteryText: { fontSize: 15, fontFamily: 'Nunito_800ExtraBold' },
  btn: { padding: 15, borderRadius: 999, alignItems: 'center' },
  btnText: { fontSize: 15, fontFamily: 'Nunito_800ExtraBold' },
})
