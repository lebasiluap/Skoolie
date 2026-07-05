import { useCallback, useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Animated } from 'react-native'
import { MAX_CONTENT } from '@/hooks/useResponsive'
import { router, useFocusEffect } from 'expo-router'
import { useScreenEntrance } from '@/hooks/useScreenEntrance'
import { effectiveStreak as computeEffectiveStreak, streakColors, computeFreezeConsumption } from '@/lib/streak'
import { StreakTracker } from '@/components/ui/StreakTracker'
import { Ionicons } from '@expo/vector-icons'
import Svg, { Circle } from 'react-native-svg'
import { SkeletonList } from '@/components/ui/Skeleton'
import { CappyHead } from '@/components/mascots/CappyHead'
import { MascotAnimator } from '@/components/mascots/MascotAnimator'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { useThemeMode } from '@/contexts/ThemeContext'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { TopBar } from '@/components/ui/TopBar'
import { TopicIcon } from '@/components/ui/TopicIcon'
import { topicColor } from '@/constants/topics'
import { PRACTITIONER_TITLES } from '@/constants/professions'
import { tierProgress, tierMeta } from '@/lib/tiers'
import { nextBarrage, barrageDay } from '@/lib/barrage'
import { rescheduleAll } from '@/lib/notifications'
import { preloadSounds } from '@/lib/sounds'
import { IntroGate } from '@/components/ui/IntroGate'
import type { UserProfile } from '@/types'

// Greeting uses the FIRST name only — warmer, and a five-word name can never
// wrap the hero. (Profile keeps the full name; this is just the hello.)
function getDisplayName(profile: UserProfile): string {
  const first = profile.full_name.trim().split(/\s+/)[0] || profile.full_name
  if (profile.study_year === 'practitioner') {
    const title = PRACTITIONER_TITLES[profile.profession]
    if (title) return `${title} ${first}`
  }
  return first
}

function formatSessionTime(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(Date.now() - 86400000)
  const timeStr = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  if (d.toDateString() === today.toDateString()) return `Today · ${timeStr}`
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday · ${timeStr}`
  return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · ${timeStr}`
}

interface SessionData {
  score: number
  question_ids: string[]
  xp_earned: number
  started_at: string
  mode?: string | null
  topic?: string | null
}

const MODE_META: Record<string, { label: string; icon: string }> = {
  mcq: { label: 'MCQ', icon: 'list' },
  flashcard: { label: 'Flashcards', icon: 'duplicate' },
  case_study: { label: 'Cases', icon: 'clipboard' },
  rapid_fire: { label: 'Rapid Fire', icon: 'flash' },
  barrage: { label: 'Barrage 2×', icon: 'flash' },
}

export default function DashboardScreen() {
  const C = useTheme()
  const { isDark } = useThemeMode()
  const { user, profile, refreshProfile } = useAuth()
  const entrance = useScreenEntrance()
  const [sessions, setSessions] = useState<SessionData[]>([])
  const [statTotals, setStatTotals] = useState({ answered: 0, attempts: 0, correct: 0 })
  const [todayCount, setTodayCount] = useState(0)   // questions answered today — feeds the daily goal ring
  const [topicActivity, setTopicActivity] = useState<{ topic: string; count: number; accuracy: number }[]>([])
  const [weekXp, setWeekXp] = useState(0)
  // Surprise Barrage — deterministic daily window; claimed defaults true to avoid banner flash
  const [claimedSlots, setClaimedSlots] = useState<Set<number>>(new Set([0, 1]))  // default full to avoid banner flash
  const [barrageTotal, setBarrageTotal] = useState(0)   // completed barrages (freeze every 5)
  const [, tick] = useState(0)
  useEffect(() => { const iv = setInterval(() => tick(t => t + 1), 30_000); return () => clearInterval(iv) }, [])
  const [refreshing, setRefreshing] = useState(false)
  const [booted, setBooted] = useState(false)   // first load done — gates the activity skeleton
  const [greeting, setGreeting] = useState('Good morning')

  useEffect(() => {
    const h = new Date().getHours()
    setGreeting(h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening')
    preloadSounds()   // warm the SFX players so the first tap isn't silent
  }, [])

  // Reload recent sessions AND the in-memory profile each time the dashboard
  // regains focus, so XP/level/streak update after a quiz completed elsewhere.
  useFocusEffect(useCallback(() => {
    loadSessions()
    refreshProfile()
  }, [user?.id])) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadSessions() {
    if (!user) return

    // Streak-freeze auto-consumption: if missed days are fully covered by
    // banked freezes, spend them — the streak survives (frozen days go blue).
    if (profile) {
      const freezeUpd = computeFreezeConsumption(profile)
      if (freezeUpd) {
        supabase.from('user_profiles').update(freezeUpd).eq('id', user.id).then(() => refreshProfile())
      }
    }

    // This week's league XP (week_start = ISO Monday, matching Postgres date_trunc('week')).
    const now = new Date()
    const monday = new Date(now)
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
    const weekStart = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`
    supabase.from('league_standings').select('week_xp').eq('user_id', user.id).eq('week_start', weekStart).maybeSingle()
      .then(({ data }) => setWeekXp(data?.week_xp ?? 0))
    // One query: total completed barrages (freeze every 5th) + today's claimed slots
    supabase.from('barrage_claims').select('day, slot', { count: 'exact' }).eq('user_id', user.id)
      .then(({ data, count }) => {
        const total = count ?? 0
        setBarrageTotal(total)
        const slots = new Set<number>((data ?? []).filter((r: any) => r.day === barrageDay()).map((r: any) => r.slot ?? 0))
        setClaimedSlots(slots)
        // Rebuild local mascot nudges from fresh state (streak rescue, lapse,
        // barrage-live, league deadline). Best-effort — never blocks the UI.
        if (profile) {
          const streak = computeEffectiveStreak(profile.current_streak, profile.last_active_date)
          const today = new Date()
          const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
          rescheduleAll({
            userId: user.id,
            streak,
            practicedToday: profile.last_active_date === todayKey,
            claimedSlotsToday: [...slots],
            barragesToFreeze: 5 - (total % 5),
            prefs: profile.notif_prefs,
          })
        }
      })
    try {
    const [{ data: recent }, { data: allSess }] = await Promise.all([
      supabase
        .from('quiz_sessions')
        .select('score, question_ids, xp_earned, started_at, mode, topic')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })
        .limit(4),
      supabase
        .from('quiz_sessions')
        .select('question_ids, score, started_at')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })
        .limit(200),
    ])

    setSessions(recent ?? [])

    // All-time stats (same 200-session window the Progress page uses) — not just
    // the 4 recent sessions, so the Dashboard tiles match the Progress page.
    const statsRows = allSess ?? []
    const answeredIds = statsRows.flatMap((s: any) => s.question_ids ?? [])
    setStatTotals({
      answered: new Set(answeredIds).size,                 // distinct questions — repeats don't inflate
      attempts: answeredIds.length,                        // total attempts — used for accuracy
      correct: statsRows.reduce((sum: number, s: any) => sum + (s.score ?? 0), 0),
    })

    // Daily goal — server-side since-midnight filter, identical to the
    // Practice hub's TODAY strip (no session-window divergence between tabs).
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0)
    supabase
      .from('quiz_sessions')
      .select('question_ids')
      .eq('user_id', user.id)
      .gte('started_at', dayStart.toISOString())
      .then(({ data: todayRows }) => {
        setTodayCount((todayRows ?? [])
          .reduce((n: number, r: any) => n + (r.question_ids?.length ?? 0), 0))
      })

    // TOPIC PERFORMANCE — real accuracy per topic from the answer history
    // (was_correct per attempt), not just volume. Top 5 by attempts.
    const { data: hist } = await supabase
      .from('user_question_history')
      .select('topic, was_correct')
      .eq('user_id', user.id)
      .limit(5000)
    const agg: Record<string, { n: number; ok: number }> = {}
    for (const h of (hist ?? []) as { topic: string | null; was_correct: boolean }[]) {
      if (!h.topic) continue
      const a = (agg[h.topic] ??= { n: 0, ok: 0 })
      a.n += 1
      if (h.was_correct) a.ok += 1
    }
    setTopicActivity(Object.entries(agg)
      .sort((a, b) => b[1].n - a[1].n)
      .slice(0, 5)
      .map(([topic, a]) => ({ topic, count: a.n, accuracy: Math.round((a.ok / a.n) * 100) })))
    } catch (e) {
      console.warn('dashboard load failed', e)
    } finally {
      setBooted(true)
    }
  }

  async function onRefresh() {
    setRefreshing(true)
    try { await loadSessions() } finally { setRefreshing(false) }
  }

  if (!profile) return null

  const effectiveStreak = computeEffectiveStreak(profile.current_streak, profile.last_active_date)
  const sc = streakColors(effectiveStreak, isDark)

  const profLabel = profile.profession.charAt(0).toUpperCase() + profile.profession.slice(1)
  const yearStr = profile.study_year ? ` · ${profile.study_year.replace('year', 'Year ')}` : ''

  // All-time stats (matches the Progress page's session window).
  // "Questions" = distinct questions answered; accuracy = correct / total attempts.
  const totalAnswered = statTotals.answered
  const avgAccuracy = statTotals.attempts > 0 ? Math.round((statTotals.correct / statTotals.attempts) * 100) : 0


  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <TopBar title="Dashboard" showLogo={false} />

      {/* One-time system explanations, staged so they never stack */}
      <IntroGate introKey="streak" when={effectiveStreak >= 1} />
      <IntroGate introKey="freeze" when={(profile.streak_freezes ?? 0) > 0 || (profile.frozen_dates?.length ?? 0) > 0} />
      <IntroGate introKey="barrage" when={!!user && !!nextBarrage(user.id, claimedSlots) && nextBarrage(user.id, claimedSlots)!.status === 'live'} />

      <Animated.View style={[{ flex: 1 }, entrance]}>
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: 32, width: '100%', maxWidth: MAX_CONTENT, alignSelf: 'center' }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.teal} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting + idle Cappy who reacts to your state (the app's face lives
            on the screen you see most — not just inside interruptions) */}
        {(() => {
          const todayDone = todayCount >= 10
          const barrageLive = !!user && nextBarrage(user.id, claimedSlots)?.status === 'live'
          const streakAtRisk = effectiveStreak > 0 && !todayDone && new Date().getHours() >= 17
          const expr = barrageLive ? 'wave' : todayDone ? 'happy' : streakAtRisk ? 'thinking' : 'idle'
          return (
            <View style={s.greetingRow}>
              <MascotAnimator expr={expr}>
                <CappyHead expr={expr} size={52} />
              </MascotAnimator>
              <View style={{ flex: 1 }}>
                <Text style={[s.greetingHi, { color: C.textSoft }]}>{greeting},</Text>
                <Text style={[s.greetingName, { color: C.text }]} numberOfLines={1}>{getDisplayName(profile)}</Text>
              </View>
              {effectiveStreak > 0 && (
                <View style={[s.streakBadge, { backgroundColor: sc.fill + '22' }]}>
                  <Ionicons name="flame" size={16} color={sc.text} />
                  <Text style={[s.streakBadgeText, { color: sc.text }]}>{effectiveStreak}d</Text>
                </View>
              )}
            </View>
          )
        })()}

        {/* DAILY GOAL — the "what now?" anchor: 10 questions keeps the streak alive.
            (Barrage banner below outranks it visually while a window is live.) */}
        {(() => {
          const GOAL = 10
          const done = Math.min(todayCount, GOAL)
          const met = todayCount >= GOAL
          const r = 26, sw = 6, circ = 2 * Math.PI * r
          return (
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/(app)/practice/mcq', params: { smartStart: '1', from: 'dashboard' } } as any)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={met ? "Today's goal complete — keep practicing" : `${GOAL - todayCount} questions to today's goal — start practicing`}
              style={[s.goalCard, {
                backgroundColor: met ? C.greenTint : C.tealTint,
                borderColor: met ? C.green : C.teal,
                ...C.shadowLg,
              }]}
            >
              <View style={s.goalRingWrap}>
                <Svg width={64} height={64} viewBox="0 0 64 64">
                  <Circle cx={32} cy={32} r={r} stroke={met ? C.green + '33' : C.teal + '33'} strokeWidth={sw} fill="none" />
                  <Circle
                    cx={32} cy={32} r={r}
                    stroke={met ? C.green : C.teal} strokeWidth={sw} fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${circ}`}
                    strokeDashoffset={circ * (1 - done / GOAL)}
                    transform="rotate(-90 32 32)"
                  />
                </Svg>
                <Text style={[s.goalRingNum, { color: met ? C.green : C.teal }]}>{met ? '✓' : todayCount}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.goalTitle, { color: met ? C.green : C.tealDeep }]}>
                  {met ? "Today's goal hit! 🎉" : `${GOAL - todayCount} more to today's goal`}
                </Text>
                <Text style={[s.goalSub, { color: C.textSoft }]}>
                  {met ? 'Everything extra is bonus XP.' : '10 a day builds the habit.'}
                </Text>
              </View>
              <View style={[s.goalBtn, { backgroundColor: met ? C.success : C.teal }]}>
                <Text style={[s.goalBtnText, { color: C.onTeal }]}>{met ? 'Keep going' : 'Start'}</Text>
              </View>
            </TouchableOpacity>
          )
        })()}

        {/* Surprise Barrage — live window banner / upcoming teaser (2 windows/day) */}
        {(() => {
          if (!user) return null
          const P = C.rf
          const onP = C.onRf
          const bw = nextBarrage(user.id, claimedSlots)
          if (!bw) return null
          if (bw.status === 'live') return (
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/(app)/practice/rapidfire', params: { barrage: '1', slot: String(bw.slot) } } as any)}
              activeOpacity={0.85}
              style={[s.barrageBanner, { backgroundColor: P, ...C.shadowLg }]}
            >
              <View style={[s.barrageIcon, { backgroundColor: onP + '26' }]}>
                <Ionicons name="flash" size={22} color={onP} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.barrageTitle, { color: onP }]}>SURPRISE BARRAGE · LIVE</Text>
                <Text style={[s.barrageSub, { color: onP + 'D9' }]}>
                  2× XP — ends in {bw.minutesLeft} min · {5 - (barrageTotal % 5) === 1 ? 'this one earns a 🧊 freeze!' : `${5 - (barrageTotal % 5)} more to a 🧊 freeze`}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={onP} />
            </TouchableOpacity>
          )
          if (bw.status === 'upcoming') return (
            <View style={[s.barrageTeaser, { backgroundColor: P + '18', borderColor: P + '55' }]}>
              <Ionicons name="flash-outline" size={15} color={P} />
              <Text style={[s.barrageTeaserText, { color: C.textSoft }]}>
                {claimedSlots.size > 0 ? 'Another' : 'A'} Surprise Barrage strikes {bw.slot === 1 ? 'later today' : 'sometime today'} — catch it for <Text style={{ color: P, fontFamily: 'Nunito_800ExtraBold' }}>2× XP</Text>
              </Text>
            </View>
          )
          return null
        })()}

        {/* Tier card — one idea: what you're becoming. The tier's own color owns
            this moment; weekly XP is a compact chip (its real home is the league);
            level moved to the stats strip below the fold. */}
        {(() => {
          const tp = tierProgress(profile.tier_score ?? 0, profile.tier ?? 0)
          const tm = tierMeta(tp.tier)
          return (
            <TouchableOpacity
              onPress={() => router.push('/(app)/progress' as any)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="View your rank and league"
              style={[s.levelCard, { backgroundColor: C.surface, borderColor: C.border, ...C.shadow }]}
            >
              <View style={s.levelRow}>
                <View style={[s.levelIconBox, { backgroundColor: tm.color + '22' }]}>
                  <Ionicons name={tm.icon as any} size={22} color={tm.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.levelTitle, { color: C.text }]}>{tm.name}</Text>
                  <Text style={[s.levelSub, { color: C.textSoft }]}>{profLabel}{yearStr}</Text>
                </View>
                <View style={[s.weekChip, { backgroundColor: C.tealTint }]}>
                  <Text style={[s.weekChipText, { color: C.tealDeep }]}>{weekXp.toLocaleString()} XP · wk</Text>
                </View>
              </View>
              <ProgressBar progress={tp.pct} height={10} color={tm.color} style={{ marginTop: 14 }} />
              <Text style={[s.xpCaption, { color: C.textFaint }]}>
                {tp.need - tp.have} to {tp.next.name} — broad practice counts double
              </Text>
            </TouchableOpacity>
          )
        })()}

        {/* Streak — Duolingo-style milestone tracker */}
        <StreakTracker streak={effectiveStreak} userId={user?.id} lastActiveDate={profile.last_active_date} createdAt={profile.created_at} frozenDates={profile.frozen_dates} freezes={profile.streak_freezes} style={{ marginBottom: 22 }} />

        {/* RECENT ACTIVITY — skeleton on first load so the page doesn't jump */}
        {!booted && sessions.length === 0 && (
          <>
            <Text style={[s.eyebrow, { color: C.textFaint }]}>RECENT ACTIVITY</Text>
            <SkeletonList rows={3} />
          </>
        )}
        {booted && sessions.length === 0 && (
          <>
            <Text style={[s.eyebrow, { color: C.textFaint }]}>RECENT ACTIVITY</Text>
            <Text style={[s.activityMeta, { color: C.textFaint, marginBottom: 22 }]}>
              No sessions yet — hit Start above and your history will grow here.
            </Text>
          </>
        )}
        {sessions.length > 0 && (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={[s.eyebrow, { color: C.textFaint, marginBottom: 0 }]}>RECENT ACTIVITY</Text>
              <TouchableOpacity onPress={() => router.push('/(app)/history' as any)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button">
                <Text style={{ fontSize: 12, fontFamily: 'Nunito_700Bold', color: C.teal }}>Time Capsule →</Text>
              </TouchableOpacity>
            </View>
            {sessions.map((sess, i) => {
              const total = sess.question_ids?.length ?? 0
              const mm = sess.mode ? MODE_META[sess.mode] : undefined
              const title = sess.mode ? (sess.topic ?? 'Random') : 'Quiz session'
              const metaLine = `${mm ? mm.label + ' · ' : ''}${sess.score} / ${total} correct`
              return (
                <View key={i} style={[s.activityRow, i > 0 && { borderTopWidth: 1, borderTopColor: C.border }]}>
                  <View style={[s.activityIcon, { backgroundColor: C.surface2 }]}>
                    <Ionicons name={(mm?.icon ?? 'checkmark') as any} size={15} color={C.textSoft} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.activityTitle, { color: C.text }]} numberOfLines={1}>{title}</Text>
                    <Text style={[s.activityMeta, { color: C.textFaint }]}>{metaLine}</Text>
                    <Text style={[s.activityTime, { color: C.textFaint }]}>{formatSessionTime(sess.started_at)}</Text>
                  </View>
                  <Text style={[s.xpChipText, { color: C.textSoft }]}>+{sess.xp_earned} XP</Text>
                </View>
              )
            })}
          </>
        )}

        {/* YOUR STATS — one quiet strip; reference material, not competing cards */}
        <Text style={[s.eyebrow, { color: C.textFaint }]}>YOUR STATS</Text>
        <View style={[s.statStrip, { backgroundColor: C.surface, borderColor: C.border }]}>
          {[
            // Color = meaning: volume is brand teal, accuracy is semantic by
            // value, level is the quiet odometer, streak wears the flame.
            { val: `${totalAnswered}`, label: 'Questions', color: C.teal },
            {
              val: `${avgAccuracy}%`, label: 'Accuracy',
              color: statTotals.attempts === 0 ? C.textFaint
                : avgAccuracy >= 75 ? C.success : avgAccuracy >= 50 ? C.teal
                : avgAccuracy >= 30 ? C.warning : C.danger,
            },
            { val: `Lv ${profile.level}`, label: 'Level', color: C.text },
            { val: `${profile.longest_streak ?? 0}d`, label: 'Best streak', color: (profile.longest_streak ?? 0) > 0 ? C.coral : C.textFaint },
          ].map((stat, i) => (
            <View key={stat.label} style={[s.statCell, i > 0 && { borderLeftWidth: 1, borderLeftColor: C.border }]}>
              <Text style={[s.statVal, { color: stat.color }]}>{stat.val}</Text>
              <Text style={[s.statLabel, { color: C.textFaint }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* TOPIC PERFORMANCE */}
        {topicActivity.length > 0 && (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={[s.eyebrow, { color: C.textFaint, marginBottom: 0 }]}>TOPIC PERFORMANCE</Text>
              <TouchableOpacity
                onPress={() => router.push({ pathname: '/(app)/progress/analytics', params: { from: 'dashboard' } } as any)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
              >
                <Text style={{ fontSize: 12, fontFamily: 'Nunito_700Bold', color: C.teal }}>Insights →</Text>
              </TouchableOpacity>
            </View>
            <View style={[s.topicCard, { backgroundColor: C.surface, borderColor: C.border, ...C.shadow }]}>
              {topicActivity.map((t, i) => {
                const { color: tColor, bgLight: tBg } = topicColor(t.topic)
                // Bar shows ACCURACY (it says "performance", so it must mean it);
                // color is semantic — success/teal/warning/danger by score.
                const accColor = t.accuracy >= 75 ? C.success : t.accuracy >= 50 ? C.teal : t.accuracy >= 30 ? C.warning : C.danger
                return (
                  <View
                    key={t.topic}
                    style={[s.topicRow, i > 0 && s.topicDivider, i > 0 && { borderTopColor: C.border }]}
                  >
                    <View style={[s.topicIconBox, { backgroundColor: tBg }]}>
                      <TopicIcon topic={t.topic} size={16} color={tColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={s.topicLabelRow}>
                        <Text style={[s.topicName, { color: C.text }]} numberOfLines={1}>{t.topic}</Text>
                        <Text style={[s.topicPct, { color: accColor }]}>{t.accuracy}% · {t.count}q</Text>
                      </View>
                      <View style={[s.topicTrack, { backgroundColor: C.surface3 }]}>
                        <View style={[s.topicFill, { backgroundColor: accColor, width: `${t.accuracy}%` as any }]} />
                      </View>
                    </View>
                  </View>
                )
              })}
            </View>
          </>
        )}
      </ScrollView>
      </Animated.View>
    </View>
  )
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: 18, paddingTop: 20 },

  // Greeting
  greetingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, gap: 12 },
  greetingHi: { fontSize: 15, fontFamily: 'Nunito_600SemiBold', marginBottom: 2 },
  greetingName: { fontSize: 26, fontFamily: 'Nunito_900Black', letterSpacing: -0.3 },
  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999 },
  streakBadgeText: { fontSize: 14, fontFamily: 'Nunito_800ExtraBold' },

  // Daily goal hero
  goalCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 20, borderWidth: 1.5, padding: 16, marginBottom: 14 },
  goalRingWrap: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center' },
  goalRingNum: { position: 'absolute', fontSize: 19, fontFamily: 'Nunito_900Black', fontVariant: ['tabular-nums'] },
  goalTitle: { fontSize: 16.5, fontFamily: 'Nunito_800ExtraBold', marginBottom: 2 },
  goalSub: { fontSize: 12.5, fontFamily: 'Nunito_600SemiBold', lineHeight: 17 },
  goalBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999 },
  goalBtnText: { fontSize: 13, fontFamily: 'Nunito_800ExtraBold' },

  // Level card (surface, not teal)
  levelCard: { borderRadius: 20, borderWidth: 1, padding: 20, marginTop: 10, marginBottom: 14 },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  levelIconBox: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  levelTitle: { fontSize: 17, fontFamily: 'Nunito_800ExtraBold', marginBottom: 2 },
  levelSub: { fontSize: 13, fontFamily: 'Nunito_600SemiBold' },
  xpCaption: { fontSize: 13, fontFamily: 'Nunito_600SemiBold', marginTop: 8 },
  barrageBanner: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 18, padding: 16, marginBottom: 14 },
  barrageIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  barrageTitle: { fontSize: 13, fontFamily: 'Nunito_900Black', letterSpacing: 0.6 },
  barrageSub: { fontSize: 12.5, fontFamily: 'Nunito_700Bold', marginTop: 2 },
  barrageTeaser: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, borderWidth: 1, paddingVertical: 11, paddingHorizontal: 14, marginBottom: 14 },
  barrageTeaserText: { flex: 1, fontSize: 12.5, fontFamily: 'Nunito_600SemiBold', lineHeight: 18 },
  weekChip: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999 },
  weekChipText: { fontSize: 12.5, fontFamily: 'Nunito_800ExtraBold', fontVariant: ['tabular-nums'] },

  // Eyebrow labels
  eyebrow: { fontSize: 11, fontFamily: 'Nunito_800ExtraBold', letterSpacing: 0.7, marginBottom: 12 },

  // Recent activity
  activityRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, gap: 12 },
  activityIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  activityTitle: { fontSize: 14, fontFamily: 'Nunito_700Bold' },
  activityMeta: { fontSize: 12, fontFamily: 'Nunito_600SemiBold', marginTop: 1 },
  activityTime: { fontSize: 11, fontFamily: 'Nunito_600SemiBold', marginTop: 1, opacity: 0.65 },
  xpChipText: { fontSize: 12, fontFamily: 'Nunito_800ExtraBold', fontVariant: ['tabular-nums'] },

  // Stats 2×2
  statStrip: { flexDirection: 'row', borderRadius: 16, borderWidth: 1, paddingVertical: 14, marginBottom: 22 },
  statCell: { flex: 1, alignItems: 'center', gap: 2 },
  statVal: { fontSize: 26, fontFamily: 'Nunito_900Black', letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: 12, fontFamily: 'Nunito_600SemiBold', marginTop: 3 },

  // Topic performance
  topicCard: { borderRadius: 18, borderWidth: 1, paddingHorizontal: 18, paddingVertical: 6, marginBottom: 8 },
  topicRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  topicDivider: { borderTopWidth: 1 },
  topicIconBox: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  topicLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  topicName: { fontSize: 13, fontFamily: 'Nunito_700Bold', flex: 1 },
  topicPct: { fontSize: 12, fontFamily: 'Nunito_700Bold', marginLeft: 6, fontVariant: ['tabular-nums'] },
  topicTrack: { height: 5, borderRadius: 3, overflow: 'hidden' },
  topicFill: { height: 5, borderRadius: 3 },
})
