/**
 * MascotAnimator — Duolingo-style motion wrapper for the Skoolie mascots.
 *
 * Wrap any mascot head and pass the same `expr` you pass to the head:
 *   <MascotAnimator expr={isCorrect ? 'happy' : 'wrong'}>
 *     <CappyHead expr={isCorrect ? 'happy' : 'wrong'} size={96} />
 *   </MascotAnimator>
 *
 * Motion per expression:
 *  - happy    → celebratory pop: springy jump + scale punch + tiny tilt wiggle
 *  - wrong    → quick head-shake (translateX) with a small sympathy dip
 *  - thinking → slow bob + tilt loop (keeps running)
 *  - idle     → gentle breathing loop (keeps running)
 *  - wave     → rocking wiggle loop
 *
 * Uses the core Animated API with the native driver — no reanimated worklets,
 * consistent with the rest of the app.
 */
import React, { useEffect, useRef } from 'react'
import { Animated, Easing, type ViewStyle } from 'react-native'
import type { MascotExpression } from './CappyHead'

interface Props {
  expr?: MascotExpression
  children: React.ReactNode
  style?: ViewStyle
}

export function MascotAnimator({ expr = 'idle', children, style }: Props) {
  const scale = useRef(new Animated.Value(1)).current
  const translateY = useRef(new Animated.Value(0)).current
  const translateX = useRef(new Animated.Value(0)).current
  const rotate = useRef(new Animated.Value(0)).current // -1..1 → deg
  const loopRef = useRef<Animated.CompositeAnimation | null>(null)

  useEffect(() => {
    // Stop any running loop and reset transforms before the next act
    loopRef.current?.stop()
    loopRef.current = null
    scale.setValue(1); translateY.setValue(0); translateX.setValue(0); rotate.setValue(0)

    const t = (v: Animated.Value, toValue: number, duration: number, easing = Easing.inOut(Easing.quad)) =>
      Animated.timing(v, { toValue, duration, easing, useNativeDriver: true })

    if (expr === 'happy') {
      // Jump + scale punch + wiggle, twice — pure celebration
      const jump = Animated.sequence([
        Animated.parallel([
          Animated.spring(scale, { toValue: 1.15, friction: 3, tension: 160, useNativeDriver: true }),
          t(translateY, -14, 160, Easing.out(Easing.quad)),
          t(rotate, -0.6, 160),
        ]),
        Animated.parallel([
          Animated.spring(scale, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }),
          Animated.spring(translateY, { toValue: 0, friction: 4, tension: 140, useNativeDriver: true }),
          t(rotate, 0.6, 200),
        ]),
        Animated.parallel([
          t(translateY, -8, 140, Easing.out(Easing.quad)),
          t(rotate, -0.3, 140),
        ]),
        Animated.parallel([
          Animated.spring(translateY, { toValue: 0, friction: 4, tension: 140, useNativeDriver: true }),
          Animated.spring(rotate, { toValue: 0, friction: 4, useNativeDriver: true }),
        ]),
      ])
      jump.start()
    } else if (expr === 'wrong') {
      // Sharp head-shake, then a sad little slump
      const shake = Animated.sequence([
        t(translateX, -9, 55, Easing.linear),
        t(translateX, 9, 90, Easing.linear),
        t(translateX, -7, 80, Easing.linear),
        t(translateX, 5, 70, Easing.linear),
        t(translateX, 0, 60, Easing.out(Easing.quad)),
        Animated.parallel([
          t(scale, 0.96, 180),
          t(translateY, 3, 180),
        ]),
        Animated.parallel([
          Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }),
          Animated.spring(translateY, { toValue: 0, friction: 5, useNativeDriver: true }),
        ]),
      ])
      shake.start()
    } else if (expr === 'thinking') {
      // Slow pondering bob with a slight tilt
      const loop = Animated.loop(Animated.sequence([
        Animated.parallel([t(translateY, -3, 900), t(rotate, 0.35, 900)]),
        Animated.parallel([t(translateY, 0, 900), t(rotate, 0, 900)]),
      ]))
      loopRef.current = loop
      loop.start()
    } else if (expr === 'wave') {
      // Friendly rocking wiggle
      const loop = Animated.loop(Animated.sequence([
        t(rotate, 0.8, 300), t(rotate, -0.8, 600), t(rotate, 0, 300),
        Animated.delay(900),
      ]))
      loopRef.current = loop
      loop.start()
    } else {
      // idle — gentle breathing
      const loop = Animated.loop(Animated.sequence([
        t(scale, 1.035, 1400), t(scale, 1, 1400),
      ]))
      loopRef.current = loop
      loop.start()
    }

    return () => { loopRef.current?.stop() }
  }, [expr]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Animated.View
      style={[style, {
        transform: [
          { translateX },
          { translateY },
          { scale },
          { rotate: rotate.interpolate({ inputRange: [-1, 1], outputRange: ['-10deg', '10deg'] }) },
        ],
      }]}
    >
      {children}
    </Animated.View>
  )
}
