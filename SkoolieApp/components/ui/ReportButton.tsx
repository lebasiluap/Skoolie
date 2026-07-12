// A lightweight "Report a problem" control for practice content (MCQ /
// flashcard / case). Renders a small, unobtrusive flag button; tapping it opens
// a modal with a reason picker + optional note, then inserts one row into
// `question_reports`. One OPEN report per user per item is enforced server-side
// (unique index) — a friendly toast covers the duplicate case.
import { useState } from 'react'
import { Modal, Pressable, Text, TextInput, TouchableOpacity, View, StyleSheet } from 'react-native'
import { useTheme } from '@/hooks/useTheme'
import { supabase } from '@/lib/supabase'
import { showToast } from '@/lib/toast'
import { withTimeout, TimeoutError, AUTH_TIMEOUT_MESSAGE } from '@/lib/withTimeout'

type QType = 'mcq' | 'flashcard' | 'case_study'

const REASONS: { key: string; label: string; sub: string }[] = [
  { key: 'wrong_answer', label: 'Wrong answer', sub: 'The marked answer looks incorrect' },
  { key: 'typo',         label: 'Typo or error', sub: 'Spelling, grammar, or formatting' },
  { key: 'unclear',      label: 'Unclear or ambiguous', sub: 'Question or options are confusing' },
  { key: 'outdated',     label: 'Outdated', sub: 'Not current guideline or practice' },
  { key: 'other',        label: 'Something else', sub: 'Describe it below' },
]

interface Props {
  /** Pass EITHER questionId (mcq/flashcard) OR caseId (case_study). */
  questionId?: string
  caseId?: string
  questionType: QType
  /** Optional style override for the trigger row. */
  compact?: boolean
}

export default function ReportButton({ questionId, caseId, questionType, compact }: Props) {
  const C = useTheme()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function reset() {
    setReason(null); setNote(''); setSubmitting(false)
  }

  async function submit() {
    if (!reason || submitting) return
    setSubmitting(true)
    try {
      const { data: { user } } = await withTimeout(supabase.auth.getUser(), 20_000)
      if (!user) { showToast('Sign in to report a question.', 'error'); setOpen(false); reset(); return }

      const { error } = await withTimeout(
        Promise.resolve(
          supabase.from('question_reports').insert({
            user_id: user.id,
            question_id: questionId ?? null,
            case_id: caseId ?? null,
            question_type: questionType,
            reason,
            note: note.trim() ? note.trim().slice(0, 1000) : null,
          }),
        ),
        20_000,
      )

      if (error) {
        // 23505 = duplicate open report for this user+item
        if (error.code === '23505') {
          showToast('You already reported this — thanks!', 'info')
        } else {
          showToast('Could not send report. Try again.', 'error')
          setSubmitting(false)
          return
        }
      } else {
        showToast('Thanks — report sent for review.', 'success')
      }
      setOpen(false); reset()
    } catch (e) {
      showToast(e instanceof TimeoutError ? AUTH_TIMEOUT_MESSAGE : 'Could not send report. Try again.', 'error')
      setSubmitting(false)
    }
  }

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Report a problem with this question"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={[st.trigger, compact && { alignSelf: 'center', paddingVertical: 4 }]}
      >
        <FlagIcon color={C.textFaint} />
        <Text style={[st.triggerText, { color: C.textFaint }]}>Report a problem</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => { setOpen(false); reset() }}>
        <Pressable style={st.backdrop} onPress={() => { setOpen(false); reset() }}>
          <Pressable style={[st.sheet, { backgroundColor: C.surface, borderColor: C.border, ...C.shadowLg }]} onPress={(e) => e.stopPropagation()}>
            <View style={st.grabber} />
            <Text style={[st.title, { color: C.text }]}>Report a problem</Text>
            <Text style={[st.subtitle, { color: C.textFaint }]}>
              Help us keep the question bank accurate. Reports go straight to review.
            </Text>

            <View style={{ gap: 8, marginTop: 14 }}>
              {REASONS.map((r) => {
                const active = reason === r.key
                return (
                  <TouchableOpacity
                    key={r.key}
                    onPress={() => setReason(r.key)}
                    style={[st.reason, {
                      backgroundColor: active ? C.tealTint : C.surface2,
                      borderColor: active ? C.teal : C.border,
                    }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[st.reasonLabel, { color: active ? C.teal : C.text }]}>{r.label}</Text>
                      <Text style={[st.reasonSub, { color: C.textFaint }]}>{r.sub}</Text>
                    </View>
                    <View style={[st.radio, { borderColor: active ? C.teal : C.borderStrong }]}>
                      {active && <View style={[st.radioDot, { backgroundColor: C.teal }]} />}
                    </View>
                  </TouchableOpacity>
                )
              })}
            </View>

            <TextInput
              value={note}
              onChangeText={(t) => setNote(t.slice(0, 1000))}
              placeholder="Add a note (optional)"
              placeholderTextColor={C.textFaint}
              multiline
              style={[st.input, { backgroundColor: C.surface2, borderColor: C.border, color: C.text }]}
            />

            <View style={st.actions}>
              <TouchableOpacity onPress={() => { setOpen(false); reset() }} style={[st.btn, { backgroundColor: C.surface2 }]}>
                <Text style={[st.btnText, { color: C.textSoft }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={submit}
                disabled={!reason || submitting}
                style={[st.btn, { backgroundColor: reason && !submitting ? C.teal : C.borderStrong }]}
              >
                <Text style={[st.btnText, { color: reason && !submitting ? C.onTeal : C.textFaint }]}>
                  {submitting ? 'Sending…' : 'Send report'}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}

function FlagIcon({ color }: { color: string }) {
  return (
    <View style={{ width: 13, height: 13, justifyContent: 'center' }}>
      <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 1.6, backgroundColor: color, borderRadius: 1 }} />
      <View style={{ position: 'absolute', left: 1.6, top: 1, width: 9, height: 6.5, backgroundColor: color, borderRadius: 1.5, opacity: 0.9 }} />
    </View>
  )
}

const st = StyleSheet.create({
  trigger: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 2 },
  triggerText: { fontSize: 12.5, fontWeight: '600' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderBottomWidth: 0, padding: 20, paddingBottom: 32 },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(128,128,128,0.35)', marginBottom: 14 },
  title: { fontSize: 18, fontWeight: '900', letterSpacing: -0.3 },
  subtitle: { fontSize: 13, fontWeight: '500', marginTop: 4, lineHeight: 18 },
  reason: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderRadius: 14, borderWidth: 1.5 },
  reasonLabel: { fontSize: 14.5, fontWeight: '800' },
  reasonSub: { fontSize: 12, fontWeight: '500', marginTop: 1 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  input: { marginTop: 12, minHeight: 64, borderRadius: 14, borderWidth: 1, padding: 12, fontSize: 14, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  btn: { flex: 1, paddingVertical: 13, borderRadius: 14, alignItems: 'center' },
  btnText: { fontSize: 14.5, fontWeight: '800' },
})
