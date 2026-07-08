/**
 * Entrance — fade + gentle rise for content appearing on screen.
 *
 * Give it a `key` that changes with the content (e.g. question index) and it
 * remounts, replaying the animation for each new item. `delay` staggers
 * siblings (Duolingo-style cascading options). Native driver throughout.
 */
import { useEffect, useRef } from 'react'
import { Animated, Easing, type StyleProp, type ViewStyle } from 'react-native'

type Props = {
  children: React.ReactNode
  /** ms before the animation starts — stagger list items with i * 45 */
  delay?: number
  /** rise distance in px */
  dy?: number
  style?: StyleProp<ViewStyle>
}

export function Entrance({ children, delay = 0, dy = 14, style }: Props) {
  const anim = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const a = Animated.timing(anim, {
      toValue: 1,
      duration: 320,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    })
    a.start()
    return () => a.stop()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Animated.View
      style={[style, {
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [dy, 0] }) }],
      }]}
    >
      {children}
    </Animated.View>
  )
}
