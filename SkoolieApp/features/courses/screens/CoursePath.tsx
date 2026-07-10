/**
 * CoursePath — Duolingo-style vertical unit path.
 * Nodes zig-zag down the screen; connectors fill teal as units are passed.
 * Locked nodes are inert; the current node pulses with a START pill;
 * done nodes can be replayed (best score is kept).
 */
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '@/hooks/useTheme'
import { MAX_CONTENT } from '@/hooks/useResponsive'
import { Entrance } from '@/components/ui/Entrance'
import { TopicIcon } from '@/components/ui/TopicIcon'
import { topicColor } from '@/constants/topics'
import { ProgressRing } from '../components/ProgressRing'
import { UnitNode } from '../components/UnitNode'
import { unitStatus, unitsDone } from '../lib/engine'
import type { Course, CourseProgress, CourseUnit } from '../lib/types'

interface Props {
  course: Course
  progress: CourseProgress | null
  onStart: (unit: CourseUnit) => void
  onBack: () => void
}

/** Horizontal drift for node i — the classic winding path. */
const drift = (i: number) => [0, -56, 0, 56][i % 4]

export function CoursePath({ course, progress, onStart, onBack }: Props) {
  const C = useTheme()
  const insets = useSafeAreaInsets()
  const done = unitsDone(course, progress)
  const { color: iconColor, bgLight: iconBg } = topicColor(course.topic)

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Course header */}
      <View style={[s.header, { paddingTop: insets.top + 10, backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={onBack} accessibilityRole="button" accessibilityLabel="Back to courses"
          style={[s.iconBtn, { backgroundColor: C.surface2, borderColor: C.border }]}>
          <Ionicons name="arrow-back" size={20} color={C.textSoft} />
        </TouchableOpacity>
        <View style={[s.headerIcon, { backgroundColor: iconBg }]}>
          <TopicIcon topic={course.topic} size={20} color={iconColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.headerTitle, { color: C.text }]} numberOfLines={1}>{course.topic}</Text>
          <Text style={[s.headerSub, { color: C.textFaint }]}>
            {done}/{course.units.length} units · pass at {course.units[0]?.passPct ?? 80}%
          </Text>
        </View>
        <ProgressRing
          progress={done / Math.max(course.units.length, 1)}
          size={44}
          color={progress?.masteredAt ? C.gold : C.teal}
          label={progress?.masteredAt ? '★' : undefined}
        />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingTop: 26, paddingBottom: 48, width: '100%', maxWidth: MAX_CONTENT, alignSelf: 'center', alignItems: 'center' }}
        showsVerticalScrollIndicator={false}
      >
        {course.units.map((unit, i) => {
          const status = unitStatus(unit.index, progress)
          const bestRaw = progress?.unitScores[String(unit.index)]
          const bestPct = typeof bestRaw === 'number' ? bestRaw : null
          return (
            <Entrance key={unit.index} delay={i * 40} style={{ alignItems: 'center' }}>
              {/* Connector above every node but the first — teal once the
                  previous unit is passed, muted otherwise. */}
              {i > 0 && (
                <View style={[s.connector, { backgroundColor: unit.index <= done ? C.teal : C.borderStrong }]} />
              )}
              <View style={{ transform: [{ translateX: drift(i) }] }}>
                <UnitNode unit={unit} status={status} bestPct={bestPct} onPress={() => onStart(unit)} />
              </View>
            </Entrance>
          )
        })}

        {progress?.masteredAt && (
          <View style={[s.masteredBanner, { backgroundColor: C.amberTint, borderColor: C.gold }]}>
            <Ionicons name="trophy" size={18} color={C.gold} />
            <Text style={[s.masteredBannerText, { color: C.gold }]}>Course mastered!</Text>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14, borderBottomWidth: 1 },
  headerIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontFamily: 'Nunito_800ExtraBold' },
  headerSub: { fontSize: 12, fontFamily: 'Nunito_600SemiBold', marginTop: 1 },
  iconBtn: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  connector: { width: 5, height: 30, borderRadius: 3, marginVertical: 4 },
  masteredBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 999, borderWidth: 1.5, paddingVertical: 10, paddingHorizontal: 20, marginTop: 24 },
  masteredBannerText: { fontSize: 14, fontFamily: 'Nunito_800ExtraBold' },
})
