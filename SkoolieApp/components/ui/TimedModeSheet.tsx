/**
 * TimedModeSheet — bottom sheet for the global timed-mode preference.
 * Opened from the TopBar clock button and the Practice-hub banner.
 * Writes timed_mode / timed_seconds to the profile (optimistic local state,
 * then refreshProfile so every screen picks the change up).
 */
import { useEffect, useState } from 'react'
import { Modal, View, Text, TouchableOpacity, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/hooks/useTheme'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { TIMED_CHOICES, formatSecs } from '@/lib/timing'

interface Props {
  visible: boolean
  onClose: () => void
}

export function TimedModeSheet({ visible, onClose }: Props) {
  const C = useTheme()
  const { user, profile, refreshProfile } = useAuth()
  const [on, setOn] = useState(profile?.timed_mode ?? false)
  const [secs, setSecs] = useState(profile?.timed_seconds ?? 30)
  useEffect(() => {
    setOn(profile?.timed_mode ?? false)
    setSecs(profile?.timed_seconds ?? 30)
  }, [profile?.timed_mode, profile?.timed_seconds])

  async function save(fields: { timed_mode?: boolean; timed_seconds?: number }) {
    if (!user) return
    await supabase.from('user_profiles').update(fields).eq('id', user.id)
    refreshProfile()
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable style={[s.sheet, { backgroundColor: C.surface }]} onPress={() => {}}>
          <View style={[s.handle, { backgroundColor: C.surface3 }]} />

          {/* Header */}
          <View style={s.headerRow}>
            <View style={[s.iconBox, { backgroundColor: C.tealTint }]}>
              <Ionicons name="timer-outline" size={20} color={C.teal} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.title, { color: C.text }]}>Timed mode</Text>
              <Text style={[s.sub, { color: C.textFaint }]}>Beat the clock — unanswered questions count as wrong</Text>
            </View>
          </View>

          {/* On/off */}
          <View style={s.toggleRow}>
            {[{ v: false, label: 'Off' }, { v: true, label: 'On' }].map(opt => {
              const active = on === opt.v
              return (
                <TouchableOpacity
                  key={opt.label}
                  onPress={() => { setOn(opt.v); save({ timed_mode: opt.v }) }}
                  activeOpacity={0.8}
                  style={[s.toggleBtn, { backgroundColor: active ? C.teal : C.surface2, borderColor: active ? C.teal : C.border }]}
                >
                  <Text style={[s.toggleText, { color: active ? C.onTeal : C.textSoft }]}>{opt.label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {/* Duration */}
          {on && (
            <>
              <Text style={[s.label, { color: C.textFaint }]}>TIME PER QUESTION</Text>
              <View style={s.choiceRow}>
                {TIMED_CHOICES.map(n => {
                  const active = secs === n
                  return (
                    <TouchableOpacity
                      key={n}
                      onPress={() => { setSecs(n); save({ timed_seconds: n }) }}
                      activeOpacity={0.8}
                      style={[s.choice, { backgroundColor: active ? C.teal : C.surface2, borderColor: active ? C.teal : C.border }]}
                    >
                      <Text style={[s.choiceText, { color: active ? C.onTeal : C.textSoft }]}>{formatSecs(n)}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </>
          )}

          <TouchableOpacity onPress={onClose} style={[s.doneBtn, { backgroundColor: C.teal }]} activeOpacity={0.85}>
            <Text style={[s.doneText, { color: C.onTeal }]}>Done</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 34 },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  iconBox: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontFamily: 'Nunito_900Black' },
  sub: { fontSize: 12.5, fontFamily: 'Nunito_600SemiBold', marginTop: 2 },
  toggleRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  toggleBtn: { flex: 1, paddingVertical: 12, borderRadius: 999, borderWidth: 1.5, alignItems: 'center' },
  toggleText: { fontSize: 14, fontFamily: 'Nunito_800ExtraBold' },
  label: { fontSize: 11, fontFamily: 'Nunito_800ExtraBold', letterSpacing: 0.7, marginBottom: 10 },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  choice: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1.5, minWidth: 56, alignItems: 'center' },
  choiceText: { fontSize: 14, fontFamily: 'Nunito_800ExtraBold' },
  doneBtn: { marginTop: 16, paddingVertical: 14, borderRadius: 999, alignItems: 'center' },
  doneText: { fontSize: 15, fontFamily: 'Nunito_800ExtraBold' },
})
