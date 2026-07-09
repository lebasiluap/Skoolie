import { useEffect, useRef } from 'react'
import { View, Animated, Easing, ViewStyle } from 'react-native'
import { useTheme } from '@/hooks/useTheme'

interface ProgressBarProps {
  progress: number
  height?: number
  color?: string
  style?: ViewStyle
}

/** Animated fill — eases to the target on mount and whenever progress
 *  changes (width % needs the JS driver; bars are small, cost is negligible). */
export function ProgressBar({ progress, height = 10, color, style }: ProgressBarProps) {
  const C = useTheme()
  const anim = useRef(new Animated.Value(0)).current
  const target = Math.min(1, Math.max(0, progress))

  useEffect(() => {
    const a = Animated.timing(anim, {
      toValue: target,
      duration: 550,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    })
    a.start()
    return () => a.stop()
  }, [target]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={[{ width: '100%', overflow: 'hidden', height, backgroundColor: C.surface3, borderRadius: height / 2 }, style]}>
      <Animated.View style={{
        width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        height,
        backgroundColor: color ?? C.teal,
        borderRadius: height / 2,
      }} />
    </View>
  )
}
