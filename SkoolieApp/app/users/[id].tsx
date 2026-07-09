import { useEffect, useState } from 'react'
import { View, Text, ActivityIndicator, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/hooks/useTheme'
import { TopBar } from '@/components/ui/TopBar'
import { Avatar } from '@/components/ui/Avatar'
import { TierBadge } from '@/components/ui/TierBadge'

const XP_PER_LEVEL = 400

interface UserProfileData {
  id: string
  full_name: string
  profession: string
  xp: number
  current_streak: number
  level: number
  avatar_url: string | null
  tier: number | null
  /** Pacer (simulated participant, ✦-marked — see Terms §6) */
  is_bot?: boolean
}

const PROF_META: Record<string, { label: string; color: string; bg: string }> = {
  pharmacy:  { label: 'Pharmacy',  color: '#0E9E8E', bg: '#0E9E8E22' },
  medicine:  { label: 'Medicine',  color: '#1F9E63', bg: '#1F9E6322' },
  nursing:   { label: 'Nursing',   color: '#F2774E', bg: '#F2774E22' },
  dentistry: { label: 'Dentistry', color: '#7C6FCD', bg: '#7C6FCD22' },
  midwifery: { label: 'Midwifery', color: '#DC8B33', bg: '#DC8B3322' },
  general:   { label: 'General',   color: '#90A099', bg: '#90A09922' },
}

export default function UserProfileScreen() {
  const C = useTheme()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [profile, setProfile] = useState<UserProfileData | null | undefined>(undefined)
  const [trophies, setTrophies] = useState<{ trophy_id: string; emoji: string; title: string }[]>([])

  useEffect(() => {
    if (!id) return
    // RLS blocks reading another user's user_profiles row directly, so fetch
    // public columns via the SECURITY DEFINER RPC instead.
    supabase
      .rpc('get_public_profile', { p_id: id })
      .then(({ data }) => setProfile((data && data[0]) ?? null))
    supabase
      .rpc('get_user_trophies', { p_id: id })
      .then(({ data }) => setTrophies((data ?? []) as any[]))
  }, [id])

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <TopBar title="Profile" />
      {/* Sub-header with back button */}
      <View style={[s.subHeader, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[s.backBtn, { backgroundColor: C.surface2, borderColor: C.border }]}>
          <Ionicons name="arrow-back" size={20} color={C.textSoft} />
        </TouchableOpacity>
        <Text style={[s.subHeaderTitle, { color: C.text }]}>Profile</Text>
      </View>

      {profile === undefined ? (
        <ActivityIndicator style={{ marginTop: 60 }} size="large" color={C.teal} />
      ) : profile === null ? (
        <View style={s.notFound}>
          <Text style={[s.notFoundText, { color: C.textFaint }]}>User not found</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: 80 }]} showsVerticalScrollIndicator={false}>
          {/* Avatar + name */}
          <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={s.avatarRow}>
              <Avatar name={profile.full_name} avatarUrl={profile.avatar_url} size={80} />
            </View>
            <Text style={[s.name, { color: C.text }]}>{profile.full_name}</Text>

            {/* Profession badge */}
            {(() => {
              const meta = PROF_META[profile.profession] ?? { label: profile.profession, color: C.textSoft, bg: C.surface3 }
              return (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={[s.profBadge, { backgroundColor: meta.bg }]}>
                    <Text style={[s.profBadgeText, { color: meta.color }]}>{meta.label}</Text>
                  </View>
                  <View style={{ marginBottom: 18 }}>
                    <TierBadge tier={profile.tier ?? 0} size="md" />
                  </View>
                </View>
              )
            })()}

            {/* XP bar */}
            <View style={s.xpSection}>
              <View style={s.xpLabelRow}>
                <Text style={[s.xpLabel, { color: C.textSoft }]}>Level {profile.level}</Text>
                <Text style={[s.xpLabel, { color: C.textFaint }]}>{profile.xp % XP_PER_LEVEL} / {XP_PER_LEVEL} XP</Text>
              </View>
              <View style={[s.xpTrack, { backgroundColor: C.surface3 }]}>
                <View style={[s.xpFill, { backgroundColor: C.teal, width: `${Math.min(100, ((profile.xp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100)}%` as any }]} />
              </View>
            </View>
          </View>

          {/* Stats */}
          <View style={s.statsRow}>
            <View style={[s.statTile, { backgroundColor: C.surface, borderColor: C.border }]}>
              <Text style={[s.statVal, { color: C.teal }]}>{profile.xp.toLocaleString()}</Text>
              <Text style={[s.statLabel, { color: C.textFaint }]}>Total XP</Text>
            </View>
            <View style={[s.statTile, { backgroundColor: C.surface, borderColor: C.border }]}>
              <Text style={[s.statVal, { color: C.coral }]}>{profile.current_streak}d</Text>
              <Text style={[s.statLabel, { color: C.textFaint }]}>Streak</Text>
            </View>
            <View style={[s.statTile, { backgroundColor: C.surface, borderColor: C.border }]}>
              <Text style={[s.statVal, { color: C.text }]}>L{profile.level}</Text>
              <Text style={[s.statLabel, { color: C.textFaint }]}>Level</Text>
            </View>
          </View>

          {/* Trophy case — earned trophies as titled tiles */}
          {trophies.length > 0 && (
            <>
              <View style={s.trophyHeaderRow}>
                <Text style={[s.trophyHeader, { color: C.textFaint }]}>TROPHY CASE</Text>
                <View style={[s.trophyCount, { backgroundColor: C.amberTint }]}>
                  <Text style={{ fontSize: 11 }}>🏆</Text>
                  <Text style={[s.trophyCountText, { color: C.amber }]}>{trophies.length}</Text>
                </View>
              </View>
              <View style={s.trophyGrid}>
                {trophies.map(t => (
                  <View
                    key={t.trophy_id}
                    style={[s.trophyCard, { backgroundColor: C.surface, borderColor: C.amber + '55' }]}
                    accessible accessibilityLabel={t.title}
                  >
                    <View style={[s.trophyEmojiBox, { backgroundColor: C.amberTint }]}>
                      <Text style={{ fontSize: 22 }}>{t.emoji}</Text>
                    </View>
                    <Text style={[s.trophyName, { color: C.textSoft }]} numberOfLines={2}>{t.title}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  subHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  subHeaderTitle: { fontSize: 18, fontFamily: 'Nunito_800ExtraBold' },

  scroll: { paddingHorizontal: 18, paddingTop: 20 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontSize: 16, fontFamily: 'Nunito_600SemiBold' },

  card: { borderRadius: 24, borderWidth: 1, padding: 24, alignItems: 'center', marginBottom: 16 },
  avatarRow: { marginBottom: 14 },
  name: { fontSize: 22, fontFamily: 'Nunito_900Black', letterSpacing: -0.3, marginBottom: 10 },

  profBadge: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 999, marginBottom: 18 },
  profBadgeText: { fontSize: 13, fontFamily: 'Nunito_700Bold' },

  trophyHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 10 },
  trophyHeader: { fontSize: 11, fontFamily: 'Nunito_800ExtraBold', letterSpacing: 0.8 },
  trophyCount: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 3, paddingHorizontal: 9, borderRadius: 999 },
  trophyCountText: { fontSize: 12, fontFamily: 'Nunito_800ExtraBold', fontVariant: ['tabular-nums'] },
  trophyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  trophyCard: { width: '31%', borderRadius: 14, borderWidth: 1, paddingVertical: 12, paddingHorizontal: 6, alignItems: 'center', gap: 6 },
  trophyEmojiBox: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  trophyName: { fontSize: 10.5, fontFamily: 'Nunito_700Bold', textAlign: 'center', lineHeight: 13 },

  xpSection: { width: '100%', maxWidth: 320 },
  xpLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 },
  xpLabel: { fontSize: 12, fontFamily: 'Nunito_700Bold' },
  xpTrack: { height: 9, borderRadius: 999, overflow: 'hidden' },
  xpFill: { height: 9, borderRadius: 999 },

  statsRow: { flexDirection: 'row', gap: 12 },
  statTile: { flex: 1, borderRadius: 18, borderWidth: 1, padding: 16, alignItems: 'center' },
  statVal: { fontSize: 22, fontFamily: 'Nunito_900Black', letterSpacing: -0.5 },
  statLabel: { fontSize: 12, fontFamily: 'Nunito_600SemiBold', marginTop: 3 },
})
