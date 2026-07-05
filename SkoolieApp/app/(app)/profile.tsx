import { useEffect, useRef, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Modal, Pressable, ActivityIndicator, Animated, Easing } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { useThemeMode, ThemeMode } from '@/contexts/ThemeContext'
import { Avatar } from '@/components/ui/Avatar'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { TopBar } from '@/components/ui/TopBar'
import { useScreenEntrance } from '@/hooks/useScreenEntrance'
import { effectiveStreak as computeEffectiveStreak } from '@/lib/streak'
import { StreakTracker } from '@/components/ui/StreakTracker'
import { YEARS_BY_PROFESSION, DEFAULT_YEARS, PRACTITIONER_TITLES } from '@/constants/professions'
import { TIMED_CHOICES, formatSecs } from '@/lib/timing'
import { TierBadge } from '@/components/ui/TierBadge'
import { InterestsSheet } from '@/components/ui/InterestsSheet'
import { CountrySheet } from '@/components/ui/CountrySheet'
import type { NotifPrefs, Profession, UserProfile } from '@/types'

const XP_PER_LEVEL = 400

const PROF_META: Record<string, { label: string; color: string; bg: string }> = {
  pharmacy:  { label: 'Pharmacy',  color: '#0E9E8E', bg: '#0E9E8E22' },
  medicine:  { label: 'Medicine',  color: '#1F9E63', bg: '#1F9E6322' },
  nursing:   { label: 'Nursing',   color: '#F2774E', bg: '#F2774E22' },
  dentistry: { label: 'Dentistry', color: '#7C6FCD', bg: '#7C6FCD22' },
  midwifery: { label: 'Midwifery', color: '#DC8B33', bg: '#DC8B3322' },
  general:   { label: 'General',   color: '#90A099', bg: '#90A09922' },
}

const PROFESSIONS_LIST: { id: Profession; label: string; emoji: string }[] = [
  { id: 'pharmacy',  label: 'Pharmacy',  emoji: '💊' },
  { id: 'medicine',  label: 'Medicine',  emoji: '🩺' },
  { id: 'nursing',   label: 'Nursing',   emoji: '🏥' },
]

function getDisplayName(profile: UserProfile): string {
  if (profile.study_year === 'practitioner') {
    const title = PRACTITIONER_TITLES[profile.profession]
    if (title) return `${title} ${profile.full_name}`
  }
  return profile.full_name
}

const THEME_OPTIONS: { id: ThemeMode; label: string; icon: string }[] = [
  { id: 'system', label: 'System', icon: 'phone-portrait-outline' },
  { id: 'light',  label: 'Light',  icon: 'sunny' },
  { id: 'dark',   label: 'Dark',   icon: 'moon' },
]

function formatYear(y: string | null): string {
  if (!y) return ''
  if (y === 'practitioner') return ' · Practitioner'
  const m = y.match(/^year(\d+)$/)
  if (m) return ` · Year ${m[1]}`
  return ` · ${y.charAt(0).toUpperCase() + y.slice(1)}`
}

function PillToggle({ value, onValueChange, activeColor }: {
  value: boolean; onValueChange: (v: boolean) => void; activeColor: string
}) {
  const C = useTheme()
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current
  useEffect(() => {
    Animated.timing(anim, { toValue: value ? 1 : 0, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start()
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps
  const bg = anim.interpolate({ inputRange: [0, 1], outputRange: [C.surface3, activeColor] })
  const tx = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 20] }) // track 50 − padding 6 − thumb 24
  return (
    <TouchableOpacity onPress={() => onValueChange(!value)} activeOpacity={0.85}>
      <Animated.View style={[tog.track, { backgroundColor: bg }]}>
        <Animated.View style={[tog.thumb, { transform: [{ translateX: tx }] }]} />
      </Animated.View>
    </TouchableOpacity>
  )
}

const tog = StyleSheet.create({
  track: { width: 50, height: 30, borderRadius: 15, padding: 3, flexDirection: 'row', alignItems: 'center' },
  thumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff', elevation: 3, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
})

export default function ProfileScreen() {
  const C = useTheme()
  const { user, profile, refreshProfile } = useAuth()
  const { isDark, themeMode, setThemeMode } = useThemeMode()
  const entrance = useScreenEntrance()

  const [allowRepeat, setAllowRepeat] = useState(profile?.allow_repeat_questions ?? true)
  const [showTags, setShowTags]       = useState(profile?.show_question_tags ?? true)
  const [timedOn, setTimedOn]         = useState(profile?.timed_mode ?? false)
  const [timedSecs, setTimedSecs]     = useState(profile?.timed_seconds ?? 30)
  const [showYearModal, setShowYearModal] = useState(false)
  const [showInterests, setShowInterests] = useState(false)
  const [showCountry, setShowCountry] = useState(false)

  // Sliding highlight for the Theme segmented control
  const segX = useRef(new Animated.Value(0)).current
  const segW = useRef(new Animated.Value(0)).current
  const segMeasured = useRef(false)
  const [segLayouts, setSegLayouts] = useState<Record<string, { x: number; w: number }>>({})
  useEffect(() => {
    const sel = segLayouts[themeMode]
    if (!sel) return
    if (!segMeasured.current) {
      segX.setValue(sel.x); segW.setValue(sel.w); segMeasured.current = true
    } else {
      Animated.spring(segX, { toValue: sel.x, useNativeDriver: false, damping: 18, stiffness: 240 }).start()
      Animated.spring(segW, { toValue: sel.w, useNativeDriver: false, damping: 18, stiffness: 240 }).start()
    }
  }, [themeMode, segLayouts]) // eslint-disable-line react-hooks/exhaustive-deps
  const [showProfessionModal, setShowProfessionModal] = useState(false)
  const [pendingProfession, setPendingProfession] = useState<Profession | null>(null)
  const [pendingYear, setPendingYear] = useState<string | null>(null)
  const [profSaving, setProfSaving] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)

  if (!profile || !user) return null

  const profMeta    = PROF_META[profile.profession] ?? { label: profile.profession, color: C.textSoft, bg: C.surface3 }
  const xpInLevel   = profile.xp % XP_PER_LEVEL
  const xpToNext    = XP_PER_LEVEL - xpInLevel
  const effStreak   = computeEffectiveStreak(profile.current_streak, profile.last_active_date)
  const joined      = new Date(profile.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  const currentYearOptions = YEARS_BY_PROFESSION[profile.profession] ?? DEFAULT_YEARS
  const yearLabel = currentYearOptions.find(y => y.id === profile.study_year)?.label
    ?? (profile.study_year === 'practitioner' ? 'Practitioner' : 'Not set')

  const themeSubLabel =
    themeMode === 'system' ? 'Follows your device setting' :
    themeMode === 'dark'   ? 'Dark mode' : 'Light mode'

  // Notification category switches — missing key means enabled.
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>(profile?.notif_prefs ?? {})
  function toggleNotif(key: keyof NotifPrefs, val: boolean) {
    const next = { ...notifPrefs, [key]: val }
    setNotifPrefs(next)
    supabase.from('user_profiles').update({ notif_prefs: next }).eq('id', user!.id)
      .then(() => refreshProfile())
    // The scheduled set rebuilds with these prefs (and real streak/barrage state)
    // on the next dashboard focus — always well before an evening notification fires.
  }

  async function dbToggle(field: 'allow_repeat_questions' | 'show_question_tags' | 'timed_mode', val: boolean) {
    await supabase.from('user_profiles').update({ [field]: val }).eq('id', user!.id)
    await refreshProfile()
  }

  async function updateTimedSecs(n: number) {
    setTimedSecs(n)
    await supabase.from('user_profiles').update({ timed_seconds: n }).eq('id', user!.id)
    await refreshProfile()
  }

  async function updateYear(yearId: string) {
    await supabase.from('user_profiles').update({ study_year: yearId }).eq('id', user!.id)
    await refreshProfile()
  }

  function openProfessionModal() {
    if (!profile) return
    setPendingProfession(profile.profession)
    setPendingYear(profile.study_year)
    setShowProfessionModal(true)
  }

  async function saveProfession() {
    if (!pendingProfession) return
    setProfSaving(true)
    const { error } = await supabase
      .from('user_profiles')
      .update({ profession: pendingProfession, study_year: pendingYear })
      .eq('id', user!.id)
    setProfSaving(false)
    if (error) {
      Alert.alert('Error', error.message)
    } else {
      await refreshProfile()
      setShowProfessionModal(false)
    }
  }

  async function pickAndUploadAvatar() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Please allow access to your photo library.')
      return
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.8,
    })
    if (res.canceled) return
    const asset = res.assets[0]
    setAvatarUploading(true)
    try {
      const ext         = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpg'
      const contentType = ext === 'png' ? 'image/png' : 'image/jpeg'
      const path        = `${user!.id}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, { uri: asset.uri, type: contentType, name: path } as any, { upsert: true, contentType })
      if (uploadError) { Alert.alert('Upload failed', uploadError.message); return }
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      await supabase.from('user_profiles').update({ avatar_url: `${publicUrl}?t=${Date.now()}` }).eq('id', user!.id)
      await refreshProfile()
    } catch (e: any) {
      Alert.alert('Upload failed', e.message ?? 'Unknown error')
    } finally {
      setAvatarUploading(false)
    }
  }

  async function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ])
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <TopBar title="Profile" />
      <Animated.View style={[{ flex: 1 }, entrance]}>
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingTop: 16, paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Profile card ──────────────────────────────────── */}
        <View style={[s.profileCard, { backgroundColor: C.surface, borderColor: C.border, ...C.shadowLg }]}>
          <TouchableOpacity onPress={pickAndUploadAvatar} activeOpacity={0.8} style={s.avatarWrap}>
            <Avatar name={profile.full_name} avatarUrl={profile.avatar_url} size={80} />
            <View style={[s.avatarBadge, { backgroundColor: C.teal, borderColor: C.surface }]}>
              {avatarUploading
                ? <ActivityIndicator size="small" color={C.onTeal} />
                : <Ionicons name="camera" size={14} color={C.onTeal} />
              }
            </View>
          </TouchableOpacity>
          <Text style={[s.name, { color: C.text }]}>{getDisplayName(profile)}</Text>
          <Text style={[s.email, { color: C.textFaint }]}>{user.email}</Text>
          <View style={s.pills}>
            <View style={[s.pill, { backgroundColor: profMeta.bg }]}>
              <Text style={[s.pillText, { color: profMeta.color }]}>
                {profMeta.label}{formatYear(profile.study_year)}
              </Text>
            </View>
            <TierBadge tier={profile.tier ?? 0} size="md" />
          </View>
          <View style={s.xpSection}>
            <View style={s.xpLabelRow}>
              <Text style={[s.xpLabel, { color: C.textSoft }]}>Level {profile.level}</Text>
              <Text style={[s.xpLabel, { color: C.textFaint }]}>{xpInLevel} / {XP_PER_LEVEL} XP</Text>
            </View>
            <ProgressBar progress={xpInLevel / XP_PER_LEVEL} height={9} />
            <Text style={[s.xpSub, { color: C.textFaint }]}>{xpToNext} XP to Level {profile.level + 1}</Text>
          </View>
          <Text style={[s.joined, { color: C.textFaint }]}>Member since {joined}</Text>
        </View>

        {/* ── Streak milestone tracker ──────────────────────── */}
        <StreakTracker streak={effStreak} userId={user.id} lastActiveDate={profile.last_active_date} createdAt={profile.created_at} style={{ marginBottom: 14 }} />

        {/* ── Stats ─────────────────────────────────────────── */}
        <View style={s.statsGrid}>
          {([
            [
              { val: profile.xp.toLocaleString(), label: 'Total XP',       color: C.teal  },
              { val: `${effStreak}d`,              label: 'Current streak', color: C.coral },
            ],
            [
              { val: `${profile.longest_streak}d`, label: 'Best streak', color: C.green },
              { val: `${profile.level}`,            label: 'Level',       color: C.text  },
            ],
          ] as { val: string; label: string; color: string }[][]).map((row, ri) => (
            <View key={ri} style={s.statsRow}>
              {row.map(item => (
                <View key={item.label} style={[s.statCard, { backgroundColor: C.surface, borderColor: C.border, ...C.shadow }]}>
                  <Text style={[s.statVal, { color: item.color }]}>{item.val}</Text>
                  <Text style={[s.statLabel, { color: C.textFaint }]}>{item.label}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        {/* ── YOUR ACCOUNT ──────────────────────────────────── */}
        <Text style={[s.sectionHeader, { color: C.textFaint }]}>YOUR ACCOUNT</Text>
        <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border, ...C.shadow }]}>
          <TouchableOpacity
            onPress={openProfessionModal}
            activeOpacity={0.75}
            style={s.row}
          >
            <View style={[s.iconBox, { backgroundColor: profMeta.bg }]}>
              <Ionicons name="medical" size={19} color={profMeta.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.rowLabel, { color: C.text }]}>Profession</Text>
              <Text style={[s.rowSub, { color: C.textFaint }]}>{profMeta.label}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.textFaint} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowYearModal(true)}
            activeOpacity={0.75}
            style={[s.row, s.rowBorder, { borderColor: C.border }]}
          >
            <View style={[s.iconBox, { backgroundColor: C.tealTint }]}>
              <Ionicons name="school" size={19} color={C.teal} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.rowLabel, { color: C.text }]}>Study year</Text>
              <Text style={[s.rowSub, { color: C.textFaint }]}>{yearLabel}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.textFaint} />
          </TouchableOpacity>
        </View>

        {/* ── APPEARANCE ────────────────────────────────────── */}
        <Text style={[s.sectionHeader, { color: C.textFaint }]}>APPEARANCE</Text>
        <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border, ...C.shadow }]}>
          <View style={s.row}>
            <View style={[s.iconBox, { backgroundColor: C.surface3 }]}>
              <Ionicons name={isDark ? 'moon' : 'sunny'} size={19} color={C.textSoft} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.rowLabel, { color: C.text }]}>Theme</Text>
              <Text style={[s.rowSub, { color: C.textFaint }]}>{themeSubLabel}</Text>
            </View>
          </View>
          {/* 3-way segment control */}
          <View style={[s.segmentWrap, { paddingHorizontal: 16, paddingBottom: 14 }]}>
            <View style={[s.segmentTrack, { backgroundColor: C.surface2, borderColor: C.border }]}>
              <Animated.View style={[s.segIndicator, { backgroundColor: C.teal, transform: [{ translateX: segX }], width: segW }]} />
              {THEME_OPTIONS.map(opt => {
                const active = themeMode === opt.id
                return (
                  <TouchableOpacity
                    key={opt.id}
                    onPress={() => setThemeMode(opt.id)}
                    onLayout={e => {
                      const { x, width } = e.nativeEvent.layout
                      setSegLayouts(p => (p[opt.id] && p[opt.id].x === x && p[opt.id].w === width ? p : { ...p, [opt.id]: { x, w: width } }))
                    }}
                    activeOpacity={0.8}
                    style={s.segment}
                  >
                    <Ionicons name={opt.icon as any} size={13} color={active ? C.onTeal : C.textFaint} />
                    <Text style={[s.segLabel, { color: active ? C.onTeal : C.textSoft }]}>{opt.label}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        </View>

        {/* ── PRACTICE ──────────────────────────────────────── */}
        <Text style={[s.sectionHeader, { color: C.textFaint }]}>PRACTICE</Text>
        <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border, ...C.shadow }]}>
          {/* Repeat questions */}
          <View style={s.row}>
            <View style={[s.iconBox, { backgroundColor: C.tealTint }]}>
              <Ionicons name="repeat" size={19} color={C.teal} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.rowLabel, { color: C.text }]}>Repeat questions</Text>
              <Text style={[s.rowSub, { color: C.textFaint }]}>Show questions you've already answered</Text>
            </View>
            <PillToggle
              value={allowRepeat}
              onValueChange={v => { setAllowRepeat(v); dbToggle('allow_repeat_questions', v) }}
              activeColor={C.teal}
            />
          </View>

          {/* Show question tags */}
          <View style={[s.row, s.rowBorder, { borderColor: C.border }]}>
            <View style={[s.iconBox, { backgroundColor: C.greenTint }]}>
              <Ionicons name="pricetag" size={19} color={C.green} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.rowLabel, { color: C.text }]}>Show question tags</Text>
              <Text style={[s.rowSub, { color: C.textFaint }]}>Display topic labels on questions</Text>
            </View>
            <PillToggle
              value={showTags}
              onValueChange={v => { setShowTags(v); dbToggle('show_question_tags', v) }}
              activeColor={C.teal}
            />
          </View>

          {/* Country */}
          <TouchableOpacity onPress={() => setShowCountry(true)} activeOpacity={0.75} style={[s.row, s.rowBorder, { borderColor: C.border }]}>
            <View style={[s.iconBox, { backgroundColor: C.tealTint }]}>
              <Ionicons name="globe-outline" size={19} color={C.teal} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.rowLabel, { color: C.text }]}>Country</Text>
              <Text style={[s.rowSub, { color: C.textFaint }]}>{profile.country || 'Ghana'} · sets which regional questions you see</Text>
            </View>
            <Ionicons name="chevron-forward" size={17} color={C.textFaint} />
          </TouchableOpacity>

          {/* Areas of interest */}
          <TouchableOpacity onPress={() => setShowInterests(true)} activeOpacity={0.75} style={[s.row, s.rowBorder, { borderColor: C.border }]}>
            <View style={[s.iconBox, { backgroundColor: C.amberTint }]}>
              <Ionicons name="heart" size={19} color={C.amber} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.rowLabel, { color: C.text }]}>Areas of interest</Text>
              <Text style={[s.rowSub, { color: C.textFaint }]} numberOfLines={1}>
                {(profile.interests?.length ?? 0) > 0 ? profile.interests.join(' · ') : 'Decided for you'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={17} color={C.textFaint} />
          </TouchableOpacity>

          {/* Timed mode */}
          <View style={[s.row, s.rowBorder, { borderColor: C.border }]}>
            <View style={[s.iconBox, { backgroundColor: C.coralTint }]}>
              <Ionicons name="timer-outline" size={19} color={C.coral} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.rowLabel, { color: C.text }]}>Timed mode</Text>
              <Text style={[s.rowSub, { color: C.textFaint }]}>Countdown per question — timeouts count as wrong</Text>
            </View>
            <PillToggle
              value={timedOn}
              onValueChange={v => { setTimedOn(v); dbToggle('timed_mode', v) }}
              activeColor={C.teal}
            />
          </View>
          {timedOn && (
            <View style={s.timedChoicesRow}>
              {TIMED_CHOICES.map(n => {
                const active = timedSecs === n
                return (
                  <TouchableOpacity
                    key={n}
                    onPress={() => updateTimedSecs(n)}
                    activeOpacity={0.8}
                    style={[s.timedChoice, { backgroundColor: active ? C.teal : C.surface2, borderColor: active ? C.teal : C.border }]}
                  >
                    <Text style={[s.timedChoiceText, { color: active ? C.onTeal : C.textSoft }]}>{formatSecs(n)}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          )}
        </View>

        {/* ── REMINDERS ─────────────────────────────────────── */}
        <Text style={[s.sectionHeader, { color: C.textFaint }]}>REMINDERS</Text>
        <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border, ...C.shadow }]}>
          <View style={s.row}>
            <View style={[s.iconBox, { backgroundColor: C.coralTint }]}>
              <Ionicons name="flame" size={19} color={C.coral} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.rowLabel, { color: C.text }]}>Streak reminders</Text>
              <Text style={[s.rowSub, { color: C.textFaint }]}>Evening rescue nudges before your streak dies</Text>
            </View>
            <PillToggle
              value={notifPrefs.streak !== false}
              onValueChange={v => toggleNotif('streak', v)}
              activeColor={C.teal}
            />
          </View>
          <View style={[s.row, s.rowBorder, { borderColor: C.border }]}>
            <View style={[s.iconBox, { backgroundColor: C.tealTint }]}>
              <Ionicons name="flash" size={19} color={C.teal} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.rowLabel, { color: C.text }]}>Barrage alerts</Text>
              <Text style={[s.rowSub, { color: C.textFaint }]}>When a 2× XP surprise window goes live</Text>
            </View>
            <PillToggle
              value={notifPrefs.barrage !== false}
              onValueChange={v => toggleNotif('barrage', v)}
              activeColor={C.teal}
            />
          </View>
          <View style={[s.row, s.rowBorder, { borderColor: C.border }]}>
            <View style={[s.iconBox, { backgroundColor: C.amberTint }]}>
              <Ionicons name="trophy" size={19} color={C.amber} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.rowLabel, { color: C.text }]}>League deadline</Text>
              <Text style={[s.rowSub, { color: C.textFaint }]}>Sunday evening, before standings lock</Text>
            </View>
            <PillToggle
              value={notifPrefs.league !== false}
              onValueChange={v => toggleNotif('league', v)}
              activeColor={C.teal}
            />
          </View>
        </View>

        {/* ── PROGRESS ──────────────────────────────────────── */}
        <Text style={[s.sectionHeader, { color: C.textFaint }]}>PROGRESS</Text>
        <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border, ...C.shadow }]}>
          <TouchableOpacity
            onPress={() => router.push('/(app)/progress')}
            activeOpacity={0.75}
            style={s.row}
          >
            <View style={[s.iconBox, { backgroundColor: C.amberTint }]}>
              <Ionicons name="trophy" size={19} color={C.amber} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.rowLabel, { color: C.text }]}>Leaderboard</Text>
              <Text style={[s.rowSub, { color: C.textFaint }]}>See how you rank against others</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.textFaint} />
          </TouchableOpacity>

          {/* Time Capsule */}
          <TouchableOpacity
            onPress={() => router.push('/(app)/history' as any)}
            activeOpacity={0.75}
            style={[s.row, s.rowBorder, { borderColor: C.border }]}
          >
            <View style={[s.iconBox, { backgroundColor: C.tealTint }]}>
              <Ionicons name="time" size={19} color={C.teal} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.rowLabel, { color: C.text }]}>Time Capsule</Text>
              <Text style={[s.rowSub, { color: C.textFaint }]}>Revisit quizzes you've taken</Text>
            </View>
            <Ionicons name="chevron-forward" size={17} color={C.textFaint} />
          </TouchableOpacity>
        </View>

        {/* Sign out */}
        <TouchableOpacity
          onPress={handleSignOut}
          style={[s.signOut, { borderColor: C.red }]}
          activeOpacity={0.75}
        >
          <Text style={[s.signOutText, { color: C.red }]}>Sign out</Text>
        </TouchableOpacity>

      </ScrollView>
      </Animated.View>
      <InterestsSheet visible={showInterests} onClose={() => setShowInterests(false)} />
      <CountrySheet visible={showCountry} onClose={() => setShowCountry(false)} />

      {/* Study Year modal */}
      <Modal visible={showYearModal} transparent animationType="fade" onRequestClose={() => setShowYearModal(false)}>
        <Pressable style={yr.overlay} onPress={() => setShowYearModal(false)}>
          <Pressable style={[yr.sheet, { backgroundColor: C.surface }]} onPress={() => {}}>
            <View style={[yr.handle, { backgroundColor: C.border }]} />
            <Text style={[yr.title, { color: C.text }]}>Study Year</Text>
            <Text style={[yr.sub, { color: C.textFaint }]}>Select your current year of study</Text>
            <View style={yr.grid}>
              {currentYearOptions.map(y => {
                const active = profile.study_year === y.id
                return (
                  <TouchableOpacity
                    key={y.id}
                    onPress={() => { updateYear(y.id); setShowYearModal(false) }}
                    activeOpacity={0.8}
                    style={[yr.yearBtn, { backgroundColor: active ? C.teal : C.surface2, borderColor: active ? C.teal : C.border }]}
                  >
                    <Text style={[yr.yearLabel, { color: active ? C.onTeal : C.text }]}>{y.label}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
            <TouchableOpacity onPress={() => setShowYearModal(false)} style={[yr.cancelBtn, { borderColor: C.border }]}>
              <Text style={[yr.cancelText, { color: C.textSoft }]}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Profession Change modal */}
      <Modal visible={showProfessionModal} transparent animationType="fade" onRequestClose={() => setShowProfessionModal(false)}>
        <Pressable style={yr.overlay} onPress={() => setShowProfessionModal(false)}>
          <Pressable style={[yr.sheet, { backgroundColor: C.surface }]} onPress={() => {}}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={[yr.handle, { backgroundColor: C.border }]} />
              <Text style={[yr.title, { color: C.text }]}>Change Profession</Text>
              <Text style={[yr.sub, { color: C.textFaint }]}>Select your profession and study year</Text>

              {/* Profession list */}
              <View style={{ gap: 8, marginBottom: 20 }}>
                {PROFESSIONS_LIST.map(p => {
                  const active = pendingProfession === p.id
                  const meta = PROF_META[p.id] ?? { label: p.label, color: C.textSoft, bg: C.surface3 }
                  return (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() => {
                        if (pendingProfession !== p.id) {
                          setPendingProfession(p.id)
                          setPendingYear(null)
                        }
                      }}
                      activeOpacity={0.75}
                      style={[
                        pr.profRow,
                        { backgroundColor: active ? meta.bg : C.surface2, borderColor: active ? meta.color : C.border },
                      ]}
                    >
                      <Text style={pr.profEmoji}>{p.emoji}</Text>
                      <Text style={[pr.profLabel, { color: active ? meta.color : C.text }]}>{p.label}</Text>
                      {active && <Ionicons name="checkmark-circle" size={20} color={meta.color} style={{ marginLeft: 'auto' as any }} />}
                    </TouchableOpacity>
                  )
                })}
              </View>

              {/* Year picker for selected profession */}
              {pendingProfession && (
                <>
                  <Text style={[yr.sub, { color: C.textFaint, marginBottom: 10 }]}>Study year</Text>
                  <View style={[yr.grid, { marginBottom: 20 }]}>
                    {(YEARS_BY_PROFESSION[pendingProfession] ?? DEFAULT_YEARS).map(y => {
                      const active = pendingYear === y.id
                      return (
                        <TouchableOpacity
                          key={y.id}
                          onPress={() => setPendingYear(active ? null : y.id)}
                          activeOpacity={0.8}
                          style={[yr.yearBtn, { backgroundColor: active ? C.teal : C.surface2, borderColor: active ? C.teal : C.border }]}
                        >
                          <Text style={[yr.yearLabel, { color: active ? C.onTeal : C.text }]}>{y.label}</Text>
                        </TouchableOpacity>
                      )
                    })}
                  </View>
                </>
              )}

              {/* Confirm */}
              <TouchableOpacity
                onPress={saveProfession}
                disabled={profSaving || !pendingProfession}
                style={[pr.confirmBtn, { backgroundColor: C.teal, opacity: (!pendingProfession || profSaving) ? 0.5 : 1 }]}
              >
                {profSaving
                  ? <ActivityIndicator size="small" color={C.onTeal} />
                  : <Text style={[pr.confirmText, { color: C.onTeal }]}>Save changes</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setShowProfessionModal(false)} style={[yr.cancelBtn, { borderColor: C.border, marginTop: 10 }]}>
                <Text style={[yr.cancelText, { color: C.textSoft }]}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

// ── Styles ───────────────────────────────────────────────────────────────────

const yr = StyleSheet.create({
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:     { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 44, maxHeight: '90%' },
  handle:    { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  title:     { fontSize: 18, fontFamily: 'Nunito_900Black', textAlign: 'center', marginBottom: 4 },
  sub:       { fontSize: 13, fontFamily: 'Nunito_600SemiBold', textAlign: 'center', marginBottom: 20 },
  grid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 16 },
  yearBtn:   { paddingVertical: 12, paddingHorizontal: 22, borderRadius: 999, borderWidth: 1.5, minWidth: 90, alignItems: 'center' },
  yearLabel: { fontSize: 14, fontFamily: 'Nunito_800ExtraBold' },
  cancelBtn: { borderWidth: 1, borderRadius: 999, padding: 14, alignItems: 'center' },
  cancelText:{ fontSize: 14, fontFamily: 'Nunito_700Bold' },
})

const pr = StyleSheet.create({
  profRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1.5, paddingVertical: 12, paddingHorizontal: 16 },
  profEmoji:   { fontSize: 22 },
  profLabel:   { fontSize: 15, fontFamily: 'Nunito_800ExtraBold' },
  confirmBtn:  { borderRadius: 999, padding: 15, alignItems: 'center', justifyContent: 'center' },
  confirmText: { fontSize: 15, fontFamily: 'Nunito_800ExtraBold' },
})

const s = StyleSheet.create({
  scroll: { paddingHorizontal: 18 },

  // Profile card
  profileCard:  { borderRadius: 24, borderWidth: 1, padding: 24, alignItems: 'center', marginBottom: 16 },
  avatarWrap:   { position: 'relative', marginBottom: 0 },
  avatarBadge:  { position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  name:         { fontSize: 22, fontFamily: 'Nunito_900Black', letterSpacing: -0.3, marginTop: 14, marginBottom: 3 },
  email:        { fontSize: 13, fontFamily: 'Nunito_600SemiBold', marginBottom: 14 },
  pills:        { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 18 },
  pill:         { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 999 },
  pillText:     { fontSize: 13, fontFamily: 'Nunito_700Bold' },
  xpSection:    { width: '100%', maxWidth: 340, marginBottom: 12 },
  xpLabelRow:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 },
  xpLabel:      { fontSize: 12, fontFamily: 'Nunito_700Bold' },
  xpSub:        { fontSize: 12, fontFamily: 'Nunito_600SemiBold', marginTop: 6 },
  joined:       { fontSize: 12, fontFamily: 'Nunito_600SemiBold' },

  // Stats
  statsGrid: { gap: 12, marginBottom: 16 },
  statsRow:  { flexDirection: 'row', gap: 12 },
  statCard:  { flex: 1, borderRadius: 18, borderWidth: 1, padding: 16 },
  statVal:   { fontSize: 26, fontFamily: 'Nunito_900Black', letterSpacing: -0.5 },
  statLabel: { fontSize: 12, fontFamily: 'Nunito_600SemiBold', marginTop: 3 },

  // Section header
  sectionHeader: { fontSize: 11, fontFamily: 'Nunito_800ExtraBold', letterSpacing: 0.8, marginTop: 20, marginBottom: 8, paddingLeft: 4 },

  // Settings card
  card:      { borderRadius: 20, borderWidth: 1, overflow: 'hidden', marginBottom: 4 },
  row:       { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  rowBorder: { borderTopWidth: 1 },
  iconBox:   { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowLabel:  { fontSize: 14, fontFamily: 'Nunito_800ExtraBold', marginBottom: 1 },
  rowSub:    { fontSize: 12, fontFamily: 'Nunito_600SemiBold' },
  timedChoicesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 16, paddingTop: 2 },
  timedChoice: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1.5, minWidth: 48, alignItems: 'center' },
  timedChoiceText: { fontSize: 13, fontFamily: 'Nunito_800ExtraBold' },

  // Theme segment control
  segmentWrap:  {},
  segmentTrack: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, padding: 3, gap: 3, position: 'relative' },
  segIndicator: { position: 'absolute', top: 3, bottom: 3, left: 0, borderRadius: 9 },
  segment:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: 9, gap: 5 },
  segLabel:     { fontSize: 12, fontFamily: 'Nunito_800ExtraBold' },

  // Sign out
  signOut:     { borderWidth: 1.5, borderRadius: 999, padding: 15, alignItems: 'center', marginTop: 20 },
  signOutText: { fontSize: 15, fontFamily: 'Nunito_800ExtraBold' },
})
