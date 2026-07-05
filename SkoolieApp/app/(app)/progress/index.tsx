import { useCallback, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, Animated, FlatList } from 'react-native'
import { withFilterAnim } from '@/lib/anim'
import { computeAnalytics, type Analytics, type QMeta, type HistRow, type SessRow } from '@/lib/analytics'
import { router, useFocusEffect } from 'expo-router'
import { useScreenEntrance } from '@/hooks/useScreenEntrance'
import { effectiveStreak as computeEffectiveStreak, streakStatus } from '@/lib/streak'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { MAX_CONTENT } from '@/hooks/useResponsive'
import { useTheme } from '@/hooks/useTheme'
import { Avatar } from '@/components/ui/Avatar'
import { TierBadge } from '@/components/ui/TierBadge'
import { IntroGate } from '@/components/ui/IntroGate'
import { tierScore, tierFromScore } from '@/lib/tiers'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { TopBar } from '@/components/ui/TopBar'
import { SkeletonList } from '@/components/ui/Skeleton'

interface LeaderboardUser {
  id: string; full_name: string; xp: number; level: number; current_streak: number
  avatar_url: string | null; profession: string; last_active_date: string | null
  tier: number | null
}

/** Weekly league row — xp is aliased to week_xp so the shared row renderer works. */
interface WeeklyRow extends LeaderboardUser { league: string }

const LEAGUE_CONFIG = {
  bronze:  { label: 'Bronze',  min: 0,    color: '#b45309', bg: 'rgba(180,83,9,0.1)',    emoji: '🥉' },
  silver:  { label: 'Silver',  min: 500,  color: '#6b7280', bg: 'rgba(107,114,128,0.1)', emoji: '🥈' },
  gold:    { label: 'Gold',    min: 1500, color: '#d97706', bg: 'rgba(217,119,6,0.1)',    emoji: '🥇' },
  diamond: { label: 'Diamond', min: 4000, color: '#0891b2', bg: 'rgba(8,145,178,0.1)',    emoji: '💎' },
}

function getLeague(xp: number) {
  if (xp >= 4000) return LEAGUE_CONFIG.diamond
  if (xp >= 1500) return LEAGUE_CONFIG.gold
  if (xp >= 500)  return LEAGUE_CONFIG.silver
  return LEAGUE_CONFIG.bronze
}

interface TopicMastery {
  topic: string; practiced: number; total: number
}

export default function ProgressScreen() {
  const C = useTheme()
  const { user, profile, refreshProfile } = useAuth()
  const entrance = useScreenEntrance()
  const [users, setUsers] = useState<LeaderboardUser[]>([])
  const [weekUsers, setWeekUsers] = useState<WeeklyRow[]>([])
  const [lbPeriod, setLbPeriod] = useState<'week' | 'all'>('week')
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lbScope, setLbScope] = useState<'all' | 'mine'>('all')

  // Refresh leaderboard + stats AND the in-memory profile every time the tab
  // gains focus, so XP/level/streak reflect sessions completed elsewhere.
  useFocusEffect(useCallback(() => {
    load()
    refreshProfile()
  }, [user?.id])) // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    try {
    const [{ data: lb }, { data: wk }, { data: sessions }, { data: hist }, { data: mcqC }, { data: fcC }] = await Promise.all([
      // RLS only permits reading your own user_profiles row, so the leaderboard
      // must come from a SECURITY DEFINER RPC that returns public columns only.
      supabase.rpc('get_leaderboard', { p_limit: 50 }),
      supabase.rpc('get_weekly_league'),
      user ? supabase.from('quiz_sessions').select('score, question_ids, xp_earned, started_at, mode, topic').eq('user_id', user.id).limit(200) : Promise.resolve({ data: [] }),
      user ? supabase.from('user_question_history').select('question_id, topic, category, subtopic, difficulty, question_type, was_correct, answered_at').eq('user_id', user.id).limit(5000) : Promise.resolve({ data: [] }),
      profile ? supabase.rpc('get_question_counts', { p_profession: profile.profession, p_question_type: 'mcq', p_access_key: profile.access_key ?? null }) : Promise.resolve({ data: [] }),
      profile ? supabase.rpc('get_question_counts', { p_profession: profile.profession, p_question_type: 'flashcard', p_access_key: profile.access_key ?? null }) : Promise.resolve({ data: [] }),
    ])

    setUsers(lb ?? [])
    // Weekly league cohort — alias week_xp to xp so the row renderer is shared.
    setWeekUsers(((wk ?? []) as any[]).map(r => ({ ...r, xp: r.week_xp })))

    const totals: Record<string, number> = {}
    for (const r of [...(mcqC ?? []), ...(fcC ?? [])]) totals[r.topic] = (totals[r.topic] ?? 0) + Number(r.cnt)

    const sess = (sessions ?? []) as SessRow[]
    const ids = [...new Set(sess.flatMap(s => s.question_ids ?? []))].filter(id => id && !id.includes(':')).slice(0, 1000)
    const qMeta: QMeta = {}
    if (ids.length) {
      const { data: qrows } = await supabase.rpc('get_question_meta', { p_ids: ids })
      for (const q of (qrows ?? []) as any[]) qMeta[q.id] = { topic: q.topic, subtopic: q.subtopic, category: q.category }
    }

    const a = computeAnalytics((hist ?? []) as HistRow[], sess, qMeta, totals)
    setAnalytics(a)

    // Specialty tier — rounded expertise (diversity) × distinct questions answered.
    // Persisted so the leaderboard can show everyone's badge and the dashboard can
    // show rank progress without recomputing analytics. Both are monotonic: a badge
    // (or progress) once earned is kept even if diversity later dips.
    const sc = tierScore(a.distinctQuestions, a.diversity)
    const t = tierFromScore(sc)
    if (user && profile && (t > (profile.tier ?? 0) || sc > (profile.tier_score ?? 0))) {
      supabase.from('user_profiles').update({
        tier: Math.max(t, profile.tier ?? 0),
        tier_score: Math.max(sc, profile.tier_score ?? 0),
      }).eq('id', user.id).then(() => refreshProfile())
    }
    } catch (e) {
      console.warn('progress load failed', e)
    } finally {
      setLoading(false)
    }
  }

  async function onRefresh() {
    setRefreshing(true)
    try { await load() } finally { setRefreshing(false) }
  }

  // Learning Insights preview — same computeAnalytics source as the full Insights page
  const overallMastery = analytics?.mastery ?? 0
  const accuracy = analytics?.accuracy ?? 0
  const retention = analytics?.retention ?? 0
  const strongest = analytics?.strongest ?? null
  const readiness = analytics?.readiness ?? 0
  const readinessLabel = analytics?.readinessLabel ?? 'Getting started'
  const nextAction = analytics?.studyPlan[0] ?? null
  const readinessColor = readiness >= 75 ? C.green : readiness >= 50 ? C.teal : readiness >= 30 ? C.amber : C.red

  // Which board is showing: weekly league cohort or all-time top 50.
  // Cold start: the weekly board backfills with the all-time list at 0 XP so it
  // never looks empty — anyone who earns weekly XP immediately floats above them.
  const weeklyIds = new Set(weekUsers.map(u => u.id))
  const weekMerged: LeaderboardUser[] = [
    ...weekUsers,
    ...users.filter(u => !weeklyIds.has(u.id)).map(u => ({ ...u, xp: 0 })),
  ]
  const activeList: LeaderboardUser[] = lbPeriod === 'week' ? weekMerged : users
  const myRank = activeList.findIndex(u => u.id === user?.id) + 1
  // Weekly view: league comes from the standings (promotion/relegation);
  // all-time view keeps the lifetime-XP league thresholds.
  const myWeekLeagueId = (weekUsers.find(u => u.id === user?.id)?.league ?? weekUsers[0]?.league ?? 'bronze') as keyof typeof LEAGUE_CONFIG
  // Low-DAU cold start: the server merges all leagues into one global race until
  // there are enough weekly players for real cohorts — label it honestly.
  const mixedCohort = new Set(weekUsers.map(u => u.league)).size > 1
  const baseLeague = lbPeriod === 'week' ? LEAGUE_CONFIG[myWeekLeagueId] : getLeague(profile?.xp ?? 0)
  const myLeague = lbPeriod === 'week' && mixedCohort ? { ...baseLeague, label: 'Open', emoji: '🌍' } : baseLeague
  const myWeekXp = weekUsers.find(u => u.id === user?.id)?.xp ?? 0
  const profCap = profile ? profile.profession.charAt(0).toUpperCase() + profile.profession.slice(1) : 'Mine'
  const filteredUsers = lbScope === 'mine' ? activeList.filter(u => u.profession === profile?.profession) : activeList
  const LB_SCOPES: { id: 'all' | 'mine'; label: string }[] = [
    { id: 'all', label: 'Everyone' },
    { id: 'mine', label: profCap },
  ]
  const LB_PERIODS: { id: 'week' | 'all'; label: string }[] = [
    { id: 'week', label: 'This week' },
    { id: 'all', label: 'All-time' },
  ]
  const effectiveStreak = computeEffectiveStreak(profile?.current_streak, profile?.last_active_date)

  /** Returns 0 if user hasn't practiced today or yesterday — prevents stale streak display */
  function liveStreak(u: LeaderboardUser): number {
    return computeEffectiveStreak(u.current_streak, u.last_active_date)
  }

  const RANK_STYLES: Record<number, { bg: string; color: string; label: string }> = {
    // Alpha tints render correctly over both light and dark surfaces
    1: { bg: '#D9770626', color: '#D97706', label: '🥇' },
    2: { bg: '#6B728026', color: '#6B7280', label: '🥈' },
    3: { bg: '#B4530926', color: '#B45309', label: '🥉' },
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <TopBar title="Progress" />

      <IntroGate introKey="tier" when={!loading} />
      <IntroGate introKey="league" when={!loading && (profile?.intros_seen?.includes('tier') ?? false)} />
      <Animated.View style={[{ flex: 1 }, entrance]}>
      <FlatList
        data={loading ? [] : filteredUsers}
        keyExtractor={u => u.id}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100, flexGrow: 1, width: '100%', maxWidth: MAX_CONTENT, alignSelf: 'center' }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.teal} />}
        ListEmptyComponent={
          loading ? <SkeletonList rows={6} style={{ marginTop: 8 }} />
            : <Text style={[s.emptyLb, { color: C.textFaint }]}>
                {lbPeriod === 'week' ? 'No one in your league yet this week — finish a session to enter!' : 'No one here yet'}
              </Text>
        }
        renderItem={({ item: u }) => {
          const rank = activeList.findIndex(x => x.id === u.id) + 1
          const isMe = u.id === user?.id
          const rankStyle = RANK_STYLES[rank]
          const cohort = activeList.length
          // Promotion / relegation zone dividers (weekly, unfiltered view only —
          // profession filtering would misalign the cut lines)
          const showZones = lbPeriod === 'week' && lbScope === 'all'
          const promoLine = showZones && rank === 11 && cohort > 11
          const relegLine = showZones && cohort >= 10 && rank === cohort - 4
          return (
            <View>
            {promoLine && (
              <View style={s.zoneRow}>
                <View style={[s.zoneLine, { backgroundColor: C.green }]} />
                <Text style={[s.zoneText, { color: C.green }]}>PROMOTION ↑</Text>
                <View style={[s.zoneLine, { backgroundColor: C.green }]} />
              </View>
            )}
            {relegLine && (
              <View style={s.zoneRow}>
                <View style={[s.zoneLine, { backgroundColor: C.red }]} />
                <Text style={[s.zoneText, { color: C.red }]}>RELEGATION ↓</Text>
                <View style={[s.zoneLine, { backgroundColor: C.red }]} />
              </View>
            )}
            <TouchableOpacity
              onPress={() => router.push(`/users/${u.id}` as any)}
              activeOpacity={0.75}
              style={[s.row, { backgroundColor: isMe ? C.tealTint : C.surface, borderColor: isMe ? C.teal : C.border, marginHorizontal: 16, ...C.shadow }]}
            >
              <View style={[s.rankBox, rankStyle ? { backgroundColor: rankStyle.bg } : { backgroundColor: C.surface3 }]}>
                {rankStyle ? <Text style={{ fontSize: 18 }}>{rankStyle.label}</Text> : <Text style={[s.rankNum, { color: C.textFaint }]}>#{rank}</Text>}
              </View>
              <Avatar name={u.full_name} avatarUrl={u.avatar_url} size={40} />
              {/* Quiet row: the tier badge is the ONLY colored chip; the XP value
                  is the ONLY emphasized number. Everything else is neutral. */}
              <View style={{ flex: 1 }}>
                <Text style={[s.name, { color: C.text }]} numberOfLines={1}>
                  {u.full_name}{isMe ? ' (you)' : ''}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <TierBadge tier={u.tier ?? 0} size="sm" />
                  <Text style={[s.leaguePillText, { color: C.textFaint, flexShrink: 1 }]} numberOfLines={1}>{u.profession}</Text>
                </View>
              </View>
              <Text style={[s.xp, { color: C.teal }]}>{u.xp.toLocaleString()} XP</Text>
            </TouchableOpacity>
            </View>
          )
        }}
        ListHeaderComponent={
          <View>
        {/* Section title */}
        <Text style={[s.pageTitle, { color: C.text, paddingHorizontal: 16, paddingTop: 20, marginBottom: 14 }]}>Your progress</Text>

        {/* Exam readiness + learning insights — one hero, opens full Insights */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push('/(app)/progress/analytics' as any)}
          style={[s.heroCard, { backgroundColor: C.surface, borderColor: C.border, marginHorizontal: 16, marginBottom: 14, ...C.shadow }]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={[s.heroEyebrow, { color: C.textFaint }]}>EXAM READINESS</Text>
                <Text style={[s.heroSeeAll, { color: C.teal }]}>Insights →</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
                <Text style={[s.heroVal, { color: readinessColor }]}>{readiness}%</Text>
                <Text style={[s.heroLabel, { color: C.textSoft, marginBottom: 7 }]}>{readinessLabel}</Text>
              </View>
              <View style={[s.heroTrack, { backgroundColor: C.surface3 }]}>
                <View style={[s.heroFill, { backgroundColor: readinessColor, width: `${Math.max(3, readiness)}%` }]} />
              </View>
            </View>
          </View>

          {/* Mini metrics */}
          <View style={[s.heroMetricsRow, { borderTopColor: C.border }]}>
            {[
              { label: 'Mastery',   val: `${overallMastery}%` },
              { label: 'Accuracy',  val: `${accuracy}%` },
              { label: 'Retention', val: `${retention}%` },
              { label: 'Streak',    val: `${effectiveStreak}d` },
            ].map(m => (
              <View key={m.label} style={{ flex: 1, alignItems: 'center' }}>
                <Text style={[s.heroMetricVal, { color: C.text }]}>{m.val}</Text>
                <Text style={[s.heroMetricLabel, { color: C.textFaint }]}>{m.label}</Text>
              </View>
            ))}
          </View>

          {/* Strongest / focus chips */}
          {(strongest || nextAction) && (
            <View style={s.heroChipRow}>
              {strongest && (
                <View style={[s.heroChip, { backgroundColor: C.greenTint }]}>
                  <Ionicons name="trophy" size={12} color={C.green} />
                  <Text style={[s.heroChipText, { color: C.green }]} numberOfLines={1}>Strongest · {strongest.topic}</Text>
                </View>
              )}
              {nextAction && (
                <View style={[s.heroChip, { backgroundColor: C.coralTint }]}>
                  <Ionicons name="flag" size={12} color={C.coral} />
                  <Text style={[s.heroChipText, { color: C.coral }]} numberOfLines={1}>Focus · {nextAction.topic}</Text>
                </View>
              )}
            </View>
          )}
        </TouchableOpacity>

        {/* Next best action — one-tap into practice */}
        {nextAction && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push({ pathname: '/(app)/practice/mcq', params: { startTopic: nextAction.topic, from: 'progress' } } as any)}
            style={[s.nextCard, { backgroundColor: C.surface, borderColor: C.border, marginHorizontal: 16, marginBottom: 20, ...C.shadow }]}
          >
            <View style={[s.nextIcon, { backgroundColor: C.coralTint }]}>
              <Ionicons name={nextAction.kind === 'review' ? 'refresh' : nextAction.kind === 'new' ? 'sparkles' : 'barbell'} size={18} color={C.coral} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.nextEyebrow, { color: C.coral }]}>DO THIS NEXT</Text>
              <Text style={[s.nextTitle, { color: C.text }]} numberOfLines={1}>{nextAction.title}</Text>
              <Text style={[s.nextReason, { color: C.textFaint }]} numberOfLines={1}>{nextAction.reason}</Text>
            </View>
            <View style={[s.nextPill, { backgroundColor: C.tealTint }]}>
              <Text style={[s.nextPillText, { color: C.teal }]}>Go →</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Leaderboard */}
        <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
          <Text style={[s.pageTitle, { color: C.text }]}>Leaderboard</Text>
          <Text style={[s.leaderSub, { color: C.textFaint }]}>
            {lbPeriod === 'week' ? 'Weekly league · resets Monday' : 'Top 50 · all-time'}
          </Text>

          {/* Period toggle */}
          <View style={s.scopeRow}>
            {LB_PERIODS.map(p => {
              const active = lbPeriod === p.id
              return (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => withFilterAnim(() => setLbPeriod(p.id))}
                  activeOpacity={0.8}
                  style={[s.scopeChip, { backgroundColor: active ? C.text : C.surface2, borderColor: active ? C.text : C.border }]}
                >
                  <Text style={[s.scopeChipText, { color: active ? C.bg : C.textSoft }]}>{p.label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {/* Compact league standing */}
          {profile && (
            <View style={[s.leagueCard, { backgroundColor: C.surface, borderColor: C.border, marginTop: 12, ...C.shadow }]}>
              <View style={s.leagueTopRow}>
                <Text style={{ fontSize: 22 }}>{myLeague.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[s.leagueRowName, { color: C.text }]}>{myLeague.label} League</Text>
                  <Text style={[s.leagueRowMeta, { color: C.textFaint }]}>
                    {lbPeriod === 'week'
                      ? `${myRank > 0 ? `Rank ${myRank}` : 'Unranked'} · ${myWeekXp.toLocaleString()} XP this week`
                      : `${myRank > 0 ? `Rank ${myRank}` : 'Unranked'} · ${profile.xp.toLocaleString()} XP`}
                  </Text>
                </View>
              </View>
              {lbPeriod === 'week' && (
                <View style={s.zoneChipRow}>
                  <View style={[s.zoneChip, { backgroundColor: C.greenTint }]}>
                    <Ionicons name="arrow-up" size={11} color={C.green} />
                    <Text style={[s.zoneChipText, { color: C.green }]}>Top 10 promote</Text>
                  </View>
                  <View style={[s.zoneChip, { backgroundColor: C.redTint }]}>
                    <Ionicons name="arrow-down" size={11} color={C.red} />
                    <Text style={[s.zoneChipText, { color: C.red }]}>Bottom 5 drop</Text>
                  </View>
                </View>
              )}
            </View>
          )}
          <View style={s.scopeRow}>
            {LB_SCOPES.map(scope => {
              const active = lbScope === scope.id
              return (
                <TouchableOpacity
                  key={scope.id}
                  onPress={() => withFilterAnim(() => setLbScope(scope.id))}
                  activeOpacity={0.8}
                  style={[s.scopeChip, { backgroundColor: active ? C.teal : C.surface2, borderColor: active ? C.teal : C.border }]}
                >
                  <Text style={[s.scopeChipText, { color: active ? C.onTeal : C.textSoft }]}>{scope.label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
          </View>
        }
      />
      </Animated.View>
    </View>
  )
}

const s = StyleSheet.create({
  pageTitle: { fontSize: 20, fontFamily: 'Nunito_900Black', letterSpacing: -0.3 },
  leaderSub: { fontSize: 13, fontFamily: 'Nunito_600SemiBold', marginTop: 2 },
  scopeRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  scopeChip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1 },
  scopeChipText: { fontSize: 13, fontFamily: 'Nunito_700Bold' },
  emptyLb: { textAlign: 'center', marginTop: 24, fontSize: 14, fontFamily: 'Nunito_600SemiBold' },
  sectionTitle: { fontSize: 13, fontFamily: 'Nunito_800ExtraBold', letterSpacing: 0.6 },
  sectionTitleSub: { fontSize: 13, fontFamily: 'Nunito_600SemiBold' },
  heroCard: { borderRadius: 20, borderWidth: 1, padding: 20 },
  heroEyebrow: { fontSize: 11, fontFamily: 'Nunito_800ExtraBold', letterSpacing: 0.8, marginBottom: 2 },
  heroSeeAll: { fontSize: 12, fontFamily: 'Nunito_700Bold' },
  heroVal: { fontSize: 34, fontFamily: 'Nunito_900Black', letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  heroLabel: { fontSize: 14, fontFamily: 'Nunito_700Bold' },
  heroTrack: { height: 7, borderRadius: 4, marginTop: 8, overflow: 'hidden' },
  heroFill: { height: 7, borderRadius: 4 },
  heroMetricsRow: { flexDirection: 'row', borderTopWidth: 1, marginTop: 14, paddingTop: 12 },
  heroMetricVal: { fontSize: 16, fontFamily: 'Nunito_900Black', fontVariant: ['tabular-nums'] },
  heroMetricLabel: { fontSize: 10.5, fontFamily: 'Nunito_700Bold', marginTop: 1 },
  heroChipRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  heroChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, flexShrink: 1 },
  heroChipText: { fontSize: 11, fontFamily: 'Nunito_700Bold', flexShrink: 1 },

  nextCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 1, padding: 14 },
  nextIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  nextEyebrow: { fontSize: 10, fontFamily: 'Nunito_800ExtraBold', letterSpacing: 0.7, marginBottom: 2 },
  nextTitle: { fontSize: 14.5, fontFamily: 'Nunito_800ExtraBold' },
  nextReason: { fontSize: 12, fontFamily: 'Nunito_600SemiBold', marginTop: 1 },
  nextPill: { paddingVertical: 7, paddingHorizontal: 13, borderRadius: 999 },
  nextPillText: { fontSize: 13, fontFamily: 'Nunito_800ExtraBold' },

  leagueCard: { borderRadius: 14, borderWidth: 1, paddingVertical: 12, paddingHorizontal: 14 },
  leagueTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  zoneChipRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  zoneChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999 },
  zoneChipText: { fontSize: 11, fontFamily: 'Nunito_700Bold' },
  zoneRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 10, marginTop: 2 },
  zoneLine: { flex: 1, height: 1.5, borderRadius: 1, opacity: 0.5 },
  zoneText: { fontSize: 10, fontFamily: 'Nunito_800ExtraBold', letterSpacing: 0.8 },
  leagueRowName: { fontSize: 14, fontFamily: 'Nunito_800ExtraBold' },
  leagueRowMeta: { fontSize: 12, fontFamily: 'Nunito_600SemiBold', marginTop: 1 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, borderBottomWidth: 1 },
  detailTitle: { fontSize: 20, fontFamily: 'Nunito_900Black', letterSpacing: -0.3 },
  masteryRow: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
  masteryTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  masteryTopic: { fontSize: 14, fontFamily: 'Nunito_700Bold', flex: 1, marginRight: 10 },
  masteryPct: { fontSize: 14, fontFamily: 'Nunito_800ExtraBold' },
  masteryMeta: { fontSize: 11, fontFamily: 'Nunito_600SemiBold', marginTop: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 1.5, padding: 14, marginBottom: 10 },
  rankBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rankNum: { fontSize: 13, fontFamily: 'Nunito_800ExtraBold' },
  name: { fontSize: 15, fontFamily: 'Nunito_700Bold', marginBottom: 2 },
  leaguePillText: { fontSize: 12, fontFamily: 'Nunito_600SemiBold' },
  xp: { fontSize: 14, fontFamily: 'Nunito_800ExtraBold', fontVariant: ['tabular-nums'] },
  streak: { fontSize: 12, fontFamily: 'Nunito_700Bold' },
})
