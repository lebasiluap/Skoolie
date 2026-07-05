import { useEffect, useState } from 'react'
import { ensureNotificationPermissions } from '@/lib/notifications'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { Button } from '@/components/ui/Button'
import type { Profession, StudyYear } from '@/types'
import { YEARS_BY_PROFESSION, DEFAULT_YEARS } from '@/constants/professions'
import { COUNTRIES, POPULAR_COUNTRIES } from '@/constants/countries'
import { CountrySheet } from '@/components/ui/CountrySheet'
import { Ionicons } from '@expo/vector-icons'

const PROFESSIONS: { id: Profession; label: string; emoji: string; desc: string }[] = [
  { id: 'pharmacy',  label: 'Pharmacy',  emoji: '💊', desc: 'Pharmacists & pharmacy students' },
  { id: 'medicine',  label: 'Medicine',  emoji: '🩺', desc: 'Medical doctors & students' },
  { id: 'nursing',   label: 'Nursing',   emoji: '🏥', desc: 'Nurses & nursing students' },
]

export default function OnboardingScreen() {
  const C = useTheme()
  const insets = useSafeAreaInsets()
  const { user, refreshProfile } = useAuth()
  const [step, setStep] = useState<'profession' | 'country' | 'year' | 'interests'>('profession')
  const [profession, setProfession] = useState<Profession | null>(null)
  const [studyYear, setStudyYear] = useState<StudyYear | null>(null)
  const [country, setCountry] = useState<string | null>(null)
  const [showCountrySheet, setShowCountrySheet] = useState(false)
  const [loading, setLoading] = useState(false)

  // Areas of interest — topics for the chosen profession. Empty = "decide for me".
  const [topicOptions, setTopicOptions] = useState<string[]>([])
  const [topicsLoading, setTopicsLoading] = useState(false)
  const [topicsError, setTopicsError] = useState(false)
  const [interests, setInterests] = useState<Set<string>>(new Set())

  function loadTopics(p: Profession) {
    setTopicsLoading(true)
    setTopicsError(false)
    supabase.rpc('get_question_counts', { p_profession: p, p_question_type: 'mcq', p_access_key: null })
      .then(({ data, error }) => {
        setTopicsLoading(false)
        if (error) { setTopicsError(true); return }
        const topics = [...new Set(((data ?? []) as any[]).map(r => r.topic).filter(Boolean))].sort() as string[]
        setTopicOptions(topics)
      })
  }

  useEffect(() => {
    if (step !== 'interests' || !profession || topicOptions.length > 0) return
    loadTopics(profession)
  }, [step, profession]) // eslint-disable-line react-hooks/exhaustive-deps

  function toggleInterest(t: string) {
    setInterests(prev => {
      const next = new Set(prev)
      if (next.has(t)) next.delete(t); else next.add(t)
      return next
    })
  }

  const yearOptions = profession ? (YEARS_BY_PROFESSION[profession] ?? DEFAULT_YEARS) : DEFAULT_YEARS

  function handleSelectProfession(p: Profession) {
    if (p !== profession) {
      setProfession(p)
      setStudyYear(null)
      // Topics belong to a profession — switching must invalidate both the
      // fetched list and any interests picked from the old one.
      setTopicOptions([])
      setInterests(new Set())
      setTopicsError(false)
    }
  }

  async function handleFinish(chosenInterests: string[]) {
    if (!profession) return
    if (!user) {
      Alert.alert('Session expired', 'Please sign in again to continue.', [
        { text: 'OK', onPress: () => supabase.auth.signOut() },
      ])
      return
    }
    setLoading(true)
    // email and full_name are NOT NULL in user_profiles and have no DB default,
    // and there is no auth.users trigger to backfill them — so they must be
    // supplied here or the INSERT fails and the user gets stuck on onboarding.
    const meta = (user.user_metadata ?? {}) as { full_name?: string; name?: string }
    const fullName =
      meta.full_name?.trim() ||
      meta.name?.trim() ||
      user.email?.split('@')[0] ||
      'Student'
    // NO progress fields here — level/xp/streaks have DB defaults for a fresh
    // insert, and if a row already exists (e.g. this screen was reached by a
    // transient fetch failure) the upsert must not zero the user's progress.
    const { error } = await supabase
      .from('user_profiles')
      .upsert({
        id: user.id,
        email: user.email,
        full_name: fullName,
        profession,
        study_year: studyYear,
        country: country ?? 'Ghana',
        interests: chosenInterests,
      })
    setLoading(false)
    if (error) {
      Alert.alert(
        "Couldn't save your profile",
        'Check your internet connection and try again — your answers here are kept.',
      )
      return
    }
    // Primed notification ask — explain the value BEFORE the one-shot OS dialog.
    Alert.alert(
      'One more thing 🔔',
      'Cappy and friends send clever nudges — streak rescues, surprise barrages, league deadlines. Want reminders?',
      [
        { text: 'Not now', style: 'cancel' },
        { text: 'Enable', onPress: () => { ensureNotificationPermissions(true) } },
      ],
    )
    refreshProfile()
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={[s.scroll, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 40 }]}>

        {/* Progress dots */}
        <View style={s.dots}>
          <View style={[s.dot, { backgroundColor: C.teal }]} />
          <View style={[s.dot, { backgroundColor: step !== 'profession' ? C.teal : C.surface3 }]} />
          <View style={[s.dot, { backgroundColor: step === 'year' || step === 'interests' ? C.teal : C.surface3 }]} />
          <View style={[s.dot, { backgroundColor: step === 'interests' ? C.teal : C.surface3 }]} />
        </View>

        {step === 'profession' ? (
          <>
            <Text style={[s.title, { color: C.text }]}>What do you study?</Text>
            <Text style={[s.sub, { color: C.textFaint }]}>We'll personalise your content</Text>
            <View style={s.options}>
              {PROFESSIONS.map(p => (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => handleSelectProfession(p.id)}
                  activeOpacity={0.75}
                  style={[
                    s.optionCard,
                    {
                      backgroundColor: C.surface,
                      borderColor: profession === p.id ? C.teal : C.border,
                      borderWidth: profession === p.id ? 2 : 1,
                      ...C.shadow,
                    }
                  ]}
                >
                  <Text style={s.optionEmoji}>{p.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.optionLabel, { color: C.text }]}>{p.label}</Text>
                    <Text style={[s.optionDesc, { color: C.textFaint }]}>{p.desc}</Text>
                  </View>
                  {profession === p.id && (
                    <View style={[s.check, { backgroundColor: C.teal }]}>
                      <Text style={{ color: C.onTeal, fontSize: 12 }}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
            <Button label="Continue" onPress={() => profession && setStep('country')} disabled={!profession} fullWidth style={{ marginTop: 8 }} />
            {user?.email ? (
              <TouchableOpacity
                onPress={() => supabase.auth.signOut()}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                style={{ marginTop: 18, alignItems: 'center' }}
              >
                <Text style={[{ color: C.textFaint, fontFamily: 'Nunito_600SemiBold', fontSize: 13 }]}>
                  Signed in as {user.email} · <Text style={{ color: C.teal, fontFamily: 'Nunito_700Bold' }}>Sign out</Text>
                </Text>
              </TouchableOpacity>
            ) : null}
          </>
        ) : step === 'country' ? (
          <>
            <Text style={[s.title, { color: C.text }]}>Where are you based?</Text>
            <Text style={[s.sub, { color: C.textFaint }]}>You'll get questions for your country plus the global bank</Text>

            {/* Quick picks */}
            <View style={s.pills}>
              {POPULAR_COUNTRIES.map(name => {
                const c = COUNTRIES.find(x => x.name === name)!
                const active = country === c.name
                return (
                  <TouchableOpacity
                    key={c.name}
                    onPress={() => setCountry(c.name)}
                    style={[s.pill, {
                      backgroundColor: active ? C.teal : C.surface,
                      borderColor: active ? C.teal : C.border,
                    }]}
                  >
                    <Text style={[s.pillText, { color: active ? C.onTeal : C.text }]}>{c.flag} {c.name}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            {/* Full searchable list */}
            <TouchableOpacity
              onPress={() => setShowCountrySheet(true)}
              activeOpacity={0.75}
              style={[s.countrySelector, { backgroundColor: C.surface, borderColor: country && !POPULAR_COUNTRIES.includes(country) ? C.teal : C.border }]}
            >
              <Ionicons name="search" size={16} color={C.textFaint} />
              <Text style={[s.countrySelectorText, { color: country && !POPULAR_COUNTRIES.includes(country) ? C.text : C.textFaint }]}>
                {country && !POPULAR_COUNTRIES.includes(country)
                  ? `${COUNTRIES.find(c => c.name === country)?.flag ?? '🌍'} ${country}`
                  : 'Search all countries…'}
              </Text>
              <Ionicons name="chevron-down" size={16} color={C.textFaint} />
            </TouchableOpacity>
            <CountrySheet
              visible={showCountrySheet}
              onClose={() => setShowCountrySheet(false)}
              onPick={setCountry}
              selected={country}
            />

            <Button label="Continue" onPress={() => country && setStep('year')} disabled={!country} fullWidth style={{ marginTop: 24 }} />
            <TouchableOpacity onPress={() => setStep('profession')} style={{ marginTop: 14, alignItems: 'center' }}>
              <Text style={[{ color: C.textFaint, fontFamily: 'Nunito_600SemiBold', fontSize: 14 }]}>← Back</Text>
            </TouchableOpacity>
          </>
        ) : step === 'year' ? (
          <>
            <Text style={[s.title, { color: C.text }]}>What year are you in?</Text>
            <Text style={[s.sub, { color: C.textFaint }]}>Optional — helps us tailor difficulty</Text>
            <View style={s.pills}>
              {yearOptions.map(y => (
                <TouchableOpacity
                  key={y.id}
                  onPress={() => setStudyYear(studyYear === y.id ? null : y.id as StudyYear)}
                  style={[
                    s.pill,
                    {
                      backgroundColor: studyYear === y.id ? C.teal : C.surface,
                      borderColor: studyYear === y.id ? C.teal : C.border,
                    }
                  ]}
                >
                  <Text style={[s.pillText, { color: studyYear === y.id ? C.onTeal : C.text }]}>{y.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Button label="Continue" onPress={() => setStep('interests')} fullWidth style={{ marginTop: 24 }} />
            <TouchableOpacity onPress={() => setStep('country')} style={{ marginTop: 14, alignItems: 'center' }}>
              <Text style={[{ color: C.textFaint, fontFamily: 'Nunito_600SemiBold', fontSize: 14 }]}>← Back</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={[s.title, { color: C.text }]}>What interests you?</Text>
            <Text style={[s.sub, { color: C.textFaint }]}>We'll match your quick starts to these areas — or let us decide for you</Text>

            {topicsLoading && <ActivityIndicator style={{ marginTop: 20 }} color={C.teal} />}
            {topicsError && (
              <View style={{ alignItems: 'center', marginTop: 12, gap: 10 }}>
                <Text style={[{ color: C.textSoft, fontFamily: 'Nunito_600SemiBold', fontSize: 13.5, textAlign: 'center' }]}>
                  Couldn't load topics — check your connection.
                </Text>
                <TouchableOpacity
                  onPress={() => profession && loadTopics(profession)}
                  accessibilityRole="button"
                  style={[s.pill, { backgroundColor: C.surface, borderColor: C.teal }]}
                >
                  <Text style={[s.pillText, { color: C.teal }]}>Try again</Text>
                </TouchableOpacity>
              </View>
            )}
            <View style={s.pills}>
              {topicOptions.map(t => {
                const active = interests.has(t)
                return (
                  <TouchableOpacity
                    key={t}
                    onPress={() => toggleInterest(t)}
                    style={[s.pill, {
                      backgroundColor: active ? C.teal : C.surface,
                      borderColor: active ? C.teal : C.border,
                    }]}
                  >
                    <Text style={[s.pillText, { color: active ? C.onTeal : C.text }]}>{t}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            {/* Never a dead end: zero picks simply means "decide for me". */}
            <Button
              label={interests.size > 0 ? `Get started (${interests.size} picked)` : 'Get started'}
              onPress={() => handleFinish([...interests])}
              loading={loading}
              fullWidth
              style={{ marginTop: 24 }}
            />
            <TouchableOpacity onPress={() => handleFinish([])} disabled={loading} style={[s.decideBtn, { borderColor: C.border, backgroundColor: C.surface }]}>
              <Text style={[s.decideText, { color: C.textSoft }]}>🎲 Decide for me</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setStep('year')} style={{ marginTop: 14, alignItems: 'center' }}>
              <Text style={[{ color: C.textFaint, fontFamily: 'Nunito_600SemiBold', fontSize: 14 }]}>← Back</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: 24 },
  dots: { flexDirection: 'row', gap: 8, marginBottom: 28 },
  dot: { width: 28, height: 6, borderRadius: 3 },
  title: { fontSize: 28, fontFamily: 'Nunito_900Black', letterSpacing: -0.5, marginBottom: 6 },
  sub: { fontSize: 14, fontFamily: 'Nunito_600SemiBold', marginBottom: 28 },
  options: { gap: 12, marginBottom: 8 },
  optionCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 18, padding: 16 },
  optionEmoji: { fontSize: 28 },
  optionLabel: { fontSize: 16, fontFamily: 'Nunito_800ExtraBold', marginBottom: 2 },
  optionDesc: { fontSize: 13, fontFamily: 'Nunito_600SemiBold' },
  check: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pill: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 999, borderWidth: 1.5 },
  pillText: { fontSize: 14, fontFamily: 'Nunito_700Bold' },
  decideBtn: { marginTop: 12, paddingVertical: 14, borderRadius: 999, borderWidth: 1.5, alignItems: 'center' },
  decideText: { fontSize: 14, fontFamily: 'Nunito_800ExtraBold' },
  countrySelector: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, borderWidth: 1.5, paddingVertical: 14, paddingHorizontal: 16, marginTop: 12 },
  countrySelectorText: { flex: 1, fontSize: 14.5, fontFamily: 'Nunito_700Bold' },
})
