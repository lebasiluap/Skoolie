/**
 * CoursesHome — course cards derived live from the question bank.
 * Each card: topic identity (icon + color), unit count, bank size,
 * progress ring, mastered badge.
 */
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/hooks/useTheme'
import { MAX_CONTENT } from '@/hooks/useResponsive'
import { Entrance } from '@/components/ui/Entrance'
import { TopBar } from '@/components/ui/TopBar'
import { SkeletonList } from '@/components/ui/Skeleton'
import { TopicIcon } from '@/components/ui/TopicIcon'
import { topicColor } from '@/constants/topics'
import { ProgressRing } from '../components/ProgressRing'
import { unitsDone } from '../lib/engine'
import type { Course, CourseProgress } from '../lib/types'

interface Props {
  courses: Course[]
  progress: Map<string, CourseProgress>
  loading: boolean
  onOpen: (course: Course) => void
  onBack: () => void
}

export function CoursesHome({ courses, progress, loading, onOpen, onBack }: Props) {
  const C = useTheme()

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <TopBar title="Courses" />
      <View style={[s.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={onBack} accessibilityRole="button" accessibilityLabel="Back"
          style={[s.iconBtn, { backgroundColor: C.surface2, borderColor: C.border }]}>
          <Ionicons name="arrow-back" size={20} color={C.textSoft} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[s.headerTitle, { color: C.text }]}>Mastery Courses</Text>
          <Text style={[s.headerSub, { color: C.textFaint }]}>
            Built live from the question bank — new questions join automatically
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingVertical: 18, paddingHorizontal: 16, width: '100%', maxWidth: MAX_CONTENT, alignSelf: 'center' }}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <SkeletonList rows={6} />
        ) : courses.length === 0 ? (
          <View style={[s.empty, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Ionicons name="school-outline" size={28} color={C.textFaint} />
            <Text style={[s.emptyText, { color: C.textSoft }]}>
              No topics have enough questions for a course yet.
            </Text>
          </View>
        ) : (
          courses.map((course, i) => {
            const prog = progress.get(course.key) ?? null
            const done = unitsDone(course, prog)
            const totalUnits = course.units.length
            const mastered = !!prog?.masteredAt
            const { color: iconColor, bgLight: iconBg } = topicColor(course.topic)
            return (
              <Entrance key={course.key} delay={i * 45}>
                <TouchableOpacity
                  onPress={() => onOpen(course)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={`${course.topic} course, ${done} of ${totalUnits} units done`}
                  style={[s.card, { backgroundColor: C.surface, borderColor: mastered ? C.gold : C.border, ...C.shadow }]}
                >
                  <View style={[s.cardIcon, { backgroundColor: iconBg }]}>
                    <TopicIcon topic={course.topic} size={22} color={iconColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.cardTitle, { color: C.text }]} numberOfLines={1}>{course.topic}</Text>
                    <Text style={[s.cardMeta, { color: C.textFaint }]}>
                      {totalUnits} units · {course.total.toLocaleString()} questions
                      {course.caseCount > 0 ? ` · ${course.caseCount} cases` : ''}
                    </Text>
                    {mastered ? (
                      <View style={[s.masteredChip, { backgroundColor: C.amberTint }]}>
                        <Ionicons name="trophy" size={11} color={C.gold} />
                        <Text style={[s.masteredText, { color: C.gold }]}>Mastered</Text>
                      </View>
                    ) : done > 0 ? (
                      <Text style={[s.cardProgressText, { color: C.teal }]}>
                        Unit {Math.min(done + 1, totalUnits)} of {totalUnits}
                      </Text>
                    ) : (
                      <Text style={[s.cardProgressText, { color: C.textFaint }]}>Not started</Text>
                    )}
                  </View>
                  <ProgressRing
                    progress={done / Math.max(totalUnits, 1)}
                    color={mastered ? C.gold : C.teal}
                    label={`${done}/${totalUnits}`}
                  />
                </TouchableOpacity>
              </Entrance>
            )
          })
        )}
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontFamily: 'Nunito_800ExtraBold' },
  headerSub: { fontSize: 12, fontFamily: 'Nunito_600SemiBold', marginTop: 1 },
  iconBtn: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 10 },
  cardIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardTitle: { fontSize: 15, fontFamily: 'Nunito_700Bold' },
  cardMeta: { fontSize: 12, fontFamily: 'Nunito_600SemiBold', marginTop: 2 },
  cardProgressText: { fontSize: 12, fontFamily: 'Nunito_800ExtraBold', marginTop: 4 },
  masteredChip: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingVertical: 3, paddingHorizontal: 9, borderRadius: 999, marginTop: 4 },
  masteredText: { fontSize: 11, fontFamily: 'Nunito_800ExtraBold' },
  empty: { alignItems: 'center', gap: 10, borderRadius: 16, borderWidth: 1, padding: 28, marginTop: 12 },
  emptyText: { fontSize: 14, fontFamily: 'Nunito_600SemiBold', textAlign: 'center' },
})
