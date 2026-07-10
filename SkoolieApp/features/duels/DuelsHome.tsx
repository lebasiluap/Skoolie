/**
 * DuelsHome — active + finished duels, plus the two ways to start one:
 * search a rival by name (same profession, server-scoped) or "Random rival".
 * Tapping a duel routes by state: your run is pending → runner; otherwise →
 * head-to-head result.
 */
import { useCallback, useEffect, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/hooks/useTheme'
import { MAX_CONTENT } from '@/hooks/useResponsive'
import { Entrance } from '@/components/ui/Entrance'
import { Avatar } from '@/components/ui/Avatar'
import { showToast } from '@/lib/toast'
import { duelList, duelCreate, duelRandom, duelSearchOpponents, timeLeft } from './api'
import type { Duel, OpponentHit } from './types'

interface Props {
  onOpen: (duel: Duel) => void
  onBack: () => void
}

export function DuelsHome({ onOpen, onBack }: Props) {
  const C = useTheme()
  const insets = useSafeAreaInsets()
  const [duels, setDuels] = useState<Duel[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [creating, setCreating] = useState(false)

  // Rival search
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<OpponentHit[]>([])
  const [searching, setSearching] = useState(false)

  const load = useCallback(async (viaPull = false) => {
    if (viaPull) setRefreshing(true)
    const { duels: d, error } = await duelList()
    if (error) showToast("Couldn't load your duels — check your connection.", 'error')
    else setDuels(d)
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Debounced rival search — server enforces same-profession scoping.
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) { setHits([]); return }
    setSearching(true)
    const t = setTimeout(async () => {
      const { hits: h } = await duelSearchOpponents(q)
      setHits(h)
      setSearching(false)
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  async function challenge(opponentId: string) {
    if (creating) return
    setCreating(true)
    const { id, error } = await duelCreate(opponentId)
    setCreating(false)
    if (error || !id) { showToast(friendly(error), 'error'); return }
    setQuery(''); setHits([])
    afterCreate(id)
  }

  async function randomRival() {
    if (creating) return
    setCreating(true)
    const { id, error } = await duelRandom()
    setCreating(false)
    if (error) { showToast(friendly(error), 'error'); return }
    if (!id) { showToast('No rivals available in your field yet — try again soon.', 'info'); return }
    afterCreate(id)
  }

  /** Refresh the list, then open the new (or deduped existing) duel. */
  async function afterCreate(id: string) {
    const { duels: d } = await duelList()
    setDuels(d)
    const duel = d.find(x => x.id === id)
    if (duel) onOpen(duel)
  }

  function friendly(error: string | null): string {
    const e = error ?? ''
    if (e.includes('different field')) return 'You can only duel someone in your own field.'
    if (e.includes('too many duels')) return 'Easy, gladiator — too many duels this hour. Try again later.'
    if (e.includes('not enough questions')) return "Not enough questions for a duel in your field yet."
    return "Couldn't start the duel — check your connection."
  }

  const active = duels.filter(d => d.status === 'pending' || d.status === 'p1_done' || d.status === 'p2_done')
  const finished = duels.filter(d => d.status === 'complete' || d.status === 'expired')

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={[s.header, { paddingTop: insets.top + 10, backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={onBack} accessibilityRole="button" accessibilityLabel="Back" style={[s.iconBtn, { backgroundColor: C.surface2, borderColor: C.border }]}>
          <Ionicons name="arrow-back" size={20} color={C.textSoft} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[s.headerTitle, { color: C.text }]}>Duels</Text>
          <Text style={[s.headerSub, { color: C.textFaint }]}>Same 10 questions · 24h · bragging rights</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40, width: '100%', maxWidth: MAX_CONTENT, alignSelf: 'center' }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={C.textFaint} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Start a duel ── */}
        <Entrance>
          <TouchableOpacity onPress={randomRival} activeOpacity={0.85} disabled={creating}
            style={[s.randomBanner, { backgroundColor: C.coral, opacity: creating ? 0.7 : 1 }]}>
            {creating
              ? <ActivityIndicator size="small" color="#FFFFFF" />
              : <>
                  <Text style={s.randomLeft}>⚔️ Random rival</Text>
                  <Text style={s.randomRight}>Challenge someone →</Text>
                </>}
          </TouchableOpacity>
        </Entrance>

        <Text style={[s.secLabel, { color: C.textFaint }]}>OR CHALLENGE BY NAME</Text>
        <View style={[s.searchBox, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Ionicons name="search" size={16} color={C.textFaint} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search classmates…"
            placeholderTextColor={C.textFaint}
            style={[s.searchInput, { color: C.text }]}
            autoCapitalize="words"
            autoCorrect={false}
          />
          {searching && <ActivityIndicator size="small" color={C.textFaint} />}
        </View>
        {hits.map((h, i) => (
          <Entrance key={h.id} delay={i * 45}>
            <TouchableOpacity onPress={() => challenge(h.id)} activeOpacity={0.75} disabled={creating}
              style={[s.hitRow, { backgroundColor: C.surface, borderColor: C.border, ...C.shadow }]}>
              <Avatar name={h.full_name} avatarUrl={h.avatar_url} size={36} />
              <Text style={[s.hitName, { color: C.text }]} numberOfLines={1}>{h.full_name}</Text>
              {h.level != null && <Text style={[s.hitLevel, { color: C.textFaint }]}>Lv {h.level}</Text>}
              <View style={[s.challengeChip, { backgroundColor: C.coralTint }]}>
                <Text style={[s.challengeChipText, { color: C.coralDeep }]}>Duel</Text>
              </View>
            </TouchableOpacity>
          </Entrance>
        ))}
        {query.trim().length >= 2 && !searching && hits.length === 0 && (
          <Text style={[s.emptyNote, { color: C.textFaint }]}>No one found in your field with that name.</Text>
        )}

        {/* ── Active ── */}
        <Text style={[s.secLabel, { color: C.textFaint }]}>ACTIVE</Text>
        {loading && <ActivityIndicator style={{ marginTop: 12 }} color={C.coral} />}
        {!loading && active.length === 0 && (
          <Text style={[s.emptyNote, { color: C.textFaint }]}>No live duels — pick a rival above.</Text>
        )}
        {active.map((d, i) => {
          const yourTurn = !d.you.done
          return (
            <Entrance key={d.id} delay={i * 45}>
              <TouchableOpacity onPress={() => onOpen(d)} activeOpacity={0.75}
                style={[s.duelRow, { backgroundColor: C.surface, borderColor: yourTurn ? C.coral : C.border, ...C.shadow }]}>
                <Avatar name={d.them.name} avatarUrl={d.them.avatar_url} size={40} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.duelName, { color: C.text }]} numberOfLines={1}>vs {d.them.name}</Text>
                  <Text style={[s.duelMeta, { color: C.textFaint }]}>
                    {yourTurn ? `Your turn · ${timeLeft(d.expires_at)}` : `Waiting for them · ${timeLeft(d.expires_at)}`}
                  </Text>
                </View>
                {yourTurn
                  ? <View style={[s.turnPill, { backgroundColor: C.coral }]}><Text style={s.turnPillText}>PLAY</Text></View>
                  : <Ionicons name="hourglass-outline" size={18} color={C.textFaint} />}
              </TouchableOpacity>
            </Entrance>
          )
        })}

        {/* ── Finished ── */}
        {finished.length > 0 && <Text style={[s.secLabel, { color: C.textFaint }]}>FINISHED</Text>}
        {finished.map((d, i) => {
          const verdict = d.status === 'expired' ? 'Expired'
            : d.draw ? 'Draw'
            : d.you_won ? 'You won' : 'They won'
          const vColor = d.status === 'expired' ? C.textFaint : d.draw ? C.amber : d.you_won ? C.green : C.red
          return (
            <Entrance key={d.id} delay={i * 45}>
              <TouchableOpacity onPress={() => onOpen(d)} activeOpacity={0.75}
                style={[s.duelRow, { backgroundColor: C.surface, borderColor: C.border, ...C.shadow }]}>
                <Avatar name={d.them.name} avatarUrl={d.them.avatar_url} size={40} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.duelName, { color: C.text }]} numberOfLines={1}>vs {d.them.name}</Text>
                  <Text style={[s.duelMeta, { color: C.textFaint }]}>
                    {d.you.score ?? '–'} : {d.them.score ?? '–'}
                  </Text>
                </View>
                <Text style={[s.verdict, { color: vColor }]}>{verdict}</Text>
              </TouchableOpacity>
            </Entrance>
          )
        })}
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  headerTitle: { fontSize: 18, fontFamily: 'Nunito_900Black' },
  headerSub: { fontSize: 12.5, fontFamily: 'Nunito_600SemiBold', marginTop: 1 },

  randomBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 16, padding: 18, minHeight: 58 },
  randomLeft: { fontSize: 16, fontFamily: 'Nunito_900Black', color: '#FFFFFF' },
  randomRight: { fontSize: 13, fontFamily: 'Nunito_700Bold', color: '#FFFFFF' },

  secLabel: { fontSize: 11, fontFamily: 'Nunito_800ExtraBold', letterSpacing: 0.8, marginTop: 22, marginBottom: 10 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, height: 48 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Nunito_700Bold', paddingVertical: 0 },
  hitRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, padding: 12, marginTop: 8 },
  hitName: { flex: 1, fontSize: 14, fontFamily: 'Nunito_700Bold' },
  hitLevel: { fontSize: 12, fontFamily: 'Nunito_700Bold' },
  challengeChip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999 },
  challengeChipText: { fontSize: 12, fontFamily: 'Nunito_800ExtraBold' },
  emptyNote: { fontSize: 13, fontFamily: 'Nunito_600SemiBold', marginTop: 4 },

  duelRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1.5, padding: 14, marginBottom: 8 },
  duelName: { fontSize: 14, fontFamily: 'Nunito_800ExtraBold' },
  duelMeta: { fontSize: 12, fontFamily: 'Nunito_600SemiBold', marginTop: 2, fontVariant: ['tabular-nums'] },
  turnPill: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999 },
  turnPillText: { fontSize: 11, fontFamily: 'Nunito_900Black', color: '#FFFFFF' },
  verdict: { fontSize: 13, fontFamily: 'Nunito_900Black' },
})
