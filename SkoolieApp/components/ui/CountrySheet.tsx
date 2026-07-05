/**
 * CountrySheet — searchable picker over ALL countries.
 * Two modes:
 *  - default: saves user_profiles.country itself (Profile settings)
 *  - onPick: hands the choice back to the caller (onboarding, before a profile exists)
 * Country drives content visibility server-side (region_visible).
 */
import { useMemo, useState } from 'react'
import { Modal, View, Text, TextInput, TouchableOpacity, Pressable, FlatList, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/hooks/useTheme'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { COUNTRIES, POPULAR_COUNTRIES } from '@/constants/countries'

interface Props {
  visible: boolean
  onClose: () => void
  /** Onboarding mode: receive the choice instead of saving to the profile. */
  onPick?: (name: string) => void
  selected?: string | null
}

export function CountrySheet({ visible, onClose, onPick, selected }: Props) {
  const C = useTheme()
  const { user, profile, refreshProfile } = useAuth()
  const [query, setQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const current = onPick ? selected : profile?.country

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q) return COUNTRIES.filter(c => c.name.toLowerCase().includes(q))
    // No search: popular first, then the full A–Z list
    const popular = POPULAR_COUNTRIES
      .map(n => COUNTRIES.find(c => c.name === n)!)
      .filter(Boolean)
    return [...popular, ...COUNTRIES.filter(c => !POPULAR_COUNTRIES.includes(c.name))]
  }, [query])

  async function pick(name: string) {
    if (saving) return
    if (onPick) { onPick(name); setQuery(''); onClose(); return }
    if (!user) return
    setSaving(true)
    await supabase.from('user_profiles').update({ country: name }).eq('id', user.id)
    await refreshProfile()
    setSaving(false)
    setQuery('')
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable style={[s.sheet, { backgroundColor: C.surface }]} onPress={() => {}}>
          <View style={[s.handle, { backgroundColor: C.surface3 }]} />
          <View style={s.headerRow}>
            <View style={[s.iconBox, { backgroundColor: C.tealTint }]}>
              <Ionicons name="globe-outline" size={20} color={C.teal} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.title, { color: C.text }]}>Country</Text>
              <Text style={[s.sub, { color: C.textFaint }]}>Global questions for everyone, plus your country's own</Text>
            </View>
          </View>

          {/* Search */}
          <View style={[s.searchBox, { backgroundColor: C.surface2, borderColor: C.border }]}>
            <Ionicons name="search" size={16} color={C.textFaint} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search all countries…"
              placeholderTextColor={C.textFaint}
              style={[s.searchInput, { color: C.text }]}
              autoCorrect={false}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <Ionicons name="close-circle" size={16} color={C.textFaint} />
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={rows}
            keyExtractor={c => c.name}
            style={{ maxHeight: 380 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={<Text style={[s.empty, { color: C.textFaint }]}>No country matches "{query}"</Text>}
            renderItem={({ item, index }) => {
              const active = current === item.name
              const isLastPopular = !query && index === POPULAR_COUNTRIES.length - 1
              return (
                <View>
                  <TouchableOpacity onPress={() => pick(item.name)} activeOpacity={0.7}
                    style={[s.row, { backgroundColor: active ? C.tealTint : 'transparent' }]}>
                    <Text style={s.flag}>{item.flag}</Text>
                    <Text style={[s.name, { color: active ? C.tealDeep : C.text }]}>{item.name}</Text>
                    {active && <Ionicons name="checkmark-circle" size={18} color={C.teal} />}
                  </TouchableOpacity>
                  {isLastPopular && <View style={[s.divider, { backgroundColor: C.border }]} />}
                </View>
              )
            }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 30 },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  iconBox: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontFamily: 'Nunito_900Black' },
  sub: { fontSize: 12.5, fontFamily: 'Nunito_600SemiBold', marginTop: 2 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Nunito_600SemiBold', padding: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 10, borderRadius: 12 },
  flag: { fontSize: 20 },
  name: { flex: 1, fontSize: 14.5, fontFamily: 'Nunito_700Bold' },
  divider: { height: 1, marginVertical: 6, marginHorizontal: 10 },
  empty: { textAlign: 'center', paddingVertical: 24, fontSize: 13.5, fontFamily: 'Nunito_600SemiBold' },
})
