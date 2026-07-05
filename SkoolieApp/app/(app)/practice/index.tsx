import { useCallback, useEffect, useRef, useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Animated } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { useScreenEntrance } from '@/hooks/useScreenEntrance'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/hooks/useTheme'
import { useThemeMode } from '@/contexts/ThemeContext'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { TopBar } from '@/components/ui/TopBar'
import { TopicIcon } from '@/components/ui/TopicIcon'
import { topicColor } from '@/constants/topics'
import { useFilters, type QSet } from '@/contexts/FiltersContext'
import { withFilterAnim } from '@/lib/anim'
import { useResponsive } from '@/hooks/useResponsive'
import { TimedModeSheet } from '@/components/ui/TimedModeSheet'
import { formatSecs } from '@/lib/timing'

interface Counts {
  mcq: number
  flashcard: number
  case_study: number
}

export default function PracticeHubScreen() {
  const C = useTheme()
  const { isDark } = useThemeMode()
  const { profile, user } = useAuth()
  const { qSet, setQSet } = useFilters()
  const entrance = useScreenEntrance()
  const [counts, setCounts] = useState<Counts>({ mcq: 0, flashcard: 0, case_study: 0 })
  const [loading, setLoading] = useState(true)
  // "Jump back in" — the topic of the LAST QUESTION answered (answer history
  // carries a topic even when the session was a Random smart start, so anyone
  // who has practiced at all gets a resume row).
  const [lastTopic, setLastTopic] = useState<{ topic: string; mode: string } | null>(null)
  useFocusEffect(useCallback(() => {
    if (!user) return
    supabase
      .from('user_question_history')
      .select('topic, question_type')
      .eq('user_id', user.id)
      .not('topic', 'is', null)
      .order('answered_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setLastTopic(data?.topic ? { topic: data.topic, mode: data.question_type ?? 'mcq' } : null))
  }, [user?.id])) // eslint-disable-line react-hooks/exhaustive-deps
  const [timedSheet, setTimedSheet] = useState(false)
  const timedOn = profile?.timed_mode ?? false
  const timedSecs = profile?.timed_seconds ?? 30

  // Sliding highlight for the QUESTION SET segmented control
  const indicatorX = useRef(new Animated.Value(0)).current
  const indicatorW = useRef(new Animated.Value(0)).current
  const segMeasured = useRef(false)
  const [segLayouts, setSegLayouts] = useState<Record<string, { x: number; w: number }>>({})

  useEffect(() => {
    const sel = segLayouts[qSet]
    if (!sel) return
    if (!segMeasured.current) {
      // First measure — snap into place without animating.
      indicatorX.setValue(sel.x); indicatorW.setValue(sel.w); segMeasured.current = true
    } else {
      Animated.spring(indicatorX, { toValue: sel.x, useNativeDriver: false, damping: 18, stiffness: 240 }).start()
      Animated.spring(indicatorW, { toValue: sel.w, useNativeDriver: false, damping: 18, stiffness: 240 }).start()
    }
  }, [qSet, segLayouts]) // eslint-disable-line react-hooks/exhaustive-deps

  const profLabel = profile
    ? (profile.profession.charAt(0).toUpperCase() + profile.profession.slice(1)) +
      (profile.study_year ? ` · ${profile.study_year.replace('year', 'Year ')}` : '')
    : ''

  useEffect(() => {
    if (profile) loadCounts(qSet)
  }, [profile, qSet])

  async function loadCounts(set: QSet) {
    setLoading(true)
    const prof = profile!.profession
    const ak = profile!.access_key ?? null
    // 'Global' = region:'universal', 'Regional' = region:'ghana', 'All' = no filter
    const regionVal = set === 'Global' ? 'universal' : set === 'Regional' ? 'ghana' : null

    const { data } = await supabase.rpc('get_practice_counts', { p_profession: prof, p_region: regionVal, p_access_key: ak })
    const row = Array.isArray(data) ? data[0] : data

    withFilterAnim(() => {
      setCounts({
        mcq: Number(row?.mcq ?? 0),
        flashcard: Number(row?.flashcard ?? 0),
        case_study: Number(row?.case_study ?? 0),
      })
      setLoading(false)
    })
  }

  const MODES = [
    { label: 'MCQs',        sub: 'Multiple choice',    icon: 'list' as const,      href: '/(app)/practice/mcq',        count: counts.mcq,        unit: 'questions', key: 'teal' as const },
    { label: 'Flashcards',  sub: 'Test your recall',   icon: 'duplicate' as const, href: '/(app)/practice/flashcards', count: counts.flashcard,  unit: 'cards',     key: 'coral' as const },
    { label: 'Cases',       sub: 'Clinical scenarios', icon: 'clipboard' as const, href: '/(app)/practice/cases',      count: counts.case_study, unit: 'cases',     key: 'amber' as const },
    { label: 'Rapid Fire',  sub: '5 quick · combo XP', icon: 'flash' as const,     href: '/(app)/practice/rapidfire',  count: 0,                 unit: '',          key: 'rf' as const },
  ]

  /** 2,662 → "2,600+", 300 → "300+", 47 → "47" (small banks show honest counts) */
  function roughCount(n: number): string {
    if (n >= 100) return `${(Math.floor(n / 100) * 100).toLocaleString()}+`
    return `${n}`
  }

  type ModeKey = 'teal' | 'coral' | 'amber' | 'rf'
  const colorMap: Record<ModeKey, { tint: string; fg: string; onFg: string }> = {
    teal:  { tint: C.tealTint,  fg: C.teal,  onFg: C.onTeal },
    coral: { tint: C.coralTint, fg: C.coral, onFg: C.onTeal },
    amber: { tint: C.amberTint, fg: C.amber, onFg: C.onTeal },
    rf:    { tint: C.rfTint,    fg: C.rf,    onFg: C.onRf   },
  }

  // Live half-width so rotation/tablets re-layout correctly.
  const { contentWidth } = useResponsive()
  const TILE_W = (contentWidth - 18 * 2 - 12) / 2

  const Q_SET_OPTS: QSet[] = ['All', 'Global', 'Regional']

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <TopBar title="Practice" />

      <Animated.View style={[{ flex: 1 }, entrance]}>
      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: 32 }]} showsVerticalScrollIndicator={false}>
        {/* TopBar already says "Practice" — just the context line here */}
        {profLabel ? <Text style={[s.pageSub, { color: C.textSoft }]}>{profLabel}</Text> : null}

        {/* Search — looks like an input, acts as a door. Tapping opens the
            real search screen with the keyboard already up. */}
        <TouchableOpacity
          onPress={() => router.push({ pathname: '/(app)/search', params: { from: 'practice' } } as any)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Search questions, cards, and cases"
          style={[s.searchBar, { backgroundColor: C.surface, borderColor: C.border }]}
        >
          <Ionicons name="search" size={18} color={C.textFaint} />
          <Text style={[s.searchBarText, { color: C.textFaint }]}>Search questions, cards, cases…</Text>
        </TouchableOpacity>

        {/* Timed mode — prominent banner while active; tap to change duration or turn off */}
        {timedOn && (
          <TouchableOpacity
            onPress={() => setTimedSheet(true)}
            activeOpacity={0.85}
            style={[s.timedBanner, { backgroundColor: C.tealTint, borderColor: C.teal }]}
          >
            <View style={[s.timedBannerIcon, { backgroundColor: C.teal }]}>
              <Ionicons name="timer-outline" size={22} color={C.onTeal} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.timedBannerTitle, { color: C.tealDeep }]}>Timed mode is ON</Text>
              <Text style={[s.timedBannerSub, { color: C.textSoft }]}>{formatSecs(timedSecs)} per question · tap to change</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.teal} />
          </TouchableOpacity>
        )}

        {/* QUESTION SET segmented control */}
        <Text style={[s.eyebrow, { color: C.textFaint }]}>QUESTION SET</Text>
        <View style={[s.segmentContainer, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Animated.View
            style={[s.segmentIndicator, { backgroundColor: C.teal, transform: [{ translateX: indicatorX }], width: indicatorW }]}
          />
          {Q_SET_OPTS.map(opt => (
            <TouchableOpacity
              key={opt}
              onPress={() => setQSet(opt)}
              onLayout={e => {
                const { x, width } = e.nativeEvent.layout
                setSegLayouts(p => (p[opt] && p[opt].x === x && p[opt].w === width ? p : { ...p, [opt]: { x, w: width } }))
              }}
              activeOpacity={0.8}
              style={s.segmentBtn}
            >
              <Text style={[s.segmentLabel, { color: qSet === opt ? C.onTeal : C.textSoft }]}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Mode grid — all four in one viewport, no scrolling. Two explicit
            single-tap actions per tile: Start (filled) and Browse (ghost). */}
        <View style={s.modeGrid}>
          {MODES.map(mode => {
            const clr = colorMap[mode.key]
            const isRF = mode.key === 'rf'
            return (
              <View
                key={mode.label}
                style={[s.modeTile, { width: TILE_W, backgroundColor: C.surface, borderColor: C.border, ...C.shadow }]}
              >
                <View style={s.tileHeader}>
                  <View style={[s.modeIconBox, { backgroundColor: clr.tint }]}>
                    <Ionicons name={mode.icon} size={20} color={clr.fg} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[s.modeTitle, { color: C.text }]} numberOfLines={1}>{mode.label}</Text>
                    <Text style={[s.modeSub, { color: C.textFaint }]} numberOfLines={1}>
                      {!loading && mode.count > 0 ? `${roughCount(mode.count)} ${mode.unit}` : mode.sub}
                    </Text>
                  </View>
                </View>
                <View style={{ flex: 1 }} />
                <View style={s.tileActions}>
                  <TouchableOpacity
                    onPress={() => router.push({ pathname: mode.href as any, params: { smartStart: '1' } })}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel={`${mode.label} — smart start`}
                    style={[s.tileBtn, { backgroundColor: clr.fg }]}
                  >
                    <Ionicons name="flash" size={12} color={clr.onFg} />
                    <Text style={[s.tileBtnText, { color: clr.onFg }]}>Start</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => router.push(
                      isRF
                        ? mode.href as any
                        : { pathname: mode.href, params: { browseMode: '1' } } as any
                    )}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={`Browse ${mode.label} topics`}
                    style={[s.tileBtn, s.tileBtnGhost, { borderColor: C.border }]}
                  >
                    <Text style={[s.tileBtnText, { color: C.text }]}>Browse</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )
          })}
        </View>

        {/* JUMP BACK IN — fills the below-grid space with something personal */}
        {lastTopic && (() => {
          const { color: tColor, bgLight: tBg } = topicColor(lastTopic.topic)
          const modeHref = lastTopic.mode === 'flashcard' ? '/(app)/practice/flashcards'
            : lastTopic.mode === 'case_study' ? '/(app)/practice/cases'
            : '/(app)/practice/mcq'
          const modeLabel = lastTopic.mode === 'flashcard' ? 'Flashcards'
            : lastTopic.mode === 'case_study' ? 'Cases' : 'MCQs'
          return (
            <>
              <Text style={[s.eyebrow, { color: C.textFaint, marginTop: 22 }]}>JUMP BACK IN</Text>
              <TouchableOpacity
                onPress={() => router.push({ pathname: modeHref, params: { startTopic: lastTopic.topic } } as any)}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={`Continue ${lastTopic.topic} ${modeLabel}`}
                style={[s.resumeRow, { backgroundColor: C.surface, borderColor: C.border, ...C.shadow }]}
              >
                <View style={[s.resumeIcon, { backgroundColor: tBg }]}>
                  <TopicIcon topic={lastTopic.topic} size={18} color={tColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.resumeTitle, { color: C.text }]} numberOfLines={1}>{lastTopic.topic}</Text>
                  <Text style={[s.resumeSub, { color: C.textFaint }]}>Continue with {modeLabel}</Text>
                </View>
                <Ionicons name="arrow-forward" size={18} color={tColor} />
              </TouchableOpacity>
            </>
          )
        })()}

      </ScrollView>
      </Animated.View>
      <TimedModeSheet visible={timedSheet} onClose={() => setTimedSheet(false)} />
    </View>
  )
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: 18, paddingTop: 20 },

  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 13, marginTop: 14, marginBottom: 4 },
  searchBarText: { fontSize: 14.5, fontFamily: 'Nunito_600SemiBold' },
  pageSub: { fontSize: 14, fontFamily: 'Nunito_600SemiBold', marginBottom: 2 },

  // Eyebrow
  eyebrow: { fontSize: 11, fontFamily: 'Nunito_800ExtraBold', letterSpacing: 0.7, marginBottom: 10 },

  // Timed banner
  timedBanner: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 18, borderWidth: 1.5, padding: 16, marginBottom: 20 },
  timedBannerIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  timedBannerTitle: { fontSize: 15, fontFamily: 'Nunito_900Black' },
  timedBannerSub: { fontSize: 12.5, fontFamily: 'Nunito_600SemiBold', marginTop: 2 },

  // Segmented control
  segmentContainer: {
    flexDirection: 'row', borderRadius: 14, borderWidth: 1,
    padding: 5, marginBottom: 22, alignSelf: 'flex-start', position: 'relative',
  },
  segmentIndicator: { position: 'absolute', top: 5, bottom: 5, left: 0, borderRadius: 10 },
  segmentBtn: { paddingVertical: 9, paddingHorizontal: 18, borderRadius: 10, alignItems: 'center' },
  segmentLabel: { fontSize: 13, fontFamily: 'Nunito_800ExtraBold' },

  // Mode cards
  modeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
  modeTile: { borderRadius: 20, borderWidth: 1, padding: 14 },
  tileHeader: { flexDirection: 'row', alignItems: 'center' },
  resumeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 1, padding: 14 },
  resumeIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  resumeTitle: { fontSize: 14.5, fontFamily: 'Nunito_700Bold', marginBottom: 1 },
  resumeSub: { fontSize: 12, fontFamily: 'Nunito_600SemiBold' },
  tileActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  tileBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, borderRadius: 999 },
  tileBtnGhost: { backgroundColor: 'transparent', borderWidth: 1.5 },
  tileBtnText: { fontSize: 12.5, fontFamily: 'Nunito_800ExtraBold' },
  modeIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modeTitle: { fontSize: 15.5, fontFamily: 'Nunito_800ExtraBold', marginBottom: 1 },
  modeSub: { fontSize: 11.5, fontFamily: 'Nunito_600SemiBold', fontVariant: ['tabular-nums'] },


  // Bookmarks
})
