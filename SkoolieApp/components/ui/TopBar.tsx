/**
 * TopBar — shared sticky top bar for the 5 tab screens.
 * Left: CappyHead logo + screen title. Right: search / theme / avatar.
 * Runner screens (MCQ, Flashcards, Cases) use their own back-button header instead.
 */
import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/hooks/useTheme'
import { useThemeMode } from '@/contexts/ThemeContext'
import { useAuth } from '@/hooks/useAuth'
import { CappyHead } from '@/components/mascots/CappyHead'
import { Avatar } from '@/components/ui/Avatar'
import { TimedModeSheet } from '@/components/ui/TimedModeSheet'

interface Props {
  title: string
  /** Hide the Cappy wordmark — used on Dashboard, where the living,
   *  state-reactive greeting Cappy sits right below and would duplicate it. */
  showLogo?: boolean
}

export function TopBar({ title, showLogo = true }: Props) {
  const C = useTheme()
  const { isDark, toggleDark } = useThemeMode()
  const { profile } = useAuth()
  const insets = useSafeAreaInsets()
  const [timedSheet, setTimedSheet] = useState(false)
  const timedOn = profile?.timed_mode ?? false

  return (
    <View style={[s.bar, { backgroundColor: C.surface, borderBottomColor: C.border, paddingTop: insets.top }]}>
      <View style={s.inner}>
        <View style={s.left}>
          {showLogo && <CappyHead size={36} expr="idle" />}
          <Text style={[s.title, { color: C.text }]} numberOfLines={1} ellipsizeMode="tail" maxFontSizeMultiplier={1.2}>{title}</Text>
        </View>
        <View style={s.right}>
          <TouchableOpacity
            accessibilityLabel={timedOn ? 'Timed mode settings (on)' : 'Timed mode settings (off)'} accessibilityRole="button"
            onPress={() => setTimedSheet(true)}
            style={[s.iconBtn, { backgroundColor: timedOn ? C.tealTint : C.surface2, borderColor: timedOn ? C.teal : C.border }]}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            <Ionicons name="timer-outline" size={17} color={timedOn ? C.teal : C.textSoft} />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'} accessibilityRole="button"
            onPress={toggleDark}
            style={[s.iconBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            <Ionicons name={isDark ? 'sunny' : 'moon'} size={17} color={C.textSoft} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(app)/profile')} activeOpacity={0.8} accessibilityLabel="Open profile" accessibilityRole="button">
            <Avatar name={profile?.full_name ?? ''} avatarUrl={profile?.avatar_url} size={34} />
          </TouchableOpacity>
        </View>
      </View>
      <TimedModeSheet visible={timedSheet} onClose={() => setTimedSheet(false)} />
    </View>
  )
}

const s = StyleSheet.create({
  bar: { borderBottomWidth: 1 },
  inner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 10,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 10 },
  title: { fontSize: 22, fontFamily: 'Nunito_800ExtraBold', flexShrink: 1 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
})
