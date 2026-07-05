/**
 * Skeleton loading (audit #12) — pulsing placeholder blocks that hold the
 * layout's shape while data arrives, replacing bare spinners on the highest-
 * traffic lists (leaderboard, topic lists, recent activity).
 *
 * One shared pulse driver: every skeleton on screen breathes in sync, which
 * reads as "one page loading" rather than a field of blinking parts.
 */
import { useEffect, useRef } from 'react'
import { View, Animated, StyleSheet, type ViewStyle, type DimensionValue } from 'react-native'
import { useTheme } from '@/hooks/useTheme'

let pulse: Animated.Value | null = null
function getPulse(): Animated.Value {
  if (!pulse) {
    pulse = new Animated.Value(0.45)
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ]),
    ).start()
  }
  return pulse
}

interface Props {
  w?: DimensionValue
  h?: number
  r?: number
  style?: ViewStyle
}

export function Skeleton({ w = '100%', h = 14, r = 7, style }: Props) {
  const C = useTheme()
  const opacity = useRef(getPulse()).current
  return (
    <Animated.View
      style={[{ width: w, height: h, borderRadius: r, backgroundColor: C.surface3, opacity }, style]}
    />
  )
}

/** Row placeholder — avatar circle + two text lines. Shape of a list row. */
export function SkeletonRow({ style }: { style?: ViewStyle }) {
  const C = useTheme()
  return (
    <View style={[s.row, { backgroundColor: C.surface, borderColor: C.border }, style]}>
      <Skeleton w={40} h={40} r={20} />
      <View style={{ flex: 1, gap: 8 }}>
        <Skeleton w="62%" h={13} />
        <Skeleton w="38%" h={11} />
      </View>
      <Skeleton w={48} h={16} r={8} />
    </View>
  )
}

/** N stacked rows — the standard "list is loading" block. */
export function SkeletonList({ rows = 5, style }: { rows?: number; style?: ViewStyle }) {
  return (
    <View style={style}>
      {Array.from({ length: rows }, (_, i) => <SkeletonRow key={i} style={{ marginBottom: 10 }} />)}
    </View>
  )
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 1, padding: 14 },
})
