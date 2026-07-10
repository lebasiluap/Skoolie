/**
 * QuestsScreen — the full daily-quests view: today's 3 quests, the league-week
 * grid (Mon–Sun, gold check = quest-complete day), and the weekly chest.
 *
 * The chest opens through quest_week_chest(), which grants +100 XP and +1
 * streak freeze exactly once per week (idempotent server-side — mashing the
 * button or racing two devices can't double-pay). refreshProfile() afterwards
 * so the XP/freeze show up everywhere immediately.
 */
import { useCallback, useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { MAX_CONTENT } from '@/hooks/useResponsive'
import { Entrance } from '@/components/ui/Entrance'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { playSound } from '@/lib/sounds'
import { haptic } from '@/lib/haptics'
import { showToast } from '@/lib/toast'
import { questToday, questWeekChest, questIcon, weekGrid } from './api'
import type { QuestToday } from './types'

interface Props {
  onBack: () => void
}

export function QuestsScreen({ onBack }: Props) {
  const C = useTheme()
  const insets = useSafeAreaInsets()
  const { refreshProfile } = useAuth()
  const [today, setToday] = useState<QuestToday | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [opening, setOpening] = useState(false)
  const [justOpened, setJustOpened] = useState<{ xp: number; freezes: number } | null>(null)

  const load = useCallback(async (viaPull = false) => {
    if (viaPull) setRefreshing(true)
    const { today: t, error } = await questToday()
    if (error || !t) showToast("Couldn't load your quests — check your connection.", 'error')
    else setToday(t)
    setLoading(false)
    setRefreshing(false)
  }, [])

  // Progress lives server-side — refetch every time the screen regains focus
  // so quests advance after practice completed elsewhere.
  useFocusEffect(useCallback(() => { load() }, [load]))

  async function openChest() {
    if (opening) return
    setOpening(true)
    const { grant, error } = await questWeekChest()
    setOpening(false)
    if (error || !grant) {
      showToast("Couldn't open the chest — check your connection.", 'error')
      return
    }
    if (!grant.granted) {
      if (grant.reason === 'already_claimed') showToast('This week’s chest is already open.', 'info')
      else showToast(`Not yet — ${grant.days_count ?? 0}/${grant.needed ?? 5} quest days this week.`, 'info')
      load()
      return
    }
    playSound('complete')
    haptic('celebrate')
    setJustOpened({ xp: grant.xp ?? 0, freezes: grant.freezes ?? 0 })
    refreshProfile()   // XP + freeze land on the profile server-side
    load()
  }

  const grid = today ? weekGrid(today.week.week_start, today.week.days) : []
  const chest = today?.week.chest

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={[s.header, { paddingTop: insets.top + 10, backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={onBack} accessibilityRole="button" accessibilityLabel="Back" style={[s.iconBtn, { backgroundColor: C.surface2, borderColor: C.border }]}>
          <Ionicons name="arrow-back" size={20} color={C.textSoft} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[s.headerTitle, { color: C.text }]}>Daily Quests</Text>
          <Text style={[s.headerSub, { color: C.textFaint }]}>3 a day · 5 days = weekly chest</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40, width: '100%', maxWidth: MAX_CONTENT, alignSelf: 'center' }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={C.textFaint} />}
        showsVerticalScrollIndicator={false}
      >
        {loading && <ActivityIndicator style={{ marginTop: 30 }} size="large" color={C.teal} />}

        {!loading && today && (
          <>
            {/* ── Today ── */}
            <Text style={[s.secLabel, { color: C.textFaint }]}>TODAY</Text>
            {today.quests.map((q, i) => (
              <Entrance key={q.key} delay={i * 45}>
                <View style={[s.questCard, { backgroundColor: C.surface, borderColor: q.done ? C.green : C.border, ...C.shadow }]}>
                  <View style={[s.questIcon, { backgroundColor: q.done ? C.greenTint : C.tealTint }]}>
                    <Ionicons name={questIcon(q.kind) as any} size={17} color={q.done ? C.green : C.teal} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={s.questTitleRow}>
                      <Text style={[s.questTitle, { color: C.text }]} numberOfLines={1}>{q.title}</Text>
                      <Text style={[s.questCount, { color: q.done ? C.green : C.textFaint }]}>
                        {q.done ? 'Done ✓' : `${q.progress}/${q.target}`}
                      </Text>
                    </View>
                    <ProgressBar progress={q.target > 0 ? q.progress / q.target : 0} height={8} color={q.done ? C.green : C.teal} />
                  </View>
                </View>
              </Entrance>
            ))}
            {today.all_done && (
              <Entrance delay={140}>
                <Text style={[s.allDoneNote, { color: C.green }]}>🎉 All 3 done — today counts toward the chest!</Text>
              </Entrance>
            )}

            {/* ── Week grid ── */}
            <Text style={[s.secLabel, { color: C.textFaint }]}>THIS WEEK</Text>
            <Entrance delay={90}>
              <View style={[s.weekCard, { backgroundColor: C.surface, borderColor: C.border, ...C.shadow }]}>
                <View style={s.weekRow}>
                  {grid.map(d => (
                    <View key={d.date} style={s.weekDay}>
                      <View style={[s.dayDot, {
                        backgroundColor: d.done ? C.gold : C.surface3,
                        borderWidth: d.isToday ? 2 : 0,
                        borderColor: C.teal,
                      }]}>
                        {d.done
                          ? <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                          : <Text style={[s.dayDotText, { color: d.isFuture ? C.textFaint : C.textSoft }]}>{d.label}</Text>}
                      </View>
                      <Text style={[s.dayLabel, { color: d.isToday ? C.teal : C.textFaint }]}>{d.label}</Text>
                    </View>
                  ))}
                </View>
                <Text style={[s.weekNote, { color: C.textFaint }]}>
                  {today.week.count}/{chest?.needed ?? 5} quest days · league week
                </Text>
              </View>
            </Entrance>

            {/* ── Chest ── */}
            <Text style={[s.secLabel, { color: C.textFaint }]}>WEEKLY CHEST</Text>
            <Entrance delay={130}>
              <View style={[s.chestCard, {
                backgroundColor: chest?.eligible && !chest?.claimed ? C.amberTint : C.surface,
                borderColor: chest?.eligible && !chest?.claimed ? C.gold : C.border,
                ...C.shadow,
              }]}>
                <Text style={s.chestEmoji}>{chest?.claimed || justOpened ? '🎁' : '🧰'}</Text>
                {justOpened ? (
                  <>
                    <Text style={[s.chestTitle, { color: C.text }]}>Chest opened!</Text>
                    <Text style={[s.chestSub, { color: C.textSoft }]}>
                      +{justOpened.xp} XP and {justOpened.freezes} streak freeze{justOpened.freezes === 1 ? '' : 's'} banked. See you next week!
                    </Text>
                  </>
                ) : chest?.claimed ? (
                  <>
                    <Text style={[s.chestTitle, { color: C.text }]}>Opened this week</Text>
                    <Text style={[s.chestSub, { color: C.textSoft }]}>A fresh chest arrives with the new league week (Monday).</Text>
                  </>
                ) : chest?.eligible ? (
                  <>
                    <Text style={[s.chestTitle, { color: C.text }]}>Your chest is ready!</Text>
                    <Text style={[s.chestSub, { color: C.textSoft }]}>+100 XP and a streak freeze inside.</Text>
                    <TouchableOpacity onPress={openChest} disabled={opening} style={[s.openBtn, { backgroundColor: C.gold, opacity: opening ? 0.7 : 1 }]} activeOpacity={0.85}>
                      {opening
                        ? <ActivityIndicator size="small" color="#FFFFFF" />
                        : <Text style={s.openBtnText}>Open the chest</Text>}
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={[s.chestTitle, { color: C.text }]}>
                      {(chest?.needed ?? 5) - today.week.count} more quest day{(chest?.needed ?? 5) - today.week.count === 1 ? '' : 's'} to go
                    </Text>
                    <Text style={[s.chestSub, { color: C.textSoft }]}>
                      Complete all 3 quests on {chest?.needed ?? 5} days this week to unlock +100 XP and a streak freeze.
                    </Text>
                  </>
                )}
              </View>
            </Entrance>
          </>
        )}
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  headerTitle: { fontSize: 18, fontFamily: 'Nunito_900Black' },
  headerSub: { fontSize: 12.5, fontFamily: 'Nunito_600SemiBold', marginTop: 1 },

  secLabel: { fontSize: 11, fontFamily: 'Nunito_800ExtraBold', letterSpacing: 0.8, marginTop: 20, marginBottom: 10 },

  questCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 1.5, padding: 14, marginBottom: 8 },
  questIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  questTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  questTitle: { flex: 1, fontSize: 14, fontFamily: 'Nunito_800ExtraBold', marginRight: 8 },
  questCount: { fontSize: 12.5, fontFamily: 'Nunito_800ExtraBold', fontVariant: ['tabular-nums'] },
  allDoneNote: { textAlign: 'center', fontSize: 13, fontFamily: 'Nunito_800ExtraBold', marginTop: 6 },

  weekCard: { borderRadius: 16, borderWidth: 1, padding: 16 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  weekDay: { alignItems: 'center', gap: 5, flex: 1 },
  dayDot: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dayDotText: { fontSize: 12, fontFamily: 'Nunito_800ExtraBold' },
  dayLabel: { fontSize: 10.5, fontFamily: 'Nunito_800ExtraBold' },
  weekNote: { textAlign: 'center', fontSize: 12, fontFamily: 'Nunito_600SemiBold', marginTop: 12 },

  chestCard: { alignItems: 'center', borderRadius: 18, borderWidth: 1.5, padding: 20 },
  chestEmoji: { fontSize: 44, marginBottom: 8 },
  chestTitle: { fontSize: 17, fontFamily: 'Nunito_900Black', textAlign: 'center' },
  chestSub: { fontSize: 13, fontFamily: 'Nunito_600SemiBold', textAlign: 'center', marginTop: 5, lineHeight: 19 },
  openBtn: { marginTop: 14, paddingVertical: 13, paddingHorizontal: 32, borderRadius: 999, minHeight: 46, justifyContent: 'center' },
  openBtnText: { fontSize: 14, fontFamily: 'Nunito_800ExtraBold', color: '#FFFFFF' },
})
