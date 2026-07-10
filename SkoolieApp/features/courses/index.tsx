/**
 * Courses feature root — ISOLATED FEATURE LAB.
 *
 * This folder is intentionally dead code to Metro: nothing under app/,
 * components/, lib/, or hooks/ imports from features/, so store builds
 * exclude it. To test on-device, add the single route file described in
 * features/courses/README.md (that route is the ONLY wiring).
 *
 * Navigation is an internal state machine (home → path → runner → results),
 * mirroring how mcq.tsx keeps its topics/quiz/results phases inside one
 * route. Runner phase engages the app-wide focus session (hides the tab bar).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Animated, View } from 'react-native'
import { router } from 'expo-router'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { useFocusSessionWhile } from '@/hooks/useFocusSession'
import { fetchCoursesCatalog, loadCourseProgress } from './lib/engine'
import type { Course, CourseProgress, CourseUnit } from './lib/types'
import { CoursesHome } from './screens/CoursesHome'
import { CoursePath } from './screens/CoursePath'
import { UnitRunner } from './screens/UnitRunner'
import { UnitResults } from './screens/UnitResults'

type Stage =
  | { name: 'home' }
  | { name: 'path'; course: Course }
  | { name: 'runner'; course: Course; unit: CourseUnit }
  | { name: 'results'; course: Course; unit: CourseUnit; score: number; total: number }

export default function CoursesFeature() {
  const C = useTheme()
  const { user, profile } = useAuth()

  const [stage, setStage] = useState<Stage>({ name: 'home' })
  const [courses, setCourses] = useState<Course[]>([])
  const [progress, setProgress] = useState<Map<string, CourseProgress>>(new Map())
  const [loading, setLoading] = useState(true)

  // Hide app chrome while a unit run is active (same store the practice modes use).
  useFocusSessionWhile(stage.name === 'runner')

  // Screen-switch animation — fade + rise, the practice-mode convention.
  const fadeAnim = useRef(new Animated.Value(1)).current
  const slideAnim = useRef(new Animated.Value(0)).current
  const go = useCallback((next: Stage) => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 140, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -10, duration: 140, useNativeDriver: true }),
    ]).start(() => {
      slideAnim.setValue(10)
      setStage(next)
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 16, stiffness: 320 }),
      ]).start()
    })
  }, [fadeAnim, slideAnim])

  const refreshProgress = useCallback(async () => {
    if (!user) return
    setProgress(await loadCourseProgress(user.id))
  }, [user])

  // Catalog + progress load together; the catalog is derived LIVE from the
  // bank, so a fresh question import reshapes courses on next open.
  useEffect(() => {
    if (!profile || !user) return
    let cancelled = false
    ;(async () => {
      const [catalog, prog] = await Promise.all([
        fetchCoursesCatalog(profile.profession, profile.access_key ?? null),
        loadCourseProgress(user.id),
      ])
      if (cancelled) return
      setCourses(catalog)
      setProgress(prog)
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [profile, user])

  const accessKey = profile?.access_key ?? null

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        {stage.name === 'home' && (
          <CoursesHome
            courses={courses}
            progress={progress}
            loading={loading}
            onOpen={course => go({ name: 'path', course })}
            onBack={() => router.back()}
          />
        )}

        {stage.name === 'path' && (
          <CoursePath
            course={stage.course}
            progress={progress.get(stage.course.key) ?? null}
            onStart={unit => go({ name: 'runner', course: stage.course, unit })}
            onBack={() => go({ name: 'home' })}
          />
        )}

        {stage.name === 'runner' && (
          <UnitRunner
            course={stage.course}
            unit={stage.unit}
            accessKey={accessKey}
            onFinish={(score, total) => go({ name: 'results', course: stage.course, unit: stage.unit, score, total })}
            onExit={() => go({ name: 'path', course: stage.course })}
          />
        )}

        {stage.name === 'results' && (
          <UnitResults
            course={stage.course}
            unit={stage.unit}
            score={stage.score}
            total={stage.total}
            userId={user?.id ?? null}
            progress={progress.get(stage.course.key) ?? null}
            onSaved={() => { refreshProgress() }}
            onRetry={() => go({ name: 'runner', course: stage.course, unit: stage.unit })}
            onBackToPath={() => go({ name: 'path', course: stage.course })}
          />
        )}
      </Animated.View>
    </View>
  )
}
