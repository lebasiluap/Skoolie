import { useCallback, useEffect, useRef, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, Animated } from 'react-native'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { TopBar } from '@/components/ui/TopBar'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { TopicIcon } from '@/components/ui/TopicIcon'
import { topicColor } from '@/constants/topics'
import { useScreenEntrance } from '@/hooks/useScreenEntrance'
import { withAccordionAnim } from '@/lib/anim'
import { computeAnalytics, type Analytics, type HistRow, type SessRow, type QMeta } from '@/lib/analytics'
import { CappyHead } from '@/components/mascots/CappyHead'
import { MascotAnimator } from '@/components/mascots/MascotAnimator'
import Svg, { Circle } from 'react-native-svg'
import { useResponsive, MAX_CONTENT } from '@/hooks/useResponsive'
import { TierBadge } from '@/components/ui/TierBadge'
import { tierScore, tierProgress } from '@/lib/tiers'
import { IntroGate } from '@/components/ui/IntroGate'

const READY_HINT: Record<string, string> = {
  'Exam ready': 'Keep it warm with quick daily reviews.',
  'Strong': 'Close the last gaps and you’re there.',
  'On track': 'Solid base — keep broadening your coverage.',
  'Building': 'Coming along — target weak spots next.',
  'Getting started': 'Answer questions daily to build your score.',
}

export default function AnalyticsScreen() {
  const C = useTheme()
  const { user, profile } = useAuth()
  const { isSmall } = useResponsive()
  const entrance = useScreenEntrance()
  const [data, setData] = useState<Analytics | null>(null)
  const [standing, setStanding] = useState({ rankField: 0, nField: 0, rankGlobal: 0, nGlobal: 0 })
  const [bookmarkCount, setBookmarkCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [openTopic, setOpenTopic] = useState<string | null>(null)

  // "See all" from the Progress page deep-links to the analytics deep-dive
  // (section=insights); the readiness hero opens the page at the top.
  const { section } = useLocalSearchParams<{ section?: string }>()
  const scrollRef = useRef<ScrollView>(null)
  const insightsY = useRef(0)
  const didAutoScroll = useRef(false)

  useEffect(() => {
    if (!loading && section === 'insights' && !didAutoScroll.current) {
      didAutoScroll.current = true
      // Wait a frame so onLayout has populated insightsY
      setTimeout(() => scrollRef.current?.scrollTo({ y: insightsY.current, animated: true }), 250)
    }
  }, [loading, section])

  useFocusEffect(useCallback(() => { load() }, [user?.id, profile?.id])) // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    // Wait for profile; the focus effect re-runs when profile.id becomes available.
    if (!user || !profile) return
    try {
    const [{ data: hist }, { data: sess }, { data: mcqC }, { data: fcC }, { data: lb }, { count: bmCount }] = await Promise.all([
      supabase.from('user_question_history').select('question_id, topic, category, subtopic, difficulty, question_type, was_correct, answered_at').eq('user_id', user.id).limit(5000),
      supabase.from('quiz_sessions').select('score, question_ids, xp_earned, started_at, mode, topic').eq('user_id', user.id).limit(500),
      supabase.rpc('get_question_counts', { p_profession: profile.profession, p_question_type: 'mcq', p_access_key: profile.access_key ?? null }),
      supabase.rpc('get_question_counts', { p_profession: profile.profession, p_question_type: 'flashcard', p_access_key: profile.access_key ?? null }),
      supabase.rpc('get_leaderboard', { p_limit: 200 }),
      supabase.from('bookmarks').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    ])
    setBookmarkCount(bmCount ?? 0)
    const totals: Record<string, number> = {}
    for (const r of [...(mcqC ?? []), ...(fcC ?? [])]) totals[r.topic] = (totals[r.topic] ?? 0) + Number(r.cnt)

    // Build question→topic/subtopic map for the questions answered in sessions (mcq/flashcard only;
    // case composite ids like "uuid:0" aren't real question ids and are skipped).
    const ids = [...new Set(((sess ?? []) as SessRow[]).flatMap(s => s.question_ids ?? []))]
      .filter(id => id && !id.includes(':')).slice(0, 1000)
    const qMeta: QMeta = {}
    if (ids.length) {
      const { data: qrows } = await supabase.rpc('get_question_meta', { p_ids: ids })
      for (const q of (qrows ?? []) as any[]) qMeta[q.id] = { topic: q.topic, subtopic: q.subtopic, category: q.category }
    }

    setData(computeAnalytics((hist ?? []) as HistRow[], (sess ?? []) as SessRow[], qMeta, totals))

    // Rank standing (leaderboard is sorted by XP desc)
    const peers = (lb ?? []) as any[]
    const field = peers.filter(p => p.profession === profile.profession)
    setStanding({
      rankGlobal: peers.findIndex(p => p.id === user.id) + 1,
      nGlobal: peers.length,
      rankField: field.findIndex(p => p.id === user.id) + 1,
      nField: field.length,
    })
    } catch (e) {
      console.warn('analytics load failed', e)
    } finally {
      setLoading(false)
    }
  }

  async function onRefresh() { setRefreshing(true); try { await load() } finally { setRefreshing(false) } }

  const practiceTopic = (topic: string) =>
    router.push({ pathname: '/(app)/practice/mcq', params: { startTopic: topic, from: 'analytics' } } as any)

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <TopBar title="Insights" />
      <ActivityIndicator style={{ marginTop: 40 }} color={C.teal} />
    </View>
  )

  const a = data!
  const masteryColor = (p: number) => (p >= 75 ? C.green : p >= 50 ? C.teal : p >= 30 ? C.amber : C.red)

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <TopBar title="Insights" />
      <IntroGate introKey="readiness" when={a.hasData} />
      <Animated.View style={[{ flex: 1 }, entrance]}>
        <View style={[s.header, { backgroundColor: C.bg }]}>
          <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.navigate('/(app)/progress' as any))} style={[s.backBtn, { backgroundColor: C.surface2, borderColor: C.border }]} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <Ionicons name="arrow-back" size={20} color={C.textSoft} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[s.title, { color: C.text }]}>Learning Insights</Text>
            <Text style={[s.sub, { color: C.textFaint }]}>Your study plan, and how you're tracking</Text>
          </View>
        </View>

        <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 16, paddingBottom: 110, width: '100%', maxWidth: MAX_CONTENT, alignSelf: 'center' }} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.teal} />}>

          {!a.hasData ? (
            <View style={[s.empty, { backgroundColor: C.surface, borderColor: C.border }]}>
              <MascotAnimator expr="thinking">
                <CappyHead expr="thinking" size={72} />
              </MascotAnimator>
              <Text style={[s.emptyTitle, { color: C.text }]}>No data yet</Text>
              <Text style={[s.emptySub, { color: C.textFaint }]}>Answer a few questions and your learning insights will appear here.</Text>
              <TouchableOpacity onPress={() => router.navigate('/(app)/practice' as any)} style={[s.cta, { backgroundColor: C.teal }]}>
                <Text style={[s.ctaText, { color: C.onTeal }]}>Start practising →</Text>
              </TouchableOpacity>
            </View>
          ) : (
          <>
          {/* ── Exam readiness ───────────────────────────────────────── */}
          <View style={[s.readyCard, { backgroundColor: C.surface, borderColor: C.border, ...C.shadow }]}>
            <View style={s.readyTop}>
              <Ring size={isSmall ? 96 : 116} stroke={isSmall ? 9 : 11} pct={a.readiness} color={masteryColor(a.readiness)} track={C.surface3}>
                <Text style={[s.readyVal, { color: masteryColor(a.readiness), fontSize: isSmall ? 24 : 28 }]}>{a.readiness}%</Text>
                <Text style={[s.readyRingSub, { color: C.textFaint }]}>READY</Text>
              </Ring>
              <View style={{ flex: 1 }}>
                <Text style={[s.secLabel, { color: C.textFaint, marginTop: 0, marginBottom: 4 }]}>EXAM READINESS</Text>
                <Text style={[s.readyLabel, { color: C.text }]}>{a.readinessLabel}</Text>
                <Text style={[s.readyHint, { color: C.textFaint }]}>{READY_HINT[a.readinessLabel] ?? ''}</Text>
              </View>
            </View>
            <View style={[s.readyBreakdown, { borderTopColor: C.border }]}>
              {[
                { label: 'Accuracy',    val: a.accuracy,    hint: 'answering correctly' },
                { label: 'Mastery',     val: a.mastery,     hint: 'of the question bank covered' },
                { label: 'Diversity',   val: a.diversity,   hint: 'spread across subjects' },
                { label: 'Retention',   val: a.retention,   hint: 'still correct on repeat' },
                { label: 'Consistency', val: a.consistency, hint: 'study days, last 30' },
              ].map(r => (
                <View key={r.label} style={s.readyRow}>
                  <View style={[s.readyDot, { backgroundColor: masteryColor(r.val) }]} />
                  <View style={{ flex: 1 }}>
                    <View style={s.rowBetween}>
                      <Text style={[s.cardText, { color: C.textSoft }]}>{r.label}{!isSmall && <Text style={[s.note, { color: C.textFaint }]}>  ·  {r.hint}</Text>}</Text>
                      <Text style={[s.cardStrong, { color: masteryColor(r.val) }]}>{r.val}%</Text>
                    </View>
                    <ProgressBar progress={r.val / 100} height={5} color={masteryColor(r.val)} style={{ marginTop: 5 }} />
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* ── Specialty rank ───────────────────────────────────────── */}
          {(() => {
            const tp = tierProgress(
              Math.max(tierScore(a.distinctQuestions, a.diversity), profile?.tier_score ?? 0),
              profile?.tier ?? 0,
            )
            return (
              <>
                <Text style={[s.secLabel, { color: C.textFaint }]}>SPECIALTY RANK</Text>
                <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border, ...C.shadow }]}>
                  <View style={s.rowBetween}>
                    <TierBadge tier={tp.tier} size="md" />
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="arrow-forward" size={13} color={C.textFaint} />
                      <TierBadge tier={tp.tier + 1} size="md" />
                    </View>
                  </View>
                  <ProgressBar progress={tp.pct} height={8} color={C.coral} style={{ marginTop: 12 }} />
                  <Text style={[s.note, { color: C.textFaint, marginTop: 8 }]}>
                    {tp.need - tp.have} to {tp.next.name} · your rank grows with distinct questions answered, multiplied by how broadly you practise
                  </Text>
                </View>
              </>
            )
          })()}

          {/* ── Today's plan ─────────────────────────────────────────── */}
          {a.studyPlan.length > 0 && (
            <>
              <Text style={[s.secLabel, { color: C.textFaint }]}>TODAY'S PLAN</Text>
              <View style={[s.planWrap, { backgroundColor: C.surface, borderColor: C.border, ...C.shadow }]}>
                {a.studyPlan.map((p, i) => {
                  const meta = {
                    weak:   { icon: 'barbell',  color: C.red },
                    review: { icon: 'refresh',  color: C.amber },
                    new:    { icon: 'sparkles', color: C.teal },
                    polish: { icon: 'trophy',   color: C.green },
                  }[p.kind]
                  const last = i === a.studyPlan.length - 1
                  return (
                    <TouchableOpacity key={p.topic} onPress={() => practiceTopic(p.topic)} activeOpacity={0.75} style={s.planStep}>
                      {/* Timeline column */}
                      <View style={{ alignItems: 'center', width: 36 }}>
                        <View style={[s.planIcon, { backgroundColor: meta.color + '22' }]}>
                          <Ionicons name={meta.icon as any} size={16} color={meta.color} />
                        </View>
                        {!last && <View style={[s.planLine, { backgroundColor: C.border }]} />}
                      </View>
                      {/* Step content */}
                      <View style={[s.planBody, !last && { borderBottomColor: C.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                        <View style={{ flex: 1 }}>
                          <Text style={[s.cardStrong, { color: C.text }]} numberOfLines={1}>{p.title}</Text>
                          <Text style={[s.note, { color: C.textFaint, marginTop: 2 }]} numberOfLines={1}>{p.reason}</Text>
                        </View>
                        <View style={[s.planPill, { backgroundColor: meta.color + '18' }]}>
                          <Text style={[s.planPillText, { color: meta.color }]}>{p.size}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={15} color={C.textFaint} />
                      </View>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </>
          )}

          {/* ── At a glance ──────────────────────────────────────────── */}
          <View onLayout={e => { insightsY.current = e.nativeEvent.layout.y }} />
          <Text style={[s.secLabel, { color: C.textFaint }]}>AT A GLANCE</Text>
          <View style={s.miniRow}>
            {[
              { label: 'Questions', val: a.distinctQuestions.toLocaleString(), icon: 'help-circle', color: C.teal },
              { label: 'Sessions', val: a.sessions.toLocaleString(), icon: 'albums', color: C.coral },
              { label: 'Active days', val: `${a.activeDays}/30`, icon: 'calendar', color: C.amber },
              { label: 'Bookmarks', val: bookmarkCount.toLocaleString(), icon: 'bookmark', color: C.green },
            ].map(m => (
              <View key={m.label} style={[s.miniCard, { backgroundColor: C.surface, borderColor: C.border, ...C.shadow }]}>
                <View style={[s.miniIcon, { backgroundColor: m.color + '1E' }]}>
                  <Ionicons name={m.icon as any} size={14} color={m.color} />
                </View>
                <Text style={[s.miniVal, { color: C.text }]}>{m.val}</Text>
                <Text style={[s.miniLabel, { color: C.textFaint }]} numberOfLines={1}>{m.label}</Text>
              </View>
            ))}
          </View>

          {/* ── Accuracy trend (14 days) ─────────────────────────────── */}
          <Text style={[s.secLabel, { color: C.textFaint }]}>ACCURACY · LAST 14 DAYS</Text>
          <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border, ...C.shadow }]}>
            <BarChart points={a.accuracyByDay.map(p => p.value)} labels={a.accuracyByDay.map(p => p.label)} color={C.green} C={C} fixedMax={100} suffix="%" />
          </View>

          {/* ── Study mix ────────────────────────────────────────────── */}
          {(a.mix.mcq + a.mix.flashcard + a.mix.case_study) > 0 && (() => {
            const total = a.mix.mcq + a.mix.flashcard + a.mix.case_study
            const rows = [
              { label: 'MCQs', val: a.mix.mcq, color: C.teal },
              { label: 'Flashcards', val: a.mix.flashcard, color: C.coral },
              { label: 'Cases', val: a.mix.case_study, color: C.amber },
            ].sort((x, y) => y.val - x.val)
            return (
              <>
                <Text style={[s.secLabel, { color: C.textFaint }]}>STUDY MIX</Text>
                <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border, ...C.shadow }]}>
                  <Text style={[s.note, { color: C.textFaint, marginBottom: 10 }]}>You practise {rows[0].label} the most.</Text>
                  {rows.map(r => (
                    <View key={r.label} style={{ marginBottom: 10 }}>
                      <View style={s.rowBetween}>
                        <Text style={[s.cardText, { color: C.textSoft }]}>{r.label}</Text>
                        <Text style={[s.cardStrong, { color: r.color }]}>{Math.round((r.val / total) * 100)}%</Text>
                      </View>
                      <ProgressBar progress={r.val / total} height={7} color={r.color} style={{ marginTop: 6 }} />
                    </View>
                  ))}
                </View>
              </>
            )
          })()}

          {/* ── Peer standing ────────────────────────────────────────── */}
          <Text style={[s.secLabel, { color: C.textFaint }]}>HOW YOU COMPARE</Text>
          <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border, ...C.shadow }]}>
            {[
              { label: `Among ${profile?.profession ?? 'your field'}`, rank: standing.rankField, n: standing.nField },
              { label: 'Among all students', rank: standing.rankGlobal, n: standing.nGlobal },
            ].map(p => {
              const ranked = p.rank > 0 && p.n > 0
              const fill = ranked ? (p.n - p.rank + 1) / p.n : 0
              const display = !ranked ? '—' : p.n <= 1 ? '#1' : `#${p.rank} of ${p.n}`
              return (
                <View key={p.label} style={{ marginBottom: 10 }}>
                  <View style={s.rowBetween}>
                    <Text style={[s.cardText, { color: C.textSoft }]}>{p.label}</Text>
                    <Text style={[s.cardStrong, { color: C.teal }]}>{display}</Text>
                  </View>
                  <ProgressBar progress={Math.max(fill, ranked ? 0.04 : 0)} height={7} color={C.teal} style={{ marginTop: 6 }} />
                </View>
              )
            })}
            <Text style={[s.note, { color: C.textFaint }]}>Ranked by XP — climb by earning more.</Text>
          </View>

          {/* ── XP trend (14 days) ───────────────────────────────────── */}
          <Text style={[s.secLabel, { color: C.textFaint }]}>XP · LAST 14 DAYS</Text>
          <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border, ...C.shadow }]}>
            <BarChart points={a.xpByDay.map(p => p.value)} labels={a.xpByDay.map(p => p.label)} color={C.teal} C={C} />
          </View>

          {/* ── Study behaviour ──────────────────────────────────────── */}
          <Text style={[s.secLabel, { color: C.textFaint }]}>STUDY BEHAVIOUR</Text>
          <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border, ...C.shadow }]}>
            <View style={s.rowBetween}>
              <Text style={[s.cardText, { color: C.textSoft }]}>Most active</Text>
              <Text style={[s.cardStrong, { color: C.text }]}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][a.byWeekday.indexOf(Math.max(...a.byWeekday))]}
                {a.bestHour != null ? ` · ${formatHour(a.bestHour)}` : ''}
              </Text>
            </View>
            {a.bestHour != null && <Text style={[s.note, { color: C.textFaint, marginTop: 4 }]}>You answer most accurately around {formatHour(a.bestHour)}.</Text>}
            <View style={{ height: 10 }} />
            <BarChart points={a.byWeekday} labels={['S', 'M', 'T', 'W', 'T', 'F', 'S']} color={C.coral} C={C} highlightIndex={a.byWeekday.indexOf(Math.max(...a.byWeekday))} />
          </View>

          {/* ── Knowledge gaps ───────────────────────────────────────── */}
          {(a.weakest || a.untouched.length > 0) && (
            <>
              <Text style={[s.secLabel, { color: C.textFaint }]}>KNOWLEDGE GAPS</Text>
              <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border, ...C.shadow }]}>
                {a.weakest && (
                  <TouchableOpacity style={[s.gapRow, { borderBottomColor: C.border }]} onPress={() => practiceTopic(a.weakest!.topic)}>
                    <Ionicons name="trending-down" size={16} color={C.red} />
                    <Text style={[s.cardText, { color: C.text, flex: 1 }]} numberOfLines={1}>Weakest: {a.weakest.topic}</Text>
                    <Text style={[s.cardStrong, { color: C.red }]}>{a.weakest.accuracy}%</Text>
                  </TouchableOpacity>
                )}
                {a.untouched.slice(0, 3).map(t => (
                  <TouchableOpacity key={t} style={[s.gapRow, { borderBottomColor: C.border }]} onPress={() => practiceTopic(t)}>
                    <Ionicons name="ellipse-outline" size={16} color={C.textFaint} />
                    <Text style={[s.cardText, { color: C.text, flex: 1 }]} numberOfLines={1}>Untouched: {t}</Text>
                    <Ionicons name="chevron-forward" size={15} color={C.textFaint} />
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* ── Subjects (drill-down) ────────────────────────────────── */}
          <Text style={[s.secLabel, { color: C.textFaint }]}>SUBJECTS</Text>
          {a.topics.filter(t => t.attempts > 0).map(t => {
            const open = openTopic === t.topic
            const tc = topicColor(t.topic)
            return (
              <View key={t.topic} style={[s.card, { backgroundColor: C.surface, borderColor: C.border, ...C.shadow, padding: 0 }]}>
                <TouchableOpacity activeOpacity={0.8} onPress={() => withAccordionAnim(() => setOpenTopic(open ? null : t.topic))} style={s.subjHead}>
                  <View style={[s.tIcon, { backgroundColor: tc.bgLight }]}>
                    <TopicIcon topic={t.topic} size={18} color={tc.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.cardStrong, { color: C.text }]} numberOfLines={1}>{t.topic}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <ProgressBar progress={t.mastery / 100} height={5} color={masteryColor(t.mastery)} style={{ flex: 1 }} />
                      {t.trendDelta !== 0 && (
                        <Text style={{ fontSize: 11, fontFamily: 'Nunito_800ExtraBold', color: t.trendDelta > 0 ? C.green : C.red }}>
                          {t.trendDelta > 0 ? '▲' : '▼'}{Math.abs(t.trendDelta)}
                        </Text>
                      )}
                    </View>
                    <Text style={[s.note, { color: C.textFaint, marginTop: 4 }]}>{t.mastery}% mastered · {t.accuracy}% accuracy · {t.attempts} attempts</Text>
                  </View>
                  <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={C.textFaint} />
                </TouchableOpacity>
                {open && (
                  <View style={[s.subList, { borderTopColor: C.border }]}>
                    {t.subtopics.length === 0 && (
                      <Text style={[s.note, { color: C.textFaint }]}>Practice MCQs or flashcards in this subject to unlock subtopic-level insights.</Text>
                    )}
                    {t.subtopics.map(st => (
                      <View key={st.name} style={s.subRow}>
                        <Text style={[s.subName, { color: C.textSoft }]} numberOfLines={1}>{st.name}</Text>
                        <View style={s.subRight}>
                          <View style={[s.subBarTrack, { backgroundColor: C.surface3 }]}>
                            <View style={[s.subBarFill, { width: `${st.accuracy}%`, backgroundColor: masteryColor(st.accuracy) }]} />
                          </View>
                          <Text style={[s.subPct, { color: masteryColor(st.accuracy) }]}>{st.accuracy}%</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )
          })}
          </>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  )
}

function formatHour(h: number) {
  const am = h < 12
  const hr = h % 12 === 0 ? 12 : h % 12
  return `${hr}${am ? 'am' : 'pm'}`
}

/** Circular progress ring with centered children. */
function Ring({ size, stroke, pct, color, track, children }: {
  size: number; stroke: number; pct: number; color: string; track: string; children: React.ReactNode
}) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        {pct > 0 && (
          <Circle
            cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
            strokeDasharray={`${circ}`} strokeDashoffset={circ * (1 - Math.min(100, pct) / 100)}
            strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>{children}</View>
    </View>
  )
}

/** Bar chart — highlighted bar (default: last, i.e. today) is full-strength with a
 *  value bubble; the rest render softened so the eye lands on "now". */
function BarChart({ points, labels, color, C, fixedMax, suffix = '', highlightIndex }: {
  points: number[]; labels: string[]; color: string; C: any; fixedMax?: number; suffix?: string; highlightIndex?: number
}) {
  const max = fixedMax ?? Math.max(1, ...points)
  const hi = highlightIndex ?? points.length - 1
  return (
    <View>
      <View style={s.chartRow}>
        {points.map((v, i) => (
          <View key={i} style={s.chartCol}>
            {i === hi && v > 0 && (
              <View style={[s.chartBubble, { backgroundColor: color }]}>
                <Text style={[s.chartBubbleText, { color: C.onTeal }]}>{v}{suffix}</Text>
              </View>
            )}
            <View style={[s.bar, {
              height: `${Math.max(3, (v / max) * 100)}%`,
              backgroundColor: v > 0 ? (i === hi ? color : color + '73') : C.surface3,
            }]} />
          </View>
        ))}
      </View>
      <View style={s.chartRow}>
        {labels.map((l, i) => (
          <Text key={i} style={[s.chartLabel, { color: i === hi ? C.textSoft : C.textFaint, fontFamily: i === hi ? 'Nunito_800ExtraBold' : 'Nunito_600SemiBold' }]}>{l}</Text>
        ))}
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1, flexShrink: 0 },
  title: { fontSize: 24, fontFamily: 'Nunito_900Black', letterSpacing: -0.3 },
  sub: { fontSize: 13, fontFamily: 'Nunito_600SemiBold', marginTop: 2 },

  secLabel: { fontSize: 11, fontFamily: 'Nunito_800ExtraBold', letterSpacing: 0.8, marginTop: 22, marginBottom: 10 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 4 },
  cardText: { fontSize: 14, fontFamily: 'Nunito_600SemiBold' },
  cardStrong: { fontSize: 14, fontFamily: 'Nunito_800ExtraBold' },
  note: { fontSize: 11.5, fontFamily: 'Nunito_600SemiBold' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  readyCard: { borderRadius: 20, borderWidth: 1, padding: 18 },
  readyTop: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  readyVal: { fontFamily: 'Nunito_900Black', letterSpacing: -0.8 },
  readyRingSub: { fontSize: 9, fontFamily: 'Nunito_800ExtraBold', letterSpacing: 1, marginTop: 1 },
  readyLabel: { fontSize: 22, fontFamily: 'Nunito_900Black', letterSpacing: -0.3 },
  readyHint: { fontSize: 12.5, fontFamily: 'Nunito_600SemiBold', marginTop: 4, lineHeight: 18 },
  readyBreakdown: { borderTopWidth: 1, marginTop: 16, paddingTop: 14, gap: 11 },
  readyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  readyDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },

  planWrap: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 4 },
  planStep: { flexDirection: 'row', gap: 10 },
  planIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  planLine: { width: 2, flex: 1, marginVertical: 3, borderRadius: 1 },
  planBody: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 14, marginBottom: 0 },
  planPill: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999 },
  planPillText: { fontSize: 11, fontFamily: 'Nunito_800ExtraBold' },

  miniRow: { flexDirection: 'row', gap: 10, marginTop: 0 },
  miniCard: { flex: 1, borderRadius: 16, borderWidth: 1, paddingVertical: 12, paddingHorizontal: 6, alignItems: 'center' },
  miniIcon: { width: 26, height: 26, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  miniVal: { fontSize: 17, fontFamily: 'Nunito_900Black' },
  miniLabel: { fontSize: 10.5, fontFamily: 'Nunito_600SemiBold', marginTop: 2 },

  tIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },

  gapRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth },

  subjHead: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  subList: { borderTopWidth: 1, paddingHorizontal: 16, paddingVertical: 10, gap: 10 },
  subRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  subName: { flex: 1, fontSize: 13, fontFamily: 'Nunito_600SemiBold' },
  subRight: { flexDirection: 'row', alignItems: 'center', gap: 8, width: 120 },
  subBarTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  subBarFill: { height: 6, borderRadius: 3 },
  subPct: { fontSize: 12, fontFamily: 'Nunito_800ExtraBold', width: 36, textAlign: 'right' },

  chartRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  chartCol: { flex: 1, height: 84, justifyContent: 'flex-end', alignItems: 'center' },
  bar: { width: '100%', borderRadius: 4, minHeight: 3 },
  chartBubble: { paddingVertical: 2, paddingHorizontal: 6, borderRadius: 7, marginBottom: 4 },
  chartBubbleText: { fontSize: 9, fontFamily: 'Nunito_800ExtraBold' },
  chartLabel: { flex: 1, fontSize: 9, textAlign: 'center', marginTop: 4 },

  empty: { alignItems: 'center', borderRadius: 18, borderWidth: 1, padding: 28, marginTop: 30, gap: 10 },
  emptyTitle: { fontSize: 17, fontFamily: 'Nunito_800ExtraBold' },
  emptySub: { fontSize: 13.5, fontFamily: 'Nunito_600SemiBold', textAlign: 'center', lineHeight: 20 },
  cta: { marginTop: 8, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 999 },
  ctaText: { fontSize: 14, fontFamily: 'Nunito_800ExtraBold' },
})
