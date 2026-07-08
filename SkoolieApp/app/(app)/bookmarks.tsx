/**
 * Bookmarks screen — lives at /(app)/bookmarks (NOT inside the practice stack)
 * so the Practice tab is NOT highlighted when the user is here.
 */
import { useCallback, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, Animated } from 'react-native'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { normalizeOptions, resolveCorrectLetter, LETTERS } from '@/lib/answers'
import { useAuth } from '@/hooks/useAuth'
import { MAX_CONTENT } from '@/hooks/useResponsive'
import { useTheme } from '@/hooks/useTheme'
import { TopBar } from '@/components/ui/TopBar'
import { useScreenEntrance } from '@/hooks/useScreenEntrance'

interface BookmarkedQuestion {
  id: string
  question_text: string
  topic: string
  question_type: string
  difficulty: string | null
  high_yield: boolean | null
  correct_answer: string
  options: string[]
  explanation: string
  bookmark_id: string
}

interface BookmarkedCase {
  bookmark_id: string
  id: string
  title: string
  topic: string
  difficulty: string | null
  clinical_vignette: string
}

export default function BookmarksScreen() {
  const C = useTheme()
  const { user } = useAuth()
  const { from } = useLocalSearchParams<{ from?: string }>()
  // Back returns to wherever Bookmarks was launched from (dashboard or practice hub).
  const backTo = (from === 'dashboard' ? '/(app)/dashboard' : '/(app)/practice') as any
  const [items, setItems] = useState<BookmarkedQuestion[]>([])
  const [caseItems, setCaseItems] = useState<BookmarkedCase[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const entrance = useScreenEntrance()

  useFocusEffect(
    useCallback(() => {
      load()
    }, [user])
  )

  async function load() {
    if (!user) { setLoading(false); return }
    try {
    const { data } = await supabase.rpc('get_bookmarks')

    setItems(
      (data ?? [])
        .filter((b: any) => b.q_id)
        .map((b: any) => ({
          bookmark_id: b.bookmark_id,
          id: b.q_id, question_text: b.q_text, topic: b.q_topic, question_type: b.q_type,
          difficulty: b.q_difficulty, high_yield: b.q_high_yield, correct_answer: b.q_correct,
          options: b.q_options, explanation: b.q_explanation,
        }))
    )
    setCaseItems(
      (data ?? [])
        .filter((b: any) => b.c_id)
        .map((b: any) => ({
          bookmark_id: b.bookmark_id,
          id: b.c_id, title: b.c_title, topic: b.c_topic, difficulty: b.c_difficulty, clinical_vignette: b.c_vignette,
        }))
    )
    } catch (e) {
      console.warn('bookmarks load failed', e)
    } finally {
      setLoading(false)
    }
  }

  async function onRefresh() { setRefreshing(true); try { await load() } finally { setRefreshing(false) } }

  async function removeBookmark(bookmarkId: string) {
    await supabase.from('bookmarks').delete().eq('id', bookmarkId)
    setItems(prev => prev.filter(q => q.bookmark_id !== bookmarkId))
    setCaseItems(prev => prev.filter(c => c.bookmark_id !== bookmarkId))
  }

  const mcqItems   = items.filter(q => q.question_type === 'mcq')
  const flashItems = items.filter(q => q.question_type === 'flashcard')
  const total      = items.length + caseItems.length

  /** Opens a single bookmarked case in the case runner (practice-only) */
  function openCase(c: BookmarkedCase) {
    router.push({ pathname: '/(app)/practice/cases' as any, params: { startCaseId: c.id, sessionKey: Date.now().toString(), from, fromBookmarks: '1' } })
  }

  /** Opens a single bookmark in its quiz runner */
  function openQuestion(q: BookmarkedQuestion) {
    const sessionKey = Date.now().toString()
    if (q.question_type === 'mcq') {
      router.push({ pathname: '/(app)/practice/mcq' as any, params: { questionIds: JSON.stringify([q.id]), sessionKey, from } })
    } else {
      router.push({ pathname: '/(app)/practice/flashcards' as any, params: { cardIds: JSON.stringify([q.id]), sessionKey, from } })
    }
  }

  /** Practice All: MCQs take priority, then flashcards */
  const practiceAll = () => {
    const sessionKey = Date.now().toString()
    if (mcqItems.length > 0) {
      router.push({ pathname: '/(app)/practice/mcq' as any, params: { questionIds: JSON.stringify(items.filter(q => q.question_type === 'mcq').map(q => q.id)), sessionKey, from } })
    } else {
      router.push({ pathname: '/(app)/practice/flashcards' as any, params: { cardIds: JSON.stringify(flashItems.map(q => q.id)), sessionKey, from } })
    }
  }

  function DiffBadge({ difficulty }: { difficulty: string | null }) {
    if (!difficulty) return null
    const map: Record<string, { bg: string; color: string }> = {
      easy:   { bg: C.greenTint, color: C.green },
      medium: { bg: C.amberTint, color: C.amber },
      hard:   { bg: C.redTint,   color: C.red   },
    }
    const style = map[difficulty] ?? { bg: C.surface3, color: C.textFaint }
    return (
      <View style={[s.diffBadge, { backgroundColor: style.bg }]}>
        <Text style={[s.diffBadgeText, { color: style.color }]}>{difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}</Text>
      </View>
    )
  }

  function BackButton() {
    return (
      <TouchableOpacity
        onPress={() => router.navigate(backTo)}
        style={[s.backBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
      >
        <Ionicons name="arrow-back" size={20} color={C.textSoft} />
      </TouchableOpacity>
    )
  }

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <TopBar title="Bookmarks" />
      <ActivityIndicator style={{ marginTop: 40 }} color={C.teal} />
    </View>
  )

  if (total === 0) return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <TopBar title="Bookmarks" />
      {from ? (
        <View style={[s.pageHeader, { backgroundColor: C.bg }]}>
          <BackButton />
        </View>
      ) : null}
      <View style={s.empty}>
        <View style={[s.emptyIcon, { backgroundColor: C.surface2 }]}>
          <Ionicons name="bookmark" size={34} color={C.textFaint} />
        </View>
        <Text style={[s.emptyTitle, { color: C.text }]}>No bookmarks yet</Text>
        <Text style={[s.emptySub, { color: C.textFaint }]}>Tap the bookmark icon while practising to save questions here.</Text>
        <TouchableOpacity onPress={() => router.navigate('/(app)/practice' as any)}
          style={[s.emptyBtn, { backgroundColor: C.teal }]}>
          <Text style={[s.emptyBtnText, { color: C.onTeal }]}>Start practising →</Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  type Section =
    | { kind: 'questions'; key: string; label: string; items: BookmarkedQuestion[]; color: string; colorTint: string }
    | { kind: 'cases'; key: string; label: string; cases: BookmarkedCase[]; color: string; colorTint: string }
  const sections = [
    mcqItems.length > 0 && { kind: 'questions', key: 'mcq', label: 'MCQs', items: mcqItems, color: C.teal, colorTint: C.tealTint },
    flashItems.length > 0 && { kind: 'questions', key: 'flash', label: 'Flashcards', items: flashItems, color: C.coral, colorTint: C.coralTint },
    caseItems.length > 0 && { kind: 'cases', key: 'cases', label: 'Case Studies', cases: caseItems, color: C.amber, colorTint: C.amberTint },
  ].filter(Boolean) as Section[]

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <TopBar title="Bookmarks" />

      <Animated.View style={[{ flex: 1 }, entrance]}>
      {/* Header row */}
      <View style={[s.pageHeader, { backgroundColor: C.bg }]}>
        {from ? <BackButton /> : null}
        <View style={{ flex: 1 }}>
          <Text style={[s.pageTitle, { color: C.text }]}>Bookmarks</Text>
          <Text style={[s.pageSub, { color: C.textFaint }]}>{total} item{total !== 1 ? 's' : ''} saved</Text>
        </View>
        <TouchableOpacity onPress={practiceAll} style={[s.practiceAllBtn, { backgroundColor: C.teal }]}>
          <Text style={[s.practiceAllText, { color: C.onTeal }]}>Practice all →</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={sections}
        keyExtractor={sec => sec.key}
        contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 28, width: '100%', maxWidth: MAX_CONTENT, alignSelf: 'center' }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.teal} />}
        renderItem={({ item: sec }) => (
          <View>
            <View style={s.secHeader}>
              <Text style={[s.secTitle, { color: C.text }]}>
                {sec.label}{' '}
                <Text style={[s.secCount, { color: C.textFaint }]}>({sec.kind === 'cases' ? sec.cases.length : sec.items.length})</Text>
              </Text>
            </View>

            {sec.kind === 'cases' ? (
              <View style={{ gap: 10 }}>
                {sec.cases.map(c => (
                  <TouchableOpacity key={c.bookmark_id} activeOpacity={0.82} onPress={() => openCase(c)}
                    style={[s.card, { backgroundColor: C.surface, borderColor: C.border, ...C.shadow }]}>
                    <View style={s.cardMeta}>
                      <View style={[s.topicBadge, { backgroundColor: sec.colorTint }]}>
                        <Text style={[s.topicBadgeText, { color: sec.color }]}>{c.topic}</Text>
                      </View>
                      <View style={s.metaRight}>
                        <DiffBadge difficulty={c.difficulty} />
                        <TouchableOpacity onPress={() => removeBookmark(c.bookmark_id)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                          <Ionicons name="bookmark" size={18} color={sec.color} />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <Text style={[s.stem, { color: C.text }]}>{c.title}</Text>
                    <Text style={[s.answerText, { color: C.textSoft }]} numberOfLines={3}>{c.clinical_vignette}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
            <View style={{ gap: 10 }}>
              {sec.items.map(q => {
                const isMCQ = q.question_type === 'mcq'
                const correctLetter = resolveCorrectLetter(q.options, q.correct_answer)
                const correctText = correctLetter ? normalizeOptions(q.options)[LETTERS.indexOf(correctLetter)] : undefined

                return (
                  <TouchableOpacity key={q.bookmark_id} activeOpacity={0.82} onPress={() => openQuestion(q)}
                    style={[s.card, { backgroundColor: C.surface, borderColor: C.border, ...C.shadow }]}>
                    <View style={s.cardMeta}>
                      <View style={[s.topicBadge, { backgroundColor: sec.colorTint }]}>
                        <Text style={[s.topicBadgeText, { color: sec.color }]}>{q.topic}</Text>
                      </View>
                      <View style={s.metaRight}>
                        {q.high_yield && <Ionicons name="star" size={14} color={C.amber} />}
                        <DiffBadge difficulty={q.difficulty} />
                        <TouchableOpacity onPress={() => removeBookmark(q.bookmark_id)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                          <Ionicons name="bookmark" size={18} color={sec.color} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <Text style={[s.stem, { color: C.text }]}>{q.question_text}</Text>

                    {isMCQ ? (
                      <View style={[s.answerBox, { backgroundColor: C.tealTint }]}>
                        <Text style={[s.answerLabel, { color: C.teal }]}>Answer: {correctText ? `${correctLetter}. ${correctText.replace(/^\s*[A-F][.):]\s*/, '')}` : q.correct_answer}</Text>
                        <Text style={[s.answerText, { color: C.textSoft }]}>{q.explanation}</Text>
                      </View>
                    ) : (
                      // Q&A flashcards keep the answer in correct_answer (the
                      // explanation is supplementary); comprehensive cards have
                      // no correct_answer — there the explanation IS the answer.
                      <View style={[s.flashAnswer, { backgroundColor: C.teal }]}>
                        <Text style={[s.flashAnswerLabel, { color: C.onTeal + '99' }]}>ANSWER</Text>
                        <Text style={[s.flashAnswerText, { color: C.onTeal }]}>{q.correct_answer?.trim() ? q.correct_answer : q.explanation}</Text>
                        {q.correct_answer?.trim() && q.explanation?.trim() && q.explanation.trim() !== q.correct_answer.trim() ? (
                          <>
                            <Text style={[s.flashAnswerLabel, { color: C.onTeal + '99', marginTop: 8 }]}>WHY</Text>
                            <Text style={[s.flashAnswerText, { color: C.onTeal }]}>{q.explanation}</Text>
                          </>
                        ) : null}
                      </View>
                    )}
                  </TouchableOpacity>
                )
              })}
            </View>
            )}
          </View>
        )}
      />
      </Animated.View>
    </View>
  )
}

const s = StyleSheet.create({
  pageHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 14 },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1, flexShrink: 0 },
  pageTitle: { fontSize: 26, fontFamily: 'Nunito_900Black', letterSpacing: -0.3 },
  pageSub: { fontSize: 13, fontFamily: 'Nunito_600SemiBold', marginTop: 2 },
  practiceAllBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 999 },
  practiceAllText: { fontSize: 14, fontFamily: 'Nunito_800ExtraBold' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingBottom: 80 },
  emptyIcon: { width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  emptyTitle: { fontSize: 18, fontFamily: 'Nunito_800ExtraBold', marginBottom: 8 },
  emptySub: { fontSize: 14, fontFamily: 'Nunito_600SemiBold', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  emptyBtn: { paddingVertical: 13, paddingHorizontal: 28, borderRadius: 999 },
  emptyBtnText: { fontSize: 14, fontFamily: 'Nunito_800ExtraBold' },

  secHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  secTitle: { fontSize: 16, fontFamily: 'Nunito_800ExtraBold' },
  secCount: { fontSize: 13, fontFamily: 'Nunito_700Bold' },

  card: { borderRadius: 18, borderWidth: 1, padding: 16, overflow: 'hidden' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  topicBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, flexShrink: 1, marginRight: 8 },
  topicBadgeText: { fontSize: 12, fontFamily: 'Nunito_800ExtraBold' },
  metaRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  diffBadge: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 999 },
  diffBadgeText: { fontSize: 11.5, fontFamily: 'Nunito_800ExtraBold', textTransform: 'capitalize' },
  stem: { fontSize: 14, fontFamily: 'Nunito_700Bold', lineHeight: 22, marginBottom: 12 },

  answerBox: { borderRadius: 12, padding: 12 },
  answerLabel: { fontSize: 12, fontFamily: 'Nunito_800ExtraBold', marginBottom: 4 },
  answerText: { fontSize: 13, fontFamily: 'Nunito_600SemiBold', lineHeight: 19 },

  flashAnswer: { marginHorizontal: -16, marginBottom: -16, padding: 14 },
  flashAnswerLabel: { fontSize: 11, fontFamily: 'Nunito_800ExtraBold', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 },
  flashAnswerText: { fontSize: 14, fontFamily: 'Nunito_800ExtraBold', lineHeight: 21 },
})
