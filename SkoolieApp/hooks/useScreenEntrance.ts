import { useCallback, useRef } from 'react'
import { Animated, Easing } from 'react-native'
import { useFocusEffect } from 'expo-router'

// Smooth Apple-style screen entrance — fade + gentle rise + subtle scale on an
// ease-out cubic curve, replayed every time the screen gains focus. Returns an
// animated style; wrap the screen's content (below the TopBar) in an
// <Animated.View style={[{ flex: 1 }, entrance]}>.
export function useScreenEntrance() {
  const fade = useRef(new Animated.Value(0)).current
  const rise = useRef(new Animated.Value(16)).current
  const scale = useRef(new Animated.Value(0.985)).current

  useFocusEffect(useCallback(() => {
    fade.setValue(0); rise.setValue(16); scale.setValue(0.985)
    const anim = Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration: 440, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 440, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ])
    anim.start()
    return () => anim.stop()
  }, [])) // eslint-disable-line react-hooks/exhaustive-deps

  return { opacity: fade, transform: [{ translateY: rise }, { scale }] }
}
