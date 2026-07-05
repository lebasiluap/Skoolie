/**
 * InterestsSheet — edit areas of interest from Profile settings.
 * Multi-select topic chips for the user's profession; "Decide for me" clears
 * the selection (empty = no biasing). Mirrors the onboarding step.
 */
import { useEffect, useRef, useState } from 'react'
import { Animated, Modal, View, Text, TouchableOpacity, Pressable, ScrollView, StyleSheet, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/hooks/useTheme'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

interface Props {
  visible: boolean
  onClose: () => void
}

export function InterestsSheet({ visible, onClose }: Props) {
  const C = useTheme()
  // Sheet slides up on open; the scrim fades in place (Modal fade). Keeping
  // the translate on the sheet ONLY — animating the whole modal layer made the
  // dim overlay itself visibly ride up from the bottom.
  const slide = useRef(new Animated.Value(600)).current
  useEffect(() => {
    if (visible) {
      slide.setValue(600)
      Animated.spring(slide, { toValue: 0, friction: 10, tension: 70, useNativeDriver: true }).start()
    }
  }, [visible]) // eslint-disable-line react-hooks/exhaustive-deps
  const { user, profile, refreshProfile } = useAuth()
  const [topics, setTopics] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [sel, setSel] = useState<Set<string>>(new Set(profile?.interests ?? []))
  const [saving, setSaving] = useState(false)

  useEffect(() => { setSel(new Set(profile?.interests ?? [])) }, [profile?.interests, visible])

  useEffect(() => {
    if (!visible || !profile || topics.length > 0) return
    setLoading(true)
    supabase.rpc('get_question_counts', {
      p_profession: profile.profession, p_question_type: 'mcq', p_access_key: profile.access_key ?? null,
    }).then(({ data }) => {
      setTopics([...new Set(((data ?? []) as any[]).map(r => r.topic).filter(Boolean))].sort() as string[])
      setLoading(false)
    })
  }, [visible, profile?.profession]) // eslint-disable-line react-hooks/exhaustive-deps

  function toggle(t: string) {
    setSel(prev => { const n = new Set(prev); n.has(t) ? n.delete(t) : n.add(t); return n })
  }

  async function save(list: string[]) {
    if (!user) return
    setSaving(true)
    await supabase.from('user_profiles').update({ interests: list }).eq('id', user.id)
    await refreshProfile()
    setSaving(false)
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <Animated.View style={{ transform: [{ translateY: slide }] }}>
        <Pressable style={[s.sheet, { backgroundColor: C.surface }]} onPress={() => {}}>
          <View style={[s.handle, { backgroundColor: C.surface3 }]} />
          <View style={s.headerRow}>
            <View style={[s.iconBox, { backgroundColor: C.tealTint }]}>
              <Ionicons name="heart" size={20} color={C.teal} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.title, { color: C.text }]}>Areas of interest</Text>
              <Text style={[s.sub, { color: C.textFaint }]}>Quick starts lean toward these — or let Skoolie decide</Text>
            </View>
          </View>

          {loading && <ActivityIndicator style={{ marginVertical: 20 }} color={C.teal} />}
          <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
            <View style={s.pills}>
              {topics.map(t => {
                const active = sel.has(t)
                return (
                  <TouchableOpacity key={t} onPress={() => toggle(t)}
                    style={[s.pill, { backgroundColor: active ? C.teal : C.surface2, borderColor: active ? C.teal : C.border }]}>
                    <Text style={[s.pillText, { color: active ? C.onTeal : C.textSoft }]}>{t}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </ScrollView>

          <TouchableOpacity onPress={() => save([...sel])} disabled={saving} style={[s.saveBtn, { backgroundColor: C.teal }]} activeOpacity={0.85}>
            <Text style={[s.saveText, { color: C.onTeal }]}>{saving ? 'Saving…' : sel.size > 0 ? `Save (${sel.size} picked)` : 'Save'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => save([])} disabled={saving} style={[s.decideBtn, { borderColor: C.border }]} activeOpacity={0.8}>
            <Text style={[s.decideText, { color: C.textSoft }]}>🎲 Decide for me</Text>
          </TouchableOpacity>
        </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  )
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 34 },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  iconBox: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontFamily: 'Nunito_900Black' },
  sub: { fontSize: 12.5, fontFamily: 'Nunito_600SemiBold', marginTop: 2 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 8 },
  pill: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1.5 },
  pillText: { fontSize: 13, fontFamily: 'Nunito_700Bold' },
  saveBtn: { marginTop: 14, paddingVertical: 14, borderRadius: 999, alignItems: 'center' },
  saveText: { fontSize: 15, fontFamily: 'Nunito_800ExtraBold' },
  decideBtn: { marginTop: 10, paddingVertical: 13, borderRadius: 999, borderWidth: 1.5, alignItems: 'center' },
  decideText: { fontSize: 14, fontFamily: 'Nunito_800ExtraBold' },
})
