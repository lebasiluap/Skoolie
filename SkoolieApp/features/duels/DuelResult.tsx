/**
 * DuelResult — head-to-head comparison with a winner banner and a rematch.
 *
 * Handles every terminal (and waiting) state: you finished first (opponent
 * pending — their numbers stay hidden server-side until you submit, so what's
 * shown here is authoritative), complete (win/lose/draw), and expired.
 * Rematch creates a fresh duel against the same rival with a NEW frozen set.
 */
import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { MAX_CONTENT } from '@/hooks/useResponsive'
import { Entrance } from '@/components/ui/Entrance'
import { Avatar } from '@/components/ui/Avatar'
import { CappyHead } from '@/components/mascots/CappyHead'
import { MascotAnimator } from '@/components/mascots/MascotAnimator'
import { playSound } from '@/lib/sounds'
import { showToast } from '@/lib/toast'
import { duelGet, duelCreate, timeLeft, fmtMs } from './api'
import type { Duel } from './types'

interface Props {
  duel: Duel
  /** Rematch created — open its runner */
  onRematch: (duel: Duel) => void
  onBack: () => void
}

export function DuelResult({ duel: initial, onRematch, onBack }: Props) {
  const C = useTheme()
  const insets = useSafeAreaInsets()
  const { profile } = useAuth()
  const [duel, setDuel] = useState<Duel>(initial)
  const [rematching, setRematching] = useState(false)

  // Refresh once on mount — the opponent may have finished since the list load.
  useEffect(() => {
    duelGet(initial.id).then(({ duel: d }) => { if (d) setDuel(d) })
  }, [initial.id])

  const waiting = duel.status !== 'complete' && duel.status !== 'expired'
  useEffect(() => {
    if (duel.status === 'complete') playSound(duel.you_won ? 'complete' : 'wrong')
  }, [duel.status]) // eslint-disable-line react-hooks/exhaustive-deps

  async function rematch() {
    if (rematching) return
    setRematching(true)
    const { id, error } = await duelCreate(duel.them.id, duel.id)
    if (error || !id) {
      setRematching(false)
      showToast("Couldn't start the rematch — check your connection.", 'error')
      return
    }
    const { duel: fresh } = await duelGet(id)
    setRematching(false)
    if (fresh) onRematch(fresh)
  }

  const banner = duel.status === 'expired'
    ? { emoji: '⏳', title: 'Duel expired', sub: 'The 24-hour window closed before both runs landed.', color: C.textFaint, expr: 'idle' as const }
    : waiting
    ? { emoji: '⚔️', title: 'Run locked in!', sub: `Now ${duel.them.name} has ${timeLeft(duel.expires_at)} to answer the same ${duel.total} questions.`, color: C.coral, expr: 'happy' as const }
    : duel.draw
    ? { emoji: '🤝', title: 'Dead even!', sub: 'Same score, same time — a true stalemate.', color: C.amber, expr: 'happy' as const }
    : duel.you_won
    ? { emoji: '🏆', title: 'You won!', sub: 'Bragging rights secured. Pride is the prize.', color: C.green, expr: 'happy' as const }
    : { emoji: '😤', title: `${duel.them.name} took it`, sub: 'Run it back — same rival, fresh questions.', color: C.red, expr: 'wrong' as const }

  const youName = profile?.full_name?.trim().split(/\s+/)[0] ?? 'You'
  const themName = duel.them.name.trim().split(/\s+/)[0]

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={[s.header, { paddingTop: insets.top + 10, backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={onBack} accessibilityRole="button" accessibilityLabel="Back to duels" style={[s.iconBtn, { backgroundColor: C.surface2, borderColor: C.border }]}>
          <Ionicons name="arrow-back" size={20} color={C.textSoft} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: C.text, flex: 1 }]}>Duel result</Text>
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, width: '100%', maxWidth: MAX_CONTENT, alignSelf: 'center' }} showsVerticalScrollIndicator={false}>
        <Entrance>
          <View style={{ alignItems: 'center', marginBottom: 8 }}>
            <MascotAnimator expr={banner.expr}>
              <CappyHead expr={banner.expr} size={80} />
            </MascotAnimator>
          </View>
          <Text style={[s.bannerTitle, { color: banner.color }]}>{banner.emoji} {banner.title}</Text>
          <Text style={[s.bannerSub, { color: C.textSoft }]}>{banner.sub}</Text>
        </Entrance>

        {/* ── Head-to-head ── */}
        <Entrance delay={90}>
          <View style={s.h2h}>
            <View style={[s.sideCard, { backgroundColor: C.surface, borderColor: duel.you_won ? C.green : C.border, ...C.shadow }]}>
              <Avatar name={profile?.full_name ?? 'You'} avatarUrl={profile?.avatar_url} size={44} />
              <Text style={[s.sideName, { color: C.text }]} numberOfLines={1}>{youName}</Text>
              <Text style={[s.sideScore, { color: duel.you_won ? C.green : C.text }]}>
                {duel.you.score ?? '–'}<Text style={[s.sideTotal, { color: C.textFaint }]}>/{duel.total}</Text>
              </Text>
              <Text style={[s.sideMs, { color: C.textFaint }]}>{fmtMs(duel.you.ms)}</Text>
            </View>
            <Text style={[s.vs, { color: C.textFaint }]}>VS</Text>
            <View style={[s.sideCard, { backgroundColor: C.surface, borderColor: !duel.you_won && duel.winner != null ? C.green : C.border, ...C.shadow }]}>
              <Avatar name={duel.them.name} avatarUrl={duel.them.avatar_url} size={44} />
              <Text style={[s.sideName, { color: C.text }]} numberOfLines={1}>{themName}</Text>
              <Text style={[s.sideScore, { color: !duel.you_won && duel.winner != null ? C.green : C.text }]}>
                {duel.them.done ? (duel.them.score ?? '–') : '?'}<Text style={[s.sideTotal, { color: C.textFaint }]}>/{duel.total}</Text>
              </Text>
              <Text style={[s.sideMs, { color: C.textFaint }]}>{duel.them.done ? fmtMs(duel.them.ms) : 'not played yet'}</Text>
            </View>
          </View>
        </Entrance>

        {duel.status === 'complete' && duel.you.score === duel.them.score && !duel.draw && (
          <Entrance delay={140}>
            <Text style={[s.tieNote, { color: C.textFaint }]}>Scores tied — decided on time.</Text>
          </Entrance>
        )}

        <Entrance delay={180}>
          {!waiting && (
            <TouchableOpacity onPress={rematch} disabled={rematching} style={[s.cta, { backgroundColor: C.coral, opacity: rematching ? 0.7 : 1 }]} activeOpacity={0.85}>
              {rematching
                ? <ActivityIndicator size="small" color="#FFFFFF" />
                : <Text style={s.ctaText}>⚔️ Rematch</Text>}
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onBack} style={[s.ctaGhost, { borderColor: C.border }]} activeOpacity={0.8}>
            <Text style={[s.ctaGhostText, { color: C.text }]}>Back to duels</Text>
          </TouchableOpacity>
        </Entrance>
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  headerTitle: { fontSize: 18, fontFamily: 'Nunito_900Black' },

  bannerTitle: { fontSize: 24, fontFamily: 'Nunito_900Black', textAlign: 'center' },
  bannerSub: { fontSize: 14, fontFamily: 'Nunito_600SemiBold', textAlign: 'center', marginTop: 6, lineHeight: 20, marginBottom: 24 },

  h2h: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  sideCard: { flex: 1, alignItems: 'center', borderRadius: 18, borderWidth: 1.5, paddingVertical: 18, paddingHorizontal: 10, gap: 6 },
  sideName: { fontSize: 13, fontFamily: 'Nunito_800ExtraBold' },
  sideScore: { fontSize: 30, fontFamily: 'Nunito_900Black', fontVariant: ['tabular-nums'] },
  sideTotal: { fontSize: 15, fontFamily: 'Nunito_800ExtraBold' },
  sideMs: { fontSize: 12, fontFamily: 'Nunito_700Bold', fontVariant: ['tabular-nums'] },
  vs: { fontSize: 13, fontFamily: 'Nunito_900Black' },
  tieNote: { textAlign: 'center', fontSize: 12.5, fontFamily: 'Nunito_700Bold', marginBottom: 14 },

  cta: { paddingVertical: 15, borderRadius: 999, alignItems: 'center', marginBottom: 10, minHeight: 50, justifyContent: 'center' },
  ctaText: { fontSize: 15, fontFamily: 'Nunito_800ExtraBold', color: '#FFFFFF' },
  ctaGhost: { paddingVertical: 14, borderRadius: 999, alignItems: 'center', borderWidth: 1.5 },
  ctaGhostText: { fontSize: 14, fontFamily: 'Nunito_800ExtraBold' },
})
