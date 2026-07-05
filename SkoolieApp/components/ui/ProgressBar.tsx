import { View, ViewStyle } from 'react-native'
import { useTheme } from '@/hooks/useTheme'

interface ProgressBarProps {
  progress: number
  height?: number
  color?: string
  style?: ViewStyle
}

export function ProgressBar({ progress, height = 10, color, style }: ProgressBarProps) {
  const C = useTheme()
  return (
    <View style={[{ width: '100%', overflow: 'hidden', height, backgroundColor: C.surface3, borderRadius: height / 2 }, style]}>
      <View style={{
        width: `${Math.min(100, Math.max(0, progress * 100))}%`,
        height,
        backgroundColor: color ?? C.teal,
        borderRadius: height / 2,
      }} />
    </View>
  )
}
