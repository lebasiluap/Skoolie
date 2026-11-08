import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/hooks/useTheme'
import { useThemeMode } from '@/contexts/ThemeContext'
import { streakColors, dateKey, STREAK_FREEZE_BLUE } from '@/lib/streak'
import { FREEZE_CAPACITY } from '@/lib/freezePolicy'
import type { StreakSnapshot } from '@/lib/streakSnapshot'

const DOW = ['Su', 'M', 'Tu', 'W', 'Th', 'F', 'Sa'] // index 0=Sun … 6=Sat

// Duolingo-style streak card on a fixed Sunday→Saturday week. Real activity:
//   ✓ studied · ✗ missed (only after the account existed) · ring = today
//   ☆ = the day you're projected to hit your next milestone.
// Streak elements are gold (theme/contrast-aware); only missed days are red.
export function StreakTracker({
  snapshot,
  createdAt,
  style,
}: {
  snapshot: StreakSnapshot | null
  createdAt?: string | null
  style?: any
}) {
  const C = useTheme()
  const { isDark } = useThemeMode()
  // Both cards render one atomic server response; no private reads or overrides.
  if (!snapshot) return (
    <View accessibilityLabel="Loading streak" style={[s.card, { backgroundColor: C.surface, borderColor: C.border }, style]}>
      <Text style={{ color: C.textSoft, fontFamily: 'Nunito_700Bold' }}>— day streak</Text>
    </View>
  )
  const streak = snapshot.current_streak
  const { current, next, fill, text, onFill, goal } = streakColors(streak, isDark)

  const now = new Date(`${snapshot.today}T12:00:00Z`)
  const todayKeyStr = snapshot.today
  const createdKey = createdAt ? dateKey(new Date(createdAt)) : null

  // Fixed current week: Sunday → Saturday.
  const weekStart = new Date(now)
  weekStart.setUTCDate(now.getUTCDate() - now.getUTCDay())
  weekStart.setUTCHours(0, 0, 0, 0)
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setUTCDate(weekStart.getUTCDate() + i)
    return { key: dateKey(d), label: DOW[i] }
  })

  const activeDays = new Set(snapshot.study_days)
  const studiedToday = activeDays.has(todayKeyStr) || snapshot.last_active_date === todayKeyStr
  const frozen = new Set(snapshot.frozen_dates)
  const balance = snapshot.streak_freezes

  // Projected day they'd reach the next milestone if they study daily from today.
  const streakAfterToday = studiedToday ? streak : streak > 0 ? streak + 1 : 1
  let goalKey: string | null = null
  if (next) {
    const offset = next.days - streakAfterToday
    if (offset >= 0) {
      const g = new Date(now)
      g.setUTCDate(now.getUTCDate() + offset)
      goalKey = dateKey(g)
    }
  }

  type DayState = 'done' | 'frozen' | 'missed' | 'today' | 'goal' | 'upcoming' | 'none'
  function dayState(key: string): DayState {
    if (activeDays.has(key)) return 'done'
    if (frozen.has(key) && key < todayKeyStr) return 'frozen' // protected, not an earned day
    if (key === todayKeyStr) return studiedToday ? 'done' : 'today'
    if (key > todayKeyStr) return key === goalKey ? 'goal' : 'upcoming'
    if (createdKey && key < createdKey) return 'none' // account didn't exist yet
    return 'missed'
  }

  return (
    <View
      style={[
        s.card,
        {
          backgroundColor: current ? fill + '14' : C.surface,
          borderColor: current ? fill : C.border,
          ...C.shadow,
        },
        style,
      ]}
    >
      <View style={s.header}>
        <Ionicons name="flame" size={26} color={text} />
        <Text style={[s.count, { color: text }]}>{streak}</Text>
        <Text style={[s.unit, { color: C.textSoft }]}>day streak</Text>
        {balance !== null && (
          <View accessibilityLabel={`${balance} of ${FREEZE_CAPACITY} streak freezes stored`} style={[s.badge, { backgroundColor: STREAK_FREEZE_BLUE + '26', flexDirection: 'row', alignItems: 'center', gap: 3 }]}>
            <Ionicons name="snow" size={12} color={STREAK_FREEZE_BLUE} />
            <Text style={[s.badgeText, { color: STREAK_FREEZE_BLUE }]}>{balance}/{FREEZE_CAPACITY}</Text>
          </View>
        )}
      </View>

      <View style={[s.week, { backgroundColor: C.surface2, borderColor: C.border }]}>
        {week.map(d => {
          const state = dayState(d.key)
          const isToday = d.key === todayKeyStr
          const circleStyle =
            state === 'done'
              ? { backgroundColor: fill, borderColor: fill, borderWidth: 1 }
              : state === 'frozen'
                ? { backgroundColor: STREAK_FREEZE_BLUE, borderColor: STREAK_FREEZE_BLUE, borderWidth: 1 }
              : state === 'missed'
                ? { backgroundColor: C.redTint, borderColor: C.red, borderWidth: 1 }
                : state === 'today'
                  ? { backgroundColor: C.surface, borderColor: text, borderWidth: 2 }
                  : state === 'goal'
                    ? { backgroundColor: C.surface, borderColor: goal, borderWidth: 2, borderStyle: 'dashed' as const }
                    : { backgroundColor: C.surface, borderColor: C.border, borderWidth: 1 }
          return (
            <View key={d.key} style={s.dayCol}>
              <Text style={[s.dow, { color: isToday ? text : C.textFaint }]}>{d.label}</Text>
              <View style={[s.circle, circleStyle]}>
                {state === 'done' && <Ionicons name="checkmark" size={15} color={onFill} />}
                {state === 'frozen' && <Ionicons name="snow" size={13} color="#FFFFFF" />}
                {state === 'missed' && <Ionicons name="close" size={14} color={C.red} />}
                {/* today = a highlighted gold ring (no icon); it fills with a check once studied */}
                {state === 'goal' && <Ionicons name="star-outline" size={13} color={goal} />}
              </View>
            </View>
          )
        })}
      </View>

    </View>
  )
}

const s = StyleSheet.create({
  card: { borderRadius: 20, borderWidth: 1.5, padding: 18 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  count: { fontSize: 26, fontFamily: 'Nunito_900Black', letterSpacing: -0.5 },
  unit: { fontSize: 15, fontFamily: 'Nunito_700Bold', flex: 1 },
  badge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999 },
  badgeText: { fontSize: 12, fontFamily: 'Nunito_800ExtraBold' },
  week: { flexDirection: 'row', justifyContent: 'space-between', borderRadius: 16, borderWidth: 1, paddingVertical: 12, paddingHorizontal: 8, marginTop: 14 },
  dayCol: { alignItems: 'center', gap: 6, flex: 1 },
  dow: { fontSize: 12, fontFamily: 'Nunito_800ExtraBold' },
  circle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
})
