'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface TopicRow {
  topic: string
  category: string | null
  subtopic: string | null
  count: number
}

interface Props {
  topicRows: TopicRow[]
  mode: 'mcq' | 'flashcard' | 'case_study'
  totalAvailable: number
  region?: string
  hasYearFilter?: boolean
  profession?: string
  accessKey?: string | null
}

const DIFFICULTIES = ['all', 'easy', 'medium', 'hard'] as const
type Difficulty = typeof DIFFICULTIES[number]
const LIMITS = [5, 10, 20, 40] as const

const COGNITIVE_TYPES = [
  { value: 'all',            label: 'All',        activeBg: 'var(--text)',  activeFg: 'var(--bg)' },
  { value: 'recall',         label: 'Recall',     activeBg: '#2563EB',      activeFg: '#fff' },
  { value: 'mechanism',      label: 'Mechanism',  activeBg: '#7C3AED',      activeFg: '#fff' },
  { value: 'application',    label: 'Apply',      activeBg: '#D97706',      activeFg: '#fff' },
  { value: 'calculation',    label: 'Calculate',  activeBg: 'var(--teal)',  activeFg: 'var(--on-teal)' },
  { value: 'interpretation', label: 'Interpret',  activeBg: '#059669',      activeFg: '#fff' },
] as const

// SVG icon components for topics and categories
const IconHeart = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
const IconLung = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2v10a6 6 0 0 0 6 6m0-16v10a6 6 0 0 1-6 6M12 2v16"/><path d="M6 14c-2 1-4 2-4 5a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-4"/><path d="M18 14c2 1 4 2 4 5a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-4"/></svg>
const IconBrain = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2z"/></svg>
const IconPill = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.5 20.5 3.5 13.5a5 5 0 1 1 7-7l7 7a5 5 0 1 1-7 7z"/><line x1="8.5" y1="8.5" x2="15.5" y2="15.5"/></svg>
const IconMicroscope = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 1 0 0-14h-1"/><path d="M9 14h.01"/><path d="M9 6h6v4H9z"/><path d="M12 6V3"/></svg>
const IconThermometer = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>
const IconBook = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
// Blood drop with medical cross — Haematology
const IconBlood = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C8 7.5 6 11 6 14a6 6 0 0 0 12 0c0-3-2-6.5-6-12z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>
// Bone — Musculoskeletal
const IconBone = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 10c.7-.7 1.69 0 2.5 0a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0-2.5 2.5c0 .81.7 1.8 0 2.5l-6 6c-.7.7-1.69 0-2.5 0a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 2.5-2.5c0-.81-.7-1.8 0-2.5l6-6z"/></svg>
// Flask — Endocrinology (hormones)
const IconFlask = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3h6"/><path d="M9 3v7L5 17a2 2 0 0 0 1.72 3h10.56A2 2 0 0 0 19 17l-4-7V3"/><path d="M7.5 17h9"/></svg>
// Intestinal S-curve — Gastroenterology
const IconGI = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h6a4 4 0 0 1 0 8H9a4 4 0 0 0 0 8h6"/></svg>
// Kidney bean — Renal
const IconKidney = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3C8 3 5 7 5 11c0 3 1.5 5.5 4 7 1 .6 1.5 1.5 1.5 3H14c0-1.5.5-2.4 1.5-3 2.5-1.5 4-4 4-7 0-4-3-8-7.5-8z"/><path d="M10.5 14c.8.3 1.5.5 1.5.5s.7-.2 1.5-.5"/></svg>
// Syringe — Hospital Pharmacy
const IconSyringe = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2l4 4"/><path d="m17 7 3-3"/><path d="M19 9 8.7 19.3a1 1 0 0 1-1.4 0l-.6-.6a1 1 0 0 1 0-1.4L17 7"/><path d="m9 11 4 4"/><path d="m5 19-3 3"/><path d="m14 4 6 6"/></svg>

const TOPIC_ICONS: Record<string, React.ReactNode> = {
  // Core body systems
  'Cardiovascular System': <IconHeart />,
  'Respiratory':           <IconLung />,
  'Central Nervous System':<IconBrain />,
  'Neurology':             <IconBrain />,
  'Renal':                 <IconKidney />,
  'Nephrology':            <IconKidney />,
  'Endocrinology':         <IconFlask />,
  'Diabetes':              <IconFlask />,
  'Gastroenterology':      <IconGI />,
  'Haematology':           <IconBlood />,
  'Musculoskeletal':       <IconBone />,
  // Pharmacy / pathology
  'Chemical Pathology':    <IconMicroscope />,
  'Clinical Pharmacy':     <IconPill />,
  'Hospital Pharmacy':     <IconSyringe />,
  'Pharmacokinetics':      <IconPill />,
  'Antibiotics':           <IconPill />,
  // Other
  'Infectious Disease':    <IconMicroscope />,
  'Malaria':               <IconMicroscope />,
  'Pain Management':       <IconThermometer />,
}

const DIFFICULTY_STYLE: Record<string, { active: { bg: string; color: string }; label: string }> = {
  all:    { active: { bg: 'var(--text)',  color: 'var(--bg)' },          label: 'All levels' },
  easy:   { active: { bg: 'var(--green)', color: '#fff' },               label: 'Easy' },
  medium: { active: { bg: 'var(--amber)', color: '#fff' },               label: 'Medium' },
  hard:   { active: { bg: 'var(--red)',   color: '#fff' },               label: 'Hard' },
}

function getTopicIcon(topic: string): React.ReactNode { return TOPIC_ICONS[topic] ?? <IconBook /> }

interface SubtopicEntry { name: string; count: number }
interface CategoryEntry { total: number; subtopics: SubtopicEntry[] }
interface TopicEntry { total: number; categories: Map<string, CategoryEntry> }

export default function TopicSelectorClient({ topicRows: initialRows, mode, totalAvailable, region, hasYearFilter, profession, accessKey }: Props) {
  const router = useRouter()
  const [difficulty, setDifficulty] = useState<Difficulty>('all')
  const [limit, setLimit] = useState<number>(10)
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null)
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [cognitiveType, setCognitiveType] = useState('all')
  const [highYield, setHighYield] = useState(false)
  const [allYears, setAllYears] = useState(false)

  // Live topic rows — updated whenever a filter toggle fires
  const [liveRows, setLiveRows] = useState<TopicRow[]>(initialRows)
  const [isFiltering, setIsFiltering] = useState(false)
  const initialRowsRef = useRef(initialRows)

  useEffect(() => {
    // Case studies use a different RPC; only filter MCQ + flashcard
    if (mode === 'case_study' || !profession) return

    const hasFilter = cognitiveType !== 'all' || highYield || (difficulty !== 'all')

    if (!hasFilter) {
      setLiveRows(initialRowsRef.current)
      setExpandedTopic(null)
      setExpandedCategory(null)
      return
    }

    let cancelled = false
    setIsFiltering(true)

    const supabase = createClient()
    supabase.rpc('get_question_counts', {
      p_profession: profession,
      p_question_type: mode === 'flashcard' ? 'flashcard' : 'mcq',
      p_access_key: accessKey ?? null,
      p_cognitive_type: cognitiveType !== 'all' ? cognitiveType : null,
      p_high_yield: highYield ? true : null,
      p_difficulty: difficulty !== 'all' ? difficulty : null,
    }).then(({ data }) => {
      if (cancelled) return
      const rows = (data ?? []).map((r: { topic: string; category: string | null; subtopic: string | null; cnt: number }) => ({
        topic: r.topic,
        category: r.category,
        subtopic: r.subtopic,
        count: Number(r.cnt),
      }))
      setLiveRows(rows)
      setExpandedTopic(null)
      setExpandedCategory(null)
      if (!cancelled) setIsFiltering(false)
    }, () => {
      if (!cancelled) setIsFiltering(false)
    })

    return () => { cancelled = true }
  }, [cognitiveType, highYield, difficulty, mode, profession, accessKey])

  const filteredTotal = liveRows.reduce((sum, r) => sum + r.count, 0)

  const grouped = new Map<string, TopicEntry>()
  for (const row of liveRows) {
    if (!row.topic) continue
    if (!grouped.has(row.topic)) grouped.set(row.topic, { total: 0, categories: new Map() })
    const topicEntry = grouped.get(row.topic)!
    topicEntry.total += row.count
    const catKey = row.category ?? 'General'
    if (!topicEntry.categories.has(catKey)) topicEntry.categories.set(catKey, { total: 0, subtopics: [] })
    const catEntry = topicEntry.categories.get(catKey)!
    catEntry.total += row.count
    if (row.subtopic) catEntry.subtopics.push({ name: row.subtopic, count: row.count })
  }

  const sortedTopics = Array.from(grouped.entries()).sort((a, b) => b[1].total - a[1].total)
  const CAT_ORDER = ['Anatomy & Physiology', 'Pharmacology', 'Pathophysiology', 'Clinicals']

  function buildUrl(topic?: string, category?: string, subtopic?: string) {
    const params = new URLSearchParams()
    if (topic) params.set('topic', topic)
    // 'General' is a display alias for null category — don't pass it as a URL param
    if (category && category !== 'General') params.set('category', category)
    if (subtopic) params.set('subtopic', subtopic)
    if (difficulty !== 'all') params.set('difficulty', difficulty)
    if (mode !== 'case_study') params.set('limit', String(limit))
    if (region && region !== 'all') params.set('region', region)
    if (cognitiveType !== 'all') params.set('cognitive_type', cognitiveType)
    if (highYield) params.set('high_yield', 'true')
    if (allYears) params.set('all_years', '1')
    const path = mode === 'case_study' ? '/practice/cases' : mode === 'flashcard' ? '/practice/flashcards' : '/practice/mcq'
    return `${path}?${params.toString()}`
  }

  function handleStartAll() {
    const url = buildUrl()
    router.push(url + (url.includes('?') ? '&' : '?') + 'random=1')
  }

  const categoryKey = (topic: string, cat: string) => `${topic}::${cat}`

  const CATEGORY_ICONS: Record<string, React.ReactNode> = {
    'Anatomy & Physiology': <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
    'Pharmacology': <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.5 20.5 3.5 13.5a5 5 0 1 1 7-7l7 7a5 5 0 1 1-7 7z"/><line x1="8.5" y1="8.5" x2="15.5" y2="15.5"/></svg>,
    'Pathophysiology': <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>,
    'Clinicals': <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <Link href="/practice" style={{
          width: 42, height: 42, borderRadius: 13, border: '1px solid var(--border)',
          background: 'var(--surface)', color: 'var(--text-soft)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 6l-6 6 6 6"/>
          </svg>
        </Link>
        <div>
          <h1 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>
            {mode === 'mcq' ? 'MCQ Practice' : mode === 'flashcard' ? 'Flashcards' : 'Case Studies'}
          </h1>
          <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-faint)', fontWeight: 600, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
            {isFiltering ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid var(--teal)', borderTopColor: 'transparent', display: 'inline-block', animation: 'spin .7s linear infinite' }} />
                Filtering…
              </span>
            ) : (
              <>
                {filteredTotal.toLocaleString()}
                {filteredTotal !== totalAvailable && <span style={{ color: 'var(--text-faint)' }}> / {totalAvailable.toLocaleString()}</span>}
                {' '}{mode === 'case_study' ? 'cases' : 'questions'} available
              </>
            )}
          </p>
        </div>
      </div>

      <div style={{ flex: 1, padding: '20px 16px 120px', maxWidth: 720, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Filters row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          {/* Difficulty */}
          <div>
            <p style={{ margin: '0 0 9px', fontSize: 11, fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Difficulty</p>
            <div style={{ display: 'flex', gap: 7 }}>
              {DIFFICULTIES.map(d => {
                const s = DIFFICULTY_STYLE[d]
                const active = difficulty === d
                return (
                  <button key={d} type="button" onClick={() => setDifficulty(d)}
                    style={{
                      padding: '8px 14px', borderRadius: 999, border: active ? 'none' : '1px solid var(--border)',
                      background: active ? s.active.bg : 'var(--surface)',
                      color: active ? s.active.color : 'var(--text-soft)',
                      fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                      transition: 'all .15s ease',
                    }}>
                    {s.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Limit */}
          {mode !== 'case_study' && (
            <div>
              <p style={{ margin: '0 0 9px', fontSize: 11, fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Session size</p>
              <div style={{ display: 'flex', gap: 7 }}>
                {LIMITS.map(n => (
                  <button key={n} type="button" onClick={() => setLimit(n)}
                    style={{
                      width: 44, padding: '8px 0', borderRadius: 999,
                      border: limit === n ? 'none' : '1px solid var(--border)',
                      background: limit === n ? 'var(--teal)' : 'var(--surface)',
                      color: limit === n ? 'var(--on-teal)' : 'var(--text-soft)',
                      fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                      transition: 'all .15s ease',
                    }}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Cognitive type filter */}
        {mode !== 'case_study' && (
          <div>
            <p style={{ margin: '0 0 9px', fontSize: 11, fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Question type</p>
            <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' }}>
              {COGNITIVE_TYPES.map(ct => {
                const active = cognitiveType === ct.value
                return (
                  <button key={ct.value} type="button" onClick={() => setCognitiveType(ct.value)}
                    style={{
                      padding: '8px 14px', borderRadius: 999, flexShrink: 0,
                      border: active ? 'none' : '1px solid var(--border)',
                      background: active ? ct.activeBg : 'var(--surface)',
                      color: active ? ct.activeFg : 'var(--text-soft)',
                      fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                      transition: 'all .15s ease',
                    }}>
                    {ct.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Focus toggles */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div>
            <p style={{ margin: '0 0 9px', fontSize: 11, fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Focus</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => setHighYield(v => !v)}
                style={{
                  padding: '8px 16px', borderRadius: 999,
                  border: highYield ? 'none' : '1px solid var(--border)',
                  background: highYield ? '#F59E0B' : 'var(--surface)',
                  color: highYield ? '#fff' : 'var(--text-soft)',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'all .15s ease', display: 'flex', alignItems: 'center', gap: 6,
                }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill={highYield ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
                High Yield
              </button>
              {hasYearFilter && (
                <button type="button" onClick={() => setAllYears(v => !v)}
                  style={{
                    padding: '8px 16px', borderRadius: 999,
                    border: allYears ? 'none' : '1px solid var(--border)',
                    background: allYears ? 'var(--text)' : 'var(--surface)',
                    color: allYears ? 'var(--bg)' : 'var(--text-soft)',
                    fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                    transition: 'all .15s ease', display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  All Years
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Surprise me button */}
        <button type="button" onClick={handleStartAll} className="surprise-btn"
          style={{
            width: '100%', padding: '16px 22px', borderRadius: 18,
            background: 'var(--teal)', color: 'var(--on-teal)', border: 'none',
            fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
          <span>🎲 Surprise me</span>
          <span style={{ opacity: .75, fontSize: 13 }}>
            {mode === 'case_study' ? 'Random cases →' : `Random ${limit} questions →`}
          </span>
        </button>

        {/* Topic list */}
        <div>
          <p style={{ margin: '0 0 11px', fontSize: 11, fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Choose a topic</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sortedTopics.map(([topic, topicData]) => {
              const isTopicExpanded = expandedTopic === topic
              const sortedCats = Array.from(topicData.categories.entries()).sort((a, b) => {
                const ai = CAT_ORDER.indexOf(a[0])
                const bi = CAT_ORDER.indexOf(b[0])
                return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
              })

              return (
                <div key={topic} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
                  {/* Topic row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '14px 16px' }}>
                    <div style={{ width: 42, height: 42, borderRadius: 13, background: 'var(--teal-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                      {getTopicIcon(topic)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{topic}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--text-faint)', fontWeight: 600 }}>
                        {topicData.total.toLocaleString()} {mode === 'case_study' ? 'cases' : 'questions'} · {sortedCats.length} {sortedCats.length === 1 ? 'category' : 'categories'}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Link href={buildUrl(topic)} className="topic-start-btn"
                        style={{ padding: '8px 14px', borderRadius: 999, background: 'var(--teal-tint)', color: 'var(--teal)', fontSize: 13, fontWeight: 800, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                        Start →
                      </Link>
                      <button type="button" onClick={() => { setExpandedTopic(isTopicExpanded ? null : topic); setExpandedCategory(null) }}
                        style={{
                          width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--border)',
                          background: 'var(--surface-2)', color: 'var(--text-soft)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                          transform: isTopicExpanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s ease',
                          padding: 0,
                        }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M6 9l6 6 6-6"/>
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Category rows */}
                  {isTopicExpanded && (
                    <div style={{ borderTop: '1px solid var(--border)' }}>
                      {sortedCats.map(([cat, catData], ci) => {
                        const ck = categoryKey(topic, cat)
                        const isCatExpanded = expandedCategory === ck
                        const hasSubtopics = catData.subtopics.length > 0
                        return (
                          <div key={cat} style={{ borderBottom: ci < sortedCats.length - 1 ? '1px solid var(--border)' : 'none' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--surface-2)' }}>
                              <span style={{ width: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-soft)' }}>
                                {CATEGORY_ICONS[cat] ?? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>}
                              </span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>{cat}</p>
                                <p style={{ margin: 0, fontSize: 11.5, color: 'var(--text-faint)', fontWeight: 600 }}>
                                  {catData.total.toLocaleString()} {mode === 'case_study' ? 'cases' : 'questions'}
                                </p>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                <Link href={buildUrl(topic, cat)}
                                  style={{ padding: '6px 12px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--teal)', fontSize: 12.5, fontWeight: 800, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                                  Start →
                                </Link>
                                {hasSubtopics && (
                                  <button type="button" onClick={() => setExpandedCategory(isCatExpanded ? null : ck)}
                                    style={{
                                      width: 28, height: 28, borderRadius: '50%', border: '1px solid var(--border)',
                                      background: 'var(--surface)', color: 'var(--text-faint)',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                      transform: isCatExpanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s ease', padding: 0,
                                    }}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M6 9l6 6 6-6"/>
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Subtopics */}
                            {isCatExpanded && hasSubtopics && (
                              <div>
                                {catData.subtopics.sort((a, b) => b.count - a.count).map((sub, si) => (
                                  <Link key={sub.name} href={buildUrl(topic, cat, sub.name)}
                                    className="subtopic-row"
                                    style={{
                                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                      padding: '11px 16px 11px 56px',
                                      borderTop: si > 0 ? '1px solid var(--border)' : '1px solid var(--border)',
                                      background: 'var(--surface)', textDecoration: 'none',
                                    }}>
                                    <span style={{ fontSize: 13.5, color: 'var(--text-soft)', fontWeight: 600 }}>{sub.name}</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                      <span style={{ fontSize: 12, color: 'var(--text-faint)', fontWeight: 600 }}>
                                        {sub.count}{mode === 'case_study' ? 'c' : 'q'}
                                      </span>
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M9 6l6 6-6 6"/>
                                      </svg>
                                    </div>
                                  </Link>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <style>{`
        .surprise-btn { transition: transform .18s ease, filter .18s ease; }
        .surprise-btn:hover { transform: translateY(-2px); filter: brightness(1.06); }
        .topic-start-btn { transition: background .15s ease, color .15s ease; }
        .topic-start-btn:hover { background: var(--teal) !important; color: var(--on-teal) !important; }
        .subtopic-row { transition: background .12s ease; }
        .subtopic-row:hover { background: var(--surface-2) !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
