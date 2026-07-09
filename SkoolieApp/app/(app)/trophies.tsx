/**
 * Trophy Case — every trophy in the catalog, earned ones lit with their date,
 * locked ones grayed with what it takes. Opened from Profile; public profiles
 * show a compact strip of the same data (get_user_trophies).
 */
import { useCallback, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, SectionList } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { MAX_CONTENT } from '@/hooks/useResponsive'
import { TopBar } from '@/components/ui/TopBar'
import { SkeletonList } from '@/components/ui/Skeleton'
import { Entrance } from '@/components/ui/Entrance'

interface TrophyRow {
  id: string; title: string; description: string; emoji: string
  category: string; sort: number
  earned_at: string | null
}

const CATEGORY_LABEL: Record<string, string> = {
  streaks: 'STREAKS', questions: 'QUESTIONS', sessions: 'SESSIONS',
  mastery: 'MASTERY', modes: 'PRACTICE MODES', challenge: 'DAILY CHALLENGE',
  barrage: 'SURPRISE BARRAGE', league: 'LEAGUES', growth: 'GROWTH', habits: 'HABITS',
}

export default function TrophiesScreen() {
  const C = useTheme()
  const { user } = useAuth()
  const [rows, setRows] = useState<TrophyRow[]>([])
  const [loading, setLoading] = useState(true)

  useFocusEffect(useCallback(() => {
    if (!user) return
    Promise.all([
      supabase.from('trophies').select('id, title, description, emoji, category, sort').order('sort'),
      supabase.from('user_trophies').select('trophy_id, earned_at').eq('user_id', user.id),
    ]).then(([{ data: cat }, { data: mine }]) => {
      const earned = new Map((mine ?? []).map((r: any) => [r.trophy_id, r.earned_at]))
      setRows(((cat ?? []) as any[]).map(t => ({ ...t, earned_at: earned.get(t.id) ?? null })))
      setLoading(false)
    })
  }, [user?.id])) // eslint-disable-line react-hooks/exhaustive-deps

  const earnedCount = rows.filter(r => r.earned_at).length
  const sections = Object.keys(CATEGORY_LABEL)
    .map(cat => ({ title: CATEGORY_LABEL[cat], data: rows.filter(r => r.category === cat) }))
    .filter(sec => sec.data.length > 0)

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <TopBar title="Profile" />
      <View style={[s.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <TouchableOpacity
          // Tab routes don't stack — router.back() falls through to the
          // Dashboard (same bug class as search). Always return to Profile.
          onPress={() => router.navigate('/(app)/profile' as any)}
          style={[s.iconBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
          accessibilityRole="button" accessibilityLabel="Back to profile"
        >
          <Ionicons name="arrow-back" size={20} color={C.textSoft} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[s.title, { color: C.text }]}>Trophy Case</Text>
          {!loading && <Text style={[s.sub, { color: C.textFaint }]}>{earnedCount} of {rows.length} earned</Text>}
        </View>
        <Text style={{ fontSize: 26 }}>🏆</Text>
      </View>

      {loading ? (
        <SkeletonList rows={8} style={{ marginHorizontal: 16, marginTop: 16 }} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={t => t.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100, width: '100%', maxWidth: MAX_CONTENT, alignSelf: 'center' }}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <Text style={[s.secLabel, { color: C.textFaint }]}>{section.title}</Text>
          )}
          renderItem={({ item: t, index }) => {
            const earned = !!t.earned_at
            return (
              <Entrance delay={Math.min(index, 6) * 30} dy={8}>
                <View style={[s.row, {
                  backgroundColor: earned ? C.surface : C.surface2,
                  borderColor: earned ? C.amber : C.border,
                  ...(earned ? C.shadow : null),
                }]}>
                  <View style={[s.emojiBox, { backgroundColor: earned ? C.amberTint : C.surface3 }]}>
                    <Text style={{ fontSize: 24, opacity: earned ? 1 : 0.35 }}>{t.emoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.tTitle, { color: earned ? C.text : C.textFaint }]} numberOfLines={1}>{t.title}</Text>
                    <Text style={[s.tDesc, { color: C.textFaint }]} numberOfLines={2}>{t.description}</Text>
                  </View>
                  {earned ? (
                    <View style={{ alignItems: 'flex-end' }}>
                      <Ionicons name="checkmark-circle" size={18} color={C.amber} />
                      <Text style={[s.tDate, { color: C.textFaint }]}>
                        {new Date(t.earned_at!).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                      </Text>
                    </View>
                  ) : (
                    <Ionicons name="lock-closed" size={16} color={C.textFaint} style={{ opacity: 0.5 }} />
                  )}
                </View>
              </Entrance>
            )
          }}
        />
      )}
    </View>
  )
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14, borderBottomWidth: 1 },
  iconBtn: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontFamily: 'Nunito_900Black' },
  sub: { fontSize: 12.5, fontFamily: 'Nunito_600SemiBold', marginTop: 1, fontVariant: ['tabular-nums'] },
  secLabel: { fontSize: 11, fontFamily: 'Nunito_800ExtraBold', letterSpacing: 0.8, marginTop: 18, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 1, padding: 12, marginBottom: 8 },
  emojiBox: { width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  tTitle: { fontSize: 14.5, fontFamily: 'Nunito_800ExtraBold' },
  tDesc: { fontSize: 12, fontFamily: 'Nunito_600SemiBold', marginTop: 1 },
  tDate: { fontSize: 10.5, fontFamily: 'Nunito_600SemiBold', marginTop: 2 },
})
