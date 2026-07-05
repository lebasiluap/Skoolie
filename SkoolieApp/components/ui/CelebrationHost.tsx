/**
 * CelebrationHost — renders queued Celebrations (lib/celebrations) one at a
 * time as a full-screen, mascot-led ceremony. Mounted once in the root layout.
 *
 * Never stacks on top of a first-encounter IntroGate: if an intro is open the
 * ceremony politely waits and retries.
 */
import { useEffect, useRef, useState } from 'react'
import { Modal, View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native'
import { useTheme } from '@/hooks/useTheme'
import { _subscribeCelebrations, type Celebration } from '@/lib/celebrations'
import { haptic } from '@/lib/haptics'
import { isIntroOpen } from '@/components/ui/IntroGate'
import { CappyHead } from '@/components/mascots/CappyHead'
import { NogginHead } from '@/components/mascots/NogginHead'
import { BuddyHead } from '@/components/mascots/BuddyHead'
import { MascotAnimator } from '@/components/mascots/MascotAnimator'

export function CelebrationHost() {
  const C = useTheme()
  const [queue, setQueue] = useState<Celebration[]>([])
  const [current, setCurrent] = useState<Celebration | null>(null)
  const scale = useRef(new Animated.Value(0.6)).current
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => _subscribeCelebrations(c => setQueue(q => [...q, c])), [])

  // Promote the next queued ceremony when free (and no intro sheet is up).
  useEffect(() => {
    if (current || queue.length === 0) return
    if (isIntroOpen()) {
      const t = setTimeout(() => setQueue(q => [...q]), 800)  // nudge a re-check
      return () => clearTimeout(t)
    }
    const [head, ...rest] = queue
    setQueue(rest)
    setCurrent(head)
  }, [queue, current])

  useEffect(() => {
    if (!current) return
    scale.setValue(0.6)
    opacity.setValue(0)
    haptic('celebrate')
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start()
  }, [current]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!current) return null
  const accent = current.accent ?? C.teal
  const Head = current.mascot === 'noggin' ? NogginHead : current.mascot === 'buddy' ? BuddyHead : CappyHead

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => setCurrent(null)}>
      <View style={s.overlay}>
        <Animated.View style={[s.card, { backgroundColor: C.surface, borderColor: C.border, transform: [{ scale }], opacity }]}>
          <View style={[s.ring, { borderColor: accent, backgroundColor: accent + '1A' }]}>
            <MascotAnimator expr="happy">
              <Head expr="happy" size={72} />
            </MascotAnimator>
          </View>
          <Text style={[s.title, { color: C.text }]} maxFontSizeMultiplier={1.2}>{current.title}</Text>
          <Text style={[s.body, { color: C.textSoft }]}>{current.body}</Text>
          <TouchableOpacity
            onPress={() => setCurrent(null)}
            style={[s.btn, { backgroundColor: accent }]}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            <Text style={s.btnText}>Continue</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  )
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', paddingHorizontal: 30 },
  card: { borderRadius: 26, borderWidth: 1, padding: 24, paddingTop: 28, alignItems: 'center' },
  ring: { width: 112, height: 112, borderRadius: 56, borderWidth: 3, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  title: { fontSize: 24, fontFamily: 'Nunito_900Black', textAlign: 'center', marginBottom: 8 },
  body: { fontSize: 14.5, fontFamily: 'Nunito_600SemiBold', lineHeight: 22, textAlign: 'center', marginBottom: 20 },
  btn: { paddingVertical: 14, paddingHorizontal: 44, borderRadius: 999, alignItems: 'center' },
  btnText: { fontSize: 15.5, fontFamily: 'Nunito_800ExtraBold', color: '#fff' },
})
