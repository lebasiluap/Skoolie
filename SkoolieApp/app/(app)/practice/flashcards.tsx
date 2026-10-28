import { useCallback, useEffect, useLayoutEffect, useState, useRef } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Animated, Easing, PanResponder, AppState, AccessibilityInfo, Alert, useWindowDimensions } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { router, useLocalSearchParams, useNavigation, useFocusEffect } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { MAX_CONTENT } from '@/hooks/useResponsive'
import { useFocusSessionWhile } from '@/hooks/useFocusSession'
import { Entrance } from '@/components/ui/Entrance'
import { useTheme } from '@/hooks/useTheme'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { TopicIcon } from '@/components/ui/TopicIcon'
import { TopBar } from '@/components/ui/TopBar'
import { SkeletonList } from '@/components/ui/Skeleton'
import { FilterBanner } from '@/components/ui/FilterBanner'
import ReportButton from '@/components/ui/ReportButton'
import { NogginHead } from '@/components/mascots/NogginHead'
import { MascotAnimator } from '@/components/mascots/MascotAnimator'
import { topicColor } from '@/constants/topics'
import type { TopicRow } from '@/types'
import { useFilters } from '@/contexts/FiltersContext'
import { useCollapsePracticeStack } from '@/hooks/usePracticeStack'
import { withFilterAnim, withAccordionAnim } from '@/lib/anim'
import { orderByInterestAndUnseen } from '@/lib/interests'
import { playSound } from '@/lib/sounds'
import { usePracticeData } from '@/contexts/PracticeDataContext'
import { readWithDeadline } from '@/lib/readWithDeadline'
import { createDeckLoadGuard } from '@/lib/deckLoadGuard'
import { captureCardSwipe, cardSwipeGrade, cardSwipeTranslation, createCardSwipeGuard } from '@/lib/flashcardSwipe'
import { useVerifiedPractice } from '@/hooks/useVerifiedPractice'
import { VerifiedSessionBusy } from '@/components/ui/VerifiedSessionBusy'
import { flashcardCheckpointKey, parseFlashcardCheckpoint, type FlashcardCheckpoint } from '@/lib/flashcardCheckpoint'

const CAT_ORDER = ['Anatomy & Physiology', 'Pharmacology', 'Pathophysiology', 'Clinicals']

const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5)
/** Orders a pool so unseen cards come first; seen ones backfill so the deck still fills. */
function orderByUnseen<T extends { id: string }>(pool: T[], seen: Set<string>): T[] {
  if (seen.size === 0) return shuffle(pool)
  return [...shuffle(pool.filter(x => !seen.has(x.id))), ...shuffle(pool.filter(x => seen.has(x.id)))]
}

type Screen = 'topics' | 'quiz' | 'results'

interface Flashcard {
  // back = the answer (correct_answer). note = supplementary explanation,
  // shown in Noggin's bubble. Comprehensive cards have no correct_answer —
  // there the explanation IS the answer, so it becomes `back` and there's
  // no separate note.
  id: string; front: string; back: string; note: string | null; topic: string; category: string | null; subtopic: string | null; difficulty: string | null
}

export default function FlashcardsScreen() {
  useCollapsePracticeStack()
  const C = useTheme()
  const insets = useSafeAreaInsets()
  const { height: screenH, width: screenW } = useWindowDimensions()
  const { user, profile, refreshProfile } = useAuth()
  const verified = useVerifiedPractice(user?.id)
  const [resumeChecked,setResumeChecked]=useState(false)
  const checkpointOwner=useRef(user?.id);checkpointOwner.current=user?.id
  const graded = useRef(new Set<string>())
  const practiceData = usePracticeData()
  const { cardIds, smartStart, sessionKey, from, startTopic } = useLocalSearchParams<{ cardIds?: string; smartStart?: string; sessionKey?: string; from?: string; startTopic?: string }>()
  const navigation = useNavigation<any>()
  // Back returns to the origin; dashboard launches also reset the Practice tab to its hub.
  const goBack = () => {
    if (from === 'analytics') {
      router.navigate('/(app)/progress/analytics' as any)
      setTimeout(() => navigation.reset({ index: 0, routes: [{ name: 'index' as never }] }), 0)
    } else if (from === 'search') {
      router.navigate('/(app)/search' as any)
      setTimeout(() => navigation.reset({ index: 0, routes: [{ name: 'index' as never }] }), 0)
    } else if (from === 'dashboard') {
      router.navigate('/(app)/dashboard' as any)
      setTimeout(() => navigation.reset({ index: 0, routes: [{ name: 'index' as never }] }), 0)
    } else {
      router.navigate('/(app)/practice' as any)
    }
  }

  // Single-card flows (bookmark- or search-opened) return to where they came from AND clear
  // the Practice tab's stack back to its hub, so tapping Practice later doesn't resurface the card.
  const backToBookmarks = () => {
    if (from === 'search') router.navigate('/(app)/search' as any)
    else if (from === 'history') router.navigate('/(app)/history' as any)
    else router.navigate({ pathname: '/(app)/bookmarks', params: { from } } as any)
    setTimeout(() => navigation.reset({ index: 0, routes: [{ name: 'index' as never }] }), 0)
  }
  const autoStarted = useRef(false)
  const prevSessionKeyRef = useRef<string | undefined>(undefined)
  const sessionSavedRef = useRef(false)   // prevents double-save; reset on every new deck start
  const fromBookmarksRef = useRef(false)  // bookmark-review decks don't count toward streak/XP/sessions
  const isRetakeRef = useRef(false)        // "Study again" replay: saves session + XP, but NOT streak
  const isReviewMissedRef = useRef(false)  // "Review missed" re-drill: practice only — no session, XP, or streak

  const [screen, setScreen] = useState<Screen>('topics')
  // Focused session — hide app chrome (tab bar) while the deck is running
  useFocusSessionWhile(screen === 'quiz')

  // Filters collapsed by default — the topic list is the browse screen's job
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Jump Back In lands here with startTopic — scroll the expanded topic into
  // view once its card reports layout (it can sit below the fold).
  const topicsScrollRef = useRef<ScrollView>(null)
  const scrolledToStartTopic = useRef(false)
  const scrollToStartTopic = (topic: string, y: number) => {
    if (topic !== startTopic || scrolledToStartTopic.current) return
    scrolledToStartTopic.current = true
    setTimeout(() => topicsScrollRef.current?.scrollTo({ y: Math.max(0, y - 8), animated: true }), 300)
  }
  const [topicRows, setTopicRows] = useState<TopicRow[]>([])
  const [cards, setCards] = useState<Flashcard[]>([])
  const [originalCards, setOriginalCards] = useState<Flashcard[]>([])  // full deck, for "Study again"
  const [missedCards, setMissedCards] = useState<Flashcard[]>([])      // cards marked "still learning", for "Review missed"
  const [cardIndex, setCardIndex] = useState(0)
  const [loadingTopics, setLoadingTopics] = useState(true)
  const [topicsError, setTopicsError] = useState(false)
  const topicRequest = useRef(0)
  const [loadingCards, setLoadingCards] = useState(false)
  const [cardsError, setCardsError] = useState<string | null>(null)
  const deckGuard = useRef(createDeckLoadGuard()).current
  const retryDeck = useRef<() => void>(() => {})
  useEffect(() => () => { deckGuard.invalidate() }, [user?.id,deckGuard])
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null)
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [answeredByTopic, setAnsweredByTopic] = useState<Record<string, number>>({})
  const [gotIt, setGotIt] = useState(0)
  const [missed, setMissed] = useState(0)
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set())
  const { fcFilter, setFcFilter } = useFilters()
  const difficulty = fcFilter.difficulty
  const sessionSize = fcFilter.sessionSize
  const allYears = fcFilter.allYears
  const setDifficulty = (v: 'all' | 'easy' | 'medium' | 'hard') => setFcFilter(f => ({ ...f, difficulty: v }))
  const setSessionSize = (v: number) => setFcFilter(f => ({ ...f, sessionSize: v }))
  const setAllYears = (v: boolean) => setFcFilter(f => ({ ...f, allYears: v }))

  // Remember last session params so "New Deck" can re-run with same filters
  const [lastTopic, setLastTopic] = useState<string | null>(null)
  const [lastCategory, setLastCategory] = useState<string | undefined>(undefined)
  const [lastSubtopic, setLastSubtopic] = useState<string | undefined>(undefined)
  const [lastWasSurprise, setLastWasSurprise] = useState(false)

  // Flip animation
  const flipAnim = useRef(new Animated.Value(0)).current

  // Swipe-to-grade: once the answer is revealed, gently slide/fade the card
  // right = Got it, left = Didn't know. Buttons remain for tap users.
  const swipeX = useRef(new Animated.Value(0)).current
  const cardOpacity=useRef(new Animated.Value(1)).current
  const swipeTransition=useRef(false)
  const reducedMotion=useRef(false)
  const swipeFocused=useRef(true)
  const swipeForeground=useRef(AppState.currentState==='active')
  const swipeGuard=useRef(createCardSwipeGuard()).current
  const [swiping,setSwiping]=useState(false)
  const swipeContext=useRef<{id:string|null;enabled:boolean;width:number}>({id:null,enabled:false,width:screenW})
  const gesture=useRef<{token:number;id:string}|null>(null)
  const flipInFlight=useRef(false)
  const flipGeneration=useRef(0)
  const flipTimer=useRef<ReturnType<typeof setTimeout>|null>(null)
  const nextRef = useRef<(didKnow: boolean, expectedId?:string) => Promise<boolean>>(async () => false)
  function resetSwipe(updateState=true) {
    swipeGuard.invalidate();gesture.current=null
    swipeX.stopAnimation();swipeX.setValue(0)
    cardOpacity.stopAnimation();cardOpacity.setValue(1);swipeTransition.current=false
    if(updateState)setSwiping(false)
  }
  function canCapture(dx:number,dy:number,touches:number) {
    return swipeFocused.current&&swipeForeground.current&&swipeContext.current.enabled&&!flipInFlight.current&&!swipeGuard.busy()&&captureCardSwipe(dx,dy,touches)
  }
  const swipePan = useRef(PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_e,g)=>canCapture(g.dx,g.dy,g.numberActiveTouches),
    onMoveShouldSetPanResponder: (_e,g)=>canCapture(g.dx,g.dy,g.numberActiveTouches),
    onPanResponderGrant: () => {
      const {id,enabled}=swipeContext.current
      if(!id||!enabled||flipInFlight.current||!swipeFocused.current||!swipeForeground.current)return
      const token=swipeGuard.begin(id)
      if(token===null)return
      gesture.current={token,id};swipeX.stopAnimation();setSwiping(true)
    },
    onPanResponderMove: (_e,g)=>{
      if(gesture.current&&g.numberActiveTouches===1)swipeX.setValue(reducedMotion.current?0:cardSwipeTranslation(g.dx))
      else resetSwipe()
    },
    onPanResponderRelease: (_e, g) => {
      const active=gesture.current
      if(!active||!swipeGuard.current(active.token,active.id))return
      const commit = cardSwipeGrade(g.dx,g.dy,g.vx)
      if (commit === null) {
        Animated.timing(swipeX, { toValue: 0, duration: reducedMotion.current?0:180, easing:Easing.out(Easing.cubic), useNativeDriver: true }).start(()=>{
          if(swipeGuard.current(active.token,active.id))resetSwipe()
        })
        return
      }
      swipeTransition.current=!reducedMotion.current
      Animated.parallel([
        Animated.timing(swipeX,{toValue:reducedMotion.current?0:commit?32:-32,duration:reducedMotion.current?0:180,easing:Easing.out(Easing.cubic),useNativeDriver:true}),
        Animated.timing(cardOpacity,{toValue:reducedMotion.current?1:0,duration:reducedMotion.current?0:160,easing:Easing.inOut(Easing.ease),useNativeDriver:true}),
      ]).start(({finished}) => {
        if(!swipeGuard.current(active.token,active.id))return
        if(!finished||swipeContext.current.id!==active.id){resetSwipe();return}
        void nextRef.current(commit,active.id).then(advanced=>{
          // Successful transitions are revealed only after the next card commits.
          if(!advanced&&swipeGuard.current(active.token,active.id))resetSwipe()
        }).catch(()=>{
          if(swipeGuard.current(active.token,active.id))resetSwipe()
        })
      })
    },
    onPanResponderTerminationRequest:()=>false,
    onPanResponderTerminate:()=>resetSwipe(),
    onShouldBlockNativeResponder:()=>true,
  })).current
  const [flipped, setFlipped] = useState(false)
  const [revealed, setRevealed] = useState(false)  // true once answer shown; stays true even if flipped back
  const [isFlipping, setIsFlipping] = useState(false)
  swipeContext.current={id:cards[cardIndex]?.id??null,width:screenW,
    enabled:screen==='quiz'&&revealed&&!isFlipping&&!verified.saving&&!loadingCards}
  useLayoutEffect(()=>{
    const fadeIn=swipeTransition.current&&!reducedMotion.current
    resetSwipe();flipGeneration.current++;flipInFlight.current=false
    if(flipTimer.current)clearTimeout(flipTimer.current)
    flipAnim.stopAnimation();flipAnim.setValue(0)
    setRevealed(false);setFlipped(false);setIsFlipping(false)
    if(fadeIn){
      cardOpacity.setValue(0)
      Animated.timing(cardOpacity,{toValue:1,duration:180,easing:Easing.out(Easing.cubic),useNativeDriver:true}).start()
    }
  },[cards,cardIndex,screen,user?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>{
    let active=true
    void AccessibilityInfo.isReduceMotionEnabled().then(value=>{if(active)reducedMotion.current=value}).catch(()=>{})
    const sub=AccessibilityInfo.addEventListener('reduceMotionChanged',value=>{reducedMotion.current=value})
    return()=>{active=false;sub.remove()}
  },[])
  useFocusEffect(useCallback(()=>{
    swipeFocused.current=true
    return()=>{swipeFocused.current=false;resetSwipe()}
  },[])) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>{
    const sub=AppState.addEventListener('change',state=>{
      swipeForeground.current=state==='active'
      if(state!=='active')resetSwipe()
    })
    return()=>sub.remove()
  },[]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>()=>{
    resetSwipe(false);flipGeneration.current++
    if(flipTimer.current)clearTimeout(flipTimer.current)
    flipAnim.stopAnimation()
  },[]) // eslint-disable-line react-hooks/exhaustive-deps

  // Card height: locked to max(front, back) so it never resizes during flip
  const [frontH, setFrontH] = useState(0)
  const [backH, setBackH] = useState(0)

  useEffect(()=>{
    if(!user?.id||!profile)return
    const uid=user.id
    let active=true
    const check=async()=>{
      try{
        const raw=await AsyncStorage.getItem(flashcardCheckpointKey(uid))
        if(!active||checkpointOwner.current!==uid)return
        const saved=parseFlashcardCheckpoint(raw,uid)
        if(!saved){if(raw)await AsyncStorage.removeItem(flashcardCheckpointKey(uid));if(active)setResumeChecked(true);return}
        Alert.alert('Resume your flashcards?',`${Object.keys(saved.answers).length} of ${saved.itemIds.length} cards saved. We’ll check that this deck is still available before resuming.`,[
          {text:'Start fresh',style:'destructive',onPress:()=>{
            if(!active)return
            void AsyncStorage.removeItem(flashcardCheckpointKey(uid)).then(()=>{if(active)setResumeChecked(true)}).catch(()=>{if(active)void check()})
          }},
          {text:'Resume',onPress:()=>{if(active){autoStarted.current=true;prevSessionKeyRef.current=sessionKey;setResumeChecked(true);void resumeDeck(saved)}}},
        ],{cancelable:false})
      }catch{if(active)Alert.alert('Saved deck unavailable','We couldn’t read your saved position. Retry to avoid losing your progress.',[{text:'Retry',onPress:()=>{if(active)void check()}}],{cancelable:false})}
    }
    setResumeChecked(false);void check()
    return()=>{active=false}
  },[user?.id,!!profile]) // same-user profile refreshes never restart a deck

  async function saveCheckpoint(){
    const uid=user?.id,snapshot=verified.checkpoint()
    if(!uid||!snapshot)throw new Error('No resumable deck')
    await AsyncStorage.setItem(flashcardCheckpointKey(uid),JSON.stringify({version:1,userId:uid,...snapshot}))
  }
  const mapIssuedCards=(rows:Record<string,unknown>[]):Flashcard[]=>rows.map(r=>({id:r.id as string,front:r.question_text as string,
    back:String(r.correct_answer||r.explanation||''),note:r.correct_answer?r.explanation as string|null:null,
    topic:r.topic as string,category:r.category as string|null,subtopic:r.subtopic as string|null,difficulty:r.difficulty as string|null}))

  async function resumeDeck(saved:FlashcardCheckpoint){
    const request=deckGuard.start()
    if(request===null)return
    setLoadingCards(true);setScreen('quiz');setCardsError(null)
    retryDeck.current=()=>void resumeDeck(saved)
    try{
      const issued=await verified.prepare('flashcard',saved.itemIds,true,undefined,saved)
      if(!deckGuard.current(request))return
      if(!issued)throw new Error('Deck no longer available')
      const deck=mapIssuedCards(issued),done=Object.keys(saved.answers)
      fromBookmarksRef.current=false;isReviewMissedRef.current=false;isRetakeRef.current=false
      setCards(deck);setOriginalCards(deck);graded.current=new Set(done)
      setCardIndex(Math.min(done.length,deck.length-1))
      setGotIt(done.filter(id=>saved.answers[id]).length)
      setMissed(done.filter(id=>!saved.answers[id]).length)
      setMissedCards(deck.filter(c=>saved.answers[c.id]===false))
      if(done.length===deck.length){
        const finish=async()=>{
          const receipt=await verified.complete(()=>void finish())
          if(!deckGuard.current(request))return
          if(!receipt){setCardsError('All ratings are saved. Retry to confirm this same session safely.');return}
          await AsyncStorage.removeItem(flashcardCheckpointKey(saved.userId)).catch(()=>{})
          setCardsError(null);setScreen('results');void refreshProfile()
        }
        retryDeck.current=()=>void finish()
        await finish()
      }
    }catch{if(deckGuard.current(request))setCardsError('This saved deck could not be revalidated. Retry when connected. Changed, expired or quarantined cards cannot be resumed.')}
    finally{if(deckGuard.finish(request))setLoadingCards(false)}
  }

  useEffect(() => {
    if (!profile||!resumeChecked) return

    // Each Practice tap from bookmarks passes a unique sessionKey (Date.now()).
    // When it changes, reset everything so a cached screen re-runs the quiz fresh.
    if (sessionKey && sessionKey !== prevSessionKeyRef.current) {
      prevSessionKeyRef.current = sessionKey
      sessionSavedRef.current = false
      autoStarted.current = false
      setScreen('quiz')
      setLoadingCards(true)
      setCards([])
      setCardIndex(0); setGotIt(0); setMissed(0); setMissedCards([])
      flipAnim.setValue(0); setFlipped(false); setRevealed(false); setIsFlipping(false)
    }

    // One-shot auto-start — run alongside loadTopics so topics are ready
    // if the user exits back to the topic screen
    if (!autoStarted.current) {
      if (cardIds) {
        autoStarted.current = true
        let ids: string[] = []
        try { ids = JSON.parse(cardIds as string) } catch { ids = [] }
        loadCardsByIds(ids)
      } else if (startTopic) {
        autoStarted.current = true
        setExpandedTopic(startTopic)   // land on the topic list with this topic open (don't auto-start)
      } else if (smartStart === '1') {
        autoStarted.current = true
        surpriseMe()
      }
    }
    loadTopics()
    return () => { topicRequest.current++ }
  }, [practiceData, profile?.profession, profile?.access_key, difficulty, sessionKey,resumeChecked])

  // The "you finished" fanfare — same sound at every results screen, win or lose.
  useEffect(() => { if (screen === 'results') playSound('complete') }, [screen])

  // Completion is confirmed by finish_verified_session BEFORE entering results.
  // Self-ratings remain zero-XP. There is intentionally no legacy save fallback.

  async function loadTopics() {
    if (!profile) return
    const request = ++topicRequest.current
    const cached = practiceData.peekTopics('flashcard', { difficulty })
    setLoadingTopics(!cached)
    setTopicsError(false)
    setTopicRows(cached ?? [])
    try {
      const rows = await practiceData.getTopics('flashcard', { difficulty })
      if (request !== topicRequest.current) return
      setTopicRows(rows)
    } catch {
      if (request === topicRequest.current && !cached) setTopicsError(true)
      return
    } finally {
      if (request === topicRequest.current) setLoadingTopics(false)
    }
    // Coverage per topic — history holds one row per distinct card reviewed
    if (user) {
      const { data: hist } = await readWithDeadline(signal => supabase.from('user_question_history')
        .select('topic').eq('user_id', user.id).eq('question_type', 'flashcard').limit(10000).abortSignal(signal), 8_000)
        .catch(() => ({ data: null }))
      if (request !== topicRequest.current) return
      const byTopic: Record<string, number> = {}
      for (const r of (hist ?? []) as any[]) if (r.topic) byTopic[r.topic] = (byTopic[r.topic] ?? 0) + 1
      setAnsweredByTopic(byTopic)
    }
  }

  /** Seen flashcard ids for this user — empty when repeats are allowed (→ no exclusion). */
  async function fetchSeenFcIds(): Promise<Set<string>> {
    if (!user || profile?.allow_repeat_questions) return new Set()
    const { data, error } = await readWithDeadline(signal => supabase
      .from('user_question_history')
      .select('question_id')
      .eq('user_id', user.id)
      .eq('question_type', 'flashcard').abortSignal(signal), 4000)
      .catch(() => ({data:null,error:null}))
    if (error) return new Set()
    return new Set((data ?? []).map((r: any) => r.question_id as string))
  }

  async function readCardPool(name: string, args: Record<string, unknown>) {
    const {data,error} = await readWithDeadline(signal => supabase.rpc(name,args).abortSignal(signal))
    if (error) throw error
    return (data ?? []) as any[]
  }

  // One load at a time. Every required request is bounded, optional bookmark
  // reads never block a deck, and stale responses cannot replace a newer deck.
  async function loadDeck(read: () => Promise<any[]>, order: (rows:any[], seen:Set<string>) => any[], bookmarkReview=false) {
    if (!profile) return
    const request=deckGuard.start()
    if(request===null)return
    resetSwipe()
    retryDeck.current=() => { void loadDeck(read,order,bookmarkReview) }
    setCardsError(null);setLoadingCards(true);setScreen('quiz');setCards([])
    setCardIndex(0);setGotIt(0);setMissed(0);setMissedCards([])
    flipAnim.setValue(0);setFlipped(false);setRevealed(false);setIsFlipping(false)
    sessionSavedRef.current=false;fromBookmarksRef.current=bookmarkReview
    isRetakeRef.current=false;isReviewMissedRef.current=false
    try {
      const [pool,seen]=await Promise.all([read(),fetchSeenFcIds()])
      if(!deckGuard.current(request))return
      if(!pool.length) {
        setCardsError('No cleared flashcards match these filters. Go back and try All years, another difficulty or another topic.')
        return
      }
      const issued=await bindCards(order(pool,seen).slice(0,60),!bookmarkReview)
      if(!deckGuard.current(request))return
      if(!issued?.length) { setCardsError('The deck could not start. Check your connection and retry. Unavailable or quarantined cards remain blocked.');return }
      const mapped=issued.map((r:any)=>({id:r.id,front:r.question_text,
        back:(r.correct_answer && String(r.correct_answer).trim()) ? r.correct_answer : (r.explanation ?? ''),
        note:(r.correct_answer && String(r.correct_answer).trim()) ? r.explanation : null,
        topic:r.topic,category:r.category,subtopic:r.subtopic,difficulty:r.difficulty}))
      setCards(mapped);setOriginalCards(mapped);setBookmarked(new Set())
      if(user) void readWithDeadline(signal => supabase.from('bookmarks').select('question_id')
        .eq('user_id',user.id).abortSignal(signal),4000).then(({data,error})=>{
          if(!error && deckGuard.current(request))setBookmarked(new Set((data??[]).map(b=>b.question_id)))
        }).catch(()=>{})
    } catch {
      if(deckGuard.current(request))setCardsError('Flashcards could not load. Check your connection and retry. Your saved progress has not changed.')
    } finally {
      if(deckGuard.finish(request))setLoadingCards(false)
    }
  }

  async function startCards(topic: string, category?: string, subtopic?: string) {
    if (!profile) return
    setLastTopic(topic); setLastCategory(category); setLastSubtopic(subtopic); setLastWasSurprise(false)
    await loadDeck(() => readCardPool('get_questions_by_topic', {
      p_profession: profile.profession,
      p_question_type: 'flashcard',
      p_topic: topic,
      p_category: category ?? null,
      p_subtopic: subtopic ?? null,
      p_difficulty: difficulty !== 'all' ? difficulty : null,
      p_year: profile.study_year && !allYears ? profile.study_year : null,
      p_access_key: profile.access_key ?? null,
      p_limit: sessionSize * 3,
    }), (pool,seen)=>orderByUnseen(pool,seen).slice(0,sessionSize))
  }

  async function surpriseMe() {
    if (!profile) return
    setLastTopic(null); setLastCategory(undefined); setLastSubtopic(undefined); setLastWasSurprise(true)

    // Surprise me = truly random across topics (server-side), within the set filters.
    await loadDeck(() => readCardPool('get_random_flashcards', {
      p_profession: profile.profession,
      p_limit: sessionSize * 3,
      p_difficulty: difficulty !== 'all' ? difficulty : null,
      p_access_key: profile.access_key ?? null,
      p_year: profile.study_year && !allYears ? profile.study_year : null,
    }), (pool,seen)=>orderByInterestAndUnseen(pool,profile.interests,seen).slice(0,sessionSize))
  }

  async function loadCardsByIds(ids: string[]) {
    if (!profile) return
    await loadDeck(() => readCardPool('get_questions_by_ids',{p_ids:ids,p_limit:200}),pool=>shuffle(pool),true)
  }

  async function toggleBookmark(cardId: string) {
    if (!user) return
    if (bookmarked.has(cardId)) {
      await supabase.from('bookmarks').delete().eq('user_id', user.id).eq('question_id', cardId)
      setBookmarked(b => { const s = new Set(b); s.delete(cardId); return s })
    } else {
      await supabase.from('bookmarks').insert({ user_id: user.id, question_id: cardId })
      setBookmarked(b => new Set(b).add(cardId))
    }
  }

  function flip() {
    if (flipInFlight.current||swipeGuard.busy()||verified.saving) return
    playSound('flip')
    const toValue = flipped ? 0 : 1
    setIsFlipping(true)
    flipInFlight.current=true
    const generation=++flipGeneration.current
    Animated.timing(flipAnim, {
      toValue,
      duration: 520,
      useNativeDriver: true,
      easing: Easing.inOut(Easing.ease),
    }).start(({finished}) => {
      if(generation!==flipGeneration.current)return
      flipInFlight.current=false
      setIsFlipping(false)
      if (finished&&!flipped)setRevealed(true)
    })
    // Switch card face at midpoint (when edge-on)
    flipTimer.current=setTimeout(()=>{if(generation===flipGeneration.current)setFlipped(f=>!f)},260)
  }

  async function next(didKnow: boolean,expectedId?:string):Promise<boolean> {
    // Record that this card has been reviewed (powers "Allow repeat questions").
    const card = cards[cardIndex]
    const owner=user?.id
    if (!card || !revealed || flipInFlight.current || verified.saving || graded.current.has(card.id)) return false
    if(expectedId ? card.id!==expectedId : swipeGuard.busy())return false
    if (!verified.answer(card.id, didKnow)) return false
    // A synchronous guard covers a swipe and button arriving before a render.
    graded.current.add(card.id)
    if(!fromBookmarksRef.current&&!isReviewMissedRef.current){
      try{await saveCheckpoint()}
      catch{
        graded.current.delete(card.id)
        Alert.alert('Position not saved','We couldn’t save your place on this device. Retry with the same rating before moving on.',[{text:'Retry',onPress:()=>void next(didKnow)}])
        return false
      }
      if(checkpointOwner.current!==owner||swipeContext.current.id!==card.id)return false
    }
    if (cardIndex + 1 >= cards.length && !fromBookmarksRef.current && !isReviewMissedRef.current) {
      const result = await verified.complete(() => { graded.current.delete(card.id); void next(didKnow) })
      if (!result) { graded.current.delete(card.id); return false }
      sessionSavedRef.current = true
      if(checkpointOwner.current!==owner||swipeContext.current.id!==card.id)return false
      if(owner)await AsyncStorage.removeItem(flashcardCheckpointKey(owner)).catch(()=>{})
      void refreshProfile()
    }
    if (didKnow) setGotIt(k => k + 1)
    else { setMissed(m => m + 1); if (card) setMissedCards(prev => [...prev, card]) }
    flipAnim.setValue(0)
    setFlipped(false)
    setRevealed(false)
    setIsFlipping(false)
    if (cardIndex + 1 >= cards.length) setScreen('results')
    else setCardIndex(i => i + 1)
    return true
  }

  nextRef.current = next

  // Replay the full deck — saves a session + XP but does NOT advance the streak.
  async function studyAgain() {
    const deck = await reloadCards(originalCards.length ? originalCards : cards)
    if (!deck) return
    sessionSavedRef.current = false; isRetakeRef.current = true; isReviewMissedRef.current = false
    setCards(deck)
    setCardIndex(0); setGotIt(0); setMissed(0); setMissedCards([])
    flipAnim.setValue(0); setFlipped(false); setRevealed(false); setIsFlipping(false)
    setScreen('quiz')
  }

  // Re-drill only the cards marked "still learning" — pure practice (no session, XP, or streak).
  async function reviewMissed() {
    if (missedCards.length === 0) return
    const deck = await reloadCards(missedCards,false)
    if (!deck) return
    sessionSavedRef.current = false; isReviewMissedRef.current = true; isRetakeRef.current = false
    setCards(deck)
    setCardIndex(0); setGotIt(0); setMissed(0); setMissedCards([])
    flipAnim.setValue(0); setFlipped(false); setRevealed(false); setIsFlipping(false)
    setScreen('quiz')
  }

  async function bindCards(pool: { id: string }[],persist=true) {
    resetSwipe()
    const items = await verified.prepare('flashcard', pool.slice(0, 60).map(c => c.id))
    if (items){graded.current.clear();if(persist)await saveCheckpoint()}
    return items
  }

  async function reloadCards(deck: Flashcard[],persist=true) {
    let rows:Record<string,unknown>[]|null
    try{rows=await bindCards(shuffle(deck),persist)}
    catch{Alert.alert('Deck could not start','We couldn’t save this deck’s recovery checkpoint. Try again before starting.');return null}
    return rows?.map(r => ({ id: r.id as string, front: r.question_text as string,
      back: String(r.correct_answer || r.explanation || ''),
      note: r.correct_answer ? r.explanation as string | null : null,
      topic: r.topic as string, category: r.category as string | null,
      subtopic: r.subtopic as string | null, difficulty: r.difficulty as string | null })) ?? null
  }

  // Single-card fold: rotateY 0° → 90° → 0° with content swap at midpoint
  const rotateY = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '90deg', '0deg'],
  })

  // Strip "Flashcard:" / "Flash card:" prefix inserted during content generation
  // Data hygiene guards: some imports carried literal "Front:"/"Back:"/
  // "Flashcard:" prefixes (the DB was cleaned July 2026, these protect
  // against regressions from future question-bank imports).
  const cleanBack = (text: string) => text.replace(/^\s*back\s*:\s*/i, '').replace(/^flash\s*card[s]?[:\s]+/i, '').trim()
  const cleanFront = (text: string) => text.replace(/^\s*front\s*:\s*/i, '').trim()

  // Dynamic card top offset — adapts to card height so Noggin always fits below
  // Header (~104px) + action bar (~88px) + safe area = fixed chrome
  // Remaining space split: 30% above card, 70% below (card + noggin + breathing room)
  // Card fills the focused-session screen (same principle as MCQ's stretch
  // layout): at least ~45% of the free height, growing further for long text.
  const availableH = Math.max(200, screenH - 104 - 88 - insets.bottom)
  const minCardH = Math.round(availableH * 0.45)
  const cardH = Math.max(minCardH, frontH, backH)
  const cardTopOffset = Math.max(12, (availableH - cardH - 88) * 0.30)

  // ── Topics screen ──────────────────────────────────────────────────────────
  if (!resumeChecked||verified.starting || verified.saving) return <VerifiedSessionBusy saving={verified.saving} />
  if (screen === 'topics') {
    const grouped = topicRows.reduce((acc: Record<string, TopicRow[]>, r) => {
      if (!r.topic) return acc
      if (!acc[r.topic]) acc[r.topic] = []
      acc[r.topic].push(r)
      return acc
    }, {})

    const totalCards = topicRows.reduce((s, r) => s + r.count, 0)
    const DIFF_OPTS = [
      { id: 'all' as const,    label: 'All levels', activeBg: C.text,    activeFg: C.bg },
      { id: 'easy' as const,   label: 'Easy',       activeBg: C.green,   activeFg: C.onTeal },
      { id: 'medium' as const, label: 'Medium',     activeBg: C.amber,   activeFg: C.onTeal },
      { id: 'hard' as const,   label: 'Hard',       activeBg: C.red,     activeFg: C.onTeal },
    ]

    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <TopBar title="Practice" />
        <View style={[s.header, { paddingTop: 14, backgroundColor: C.surface, borderBottomColor: C.border }]}>
          <TouchableOpacity
            onPress={goBack}
            style={[s.iconBtn, { backgroundColor: C.surface2, borderColor: C.border }]}>
            <Ionicons name="arrow-back" size={20} color={C.textSoft} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[s.headerTitle, { color: C.text }]}>Flashcards</Text>
            {!loadingTopics && <Text style={[s.headerSub, { color: C.textFaint }]}>{totalCards.toLocaleString()} cards available</Text>}
          </View>
        </View>

        {/* Pinned: active filters survive across visits — keep them visible with one-tap clear */}
        <FilterBanner kind="fc" />
        <ScrollView ref={topicsScrollRef} contentContainerStyle={{ paddingBottom: 100, width: '100%', maxWidth: MAX_CONTENT, alignSelf: 'center' }} showsVerticalScrollIndicator={false}>
        {/* Filters — collapsed to one summary row by default (matches MCQ) */}
        <View style={[s.filterSection, { backgroundColor: C.surface, borderBottomColor: C.border, paddingTop: 0, paddingBottom: filtersOpen ? 18 : 0 }]}>
          <TouchableOpacity
            onPress={() => withAccordionAnim(() => setFiltersOpen(o => !o))}
            style={[s.filterToggle, { backgroundColor: C.tealTint, borderColor: C.teal }]}
            accessibilityRole="button"
            accessibilityState={{ expanded: filtersOpen }}
            accessibilityLabel="Session filters"
          >
            <View style={[s.filterToggleIcon, { backgroundColor: C.teal }]}>
              <Ionicons name="options" size={15} color={C.onTeal} />
            </View>
            <Text style={[s.filterToggleTitle, { color: C.teal }]}>Filters</Text>
            <Text style={[s.filterToggleSummary, { color: C.textFaint }]} numberOfLines={1}>
              {difficulty === 'all' ? 'All levels' : difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} · {sessionSize} cards{allYears ? ' · All years' : ''}
            </Text>
            <Ionicons name={filtersOpen ? 'chevron-up' : 'chevron-down'} size={17} color={C.teal} />
          </TouchableOpacity>
          {filtersOpen && (<Entrance dy={-8}>
          <Text style={[s.filterLabel, { color: C.textFaint }]}>DIFFICULTY</Text>
          <View style={s.chipRow}>
            {DIFF_OPTS.map(d => {
              const active = difficulty === d.id
              return (
                <TouchableOpacity key={d.id} onPress={() => withFilterAnim(() => setDifficulty(d.id))} activeOpacity={0.75}
                  style={[s.chip, { backgroundColor: active ? d.activeBg : C.surface2, borderColor: active ? d.activeBg : C.border }]}>
                  <Text style={[s.chipText, { color: active ? d.activeFg : C.textSoft }]}>{d.label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>

          <Text style={[s.filterLabel, { color: C.textFaint, marginTop: 14 }]}>SESSION SIZE</Text>
          <View style={s.chipRow}>
            {([5, 10, 20, 40] as const).map(n => {
              const disabled = totalCards > 0 && n > totalCards
              return (
              <TouchableOpacity key={n} disabled={disabled} onPress={() => withFilterAnim(() => setSessionSize(n))} activeOpacity={0.75}
                style={[s.chip, { backgroundColor: sessionSize === n ? C.teal : C.surface2, borderColor: sessionSize === n ? C.teal : C.border, opacity: disabled ? 0.4 : 1 }]}>
                <Text style={[s.chipText, { color: sessionSize === n ? C.onTeal : C.textSoft }]}>{n}</Text>
              </TouchableOpacity>
              )
            })}
          </View>

          {profile?.study_year ? (
            <>
              <Text style={[s.filterLabel, { color: C.textFaint, marginTop: 14 }]}>FOCUS</Text>
              <View style={s.chipRow}>
                <TouchableOpacity onPress={() => withFilterAnim(() => setAllYears(!allYears))} activeOpacity={0.75}
                  style={[s.chip, s.chipIcon, { backgroundColor: allYears ? C.text : C.surface2, borderColor: allYears ? C.text : C.border }]}>
                  <Ionicons name="calendar-outline" size={14} color={allYears ? C.bg : C.textSoft} />
                  <Text style={[s.chipText, { color: allYears ? C.bg : C.textSoft }]}>All Years</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : null}
          </Entrance>)}
        </View>

        {/* Surprise me */}
        <TouchableOpacity onPress={surpriseMe} activeOpacity={0.85}
          style={[s.surpriseBanner, { backgroundColor: C.teal, marginHorizontal: 16, marginTop: 14, marginBottom: 4 }]}>
          <Text style={[s.surpriseLeft, { color: C.onTeal }]}>🎲 Surprise me</Text>
          <Text style={[s.surpriseRight, { color: C.onTeal }]}>Random {sessionSize} cards →</Text>
        </TouchableOpacity>

        {loadingTopics ? <SkeletonList rows={7} style={{ marginHorizontal: 16, marginTop: 16 }} /> : topicsError ? (
          <TouchableOpacity onPress={loadTopics} accessibilityRole="button" accessibilityLabel="Retry flashcard topics"
            style={{ margin: 16, padding: 20, minHeight: 44, borderRadius: 20, backgroundColor: C.surface }}>
            <Text style={{ color: C.textSoft, fontFamily: 'Nunito_600SemiBold' }}>Cards couldn’t load. Tap to try again.</Text>
          </TouchableOpacity>
        ) : (
          <>
            {Object.entries(grouped).map(([topic, rows]) => {
              const total = rows.reduce((s, r) => s + r.count, 0)
              const isExpanded = expandedTopic === topic
              const { color: iconColor, bgLight: iconBg } = topicColor(topic)

              const catMap = new Map<string, { total: number; subtopics: { name: string; count: number }[] }>()
              for (const r of rows) {
                const catKey = r.category ?? 'General'
                if (!catMap.has(catKey)) catMap.set(catKey, { total: 0, subtopics: [] })
                const entry = catMap.get(catKey)!
                entry.total += r.count
                if (r.subtopic) entry.subtopics.push({ name: r.subtopic, count: r.count })
              }
              const sortedCats = Array.from(catMap.entries()).sort(([a], [b]) => {
                const ai = CAT_ORDER.indexOf(a); const bi = CAT_ORDER.indexOf(b)
                return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
              })

              return (
                <View key={topic} onLayout={e => scrollToStartTopic(topic, e.nativeEvent.layout.y)} style={[s.topicCard, { backgroundColor: C.surface, borderColor: C.border, ...C.shadow, marginHorizontal: 16, marginBottom: 10 }]}>
                  <View style={s.topicRowInner}>
                    <View style={[s.topicIcon, { backgroundColor: iconBg }]}>
                      <TopicIcon topic={topic} size={20} color={iconColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.topicName, { color: C.text }]}>{topic}</Text>
                      <Text style={[s.topicMeta, { color: C.textFaint }]}>
                        {total.toLocaleString()} cards · {sortedCats.length} {sortedCats.length === 1 ? 'category' : 'categories'}
                      </Text>
                      {(() => {
                        const done = Math.min(answeredByTopic[topic] ?? 0, total)
                        if (done === 0) return null
                        return (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 }}>
                            <ProgressBar progress={done / Math.max(total, 1)} height={4} color={C.green} style={{ flex: 1 }} />
                            <Text style={{ fontSize: 10.5, fontFamily: 'Nunito_700Bold', color: C.textFaint }}>{done}/{total}</Text>
                          </View>
                        )
                      })()}
                    </View>
                    <TouchableOpacity onPress={() => startCards(topic)} activeOpacity={0.75}
                      style={[s.startBtn, { backgroundColor: C.tealTint, borderColor: C.teal }]}>
                      <Text style={[s.startBtnText, { color: C.teal }]}>{total < sessionSize ? `Start ${total} →` : 'Start →'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => withAccordionAnim(() => { setExpandedTopic(isExpanded ? null : topic); setExpandedCategory(null) })} style={s.chevronBtn}>
                      <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={C.textFaint} />
                    </TouchableOpacity>
                  </View>

                  {isExpanded && (
                    <View style={{ borderTopWidth: 1, borderTopColor: C.border }}>
                      {sortedCats.map(([catName, catData], ci) => {
                        const ck = `${topic}::${catName}`
                        const isCatExpanded = expandedCategory === ck
                        const hasSubtopics = catData.subtopics.length > 0
                        return (
                          <View key={catName} style={{ borderBottomWidth: ci < sortedCats.length - 1 ? 1 : 0, borderBottomColor: C.border }}>
                            <View style={[s.catRow, { backgroundColor: C.surface2 }]}>
                              <View style={{ flex: 1 }}>
                                <Text style={[s.catName, { color: C.text }]}>{catName}</Text>
                                <Text style={[s.catCount, { color: C.textFaint }]}>{catData.total.toLocaleString()} cards</Text>
                              </View>
                              <TouchableOpacity
                                onPress={() => startCards(topic, catName !== 'General' ? catName : undefined)}
                                style={[s.catStartBtn, { borderColor: C.teal, backgroundColor: C.tealTint }]}>
                                <Text style={[s.startBtnText, { color: C.teal }]}>{catData.total < sessionSize ? `Start ${catData.total} →` : 'Start →'}</Text>
                              </TouchableOpacity>
                              {hasSubtopics && (
                                <TouchableOpacity onPress={() => withAccordionAnim(() => setExpandedCategory(isCatExpanded ? null : ck))} style={s.chevronBtn}>
                                  <Ionicons name={isCatExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={C.textFaint} />
                                </TouchableOpacity>
                              )}
                            </View>
                            {isCatExpanded && catData.subtopics.sort((a, b) => b.count - a.count).map((sub) => (
                              <TouchableOpacity key={sub.name}
                                onPress={() => startCards(topic, catName !== 'General' ? catName : undefined, sub.name)}
                                style={[s.subtopicRow, { backgroundColor: C.surface, borderTopColor: C.border, borderTopWidth: 1 }]}>
                                <Text style={[s.subtopicName, { color: C.textSoft }]}>{sub.name}</Text>
                                <Text style={[s.subtopicCount, { color: C.textFaint }]}>{sub.count}</Text>
                                <Text style={[s.startBtnText, { color: C.teal }]}>→</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )
                      })}
                    </View>
                  )}
                </View>
              )
            })}
          </>
        )}
        </ScrollView>
        {loadingCards && (
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: C.bg + 'cc', alignItems: 'center', justifyContent: 'center' }]}>
            <ActivityIndicator size="large" color={C.coral} />
          </View>
        )}
      </View>
    )
  }

  // ── Quiz screen ────────────────────────────────────────────────────────────
  if (screen === 'quiz') {
    if (cardsError || (!loadingCards && !cards[cardIndex])) return (
      <View style={{flex:1,justifyContent:'center',padding:24,backgroundColor:C.bg,gap:16}}>
        <Text accessibilityRole="alert" style={{color:C.text,fontFamily:'Nunito_700Bold',fontSize:16}}>{cardsError ?? 'This deck is unavailable. Please retry or choose another topic.'}</Text>
        <TouchableOpacity accessibilityRole="button" onPress={()=>retryDeck.current()} style={{minHeight:48,justifyContent:'center',alignItems:'center',backgroundColor:C.teal,borderRadius:16}}>
          <Text style={{color:C.onTeal,fontFamily:'Nunito_800ExtraBold'}}>Retry loading flashcards</Text>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" onPress={()=>{setCardsError(null);setScreen('topics')}} style={{minHeight:48,justifyContent:'center',alignItems:'center'}}>
          <Text style={{color:C.textSoft,fontFamily:'Nunito_700Bold'}}>Back to topics and filters</Text>
        </TouchableOpacity>
      </View>
    )
    // Cards may not be loaded yet (switched screen early to avoid zero-flash on results)
    if (loadingCards || !cards[cardIndex]) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg, padding:24, gap:16 }}>
          <ActivityIndicator size="large" color={C.teal} />
          <Text style={{color:C.textSoft,fontFamily:'Nunito_700Bold'}}>Loading cleared flashcards…</Text>
          <TouchableOpacity accessibilityRole="button" onPress={()=>{
            deckGuard.invalidate();setLoadingCards(false);setCardsError(null);setScreen('topics')
          }} style={{minHeight:48,justifyContent:'center',paddingHorizontal:16}}>
            <Text style={{color:C.teal,fontFamily:'Nunito_800ExtraBold'}}>Back to topics</Text>
          </TouchableOpacity>
        </View>
      )
    }

    const card = cards[cardIndex]
    const total = cards.length
    const isBookmarked = bookmarked.has(card.id)
    const diffColor = card.difficulty === 'easy' ? C.green : card.difficulty === 'hard' ? C.red : C.amber
    const diffTint = card.difficulty === 'easy' ? C.greenTint : card.difficulty === 'hard' ? C.redTint : C.amberTint

    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        {/* Focused session: no TopBar/tab bar — header owns the safe area */}
        <View style={[s.quizHeader, { paddingTop: insets.top + 10, backgroundColor: C.surface, borderBottomColor: C.border }]}>
          <TouchableOpacity
            onPress={() => cardIds ? backToBookmarks() : smartStart === '1' ? goBack() : setScreen('topics')}
            style={[s.iconBtn, { backgroundColor: C.surface2, borderColor: C.border }]}>
            <Ionicons name="arrow-back" size={20} color={C.textSoft} />
          </TouchableOpacity>
          <View style={{ alignItems: 'center', gap: 4 }}>
            <Text style={[s.qCount, { color: C.text }]}>{cardIndex + 1} / {total}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              {(profile?.show_question_tags ?? true) && card.topic && (
                <View style={[s.fcDiff, { backgroundColor: C.tealTint }]}>
                  <Text style={[s.fcDiffText, { color: C.teal }]} numberOfLines={1}>{card.topic}</Text>
                </View>
              )}
              {card.difficulty && (
                <View style={[s.fcDiff, { backgroundColor: diffTint }]}>
                  <Text style={[s.fcDiffText, { color: diffColor }]}>{card.difficulty}</Text>
                </View>
              )}
            </View>
          </View>
          <TouchableOpacity onPress={() => toggleBookmark(card.id)} style={[s.iconBtn, { backgroundColor: C.surface2, borderColor: C.border }]}>
            <Ionicons name={isBookmarked ? 'bookmark' : 'bookmark-outline'} size={19} color={isBookmarked ? C.teal : C.textFaint} />
          </TouchableOpacity>
        </View>
        {/* Progress bar */}
        <ProgressBar progress={(cardIndex) / total} height={3} color={C.teal} />

        {/* Score pills row */}
        <View style={s.scoreRow}>
          <View style={[s.scorePill, { backgroundColor: C.redTint }]}>
            <Ionicons name="close" size={14} color={C.red} />
            <Text style={[s.scorePillText, { color: C.red }]}>{missed} missed</Text>
          </View>
          <View style={[s.scorePill, { backgroundColor: C.greenTint }]}>
            <Ionicons name="checkmark" size={14} color={C.green} />
            <Text style={[s.scorePillText, { color: C.green }]}>{gotIt} got it</Text>
          </View>
        </View>

        {/* Card + explanation in a scroll view */}
        <ScrollView
          scrollEnabled={!swiping}
          directionalLockEnabled
          contentContainerStyle={[s.quizScroll, { paddingBottom: revealed ? 130 : 40, width: '100%', maxWidth: MAX_CONTENT, alignSelf: 'center' }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Dynamic top offset — keeps the card position stable across flip */}
          <View style={{ height: cardTopOffset }} />

          {/* Invisible sizers — measure each face's natural height, take the max */}
          <View pointerEvents="none" style={{ position: 'absolute', opacity: 0, width: '100%' }}>
            <View
              key={`sf-${cardIndex}`}
              style={s.cardSizer}
              onLayout={e => setFrontH(e.nativeEvent.layout.height)}
            >
              <View style={{ alignItems: 'center' }}>
                <Text style={s.cardLabel}>QUESTION</Text>
                <Text style={s.cardText}>{cleanFront(card.front)}</Text>
              </View>
              <View style={s.tapReveal}>
                <Text style={s.tapRevealText}>Tap to reveal</Text>
              </View>
            </View>
            <View
              key={`sb-${cardIndex}`}
              style={s.cardSizer}
              onLayout={e => setBackH(e.nativeEvent.layout.height)}
            >
              <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                <Text style={s.cardLabel}>ANSWER</Text>
                <Text style={s.cardText}>{cleanBack(card.back)}</Text>
              </View>
            </View>
          </View>

          {/* Flip card — height locked to max(front, back); swipeable once revealed */}
          <Animated.View
            {...swipePan.panHandlers}
            style={{
              width: '100%',
              opacity:cardOpacity,
              transform: [
                { translateX: swipeX },
              ],
            }}
          >
            {/* Grade badges fade in as the card is dragged */}
            <Animated.View pointerEvents="none" style={[s.swipeBadge, { left: 14, backgroundColor: C.greenTint, borderColor: C.green, opacity: swipeX.interpolate({ inputRange: [0, 24], outputRange: [0, 1], extrapolate: 'clamp' }) }]}>
              <Text style={[s.swipeBadgeText, { color: C.green }]}>✓ Got it</Text>
            </Animated.View>
            <Animated.View pointerEvents="none" style={[s.swipeBadge, { right: 14, backgroundColor: C.redTint, borderColor: C.red, opacity: swipeX.interpolate({ inputRange: [-24, 0], outputRange: [1, 0], extrapolate: 'clamp' }) }]}>
              <Text style={[s.swipeBadgeText, { color: C.red }]}>✗ Didn't know</Text>
            </Animated.View>
          <TouchableOpacity onPress={flip} activeOpacity={0.92} style={s.cardTouchable} disabled={isFlipping||swiping} accessibilityRole="button" accessibilityLabel={flipped?'Show question':'Reveal answer'}>
            <Animated.View style={[
              s.card,
              C.shadowLg,
              { height: cardH },
              flipped
                ? { backgroundColor: C.teal, borderColor: C.teal }
                : { backgroundColor: C.surface, borderColor: C.border },
              { transform: [{ perspective: 900 }, { rotateY }] },
            ]}>
              {!flipped ? (
                <>
                  {/* Centered vertically now the card is taller */}
                  <View style={{ alignSelf: 'stretch', alignItems: 'center', flex: 1, justifyContent: 'center' }}>
                    <Text style={[s.cardLabel, { color: C.textFaint }]}>QUESTION</Text>
                    <Text style={[s.cardText, { color: C.text }]}>{cleanFront(card.front)}</Text>
                  </View>
                  <View style={s.tapReveal}>
                    <Ionicons name="arrow-up-circle-outline" size={17} color={C.textFaint} />
                    <Text style={[s.tapRevealText, { color: C.textFaint }]}>Tap to reveal</Text>
                  </View>
                </>
              ) : (
                <View style={{ alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                  <Text style={[s.cardLabel, { color: C.onTeal, opacity: 0.75 }]}>ANSWER</Text>
                  <Text style={[s.cardText, { color: C.onTeal }]}>{cleanBack(card.back)}</Text>
                </View>
              )}
            </Animated.View>
          </TouchableOpacity>
          </Animated.View>

          {/* Below-card: hint before reveal, Noggin explains after — same
              Duolingo treatment as MCQ/cases: big mascot, bubble with a
              tail centered on the face */}
          {!revealed ? (
            <Text style={[s.tapHint, { color: C.textFaint }]}>Tap the card to flip it</Text>
          ) : card.note && cleanBack(card.note).trim() && cleanBack(card.note).trim() !== cleanBack(card.back).trim() ? (
            // Noggin adds the supplementary explanation — only when there's a
            // note distinct from the answer already on the card. Eases in
            // after the flip lands.
            <Entrance key={`note-${cardIndex}`} delay={120} style={s.nogginBubbleRow}>
              <MascotAnimator expr="happy">
                <NogginHead size={92} expr="happy" />
              </MascotAnimator>
              <View style={[s.speechBubble, { backgroundColor: C.surface, borderColor: C.border, ...C.shadow }]}>
                <View style={s.tailWrap} pointerEvents="none">
                  <View style={[s.bubbleTail, { borderRightColor: C.surface }]} />
                </View>
                <Text style={[s.explainLabel, { color: C.teal }]}>WHY</Text>
                <Text style={[s.explanationText, { color: C.text }]}>{cleanBack(card.note)}</Text>
              </View>
            </Entrance>
          ) : null}

          {revealed && (
            <View style={{ alignItems: 'center', marginTop: 14 }}>
              <ReportButton questionId={card.id} questionType="flashcard" compact />
            </View>
          )}

          {/* Bottom spacer — flex so it absorbs remaining space without affecting card position */}
          <View style={{ flex: 1 }} />
        </ScrollView>

        {/* Fixed bottom action bar — appears after answer revealed; stays even if flipped back */}
        {revealed && (
          <Entrance key={`bar-${cardIndex}`} dy={20} style={[s.actionBar, {
            backgroundColor: C.bg,
            borderTopColor: C.border,
            paddingBottom: insets.bottom + 12,
          }]}>
            <Text style={[s.actionPrompt, { color: C.textSoft }]}>How did you do? Swipe the card → or ←, or tap</Text>
            <View style={s.actionBtns}>
              <TouchableOpacity onPress={() => next(false)} disabled={swiping||isFlipping} accessibilityRole="button" accessibilityLabel="Did not know this card" style={[s.actionBtn, { backgroundColor: C.redTint, borderColor: C.red }]}>
                <Ionicons name="close" size={20} color={C.red} />
                <Text style={[s.actionText, { color: C.red }]}>Didn't know</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => next(true)} disabled={swiping||isFlipping} accessibilityRole="button" accessibilityLabel="Knew this card" style={[s.actionBtn, { backgroundColor: C.greenTint, borderColor: C.green }]}>
                <Ionicons name="checkmark" size={20} color={C.green} />
                <Text style={[s.actionText, { color: C.green }]}>Got it</Text>
              </TouchableOpacity>
            </View>
          </Entrance>
        )}
      </View>
    )
  }

  // ── Results screen ─────────────────────────────────────────────────────────
  const total = cards.length
  const pct = total > 0 ? Math.round((gotIt / total) * 100) : 0

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <TopBar title="Practice" />
      <ScrollView contentContainerStyle={[s.resultScroll, { paddingTop: 32, paddingBottom: 100, width: '100%', maxWidth: MAX_CONTENT, alignSelf: 'center' }]}>
        {/* Mascot */}
        <View style={s.resultMascot}>
          <MascotAnimator expr={pct >= 70 ? 'happy' : 'thinking'}>
            <NogginHead size={88} expr={pct >= 70 ? 'happy' : 'thinking'} />
          </MascotAnimator>
        </View>

        <Text style={[s.resultTitle, { color: C.text }]}>Session complete!</Text>
        <Text style={[s.resultSub, { color: C.textSoft }]}>
          {pct >= 80 ? 'Excellent recall!' : pct >= 60 ? 'Good effort — keep going!' : 'Keep practicing!'}
        </Text>

        {/* Big accuracy */}
        <Text style={[s.resultPct, { color: C.coral }]}>{pct}%</Text>

        {/* Stat tiles */}
        <View style={s.statGrid}>
          <View style={[s.statTile, { backgroundColor: C.surface, borderColor: C.border, ...C.shadow }]}>
            <Text style={[s.statVal, { color: C.green }]}>{gotIt}</Text>
            <Text style={[s.statLabel, { color: C.textFaint }]}>Got it</Text>
          </View>
          <View style={[s.statTile, { backgroundColor: C.surface, borderColor: C.border, ...C.shadow }]}>
            <Text style={[s.statVal, { color: C.red }]}>{missed}</Text>
            <Text style={[s.statLabel, { color: C.textFaint }]}>Missed</Text>
          </View>
          <View style={[s.statTile, { backgroundColor: C.surface, borderColor: C.border, ...C.shadow }]}>
            <Text style={[s.statVal, { color: C.coral }]}>{total}</Text>
            <Text style={[s.statLabel, { color: C.textFaint }]}>Reviewed</Text>
          </View>
        </View>

        {/* Action buttons — same hierarchy as MCQ results:
            review (tinted) → replay (ghost) → new content (filled) → Dashboard (ghost) */}
        <View style={s.resultActions}>
          {missed > 0 && (
            <TouchableOpacity
              onPress={reviewMissed}
              style={[s.resultBtn, { backgroundColor: C.redTint, borderWidth: 1, borderColor: C.red }]}
            >
              <Text style={[s.resultBtnText, { color: C.red }]}>Review {missed} still learning →</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={studyAgain}
            style={[s.resultBtn, { backgroundColor: C.surface, borderWidth: 1, borderColor: C.borderStrong }]}
          >
            <Text style={[s.resultBtnText, { color: C.textSoft }]}>↺  Study again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              if (lastWasSurprise) surpriseMe()
              else if (lastTopic) startCards(lastTopic, lastCategory, lastSubtopic)
              else router.back()   // launched from bookmarks — pop back there
            }}
            style={[s.resultBtn, { backgroundColor: C.coral }]}
          >
            <Text style={[s.resultBtnText, { color: C.onTeal }]}>New deck →</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(app)/dashboard')} style={[s.resultBtn, { backgroundColor: C.surface, borderWidth: 1, borderColor: C.borderStrong }]}>
            <Text style={[s.resultBtnText, { color: C.textSoft }]}>Dashboard</Text>
          </TouchableOpacity>
          {cardIds && (
            <TouchableOpacity onPress={() => backToBookmarks()} style={{ alignSelf: 'center', marginTop: 6 }}>
              <Text style={[s.resultBtnText, { color: C.textFaint, fontSize: 13 }]}>
                ← Back to {from === 'search' ? 'search' : from === 'history' ? 'Time Capsule' : 'bookmarks'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  // Topics header
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 20, fontFamily: 'Nunito_800ExtraBold' },
  headerSub: { fontSize: 12, fontFamily: 'Nunito_600SemiBold', marginTop: 1 },
  iconBtn: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },

  // Filters
  filterSection: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 18, borderBottomWidth: 1 },
  filterToggle: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 12, paddingVertical: 11, paddingHorizontal: 13, borderRadius: 14, borderWidth: 1.5 },
  filterToggleIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  filterToggleTitle: { fontSize: 14.5, fontFamily: 'Nunito_800ExtraBold' },
  filterToggleSummary: { flex: 1, fontSize: 12.5, fontFamily: 'Nunito_600SemiBold', textAlign: 'right' },
  filterLabel: { fontSize: 11, fontFamily: 'Nunito_800ExtraBold', letterSpacing: 0.6, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1.5 },
  chipIcon: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipText: { fontSize: 13, fontFamily: 'Nunito_700Bold' },

  // Surprise me
  surpriseBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 20 },
  surpriseLeft: { fontSize: 15, fontFamily: 'Nunito_800ExtraBold' },
  surpriseRight: { fontSize: 13, fontFamily: 'Nunito_700Bold', opacity: 0.85 },

  // Topic list
  topicCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  topicRowInner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  topicIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  topicName: { fontSize: 15, fontFamily: 'Nunito_700Bold' },
  topicMeta: { fontSize: 12, fontFamily: 'Nunito_600SemiBold', marginTop: 2 },
  startBtn: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1.5 },
  startBtnText: { fontSize: 13, fontFamily: 'Nunito_800ExtraBold' },
  chevronBtn: { padding: 4 },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: 14 },
  catName: { fontSize: 13, fontFamily: 'Nunito_800ExtraBold' },
  catCount: { fontSize: 11.5, fontFamily: 'Nunito_600SemiBold', marginTop: 1 },
  catStartBtn: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1 },
  subtopicRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingLeft: 48, paddingRight: 14 },
  subtopicName: { fontSize: 13.5, fontFamily: 'Nunito_600SemiBold', flex: 1 },
  subtopicCount: { fontSize: 12, fontFamily: 'Nunito_600SemiBold' },
  badge: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: 999 },
  badgeText: { fontSize: 13, fontFamily: 'Nunito_800ExtraBold' },

  // Quiz header
  quizHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  qCount: { fontSize: 17, fontFamily: 'Nunito_800ExtraBold', textAlign: 'center' },

  // Score pills
  scoreRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, paddingVertical: 12 },
  scorePill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 14, borderRadius: 999 },
  scorePillText: { fontSize: 13, fontFamily: 'Nunito_700Bold' },

  // Flip card
  quizScroll: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 20 },
  tapHint: { fontSize: 13, fontFamily: 'Nunito_600SemiBold', marginTop: 14, textAlign: 'center' },
  cardTouchable: { width: '100%' },
  swipeBadge: { position: 'absolute', top: 12, zIndex: 3, borderWidth: 1.5, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 13 },
  swipeBadgeText: { fontSize: 13, fontFamily: 'Nunito_800ExtraBold' },
  // cardSizer: invisible twin used only for onLayout measurement — must match card padding exactly
  cardSizer: { width: '100%', paddingHorizontal: 28, paddingTop: 24, paddingBottom: 20, alignItems: 'center', justifyContent: 'space-between' },
  card: { width: '100%', borderRadius: 24, borderWidth: 1.5, paddingHorizontal: 28, paddingTop: 24, paddingBottom: 20, alignItems: 'center', justifyContent: 'space-between' },
  cardLabel: { fontSize: 11, fontFamily: 'Nunito_800ExtraBold', letterSpacing: 1.4, marginBottom: 16 },
  cardText: { fontSize: 16, fontFamily: 'Nunito_700Bold', textAlign: 'center', lineHeight: 25 },
  tapReveal: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 16 },
  tapRevealText: { fontSize: 13, fontFamily: 'Nunito_600SemiBold' },

  // Noggin speech bubble (below card, after flip)
  fcDiff: { paddingVertical: 2, paddingHorizontal: 9, borderRadius: 999 },
  fcDiffText: { fontSize: 11, fontFamily: 'Nunito_800ExtraBold', textTransform: 'capitalize' },
  nogginBubbleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, width: '100%', gap: 6 },
  speechBubble: { flex: 1, borderRadius: 20, borderWidth: 1, padding: 18 },
  // Full-height wrapper vertically centers the tail on the bubble (and Noggin)
  tailWrap: { position: 'absolute', left: -10, top: 0, bottom: 0, justifyContent: 'center' },
  bubbleTail: { width: 0, height: 0, borderTopWidth: 9, borderBottomWidth: 9, borderRightWidth: 11, borderTopColor: 'transparent', borderBottomColor: 'transparent' },
  explainLabel: { fontSize: 11, fontFamily: 'Nunito_800ExtraBold', letterSpacing: 1, marginBottom: 6 },
  explanationText: { fontSize: 15, fontFamily: 'Nunito_600SemiBold', lineHeight: 23 },

  // Action bar (fixed bottom, after flip)
  actionBar: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1, paddingTop: 12, paddingHorizontal: 16 },
  actionPrompt: { fontSize: 13, fontFamily: 'Nunito_700Bold', textAlign: 'center', marginBottom: 10 },
  actionBtns: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 15, borderRadius: 16, borderWidth: 1.5 },
  actionText: { fontSize: 15, fontFamily: 'Nunito_800ExtraBold' },

  // Results
  resultScroll: { paddingHorizontal: 22, alignItems: 'center' },
  resultMascot: { marginBottom: 16 },
  resultTitle: { fontSize: 26, fontFamily: 'Nunito_900Black', letterSpacing: -0.3, marginBottom: 4 },
  resultSub: { fontSize: 15, fontFamily: 'Nunito_600SemiBold', marginBottom: 10 },
  resultPct: { fontSize: 64, fontFamily: 'Nunito_900Black', letterSpacing: -3, marginBottom: 20 },
  statGrid: { flexDirection: 'row', gap: 10, width: '100%', marginBottom: 26 },
  statTile: { flex: 1, borderRadius: 18, borderWidth: 1, padding: 16, alignItems: 'center' },
  statVal: { fontSize: 24, fontFamily: 'Nunito_900Black', letterSpacing: -0.5 },
  statLabel: { fontSize: 12, fontFamily: 'Nunito_600SemiBold', marginTop: 3 },
  resultActions: { width: '100%', gap: 10 },
  resultBtn: { padding: 16, borderRadius: 999, alignItems: 'center' },
  resultBtnText: { fontSize: 15, fontFamily: 'Nunito_800ExtraBold' },
  dashLink: { fontSize: 13, fontFamily: 'Nunito_600SemiBold' },
})
