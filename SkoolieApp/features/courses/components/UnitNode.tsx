/**
 * UnitNode — one stop on the Duolingo-style vertical course path.
 *
 * States: done (filled, check), current (pulsing halo + START pill),
 * locked (muted, lock icon). Boss checkpoints render coral and larger;
 * the mastery exam renders gold with a trophy.
 */
import { useEffect, useRef } from 'react'
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/hooks/useTheme'
import type { CourseUnit, UnitStatus } from '../lib/types'

interface Props {
  unit: CourseUnit
  status: UnitStatus
  /** Best score percent for this unit, if any run was recorded. */
  bestPct: number | null
  onPress: () => void
}

export function UnitNode({ unit, status, bestPct, onPress }: Props) {
  const C = useTheme()
  const isBoss = unit.kind === 'boss'
  const isMastery = unit.kind === 'mastery'
  const size = isMastery ? 84 : isBoss ? 76 : 64

  // Accent per unit kind — boss = coral, mastery = gold, standard = teal.
  const accent = isMastery ? C.gold : isBoss ? C.coral : C.teal
  const accentTint = isMastery ? C.amberTint : isBoss ? C.coralTint : C.tealTint

  // Gentle looping pulse on the current node only.
  const pulse = useRef(new Animated.Value(0)).current
  useEffect(() => {
    if (status !== 'current') return
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]))
    loop.start()
    return () => loop.stop()
  }, [status]) // eslint-disable-line react-hooks/exhaustive-deps

  const icon: keyof typeof Ionicons.glyphMap =
    status === 'locked' ? 'lock-closed'
    : status === 'done' ? 'checkmark'
    : isMastery ? 'trophy'
    : isBoss ? 'flash'
    : 'book'

  const circleBg = status === 'done' ? accent : status === 'current' ? accentTint : C.surface2
  const circleBorder = status === 'locked' ? C.border : accent
  const iconColor = status === 'done' ? C.onTeal : status === 'locked' ? C.textFaint : accent

  return (
    <View style={s.wrap}>
      {status === 'current' && (
        <View style={[s.startPill, { backgroundColor: accent }]}>
          <Text style={[s.startPillText, { color: C.onTeal }]}>START</Text>
        </View>
      )}
      <View style={{ width: size + 24, height: size + 24, alignItems: 'center', justifyContent: 'center' }}>
        {status === 'current' && (
          <Animated.View
            pointerEvents="none"
            style={[s.halo, {
              width: size + 18, height: size + 18, borderRadius: (size + 18) / 2,
              borderColor: accent,
              opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.75] }),
              transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.05] }) }],
            }]}
          />
        )}
        <TouchableOpacity
          disabled={status === 'locked'}
          onPress={onPress}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`${unit.title}${status === 'locked' ? ', locked' : status === 'done' ? ', completed' : ''}`}
          accessibilityState={{ disabled: status === 'locked' }}
          style={[s.circle, {
            width: size, height: size, borderRadius: size / 2,
            backgroundColor: circleBg, borderColor: circleBorder,
            opacity: status === 'locked' ? 0.55 : 1,
          }]}
        >
          <Ionicons name={icon} size={size * 0.42} color={iconColor} />
        </TouchableOpacity>
      </View>
      <Text style={[s.title, { color: status === 'locked' ? C.textFaint : C.text }]} numberOfLines={1}>
        {unit.title}
      </Text>
      {bestPct != null && (
        <Text style={[s.best, { color: bestPct >= unit.passPct ? C.green : C.textFaint }]}>
          Best {bestPct}%
        </Text>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  wrap: { alignItems: 'center', width: 148 },
  circle: { borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', borderWidth: 3 },
  startPill: { paddingVertical: 4, paddingHorizontal: 12, borderRadius: 999, marginBottom: 2 },
  startPillText: { fontSize: 11, fontFamily: 'Nunito_800ExtraBold', letterSpacing: 1 },
  title: { fontSize: 12.5, fontFamily: 'Nunito_700Bold', marginTop: 2, maxWidth: 140, textAlign: 'center' },
  best: { fontSize: 11, fontFamily: 'Nunito_600SemiBold', marginTop: 1 },
})
