import { useEffect, useState, useRef } from 'react'
import { View, Text, TextInput, FlatList, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Modal, Pressable, Animated } from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useScreenEntrance } from '@/hooks/useScreenEntrance'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { normalizeOptions, resolveCorrectLetter, LETTERS } from '@/lib/answers'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { TopicIcon } from '@/components/ui/TopicIcon'
import { topicColor } from '@/constants/topics'
import { SkeletonList } from '@/components/ui/Skeleton'
import { withFilterAnim } from '@/lib/anim'

type TypeFilter = 'all' | 'mcq' | 'flashcard' | 'case_study'

interface Result {
  id: string; question_text: string; topic: string; category: string | null
  question_type: string; correct_answer: string
  options: string[]; explanation: string
}

interface CaseResult {
  id: string; title: string; topic: string
  clinical_vignette: string; difficulty: string | null
}

interface SystemRow {
  topic: string; mcq_count: number; flashcard_count: number; case_count: number
}

/** Client-side fuzzy match: any word in the query appears in the topic name */
function fuzzyMatchSystems(q: string, systems: SystemRow[]): SystemRow[] {
  const words = q.toLowerCase().trim().split(/\s+/).filter(w => w.length >= 2)
  if (words.length === 0) return []
  return systems.filter(sys => {
    const name = sys.topic.toLowerCase()
    return words.some(w => name.includes(w))
  })
}

export default function SearchScreen() {
  const C = useTheme()
  const insets = useSafeAreaInsets()
  const { profile, user } = useAuth()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [caseResults, setCaseResults] = useState<CaseResult[]>([])
  const [systems, setSystems] = useState<SystemRow[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingSystems, setLoadingSystems] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [selectedSystem, setSelectedSystem] = useState<SystemRow | null>(null)
  const [quickPicks, setQuickPicks] = useState<string[]>([])
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set())
  const [bookmarkedCaseIds, setBookmarkedCaseIds] = useState<Set<string>>(new Set())
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const loggedSearchRef = useRef<Set<string>>(new Set())  // dedupe 'search' events per query session

  const entrance = useScreenEntrance()

  function goBack() {
    // Search is a hidden TAB route, not a stacked screen — router.back() inside
    // a tab navigator falls back to the initial tab (Dashboard). Its only entry
    // point is the Practice hub's search bar, so back always returns there.
    router.navigate('/(app)/practice' as any)
  }

  useEffect(() => { loadSystems() }, [profile?.profession])

  // Load the user's bookmarks (questions + cases) so results can show/toggle bookmark state.
  useEffect(() => {
    if (!user) return
    supabase.from('bookmarks').select('question_id, case_id').eq('user_id', user.id)
      .then(({ data }) => {
        setBookmarkedIds(new Set((data ?? []).filter((b: any) => b.question_id).map((b: any) => b.question_id)))
        setBookmarkedCaseIds(new Set((data ?? []).filter((b: any) => b.case_id).map((b: any) => b.case_id)))
      })
  }, [user?.id])

  function toggleBookmark(id: string) {
    if (!user) return
    if (bookmarkedIds.has(id)) {
      supabase.from('bookmarks').delete().eq('user_id', user.id).eq('question_id', id).then(() => {})
      setBookmarkedIds(s => { const n = new Set(s); n.delete(id); return n })
    } else {
      supabase.from('bookmarks').insert({ user_id: user.id, question_id: id }).then(() => {})
      setBookmarkedIds(s => new Set(s).add(id))
    }
  }

  function toggleCaseBookmark(id: string) {
    if (!user) return
    if (bookmarkedCaseIds.has(id)) {
      supabase.from('bookmarks').delete().eq('user_id', user.id).eq('case_id', id).then(() => {})
      setBookmarkedCaseIds(s => { const n = new Set(s); n.delete(id); return n })
    } else {
      supabase.from('bookmarks').insert({ user_id: user.id, case_id: id }).then(() => {})
      setBookmarkedCaseIds(s => new Set(s).add(id))
    }
  }

  // Open a single found item in practice mode. All three are practice-only — they never count
  // toward quiz_sessions/XP/streak (mcq via questionIds, flashcards via cardIds, cases via startCaseId).
  function openResult(item: Result) {
    if (item.question_type === 'flashcard') {
      router.push({ pathname: '/(app)/practice/flashcards', params: { cardIds: JSON.stringify([item.id]), from: 'search' } } as any)
    } else {
      router.push({ pathname: '/(app)/practice/mcq', params: { questionIds: JSON.stringify([item.id]), from: 'search' } } as any)
    }
  }

  // Blended quick picks (the user's own activity + platform popularity by clicks/searches/bookmarks/sessions)
  useEffect(() => {
    if (!profile || !user) return
    supabase.rpc('get_quick_picks', { p_profession: profile.profession, p_user_id: user.id, p_limit: 6 })
      .then(({ data }) => { if (data && data.length) setQuickPicks(data.map((r: any) => r.topic)) })
  }, [profile?.profession, user?.id])

  // Fallback if the RPC hasn't populated yet (e.g. offline): biggest topics with content.
  useEffect(() => {
    if (quickPicks.length === 0 && systems.length > 0) {
      setQuickPicks(systems.filter(s => s.mcq_count > 0 || s.flashcard_count > 0).slice(0, 6).map(s => s.topic))
    }
  }, [systems]) // eslint-disable-line react-hooks/exhaustive-deps

  // Log a topic "open" (click) for popularity, and open the practice picker.
  function openSystem(sys: SystemRow) {
    setSelectedSystem(sys)
    if (user) {
      supabase.from('topic_events')
        .insert({ user_id: user.id, profession: profile?.profession ?? null, topic: sys.topic, event_type: 'open' })
        .then(() => {})
    }
  }

  // Log 'search' popularity for the systems a query fuzzy-matches (deduped per query session).
  function logSearchTopics(text: string) {
    if (!user) return
    const toLog = fuzzyMatchSystems(text, systems)
      .filter(m => !loggedSearchRef.current.has(m.topic))
      .slice(0, 3)
    if (toLog.length === 0) return
    toLog.forEach(m => loggedSearchRef.current.add(m.topic))
    supabase.from('topic_events')
      .insert(toLog.map(m => ({ user_id: user.id, profession: profile?.profession ?? null, topic: m.topic, event_type: 'search' })))
      .then(() => {})
  }

  async function loadSystems() {
    if (!profile) return
    const [{ data: mcqData }, { data: fcData }, { data: caseData }] = await Promise.all([
      supabase.rpc('get_question_counts', {
        p_profession: profile.profession,
        p_question_type: 'mcq',
        p_access_key: profile.access_key ?? null,
      }),
      supabase.rpc('get_question_counts', {
        p_profession: profile.profession,
        p_question_type: 'flashcard',
        p_access_key: profile.access_key ?? null,
      }),
      supabase.rpc('get_case_study_counts', {
        p_profession: profile.profession,
        p_access_key: profile.access_key ?? null,
        p_difficulty: null,
      }),
    ])

    const mcqByTopic: Record<string, number> = {}
    for (const r of (mcqData ?? [])) mcqByTopic[r.topic] = (mcqByTopic[r.topic] ?? 0) + Number(r.cnt)
    const fcByTopic: Record<string, number> = {}
    for (const r of (fcData ?? [])) fcByTopic[r.topic] = (fcByTopic[r.topic] ?? 0) + Number(r.cnt)
    const caseByTopic: Record<string, number> = {}
    for (const r of (caseData ?? [])) caseByTopic[r.topic] = (caseByTopic[r.topic] ?? 0) + Number(r.cnt)

    const topics = Array.from(new Set([...Object.keys(mcqByTopic), ...Object.keys(fcByTopic), ...Object.keys(caseByTopic)])).sort()
    setSystems(topics.map(t => ({ topic: t, mcq_count: mcqByTopic[t] ?? 0, flashcard_count: fcByTopic[t] ?? 0, case_count: caseByTopic[t] ?? 0 })))
    setLoadingSystems(false)
  }

  async function search(text: string) {
    setQuery(text)
    if (timer.current) clearTimeout(timer.current)
    if (text.trim().length < 2) { setResults([]); setCaseResults([]); loggedSearchRef.current.clear(); return }
    timer.current = setTimeout(async () => {
      setLoading(true)
      const prof = profile?.profession ?? 'pharmacy'
      const ak = profile?.access_key ?? null
      // Server-side full-text search across ALL fields (stem, options, explanation, topic, etc.),
      // ranked by relevance, with access-key gating. Prefix matching makes partial terms work.
      const [{ data }, { data: cases }] = await Promise.all([
        supabase.rpc('search_questions', { p_query: text, p_profession: prof, p_access_key: ak, p_limit: 30 }),
        supabase.rpc('search_cases', { p_query: text, p_profession: prof, p_access_key: ak, p_limit: 10 }),
      ])
      setResults(data ?? [])
      setCaseResults(cases ?? [])
      setLoading(false)
      logSearchTopics(text)
    }, 350)
  }

  const TYPE_COLOR: Record<string, string> = { mcq: C.teal, flashcard: C.coral, case_study: C.amber }
  const showBrowse = query.length < 2

  // In search mode, show matching systems at the top
  const matchingSystems = !showBrowse ? fuzzyMatchSystems(query, systems) : []

  // Type filter (All / MCQ / Flashcards / Cases)
  const mcqCount = results.filter(r => r.question_type === 'mcq').length
  const fcCount = results.filter(r => r.question_type === 'flashcard').length
  const shownResults = typeFilter === 'all' ? results
    : typeFilter === 'case_study' ? []
    : results.filter(r => r.question_type === typeFilter)
  const shownCases = typeFilter === 'all' || typeFilter === 'case_study' ? caseResults : []
  const TYPE_CHIPS: { id: TypeFilter; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: results.length + caseResults.length },
    { id: 'mcq', label: 'MCQs', count: mcqCount },
    { id: 'flashcard', label: 'Flashcards', count: fcCount },
    { id: 'case_study', label: 'Cases', count: caseResults.length },
  ]

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Animated.View style={[{ flex: 1 }, entrance]}>
      {/* Focused search header — back + live input, keyboard up on arrival */}
      <View style={[s.header, { backgroundColor: C.surface, borderBottomColor: C.border, paddingTop: insets.top + 10 }]}>
        <View style={s.headerRow}>
          <TouchableOpacity
            onPress={goBack}
            style={[s.backBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
            accessibilityRole="button"
            accessibilityLabel="Back to practice"
          >
            <Ionicons name="arrow-back" size={20} color={C.textSoft} />
          </TouchableOpacity>
          <View style={[s.searchBar, { flex: 1, backgroundColor: C.surface2, borderColor: C.border }]}>
            <Ionicons name="search" size={18} color={C.textFaint} />
            <TextInput
              style={[s.input, { color: C.text }]}
              value={query}
              onChangeText={search}
              placeholder="Search topics, conditions, drugs…"
              placeholderTextColor={C.textFaint}
              autoCapitalize="none"
              returnKeyType="search"
              autoFocus
            />
            {query.length > 0 && (
              <TouchableOpacity
                onPress={() => { setQuery(''); setResults([]); setCaseResults([]); loggedSearchRef.current.clear() }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
              >
                <Ionicons name="close-circle" size={18} color={C.textFaint} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Type filter chips (search mode only) */}
        {!showBrowse && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 12 }}>
            {TYPE_CHIPS.map(chip => {
              const active = typeFilter === chip.id
              return (
                <TouchableOpacity
                  key={chip.id}
                  onPress={() => withFilterAnim(() => setTypeFilter(chip.id))}
                  activeOpacity={0.8}
                  style={[s.typeChip, { backgroundColor: active ? C.teal : C.surface2, borderColor: active ? C.teal : C.border }]}
                >
                  <Text style={[s.typeChipText, { color: active ? C.onTeal : C.textSoft }]}>
                    {chip.label}{chip.count > 0 ? ` ${chip.count}` : ''}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        )}
      </View>

      {/* Browse mode */}
      {showBrowse && (
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          <Text style={[s.sectionLabel, { color: C.textFaint }]}>QUICK PICKS</Text>
          <View style={s.quickPicks}>
            {loadingSystems ? (
              <ActivityIndicator style={{ margin: 8 }} color={C.teal} />
            ) : (
              quickPicks.map(t => (
                <TouchableOpacity
                  key={t}
                  onPress={() => openSystem(systems.find(sys => sys.topic === t) ?? { topic: t, mcq_count: 0, flashcard_count: 0, case_count: 0 })}
                  style={[s.quickChip, { backgroundColor: C.surface2, borderColor: C.border }]}
                >
                  <Text style={[s.quickChipText, { color: C.textSoft }]}>{t}</Text>
                </TouchableOpacity>
              ))
            )}
          </View>

          <Text style={[s.sectionLabel, { color: C.textFaint }]}>ALL SYSTEMS ({systems.length})</Text>
          {loadingSystems ? (
            <SkeletonList rows={7} style={{ marginHorizontal: 16, marginTop: 4 }} />
          ) : (
            systems.map(sys => {
              const { color: iconColor, bgLight: iconBg } = topicColor(sys.topic)
              return (
                <TouchableOpacity
                  key={sys.topic}
                  onPress={() => openSystem(sys)}
                  activeOpacity={0.75}
                  style={[s.systemRow, { backgroundColor: C.surface, borderColor: C.border }]}
                >
                  <View style={[s.systemIcon, { backgroundColor: iconBg }]}>
                    <TopicIcon topic={sys.topic} size={20} color={iconColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.systemName, { color: C.text }]}>{sys.topic}</Text>
                    <Text style={[s.systemCounts, { color: C.textFaint }]}>
                      {sys.mcq_count.toLocaleString()} MCQs{sys.flashcard_count > 0 ? ` · ${sys.flashcard_count.toLocaleString()} flashcards` : ''}{sys.case_count > 0 ? ` · ${sys.case_count.toLocaleString()} cases` : ''}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={C.textFaint} />
                </TouchableOpacity>
              )
            })
          )}
        </ScrollView>
      )}

      {/* Search results — ONE scroll container (systems header + questions + cases footer) */}
      {!showBrowse && (
        <FlatList
          data={loading ? [] : shownResults}
          keyExtractor={item => item.id}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 100, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View>
              {loading && <ActivityIndicator style={{ marginTop: 24 }} color={C.teal} />}

              {!loading && typeFilter === 'all' && matchingSystems.length > 0 && (
                <View style={[s.matchingSystems, { borderBottomColor: C.border }]}>
                  <Text style={[s.sectionLabel, { color: C.textFaint, marginTop: 12 }]}>SYSTEMS</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 10, gap: 8 }}>
                    {matchingSystems.map(sys => {
                      const { color: iconColor, bgLight: iconBg } = topicColor(sys.topic)
                      return (
                        <TouchableOpacity
                          key={sys.topic}
                          onPress={() => openSystem(sys)}
                          activeOpacity={0.8}
                          style={[s.systemChip, { backgroundColor: C.surface, borderColor: C.border }]}
                        >
                          <View style={[s.systemChipIcon, { backgroundColor: iconBg }]}>
                            <TopicIcon topic={sys.topic} size={14} color={iconColor} />
                          </View>
                          <View>
                            <Text style={[s.systemChipName, { color: C.text }]}>{sys.topic}</Text>
                            <Text style={[s.systemChipCounts, { color: C.textFaint }]}>
                              {sys.mcq_count > 0 ? `${sys.mcq_count.toLocaleString()} MCQs` : ''}
                              {sys.mcq_count > 0 && sys.flashcard_count > 0 ? ' · ' : ''}
                              {sys.flashcard_count > 0 ? `${sys.flashcard_count.toLocaleString()} cards` : ''}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      )
                    })}
                  </ScrollView>
                </View>
              )}

              {!loading && shownResults.length > 0 && (
                <Text style={[s.sectionLabel, { color: C.textFaint }]}>QUESTIONS ({shownResults.length})</Text>
              )}
            </View>
          }
          ListEmptyComponent={
            loading ? null : (
              shownResults.length === 0 && shownCases.length === 0 ? (
                <View style={s.empty}>
                  <Text style={[s.emptyTitle, { color: C.text }]}>No results</Text>
                  <Text style={[s.emptySub, { color: C.textFaint }]}>
                    {typeFilter === 'all' ? 'Try different keywords' : 'Nothing of this type — try another filter'}
                  </Text>
                </View>
              ) : null
            )
          }
          renderItem={({ item }) => {
            const isOpen = expanded === item.id
            const opts = normalizeOptions(item.options).map((v, i) => ({ k: LETTERS[i], v }))
            const correctK = resolveCorrectLetter(item.options, item.correct_answer)
            return (
              <TouchableOpacity
                onPress={() => setExpanded(isOpen ? null : item.id)}
                activeOpacity={0.85}
                style={[s.card, { marginHorizontal: 16, backgroundColor: C.surface, borderColor: C.border, ...C.shadow }]}
              >
                <View style={s.cardHeader}>
                  <View style={[s.typeBadge, { backgroundColor: `${TYPE_COLOR[item.question_type]}20` }]}>
                    <Text style={[s.typeBadgeText, { color: TYPE_COLOR[item.question_type] }]}>
                      {item.question_type.replace('_', ' ')}
                    </Text>
                  </View>
                  <Text style={[s.topic, { color: C.textFaint }]} numberOfLines={1}>{item.topic}</Text>
                  <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color={C.textFaint} />
                </View>
                <Text style={[s.stem, { color: C.text }]} numberOfLines={isOpen ? undefined : 2}>{item.question_text}</Text>

                {isOpen && (
                  <View style={s.expandedContent}>
                    {opts.map(opt => (
                      <View key={opt.k} style={[
                        s.opt,
                        opt.k === correctK && { backgroundColor: C.greenTint, borderColor: C.green, borderWidth: 1.5 }
                      ]}>
                        <View style={[s.optKey, { backgroundColor: opt.k === correctK ? C.green : C.surface3 }]}>
                          <Text style={[s.optKeyText, { color: opt.k === correctK ? C.onTeal : C.textSoft }]}>{opt.k}</Text>
                        </View>
                        <Text style={[s.optText, { color: C.text }]}>{opt.v}</Text>
                      </View>
                    ))}
                    <View style={[s.explain, { backgroundColor: C.tealTint }]}>
                      <Text style={[s.explainTitle, { color: C.teal }]}>Explanation</Text>
                      <Text style={[s.explainText, { color: C.textSoft }]}>{item.explanation}</Text>
                    </View>
                  </View>
                )}

                <View style={s.resultActions}>
                  <TouchableOpacity
                    onPress={() => toggleBookmark(item.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={[s.bmBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
                  >
                    <Ionicons
                      name={bookmarkedIds.has(item.id) ? 'bookmark' : 'bookmark-outline'}
                      size={16}
                      color={bookmarkedIds.has(item.id) ? C.teal : C.textFaint}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => openResult(item)}
                    activeOpacity={0.85}
                    style={[s.openBtn, { backgroundColor: TYPE_COLOR[item.question_type] }]}
                  >
                    <Text style={[s.openBtnText, { color: C.onTeal }]}>
                      {item.question_type === 'flashcard' ? 'Study →' : 'Practice →'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            )
          }}
          ListFooterComponent={
            !loading && shownCases.length > 0 ? (
              <View>
                <Text style={[s.sectionLabel, { color: C.textFaint, marginTop: 4 }]}>CASE STUDIES ({shownCases.length})</Text>
                {shownCases.map(cs => (
                  <View
                    key={cs.id}
                    style={[s.caseCard, { backgroundColor: C.surface, borderColor: C.border, ...C.shadow }]}
                  >
                    <View style={s.caseHeader}>
                      <View style={[s.typeBadge, { backgroundColor: `${C.amber}20` }]}>
                        <Text style={[s.typeBadgeText, { color: C.amber }]}>case study</Text>
                      </View>
                      <Text style={[s.topic, { color: C.textFaint }]} numberOfLines={1}>{cs.topic}</Text>
                      {cs.difficulty && (
                        <Text style={[s.caseDiff, { color: cs.difficulty === 'easy' ? C.green : cs.difficulty === 'hard' ? C.red : C.amber }]}>
                          {cs.difficulty}
                        </Text>
                      )}
                    </View>
                    <Text style={[s.caseTitleText, { color: C.text }]} numberOfLines={2}>{cs.title}</Text>
                    <Text style={[s.caseVignette, { color: C.textSoft }]} numberOfLines={3}>{cs.clinical_vignette}</Text>
                    <View style={s.resultActions}>
                      <TouchableOpacity
                        onPress={() => toggleCaseBookmark(cs.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={[s.bmBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
                      >
                        <Ionicons
                          name={bookmarkedCaseIds.has(cs.id) ? 'bookmark' : 'bookmark-outline'}
                          size={16}
                          color={bookmarkedCaseIds.has(cs.id) ? C.amber : C.textFaint}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => router.push({ pathname: '/(app)/practice/cases', params: { startCaseId: cs.id, from: 'search' } } as any)}
                        activeOpacity={0.85}
                        style={[s.openBtn, { backgroundColor: C.amber }]}
                      >
                        <Text style={[s.openBtnText, { color: C.onTeal }]}>Open case →</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ) : null
          }
        />
      )}

      </Animated.View>

      {/* Topic picker modal — stays on search page */}
      <Modal
        visible={selectedSystem !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedSystem(null)}
      >
        <Pressable style={s.modalOverlay} onPress={() => setSelectedSystem(null)}>
          <Pressable style={[s.modalSheet, { backgroundColor: C.surface }]} onPress={() => {}}>
            {/* Handle */}
            <View style={[s.handle, { backgroundColor: C.border }]} />

            {/* Header */}
            <View style={s.modalHeader}>
              {selectedSystem && (() => {
                const { color: iconColor, bgLight: iconBg } = topicColor(selectedSystem.topic)
                return (
                  <View style={[s.modalIcon, { backgroundColor: iconBg }]}>
                    <TopicIcon topic={selectedSystem.topic} size={24} color={iconColor} />
                  </View>
                )
              })()}
              <View style={{ flex: 1 }}>
                <Text style={[s.modalTitle, { color: C.text }]}>{selectedSystem?.topic}</Text>
                <Text style={[s.modalSub, { color: C.textFaint }]}>Choose what to practise</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedSystem(null)} hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}>
                <Ionicons name="close" size={22} color={C.textFaint} />
              </TouchableOpacity>
            </View>

            {/* Buttons */}
            <View style={{ gap: 10, marginTop: 4 }}>
              {(selectedSystem?.mcq_count ?? 0) > 0 && (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => {
                    setSelectedSystem(null)
                    router.push({ pathname: '/(app)/practice/mcq', params: { startTopic: selectedSystem!.topic, from: 'search' } } as any)
                  }}
                  style={[s.modalBtn, { backgroundColor: C.teal }]}
                >
                  <Ionicons name="school-outline" size={20} color={C.onTeal} />
                  <View style={{ flex: 1 }}>
                    <Text style={[s.modalBtnLabel, { color: C.onTeal }]}>Practice MCQs</Text>
                    <Text style={[s.modalBtnCount, { color: C.onTeal + 'B3' }]}>{selectedSystem!.mcq_count.toLocaleString()} questions</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={C.onTeal} />
                </TouchableOpacity>
              )}

              {(selectedSystem?.flashcard_count ?? 0) > 0 && (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => {
                    setSelectedSystem(null)
                    router.push({ pathname: '/(app)/practice/flashcards', params: { startTopic: selectedSystem!.topic, from: 'search' } } as any)
                  }}
                  style={[s.modalBtn, { backgroundColor: C.coral }]}
                >
                  <Ionicons name="layers-outline" size={20} color={C.onTeal} />
                  <View style={{ flex: 1 }}>
                    <Text style={[s.modalBtnLabel, { color: C.onTeal }]}>Practice Flashcards</Text>
                    <Text style={[s.modalBtnCount, { color: C.onTeal + 'B3' }]}>{selectedSystem!.flashcard_count.toLocaleString()} cards</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={C.onTeal} />
                </TouchableOpacity>
              )}

              {(selectedSystem?.case_count ?? 0) > 0 && (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => {
                    setSelectedSystem(null)
                    router.push({ pathname: '/(app)/practice/cases', params: { startTopic: selectedSystem!.topic, from: 'search' } } as any)
                  }}
                  style={[s.modalBtn, { backgroundColor: C.amber }]}
                >
                  <Ionicons name="clipboard-outline" size={20} color={C.onTeal} />
                  <View style={{ flex: 1 }}>
                    <Text style={[s.modalBtnLabel, { color: C.onTeal }]}>Practice Cases</Text>
                    <Text style={[s.modalBtnCount, { color: C.onTeal + 'B3' }]}>{selectedSystem!.case_count.toLocaleString()} cases</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={C.onTeal} />
                </TouchableOpacity>
              )}

              {(selectedSystem?.mcq_count ?? 0) === 0 && (selectedSystem?.flashcard_count ?? 0) === 0 && (selectedSystem?.case_count ?? 0) === 0 && (
                <View style={[s.modalBtn, { backgroundColor: C.surface2 }]}>
                  <Text style={[s.modalBtnLabel, { color: C.textFaint }]}>No content yet for this system</Text>
                </View>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 14, paddingBottom: 12, borderBottomWidth: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 11 },
  input: { flex: 1, fontSize: 15, fontFamily: 'Nunito_600SemiBold' },
  sectionLabel: { fontSize: 11, fontFamily: 'Nunito_800ExtraBold', letterSpacing: 0.8, marginTop: 20, marginBottom: 10, paddingHorizontal: 18 },
  typeChip: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1.5 },
  typeChipText: { fontSize: 13, fontFamily: 'Nunito_800ExtraBold' },
  resultActions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  bmBtn: { width: 38, height: 38, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  openBtn: { flex: 1, paddingVertical: 10, borderRadius: 999, alignItems: 'center' },
  openBtnText: { fontSize: 13, fontFamily: 'Nunito_800ExtraBold' },
  quickPicks: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16 },
  quickChip: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1 },
  quickChipText: { fontSize: 13, fontFamily: 'Nunito_700Bold' },
  systemRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 18, borderBottomWidth: 1 },
  systemIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  systemName: { fontSize: 15, fontFamily: 'Nunito_700Bold', marginBottom: 2 },
  systemCounts: { fontSize: 12, fontFamily: 'Nunito_600SemiBold' },

  matchingSystems: { borderBottomWidth: 1 },
  systemChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1 },
  systemChipIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  systemChipName: { fontSize: 13, fontFamily: 'Nunito_700Bold' },
  systemChipCounts: { fontSize: 11, fontFamily: 'Nunito_600SemiBold' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 },
  emptyTitle: { fontSize: 18, fontFamily: 'Nunito_800ExtraBold', marginBottom: 6 },
  emptySub: { fontSize: 14, fontFamily: 'Nunito_600SemiBold' },
  card: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  typeBadge: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 999 },
  typeBadgeText: { fontSize: 11, fontFamily: 'Nunito_700Bold' },
  topic: { flex: 1, fontSize: 12, fontFamily: 'Nunito_600SemiBold' },
  stem: { fontSize: 14, fontFamily: 'Nunito_700Bold', lineHeight: 21 },
  expandedContent: { marginTop: 12, gap: 8 },
  opt: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 10, borderRadius: 10 },
  optKey: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  optKeyText: { fontSize: 12, fontFamily: 'Nunito_800ExtraBold' },
  optText: { fontSize: 13, fontFamily: 'Nunito_600SemiBold', flex: 1, lineHeight: 19 },
  explain: { borderRadius: 10, padding: 12, marginTop: 4 },
  explainTitle: { fontSize: 13, fontFamily: 'Nunito_800ExtraBold', marginBottom: 5 },
  explainText: { fontSize: 13, fontFamily: 'Nunito_600SemiBold', lineHeight: 19 },

  // Case cards
  caseCard: { borderRadius: 16, borderWidth: 1, padding: 14, marginHorizontal: 16, marginBottom: 12 },
  caseHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  caseDiff: { fontSize: 11, fontFamily: 'Nunito_700Bold', textTransform: 'capitalize' },
  caseTitleText: { fontSize: 14, fontFamily: 'Nunito_800ExtraBold', marginBottom: 6 },
  caseVignette: { fontSize: 13, fontFamily: 'Nunito_600SemiBold', lineHeight: 19 },
  caseCta: { marginTop: 10, alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999 },
  caseCtaText: { fontSize: 12, fontFamily: 'Nunito_800ExtraBold' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 40 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 18 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  modalIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: 18, fontFamily: 'Nunito_900Black' },
  modalSub: { fontSize: 13, fontFamily: 'Nunito_600SemiBold', marginTop: 2 },
  modalBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 16 },
  modalBtnLabel: { fontSize: 15, fontFamily: 'Nunito_800ExtraBold' },
  modalBtnCount: { fontSize: 12, fontFamily: 'Nunito_600SemiBold', marginTop: 2 },
})
