/**
 * IntroGate — mount anywhere with a key and a condition; shows the system's
 * one-time, mascot-led explanation sheet the first time `when` is true, then
 * records it in user_profiles.intros_seen so it never repeats.
 *
 *   <IntroGate introKey="league" when={lbPeriod === 'week'} />
 */
import { useEffect, useState } from 'react'
import { Modal, View, Text, TouchableOpacity, Pressable, StyleSheet } from 'react-native'
import { useTheme } from '@/hooks/useTheme'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { INTROS, type IntroKey } from '@/lib/intros'
import { CappyHead } from '@/components/mascots/CappyHead'
import { NogginHead } from '@/components/mascots/NogginHead'
import { BuddyHead } from '@/components/mascots/BuddyHead'
import { MascotAnimator } from '@/components/mascots/MascotAnimator'

// Only one intro visible at a time app-wide (two gates can become eligible on
// the same screen — e.g. tier + league on Progress). First to claim wins; the
// other shows on its next eligible mount.
let introLock: IntroKey | null = null

// Keys dismissed THIS session. The DB write + profile refresh after dismiss are
// async — without this, the effect re-fires in the gap while intros_seen still
// looks stale and the same intro shows a second time.
const locallySeen = new Set<IntroKey>()

/** Whether any first-encounter intro is currently on screen (CelebrationHost
 *  waits for it — two stacked modals would fight on iOS). */
export function isIntroOpen(): boolean {
  return introLock !== null
}

interface Props {
  introKey: IntroKey
  when: boolean
}

export function IntroGate({ introKey, when }: Props) {
  const C = useTheme()
  const { user, profile, refreshProfile } = useAuth()
  const [visible, setVisible] = useState(false)

  const seen = locallySeen.has(introKey) || (profile?.intros_seen?.includes(introKey) ?? true)

  useEffect(() => {
    if (visible || seen || !when || !profile) return
    if (introLock && introLock !== introKey) return
    introLock = introKey
    setVisible(true)
  }, [when, seen, visible, profile, introKey])

  async function dismiss() {
    locallySeen.add(introKey)   // immediate — never re-show while the write is in flight
    setVisible(false)
    if (introLock === introKey) introLock = null
    if (!user || !profile) return
    const next = [...new Set([...(profile.intros_seen ?? []), introKey])]
    await supabase.from('user_profiles').update({ intros_seen: next }).eq('id', user.id)
    refreshProfile()
  }

  if (!visible) return null
  const intro = INTROS[introKey]
  const Head = intro.mascot === 'noggin' ? NogginHead : intro.mascot === 'buddy' ? BuddyHead : CappyHead

  return (
    <Modal visible transparent animationType="fade" onRequestClose={dismiss}>
      <Pressable style={s.overlay} onPress={dismiss}>
        <Pressable style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]} onPress={() => {}}>
          <View style={{ alignItems: 'center', marginTop: -52 }}>
            <View style={[s.mascotCircle, { backgroundColor: C.surface, borderColor: C.border }]}>
              <MascotAnimator expr="happy">
                <Head expr="happy" size={64} />
              </MascotAnimator>
            </View>
          </View>
          <Text style={[s.title, { color: C.text }]}>{intro.title}</Text>
          <Text style={[s.body, { color: C.textSoft }]}>{intro.body}</Text>
          <TouchableOpacity onPress={dismiss} style={[s.btn, { backgroundColor: C.teal }]} activeOpacity={0.85} accessibilityRole="button">
            <Text style={[s.btnText, { color: C.onTeal }]}>Got it</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', paddingHorizontal: 28 },
  card: { borderRadius: 24, borderWidth: 1, padding: 22, paddingTop: 32 },
  mascotCircle: { width: 84, height: 84, borderRadius: 42, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  title: { fontSize: 19, fontFamily: 'Nunito_900Black', textAlign: 'center', marginTop: 6, marginBottom: 8 },
  body: { fontSize: 14, fontFamily: 'Nunito_600SemiBold', lineHeight: 21, textAlign: 'center', marginBottom: 18 },
  btn: { paddingVertical: 13, borderRadius: 999, alignItems: 'center' },
  btnText: { fontSize: 15, fontFamily: 'Nunito_800ExtraBold' },
})
