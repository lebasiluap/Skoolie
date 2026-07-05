/**
 * FilterBanner — persistent-filter visibility (audit #11).
 *
 * Filters live in FiltersContext and survive across visits, so a "Hard +
 * High-yield" choice made last week silently thins every topic list today.
 * The chips themselves scroll away; this banner is pinned above the list
 * whenever any non-default filter is active, with a one-tap Clear.
 * Session size is a preference, not a filter — it never triggers the banner.
 */
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/hooks/useTheme'
import { useFilters } from '@/contexts/FiltersContext'

const cap = (v: string) => v.charAt(0).toUpperCase() + v.slice(1)

export function FilterBanner({ kind }: { kind: 'mcq' | 'fc' | 'case' }) {
  const C = useTheme()
  const { qSet, setQSet, mcqFilter, setMcqFilter, fcFilter, setFcFilter, caseFilter, setCaseFilter } = useFilters()

  const parts: string[] = []
  if (qSet !== 'All') parts.push(`${qSet} only`)
  if (kind === 'mcq') {
    if (mcqFilter.difficulty !== 'all') parts.push(cap(mcqFilter.difficulty))
    if (mcqFilter.cognitiveType !== 'all') parts.push(cap(mcqFilter.cognitiveType))
    if (mcqFilter.highYield) parts.push('High-yield')
  } else if (kind === 'fc') {
    if (fcFilter.difficulty !== 'all') parts.push(cap(fcFilter.difficulty))
    if (fcFilter.allYears) parts.push('All years')
  } else {
    if (caseFilter.difficulty !== 'all') parts.push(cap(caseFilter.difficulty))
  }
  if (parts.length === 0) return null

  function clearAll() {
    setQSet('All')
    if (kind === 'mcq') setMcqFilter(f => ({ ...f, difficulty: 'all', cognitiveType: 'all', highYield: false }))
    else if (kind === 'fc') setFcFilter(f => ({ ...f, difficulty: 'all', allYears: false }))
    else setCaseFilter(f => ({ ...f, difficulty: 'all' }))
  }

  return (
    <View style={[s.row, { backgroundColor: C.amberTint, borderBottomColor: C.border }]}>
      <Ionicons name="funnel" size={13} color={C.amber} />
      <Text style={[s.text, { color: C.textSoft }]} numberOfLines={1}>
        Filters on: <Text style={{ color: C.amber, fontFamily: 'Nunito_800ExtraBold' }}>{parts.join(' · ')}</Text>
      </Text>
      <TouchableOpacity
        onPress={clearAll}
        hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        accessibilityRole="button"
        accessibilityLabel="Clear all filters"
      >
        <Text style={[s.clear, { color: C.amber }]}>Clear</Text>
      </TouchableOpacity>
    </View>
  )
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, paddingHorizontal: 16, borderBottomWidth: 1 },
  text: { flex: 1, fontSize: 12.5, fontFamily: 'Nunito_600SemiBold' },
  clear: { fontSize: 13, fontFamily: 'Nunito_800ExtraBold' },
})
