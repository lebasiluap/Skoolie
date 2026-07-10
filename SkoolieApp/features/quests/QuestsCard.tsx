/**
 * QuestsCard — embeddable dashboard card: today's 3 quests with progress bars
 * plus the weekly chest tracker (N of 5 days). All numbers are server-computed
 * by quest_today(); the card refetches on mount and whenever `refreshKey`
 * changes (pass the dashboard's focus counter to keep it live).
 */
import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/hooks/useTheme'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { questToday, questIcon } from './api'
import type { QuestToday } from './types'

interface Props {
  /** Bump to refetch (e.g. a useFocusEffect counter on the host screen) */
  refreshKey?: number
  /** Open the full quests screen */
  onOpenFull?: () => void
}

export function QuestsCard({ refreshKey = 0, onOpenFull }: Props) {
  const C = useTheme()
  const [today, setToday] = useState<QuestToday | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let live = true
    questToday().then(({ today: t, error }) => {
      if (!live) return
      if (error || !t) setFailed(true)
      else { setToday(t); setFailed(false) }
      setLoading(false)
    })
    return () => { live = false }
  }, [refreshKey])

  // Quiet card: no data → no noise on the dashboard.
  if (failed) return null

  return (
    <TouchableOpacity activeOpacity={onOpenFull ? 0.85 : 1} onPress={onOpenFull} disabled={!onOpenFull}
      style={[s.card, { backgroundColor: C.surface, borderColor: C.border, ...C.shadow }]}>
      <View style={s.headRow}>
        <View style={s.headLeft}>
          <Ionicons name="rocket" size={15} color={C.teal} />
          <Text style={[s.headTitle, { color: C.text }]}>Daily Quests</Text>
        </View>
        {today?.all_done
          ? <View style={[s.doneChip, { backgroundColor: C.greenTint }]}>
              <Text style={[s.doneChipText, { color: C.green }]}>All done ✓</Text>
            </View>
          : onOpenFull && <Ionicons name="chevron-forward" size={16} color={C.textFaint} />}
      </View>

      {loading && <ActivityIndicator style={{ marginVertical: 18 }} color={C.teal} />}

      {!loading && today && (
        <>
          {today.quests.map(q => (
            <View key={q.key} style={s.questRow}>
              <View style={[s.questIcon, { backgroundColor: q.done ? C.greenTint : C.surface2 }]}>
                <Ionicons name={questIcon(q.kind) as any} size={14} color={q.done ? C.green : C.textFaint} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={s.questTitleRow}>
                  <Text style={[s.questTitle, { color: q.done ? C.textFaint : C.text }]} numberOfLines={1}>{q.title}</Text>
                  <Text style={[s.questCount, { color: q.done ? C.green : C.textFaint }]}>
                    {q.done ? '✓' : `${q.progress}/${q.target}`}
                  </Text>
                </View>
                <ProgressBar progress={q.target > 0 ? q.progress / q.target : 0} height={6} color={q.done ? C.green : C.teal} />
              </View>
            </View>
          ))}

          {/* ── Chest tracker ── */}
          <View style={[s.chestRow, { borderTopColor: C.border }]}>
            <Text style={s.chestEmoji}>{today.week.chest.claimed ? '🎁' : '🧰'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.chestLabel, { color: C.textSoft }]}>
                {today.week.chest.claimed
                  ? 'Weekly chest opened!'
                  : today.week.chest.eligible
                  ? 'Weekly chest ready to open!'
                  : `${today.week.count}/${today.week.chest.needed} quest days this week`}
              </Text>
              <View style={s.pipRow}>
                {Array.from({ length: today.week.chest.needed }).map((_, i) => (
                  <View key={i} style={[s.pip, {
                    backgroundColor: i < today.week.count ? C.gold : C.surface3,
                  }]} />
                ))}
              </View>
            </View>
            {today.week.chest.eligible && !today.week.chest.claimed && (
              <View style={[s.openChip, { backgroundColor: C.gold }]}>
                <Text style={s.openChipText}>OPEN</Text>
              </View>
            )}
          </View>
        </>
      )}
    </TouchableOpacity>
  )
}

const s = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, padding: 16 },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  headLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headTitle: { fontSize: 14, fontFamily: 'Nunito_900Black' },
  doneChip: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999 },
  doneChipText: { fontSize: 11, fontFamily: 'Nunito_800ExtraBold' },

  questRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  questIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  questTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  questTitle: { flex: 1, fontSize: 13, fontFamily: 'Nunito_700Bold', marginRight: 8 },
  questCount: { fontSize: 12, fontFamily: 'Nunito_800ExtraBold', fontVariant: ['tabular-nums'] },

  chestRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, paddingTop: 12, marginTop: 2 },
  chestEmoji: { fontSize: 22 },
  chestLabel: { fontSize: 12, fontFamily: 'Nunito_700Bold', marginBottom: 5 },
  pipRow: { flexDirection: 'row', gap: 4 },
  pip: { flex: 1, height: 6, borderRadius: 3, maxWidth: 34 },
  openChip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999 },
  openChipText: { fontSize: 11, fontFamily: 'Nunito_900Black', color: '#FFFFFF' },
})
