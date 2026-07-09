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
import { Entrance } from '@/components/ui/Entrance'

interface LeaderboardUser {
  id: string; full_name: string; xp: number; level: number; current_streak: number
  avatar_url: string | null; profession: string; last_active_date: string | null
  tier: number | null
}

/** Weekly league row — xp is aliased to week_xp so the shared row renderer works. */
interface WeeklyRow extends LeaderboardUser { league: string }

// Medal metals are identity colors (not theme moods) — deliberately fixed hex,
// with alpha tints that read on both light and dark surfaces.
const LEAGUE_CONFIG = {
  bronze:  { label: 'Bronze',  min: 0,    color: '#b45309', bg: 'rgba(180,83,9,0.1)',    emoji: '🥉' },
  silver:  { label: 'Silver',  min: 500,  color: '#6b7280', bg: 'rgba(107,114,128,0.1)', emoji: '🥈' },
  gold:    { label: 'Gold',    min: 1500, color: '#d97706', bg: 'rgba(217,119,6,0.1)',    emoji: '🥇' },
  diamond: { label: 'Diamond', min: 4000, color: '#0891b2', bg: 'rgba(8,145,178,0.1)',    emoji: '💎' },
}

const LEAGUE_ORDER = ['bronze', 'silver', 'gold', 'diamond'] as const

/** Time until the weekly league resets (Monday 00:00, matching the server's
 *  date_trunc('week')). */
function weekEndsIn(): string {
  const now = new Date()
  const next = new Date(now)
  const dow = (now.getDay() + 6) % 7   // 0 = Monday
  next.setDate(now.getDate() + (7 - dow))
  next.setHours(0, 0, 0, 0)
  const ms = next.getTime() - now.getTime()
  const days = Math.floor(ms / 86400000)
  const hrs = Math.floor((ms % 86400000) / 3600000)
  if (days > 0) return `${days}d ${hrs}h`
  if (hrs > 0) return `${hrs}h`
  return 'soon'
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
  // Diamond Tournament — active entry shows the knockout race above the league
  const [tournament, setTournament] = useState<{
    stage: number; stageLabel: string
    entrants: { id: string; full_name: string; avatar_url: string | null; tier: number | null; xp: number }[]
  } | null>(null)
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
      // ALWAYS newest-first: without ORDER BY the row choice is arbitrary once
      // the limit binds, and recent activity would silently vanish from stats.
      user ? supabase.from('quiz_sessions').select('score, question_ids, xp_earned, started_at, mode, topic').eq('user_id', user.id).order('started_at', { ascending: false }).limit(200) : Promise.resolve({ data: [] }),
      user ? supabase.from('user_question_history').select('question_id, topic, category, subtopic, difficulty, question_type, was_correct, answered_at').eq('user_id', user.id).order('answered_at', { ascending: false }).limit(5000) : Promise.resolve({ data: [] }),
      profile ? supabase.rpc('get_question_counts', { p_profession: profile.profession, p_question_type: 'mcq', p_access_key: profile.access_key ?? null }) : Promise.resolve({ data: [] }),
      profile ? supabase.rpc('get_question_counts', { p_profession: profile.profession, p_question_type: 'flashcard', p_access_key: profile.access_key ?? null }) : Promise.resolve({ data: [] }),
    ])

    setUsers(lb ?? [])
    // Weekly league cohort — alias week_xp to xp so the row renderer is shared.
    setWeekUsers(((wk ?? []) as any[]).map(r => ({ ...r, xp: r.week_xp })))

    // Tournament (best-effort; RPC is idempotent and resolves finished stages)
    supabase.rpc('get_tournament').then(({ data: t }) => {
      setTournament(t?.in_tournament && t.status === 'active'
        ? { stage: Number(t.stage), stageLabel: String(t.stage_label), entrants: (t.entrants ?? []) as any[] }
        : null)
    })

    const totals: Record<string, number> = {}
    for (const r of [...(mcqC ?? []), ...(fcC ?? [])]) totals[r.topic] = (totals[r.topic] ?? 0) + Number(r.cnt)

    const sess = (sessions ?? []) as SessRow[]
    // KNOWN LIMIT: 1,000 distinct ids for meta lookup — newest sessions win
    // (ordered above); server-side aggregation is the eventual fix at scale.
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
  // Weekly view: league comes from the standings (promotion/relegation);
  // all-time view keeps the lifetime-XP league thresholds.
  // Unranked users default to bronze (where a fresh entrant lands) — never
  // borrow another user's league for the label.
  const myWeekLeagueId = (weekUsers.find(u => u.id === user?.id)?.league ?? 'bronze') as keyof typeof LEAGUE_CONFIG
  // Low-DAU cold start: the server merges all leagues into one global race until
  // there are enough weekly players for real cohorts — label it honestly.
  const mixedCohort = new Set(weekUsers.map(u => u.league)).size > 1
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
        // Key includes the active filters so toggling period/scope remounts
        // rows and replays the cascade
        keyExtractor={u => `${lbPeriod}-${lbScope}-${u.id}`}
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
        renderItem={({ item: u, index }) => {
          const rank = activeList.findIndex(x => x.id === u.id) + 1
          const isMe = u.id === user?.id
          const rankStyle = RANK_STYLES[rank]
          // Zones mirror credit_xp truthfully but stay VISIBLE (Duolingo-style):
          // - Promotion band always sits under displayed rank 10 — anyone who
          //   earns XP floats above the 0-XP backfill, so a top-10 spot with
          //   XP genuinely promotes. Full green caret = promoting now; faint
          //   caret = a promotion seat not yet earned (0 XP).
          // - Demotion needs ≥10 REAL weekly entrants (server rule) — the red
          //   zone only appears when someone can actually drop.
          // - Hidden in merged "Open" weeks: display ranks aren't league ranks.
          const zoneCohort = weekUsers.length
          const listLen = activeList.length
          const showZones = lbPeriod === 'week' && lbScope === 'all' && !mixedCohort
          const inPromoZone = showZones && rank <= 10
          const promoEarned = inPromoZone && u.xp > 0
          const demoStart = Math.max(11, zoneCohort - 4)
          const inDemo = showZones && !promoEarned && zoneCohort >= 10 && rank >= demoStart && rank <= zoneCohort
          const promoLine = showZones && listLen > 10 && rank === 11
          const relegLine = showZones && zoneCohort >= 11 && rank === demoStart && demoStart <= zoneCohort
          return (
            // Rows cascade in — delay capped so deep scrolls never wait
            <Entrance delay={Math.min(index, 8) * 35} dy={10}>
            {promoLine && (
              <View style={s.zoneRow}>
                <View style={[s.zoneLine, { backgroundColor: C.green }]} />
                <Ionicons name="arrow-up" size={11} color={C.green} />
                <Text style={[s.zoneText, { color: C.green }]}>PROMOTION ZONE</Text>
                <Ionicons name="arrow-up" size={11} color={C.green} />
                <View style={[s.zoneLine, { backgroundColor: C.green }]} />
              </View>
            )}
            {relegLine && (
              <View style={s.zoneRow}>
                <View style={[s.zoneLine, { backgroundColor: C.red }]} />
                <Ionicons name="arrow-down" size={11} color={C.red} />
                <Text style={[s.zoneText, { color: C.red }]}>DEMOTION ZONE</Text>
                <Ionicons name="arrow-down" size={11} color={C.red} />
                <View style={[s.zoneLine, { backgroundColor: C.red }]} />
              </View>
            )}
            <TouchableOpacity
              onPress={() => router.push(`/users/${u.id}` as any)}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={`${u.full_name}${isMe ? ', you' : ''}, rank ${rank}, ${u.xp.toLocaleString()} XP. View profile`}
              style={[s.row, { backgroundColor: isMe ? C.tealTint : C.surface, borderColor: isMe ? C.teal : C.border, marginHorizontal: 16, ...C.shadow }]}
            >
              <View style={[s.rankBox, rankStyle ? { backgroundColor: rankStyle.bg } : { backgroundColor: C.surface3 }]}>
                {rankStyle ? <Text style={{ fontSize: 18 }}>{rankStyle.label}</Text> : <Text style={[s.rankNum, { color: C.textFaint }]}>#{rank}</Text>}
              </View>
              {/* Per-row zone cue — no misreading which side of the cut a row is on */}
              {inPromoZone && <Ionicons name="caret-up" size={13} color={C.green} style={{ marginLeft: -6, opacity: promoEarned ? 1 : 0.3 }} />}
              {inDemo && <Ionicons name="caret-down" size={13} color={C.red} style={{ marginLeft: -6 }} />}
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
            </Entrance>
          )
        }}
        ListHeaderComponent={
          <View>
        {/* Section title */}
        <Text style={[s.pageTitle, { color: C.text, paddingHorizontal: 16, paddingTop: 20, marginBottom: 14 }]}>Your progress</Text>

        {/* Exam readiness + learning insights — one hero, opens full Insights */}
        <Entrance>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push('/(app)/progress/analytics' as any)}
          accessibilityRole="button"
          accessibilityLabel={`Exam readiness ${readiness} percent, ${readinessLabel}. Open learning insights`}
          // The page's ONE tinted moment — matches the Insights hero treatment
          style={[s.heroCard, { backgroundColor: readinessColor + '10', borderColor: readinessColor + '55', marginHorizontal: 16, marginBottom: 14 }]}
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

          {/* (strongest/focus chips removed — the Focus chip duplicated the
              "Do this next" card directly below; Strongest lives in Insights) */}
        </TouchableOpacity>
        </Entrance>

        {/* Next best action — one-tap into practice */}
        {nextAction && (
          <Entrance delay={70}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push({ pathname: '/(app)/practice/mcq', params: { startTopic: nextAction.topic, from: 'progress' } } as any)}
            accessibilityRole="button"
            accessibilityLabel={`Do this next: ${nextAction.title}. ${nextAction.reason}`}
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
          </Entrance>
        )}

        {/* Diamond Tournament — the knockout race outranks the league while live */}
        {tournament && (
          <Entrance delay={100}>
          <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
            <Text style={[s.pageTitle, { color: C.text }]}>🏆 Diamond Tournament</Text>
            <Text style={[s.leaderSub, { color: C.textFaint }]}>
              {tournament.stageLabel} · {tournament.stage < 3 ? 'top half advance' : 'winner takes the crown'} · ends in {weekEndsIn()}
            </Text>
            <View style={[s.tourneyCard, { backgroundColor: C.surface, borderColor: C.amber, ...C.shadow }]}>
              {tournament.entrants.map((e, i) => {
                const isMe = e.id === user?.id
                const cut = tournament.stage < 3 ? Math.max(1, Math.ceil(tournament.entrants.length / 2)) : 1
                return (
                  <View key={e.id}>
                    {i === cut && tournament.entrants.length > cut && (
                      <View style={s.zoneRow}>
                        <View style={[s.zoneLine, { backgroundColor: C.red }]} />
                        <Text style={[s.zoneText, { color: C.red }]}>{tournament.stage < 3 ? 'CUT LINE' : 'CROWN LINE'}</Text>
                        <View style={[s.zoneLine, { backgroundColor: C.red }]} />
                      </View>
                    )}
                    <View style={[s.tourneyRow, isMe && { backgroundColor: C.tealTint, borderRadius: 10 }]}>
                      <Text style={[s.rankNum, { color: i < cut ? C.amber : C.textFaint, width: 26 }]}>#{i + 1}</Text>
                      <Avatar name={e.full_name} avatarUrl={e.avatar_url} size={30} />
                      <Text style={[s.name, { color: C.text, flex: 1, marginBottom: 0 }]} numberOfLines={1}>
                        {e.full_name}{isMe ? ' (you)' : ''}
                      </Text>
                      <Text style={[s.xp, { color: C.teal }]}>{e.xp.toLocaleString()} XP</Text>
                    </View>
                  </View>
                )
              })}
            </View>
          </View>
          </Entrance>
        )}

        {/* Leaderboard */}
        <Entrance delay={140}>
        <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
          <Text style={[s.pageTitle, { color: C.text }]}>Leaderboard</Text>
          <Text style={[s.leaderSub, { color: C.textFaint }]}>
            {lbPeriod === 'week' ? 'Weekly league · resets Monday' : 'Top 50 · all-time'}
          </Text>

          {/* ONE controls row: period (ink) + scope (teal) — was two rows
              sandwiching the league card, five bands before the first row */}
          <View style={[s.scopeRow, { flexWrap: 'wrap', justifyContent: 'space-between' }]}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {LB_PERIODS.map(p => {
                const active = lbPeriod === p.id
                return (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => withFilterAnim(() => setLbPeriod(p.id))}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`Show ${p.label} leaderboard`}
                    style={[s.scopeChip, { backgroundColor: active ? C.text : C.surface2, borderColor: active ? C.text : C.border }]}
                  >
                    <Text style={[s.scopeChipText, { color: active ? C.bg : C.textSoft }]}>{p.label}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {LB_SCOPES.map(scope => {
                const active = lbScope === scope.id
                return (
                  <TouchableOpacity
                    key={scope.id}
                    onPress={() => withFilterAnim(() => setLbScope(scope.id))}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`Filter leaderboard: ${scope.label}`}
                    style={[s.scopeChip, { backgroundColor: active ? C.teal : C.surface2, borderColor: active ? C.teal : C.border }]}
                  >
                    <Text style={[s.scopeChipText, { color: active ? C.onTeal : C.textSoft }]}>{scope.label}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>

          {/* Duolingo-style league header: the shield strip shows the ladder
              (your league lit, the rest quiet), then the league name and the
              week countdown. The promotion/demotion zones live IN the list
              as dividers — no explainer chips. */}
          {lbPeriod === 'week' && (
            <View style={s.leagueHeader}>
              <View style={s.shieldRow}>
                {LEAGUE_ORDER.map(id => {
                  const lg = LEAGUE_CONFIG[id]
                  const active = !mixedCohort && id === myWeekLeagueId
                  return (
                    <View
                      key={id}
                      style={[s.shield, active
                        ? { backgroundColor: lg.bg, borderColor: lg.color, transform: [{ scale: 1.12 }] }
                        : { backgroundColor: C.surface2, borderColor: C.border }]}
                      accessible accessibilityLabel={`${lg.label} league${active ? ', your current league' : ''}`}
                    >
                      <Text style={{ fontSize: 22, opacity: active ? 1 : 0.35 }}>{lg.emoji}</Text>
                    </View>
                  )
                })}
              </View>
              <Text style={[s.leagueTitle, { color: C.text }]}>
                {mixedCohort ? 'Open League' : `${LEAGUE_CONFIG[myWeekLeagueId].label} League`}
              </Text>
              <View style={s.leagueMetaRow}>
                <View style={[s.countdownPill, { backgroundColor: C.amberTint }]}>
                  <Ionicons name="time-outline" size={13} color={C.amber} />
                  <Text style={[s.countdownText, { color: C.amber }]}>Ends in {weekEndsIn()}</Text>
                </View>
                {mixedCohort && (
                  <Text style={[s.leaderSub, { color: C.textFaint, flexShrink: 1 }]}>All leagues race together this week</Text>
                )}
              </View>
            </View>
          )}
          {/* Filtered view keeps GLOBAL ranks (your true position) — say so,
              or the gaps in numbering read as missing rows */}
          {lbScope === 'mine' && (
            <Text style={[s.leaderSub, { color: C.textFaint, marginTop: 8 }]}>
              Showing overall ranks — numbers skip where other professions place.
            </Text>
          )}
        </View>
        </Entrance>
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

  nextCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 1, padding: 14 },
  nextIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  nextEyebrow: { fontSize: 10, fontFamily: 'Nunito_800ExtraBold', letterSpacing: 0.7, marginBottom: 2 },
  nextTitle: { fontSize: 14.5, fontFamily: 'Nunito_800ExtraBold' },
  nextReason: { fontSize: 12, fontFamily: 'Nunito_600SemiBold', marginTop: 1 },
  nextPill: { paddingVertical: 7, paddingHorizontal: 13, borderRadius: 999 },
  nextPillText: { fontSize: 13, fontFamily: 'Nunito_800ExtraBold' },

  // Diamond Tournament
  tourneyCard: { borderRadius: 16, borderWidth: 1.5, padding: 10, marginTop: 10 },
  tourneyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 8 },

  // Duolingo-style league header
  leagueHeader: { alignItems: 'center', marginTop: 16 },
  shieldRow: { flexDirection: 'row', gap: 14, marginBottom: 12 },
  shield: { width: 46, height: 46, borderRadius: 23, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  leagueTitle: { fontSize: 20, fontFamily: 'Nunito_900Black', letterSpacing: -0.3 },
  leagueMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  countdownPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 5, paddingHorizontal: 11, borderRadius: 999 },
  countdownText: { fontSize: 12, fontFamily: 'Nunito_800ExtraBold', fontVariant: ['tabular-nums'] },
  zoneRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 16, marginBottom: 10, marginTop: 2 },
  zoneLine: { flex: 1, height: 1.5, borderRadius: 1, opacity: 0.5 },
  zoneText: { fontSize: 10, fontFamily: 'Nunito_800ExtraBold', letterSpacing: 0.8 },
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
