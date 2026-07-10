/**
 * ProgressRing — SVG completion ring for course cards / the path header.
 * Static (no animation): rings appear in lists, so cheap rendering wins.
 */
import { View, Text, StyleSheet } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { useTheme } from '@/hooks/useTheme'

interface Props {
  /** 0..1 */
  progress: number
  size?: number
  strokeWidth?: number
  color?: string
  /** Center label; defaults to a percent. */
  label?: string
}

export function ProgressRing({ progress, size = 52, strokeWidth = 5, color, label }: Props) {
  const C = useTheme()
  const p = Math.min(1, Math.max(0, progress))
  const r = (size - strokeWidth) / 2
  const cx = size / 2
  const circumference = 2 * Math.PI * r
  const ringColor = color ?? C.teal

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cx} r={r} stroke={C.surface3} strokeWidth={strokeWidth} fill="none" />
        {p > 0 && (
          <Circle
            cx={cx} cy={cx} r={r}
            stroke={ringColor} strokeWidth={strokeWidth} fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={circumference * (1 - p)}
            transform={`rotate(-90 ${cx} ${cx})`}
          />
        )}
      </Svg>
      <View style={s.center} pointerEvents="none">
        <Text style={[s.label, { color: C.text, fontSize: size / 4.2 }]}>
          {label ?? `${Math.round(p * 100)}%`}
        </Text>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: 'Nunito_800ExtraBold' },
})
