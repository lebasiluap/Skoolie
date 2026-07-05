/**
 * ToastHost — renders toasts fired via lib/toast's showToast().
 * Mounted once in the root layout, floats above everything, auto-dismisses.
 */
import { useEffect, useRef, useState } from 'react'
import { Animated, Text, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/hooks/useTheme'
import { _subscribe, type ToastMsg } from '@/lib/toast'

const KIND_META = {
  error:   { icon: 'cloud-offline' as const },
  success: { icon: 'checkmark-circle' as const },
  info:    { icon: 'information-circle' as const },
}

export function ToastHost() {
  const C = useTheme()
  const insets = useSafeAreaInsets()
  const [toast, setToast] = useState<ToastMsg | null>(null)
  const anim = useRef(new Animated.Value(0)).current
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const unsub = _subscribe(t => {
      if (hideTimer.current) clearTimeout(hideTimer.current)
      setToast(t)
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, damping: 16, stiffness: 220 }).start()
      hideTimer.current = setTimeout(() => {
        Animated.timing(anim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setToast(null))
      }, 3500)
    })
    return () => {
      unsub()
      if (hideTimer.current) clearTimeout(hideTimer.current)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!toast) return null
  const color = toast.kind === 'error' ? C.red : toast.kind === 'success' ? C.green : C.teal
  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={[
        s.wrap,
        { top: insets.top + 8 },
        { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }] },
      ]}
    >
      <View style={[s.toast, { backgroundColor: C.surface, borderColor: color, ...C.shadowLg }]}>
        <Ionicons name={KIND_META[toast.kind].icon} size={17} color={color} />
        <Text style={[s.text, { color: C.text }]} numberOfLines={3}>{toast.text}</Text>
      </View>
    </Animated.View>
  )
}

const s = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, zIndex: 9999, alignItems: 'center' },
  toast: {
    flexDirection: 'row', alignItems: 'center', gap: 9,
    borderRadius: 14, borderWidth: 1.5, paddingVertical: 11, paddingHorizontal: 14, maxWidth: 480,
  },
  text: { flexShrink: 1, fontSize: 13.5, fontFamily: 'Nunito_700Bold', lineHeight: 19 },
})
