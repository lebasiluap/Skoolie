import { useEffect, useRef, useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Animated } from 'react-native'
import { router } from 'expo-router'
import { useScreenEntrance } from '@/hooks/useScreenEntrance'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/hooks/useTheme'
import { useThemeMode } from '@/contexts/ThemeContext'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { TopBar } from '@/components/ui/TopBar'
import { useFilters, type QSet } from '@/contexts/FiltersContext'
import { withFilterAnim } from '@/lib/anim'
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
  const RF_PURPLE = isDark ? '#9D93E3' : '#7C6FCD'
  const RF_ON_PURPLE = isDark ? '#151038' : '#FFFFFF'
  const { profile } = useAuth()
  const { qSet, setQSet } = useFilters()
  const entrance = useScreenEntrance()
  const [counts, setCounts] = useState<Counts>({ mcq: 0, flashcard: 0, case_study: 0 })
  const [loading, setLoading] = useState(true)
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
    {
      label: 'MCQs',
      subtitle: 'Multiple choice questions',
      icon: 'list' as const,
      href: '/(app)/practice/mcq',
      count: counts.mcq,
      unit: 'questions',
      key: 'teal' as const,
    },
    {
      label: 'Flashcards',
      subtitle: 'Test your recall',
      icon: 'duplicate' as const,
      href: '/(app)/practice/flashcards',
      count: counts.flashcard,
      unit: 'cards',
      key: 'coral' as const,
    },
    {
      label: 'Case Studies',
      subtitle: 'Clinical scenarios',
      icon: 'clipboard' as const,
      href: '/(app)/practice/cases',
      count: counts.case_study,
      unit: 'cases',
      key: 'amber' as const,
    },
  ]

  type ModeKey = 'teal' | 'coral' | 'amber'
  const colorMap: Record<ModeKey, { tint: string; fg: string; deep: string; onFg: string }> = {
    teal:  { tint: C.tealTint,  fg: C.teal,  deep: C.tealDeep,  onFg: C.onTeal  },
    coral: { tint: C.coralTint, fg: C.coral, deep: C.coralDeep, onFg: C.onTeal  },
    amber: { tint: C.amberTint, fg: C.amber, deep: C.amber,     onFg: C.onTeal  },
  }

  const Q_SET_OPTS: QSet[] = ['All', 'Global', 'Regional']

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <TopBar title="Practice" />

      <Animated.View style={[{ flex: 1 }, entrance]}>
      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: 32 }]} showsVerticalScrollIndicator={false}>
        {/* Title + subtitle */}
        <Text style={[s.pageTitle, { color: C.text }]}>Practice</Text>
        {profLabel ? <Text style={[s.pageSub, { color: C.textSoft }]}>{profLabel}</Text> : null}

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

        {/* Mode cards */}
        {MODES.map(mode => {
          const clr = colorMap[mode.key]
          return (
            <View key={mode.label} style={[s.modeCard, { backgroundColor: C.surface, borderColor: C.border, ...C.shadowLg }]}>
              {/* Top row: icon + title/subtitle + count */}
              <View style={s.modeTop}>
                <View style={[s.modeIconBox, { backgroundColor: clr.tint }]}>
                  <Ionicons name={mode.icon} size={24} color={clr.fg} />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={[s.modeTitle, { color: C.text }]}>{mode.label}</Text>
                  <Text style={[s.modeSub, { color: C.textFaint }]}>{mode.subtitle}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  {loading ? (
                    <ActivityIndicator size="small" color={clr.fg} />
                  ) : (
                    <>
                      <Text style={[s.modeCount, { color: clr.fg }]}>{mode.count.toLocaleString()}</Text>
                      <Text style={[s.modeUnit, { color: C.textFaint }]}>{mode.unit}</Text>
                    </>
                  )}
                </View>
              </View>

              {/* Buttons */}
              <View style={s.modeButtons}>
                <TouchableOpacity
                  onPress={() => router.push({ pathname: mode.href as any, params: { smartStart: '1' } })}
                  activeOpacity={0.8}
                  style={[s.btnPrimary, { backgroundColor: clr.fg }]}
                >
                  <Ionicons name="flash" size={14} color={clr.onFg} />
                  <Text style={[s.btnPrimaryText, { color: clr.onFg }]}>Smart start</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => router.push({ pathname: mode.href, params: { browseMode: '1' } } as any)}
                  activeOpacity={0.8}
                  style={[s.btnGhost, { borderColor: C.border }]}
                >
                  <Text style={[s.btnGhostText, { color: C.text }]}>Browse topics</Text>
                </TouchableOpacity>
              </View>
            </View>
          )
        })}

        {/* Rapid Fire — purple brand accent */}
        <View style={[s.modeCard, { backgroundColor: C.surface, borderColor: C.border, ...C.shadowLg }]}>
          <View style={s.modeTop}>
            <View style={[s.modeIconBox, { backgroundColor: RF_PURPLE + '22' }]}>
              <Ionicons name="flash" size={24} color={RF_PURPLE} />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={[s.modeTitle, { color: C.text }]}>Rapid Fire</Text>
              <Text style={[s.modeSub, { color: C.textFaint }]}>5 quick questions · combo multiplier · bonus XP</Text>
            </View>
          </View>
          <View style={s.modeButtons}>
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/(app)/practice/rapidfire', params: { smartStart: '1' } } as any)}
              activeOpacity={0.8}
              style={[s.btnPrimary, { backgroundColor: RF_PURPLE }]}
            >
              <Ionicons name="flash" size={14} color={RF_ON_PURPLE} />
              <Text style={[s.btnPrimaryText, { color: RF_ON_PURPLE }]}>Smart start</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/(app)/practice/rapidfire' as any)}
              activeOpacity={0.8}
              style={[s.btnGhost, { borderColor: C.border }]}
            >
              <Text style={[s.btnGhostText, { color: C.text }]}>Pick topic</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search — demoted from the tab bar (Bookmarks took its slot) */}
        <TouchableOpacity
          onPress={() => router.navigate('/(app)/search' as any)}
          activeOpacity={0.75}
          style={[s.bookmarksRow, { backgroundColor: C.surface, borderColor: C.border, ...C.shadow }]}
        >
          <View style={[s.bmIcon, { backgroundColor: C.tealTint }]}>
            <Ionicons name="search" size={20} color={C.teal} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.bmLabel, { color: C.text }]}>Search</Text>
            <Text style={[s.bmSub, { color: C.textFaint }]}>Find any question, card, or case</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.textFaint} />
        </TouchableOpacity>
      </ScrollView>
      </Animated.View>
      <TimedModeSheet visible={timedSheet} onClose={() => setTimedSheet(false)} />
    </View>
  )
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: 18, paddingTop: 20 },

  pageTitle: { fontSize: 26, fontFamily: 'Nunito_900Black', letterSpacing: -0.3, marginBottom: 4 },
  pageSub: { fontSize: 15, fontFamily: 'Nunito_600SemiBold', marginBottom: 20 },

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
  modeCard: { borderRadius: 20, borderWidth: 1, padding: 20, marginBottom: 14 },
  modeTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  modeIconBox: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  modeTitle: { fontSize: 17, fontFamily: 'Nunito_800ExtraBold', marginBottom: 3 },
  modeSub: { fontSize: 13, fontFamily: 'Nunito_600SemiBold' },
  modeCount: { fontSize: 22, fontFamily: 'Nunito_900Black', letterSpacing: -0.5 },
  modeUnit: { fontSize: 12, fontFamily: 'Nunito_600SemiBold' },

  modeButtons: { flexDirection: 'row', gap: 10 },
  btnPrimary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: 100 },
  btnPrimaryText: { fontSize: 14, fontFamily: 'Nunito_800ExtraBold' },
  btnGhost: { flex: 1, paddingVertical: 13, borderRadius: 100, alignItems: 'center', borderWidth: 1.5 },
  btnGhostText: { fontSize: 14, fontFamily: 'Nunito_800ExtraBold' },

  // Bookmarks
  bookmarksRow: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 18, borderWidth: 1, padding: 16 },
  bmIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  bmLabel: { fontSize: 15, fontFamily: 'Nunito_800ExtraBold' },
  bmSub: { fontSize: 12, fontFamily: 'Nunito_600SemiBold', marginTop: 2 },
})
