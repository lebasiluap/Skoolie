/**
 * Time Capsule — every quiz you've ever taken, revisitable.
 *
 * Lists past sessions (all modes, newest first). Tapping an MCQ / Rapid Fire /
 * Barrage / Flashcard session reopens THOSE EXACT questions as a practice-only
 * replay (the existing ids-based flows: no XP, no streak, no session record).
 * Case sessions store composite per-question ids, so they're shown but not
 * replayable (yet).
 */
import { useCallback, useState } from 'react'
import { View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { TopBar } from '@/components/ui/TopBar'
import { MAX_CONTENT } from '@/hooks/useResponsive'

interface SessionRow {
  id: string
  score: number
  question_ids: string[]
  xp_earned: number
  started_at: string
  mode: string | null
  topic: string | null
  timed: boolean | null
}

const MODE_META: Record<string, { label: string; icon: string }> = {
  mcq: { label: 'MCQ', icon: 'list' },
  flashcard: { label: 'Flashcards', icon: 'duplicate' },
  case_study: { label: 'Cases', icon: 'clipboard' },
  rapid_fire: { label: 'Rapid Fire', icon: 'flash' },
  barrage: { label: 'Barrage 2×', icon: 'flash' },
  // Challenge replays fall through to the MCQ branch — practice-only, like all replays
  daily_challenge: { label: 'Challenge', icon: 'trophy' },
}

function formatWhen(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(Date.now() - 86_400_000)
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  if (d.toDateString() === today.toDateString()) return `Today · ${time}`
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday · ${time}`
  return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined })} · ${time}`
}

export default function HistoryScreen() {
  const C = useTheme()
  const { user } = useAuth()
  const [rows, setRows] = useState<SessionRow[]>([])
  const [loading, setLoading] = useState(true)

  useFocusEffect(useCallback(() => {
    if (!user) return
    supabase
      .from('quiz_sessions')
      .select('id, score, question_ids, xp_earned, started_at, mode, topic, timed')
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setRows((data ?? []) as SessionRow[])
        setLoading(false)
      })
  }, [user?.id])) // eslint-disable-line react-hooks/exhaustive-deps

  function replay(sess: SessionRow) {
    // Case sessions store composite "caseId:idx" ids — replay the distinct cases.
    if (sess.mode === 'case_study') {
      const cids = [...new Set((sess.question_ids ?? []).filter(id => id && id.includes(':')).map(id => id.split(':')[0]))]
      if (cids.length === 0) return
      router.push({ pathname: '/(app)/practice/cases', params: { caseIds: JSON.stringify(cids), from: 'history' } } as any)
      return
    }
    const ids = (sess.question_ids ?? []).filter(id => id && !id.includes(':'))
    if (ids.length === 0) return
    if (sess.mode === 'flashcard') {
      router.push({ pathname: '/(app)/practice/flashcards', params: { cardIds: JSON.stringify(ids), from: 'history' } } as any)
    } else {
      router.push({ pathname: '/(app)/practice/mcq', params: { questionIds: JSON.stringify(ids), from: 'history' } } as any)
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <TopBar title="Time Capsule" />
      <View style={[s.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        {/* Tab routes don't stack — back() falls to Dashboard; go to Profile */}
        <TouchableOpacity onPress={() => router.navigate('/(app)/profile' as any)} style={[s.iconBtn, { backgroundColor: C.surface2, borderColor: C.border }]} accessibilityRole="button" accessibilityLabel="Back to profile">
          <Ionicons name="arrow-back" size={20} color={C.textSoft} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[s.headerTitle, { color: C.text }]}>Time Capsule</Text>
          <Text style={[s.headerSub, { color: C.textFaint }]}>Revisit any quiz you've taken — replays are practice-only</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={C.teal} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={r => r.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100, width: '100%', maxWidth: MAX_CONTENT, alignSelf: 'center' }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={[s.empty, { color: C.textFaint }]}>No sessions yet — your finished quizzes will appear here.</Text>
          }
          renderItem={({ item }) => {
            const mm = item.mode ? MODE_META[item.mode] : undefined
            const total = item.question_ids?.length ?? 0
            const replayable = item.mode === 'case_study'
              ? (item.question_ids ?? []).some(id => id && id.includes(':'))
              : (item.question_ids ?? []).some(id => id && !id.includes(':'))
            const isBlitz = item.mode === 'rapid_fire' || item.mode === 'barrage'
            return (
              <TouchableOpacity
                disabled={!replayable}
                onPress={() => replay(item)}
                activeOpacity={0.75}
                style={[s.row, { backgroundColor: C.surface, borderColor: C.border, ...C.shadow }]}
              >
                <View style={[s.iconBox, { backgroundColor: isBlitz ? '#7C6FCD22' : C.tealTint }]}>
                  <Ionicons name={(mm?.icon ?? 'help') as any} size={18} color={isBlitz ? '#7C6FCD' : C.teal} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.title, { color: C.text }]} numberOfLines={1}>
                    {item.mode === 'daily_challenge' ? "Today's Challenge" : item.topic ?? 'Random mix'}
                  </Text>
                  <Text style={[s.meta, { color: C.textFaint }]} numberOfLines={1}>
                    {mm?.label ?? 'Quiz'} · {item.score}/{total}{item.timed ? ' · ⏱' : ''} · {formatWhen(item.started_at)}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 3 }}>
                  <Text style={[s.xp, { color: C.teal }]}>+{item.xp_earned} XP</Text>
                  {replayable
                    ? <Text style={[s.replay, { color: C.textFaint }]}>Replay →</Text>
                    : <Text style={[s.replay, { color: C.textFaint, opacity: 0.5 }]}>—</Text>}
                </View>
              </TouchableOpacity>
            )
          }}
        />
      )}
    </View>
  )
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  headerTitle: { fontSize: 18, fontFamily: 'Nunito_900Black' },
  headerSub: { fontSize: 12.5, fontFamily: 'Nunito_600SemiBold', marginTop: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 10 },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 14.5, fontFamily: 'Nunito_800ExtraBold' },
  meta: { fontSize: 12, fontFamily: 'Nunito_600SemiBold', marginTop: 2 },
  xp: { fontSize: 13, fontFamily: 'Nunito_800ExtraBold' },
  replay: { fontSize: 11.5, fontFamily: 'Nunito_700Bold' },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 14, fontFamily: 'Nunito_600SemiBold', paddingHorizontal: 30, lineHeight: 21 },
})
