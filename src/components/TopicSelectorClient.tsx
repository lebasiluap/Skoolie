'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
}

const DIFFICULTIES = ['all', 'easy', 'medium', 'hard'] as const
type Difficulty = typeof DIFFICULTIES[number]

const LIMITS = [5, 10, 20, 40] as const

const TOPIC_ICONS: Record<string, string> = {
  'Cardiovascular System': '❤️',
  'Respiratory': '🫁',
  'Pharmacokinetics': '⚗️',
  'Antibiotics': '💊',
  'Infectious Disease': '🦠',
  'Malaria': '🦟',
  'Diabetes': '🩸',
  'Nephrology': '🫘',
  'Gastroenterology': '🫃',
  'Pain Management': '💉',
  'Neurology': '🧠',
  'Central Nervous System': '🧠',
}

const CATEGORY_ICONS: Record<string, string> = {
  'Anatomy & Physiology': '🫀',
  'Pharmacology': '💊',
  'Pathophysiology': '🔬',
  'Clinicals': '🩺',
}

function getTopicIcon(topic: string) {
  return TOPIC_ICONS[topic] ?? '📚'
}

function getCategoryIcon(cat: string) {
  return CATEGORY_ICONS[cat] ?? '📖'
}

interface SubtopicEntry { name: string; count: number }
interface CategoryEntry { total: number; subtopics: SubtopicEntry[] }
interface TopicEntry { total: number; categories: Map<string, CategoryEntry> }

export default function TopicSelectorClient({ topicRows, mode, totalAvailable, region }: Props) {
  const router = useRouter()
  const [difficulty, setDifficulty] = useState<Difficulty>('all')
  const [limit, setLimit] = useState<number>(10)
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null)
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)

  const grouped = new Map<string, TopicEntry>()

  for (const row of topicRows) {
    if (!row.topic) continue
    if (!grouped.has(row.topic)) {
      grouped.set(row.topic, { total: 0, categories: new Map() })
    }
    const topicEntry = grouped.get(row.topic)!
    topicEntry.total += row.count

    const catKey = row.category ?? 'General'
    if (!topicEntry.categories.has(catKey)) {
      topicEntry.categories.set(catKey, { total: 0, subtopics: [] })
    }
    const catEntry = topicEntry.categories.get(catKey)!
    catEntry.total += row.count
    if (row.subtopic) {
      catEntry.subtopics.push({ name: row.subtopic, count: row.count })
    }
  }

  const sortedTopics = Array.from(grouped.entries()).sort((a, b) => b[1].total - a[1].total)
  const CAT_ORDER = ['Anatomy & Physiology', 'Pharmacology', 'Pathophysiology', 'Clinicals']

  function buildUrl(topic?: string, category?: string, subtopic?: string) {
    const params = new URLSearchParams()
    if (topic) params.set('topic', topic)
    if (category) params.set('category', category)
    if (subtopic) params.set('subtopic', subtopic)
    if (difficulty !== 'all') params.set('difficulty', difficulty)
    if (mode !== 'case_study') params.set('limit', String(limit))
    if (region && region !== 'all') params.set('region', region)
    const path =
      mode === 'case_study' ? '/practice/cases' :
      mode === 'flashcard'  ? '/practice/flashcards' :
                              '/practice/mcq'
    return `${path}?${params.toString()}`
  }

  function handleStartAll() {
    const url = buildUrl()
    const sep = url.includes('?') ? '&' : '?'
    router.push(url + sep + 'random=1')
  }

  const categoryKey = (topic: string, cat: string) => `${topic}::${cat}`

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
      {/* Header */}
      <div className="bg-[#0A0A0A] px-5 py-4 flex items-center gap-3 border-b border-[#1F1F1F]">
        <Link
          href="/practice"
          className="w-9 h-9 rounded-full bg-[#1F1F1F] flex items-center justify-center text-[#888888] hover:text-white transition-colors"
        >
          ←
        </Link>
        <div>
          <h1 className="text-base font-bold text-white">
            {mode === 'mcq' ? 'MCQ Practice' : mode === 'flashcard' ? 'Flashcards' : 'Case Studies'}
          </h1>
          <p className="text-xs text-[#888888]">
            {totalAvailable} {mode === 'case_study' ? 'cases' : 'questions'} available
          </p>
        </div>
      </div>

      <div className="flex-1 px-5 py-5 flex flex-col gap-5 pb-32">
        {/* Difficulty filter */}
        <div>
          <p className="text-[10px] font-semibold text-[#0D9488] uppercase tracking-widest mb-2">Difficulty</p>
          <div className="flex gap-2 flex-wrap">
            {DIFFICULTIES.map(d => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all capitalize ${
                  difficulty === d
                    ? d === 'all' ? 'bg-white text-black border-white'
                    : d === 'easy' ? 'bg-green-500 text-white border-green-500'
                    : d === 'medium' ? 'bg-orange-400 text-white border-orange-400'
                    : 'bg-red-500 text-white border-red-500'
                    : 'bg-transparent text-[#888888] border-[#2A2A2A] hover:border-[#555555]'
                }`}
              >
                {d === 'all' ? 'All levels' : d}
              </button>
            ))}
          </div>
        </div>

        {/* Question count */}
        {mode !== 'case_study' && (
          <div>
            <p className="text-[10px] font-semibold text-[#0D9488] uppercase tracking-widest mb-2">Questions per session</p>
            <div className="flex gap-2">
              {LIMITS.map(n => (
                <button
                  key={n}
                  onClick={() => setLimit(n)}
                  className={`w-12 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    limit === n
                      ? 'bg-[#0D9488] text-black border-[#0D9488]'
                      : 'bg-transparent text-[#888888] border-[#2A2A2A] hover:border-[#555555]'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quick start */}
        <button
          onClick={handleStartAll}
          className="w-full py-3.5 rounded-2xl bg-[#0D9488] text-black font-semibold text-sm flex items-center justify-between px-5"
        >
          <span>🎲 Surprise me</span>
          <span className="opacity-60 text-xs">
            {mode === 'case_study' ? 'Random cases →' : `Random ${limit} questions →`}
          </span>
        </button>

        {/* Topic list */}
        <div>
          <p className="text-[10px] font-semibold text-[#0D9488] uppercase tracking-widest mb-3">Choose a topic</p>
          <div className="flex flex-col gap-2">
            {sortedTopics.map(([topic, topicData]) => {
              const isTopicExpanded = expandedTopic === topic
              const sortedCats = Array.from(topicData.categories.entries()).sort((a, b) => {
                const ai = CAT_ORDER.indexOf(a[0])
                const bi = CAT_ORDER.indexOf(b[0])
                return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
              })

              return (
                <div key={topic} className="bg-[#141414] rounded-2xl overflow-hidden border border-[#1F1F1F]">
                  {/* Topic row */}
                  <div className="flex items-center gap-3 px-4 py-3.5">
                    <span className="text-xl">{getTopicIcon(topic)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{topic}</p>
                      <p className="text-xs text-[#888888]">
                        {topicData.total} {mode === 'case_study' ? 'cases' : 'questions'} · {sortedCats.length} {sortedCats.length === 1 ? 'category' : 'categories'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={buildUrl(topic)}
                        className="px-3 py-1.5 rounded-full bg-[#0D9488]/15 text-[#0D9488] text-xs font-semibold border border-[#0D9488]/20"
                      >
                        Start →
                      </Link>
                      <button
                        onClick={() => {
                          setExpandedTopic(isTopicExpanded ? null : topic)
                          setExpandedCategory(null)
                        }}
                        className="w-7 h-7 rounded-full bg-[#1F1F1F] flex items-center justify-center text-[#888888] text-xs transition-transform duration-200"
                        style={{ transform: isTopicExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                      >
                        ↓
                      </button>
                    </div>
                  </div>

                  {/* Category rows */}
                  {isTopicExpanded && (
                    <div className="border-t border-[#1F1F1F]">
                      {sortedCats.map(([cat, catData]) => {
                        const ck = categoryKey(topic, cat)
                        const isCatExpanded = expandedCategory === ck
                        const hasSubtopics = catData.subtopics.length > 0

                        return (
                          <div key={cat} className="border-b border-[#1F1F1F] last:border-0">
                            {/* Category row */}
                            <div className="flex items-center gap-3 px-5 py-3 bg-[#0D0D0D]">
                              <span className="text-base">{getCategoryIcon(cat)}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-white">{cat}</p>
                                <p className="text-[10px] text-[#888888]">
                                  {catData.total} {mode === 'case_study' ? 'cases' : 'questions'}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Link
                                  href={buildUrl(topic, cat)}
                                  className="px-2.5 py-1 rounded-full bg-[#141414] border border-[#2A2A2A] text-[#0D9488] text-xs font-semibold"
                                >
                                  Start →
                                </Link>
                                {hasSubtopics && (
                                  <button
                                    onClick={() => setExpandedCategory(isCatExpanded ? null : ck)}
                                    className="w-6 h-6 rounded-full bg-[#1F1F1F] flex items-center justify-center text-[#888888] text-[10px] transition-transform duration-200"
                                    style={{ transform: isCatExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                                  >
                                    ↓
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Subtopics */}
                            {isCatExpanded && hasSubtopics && (
                              <div>
                                {catData.subtopics
                                  .sort((a, b) => b.count - a.count)
                                  .map(sub => (
                                    <Link
                                      key={sub.name}
                                      href={buildUrl(topic, cat, sub.name)}
                                      className="flex items-center justify-between px-7 py-2.5 hover:bg-[#1A1A1A] transition-colors border-b border-[#1F1F1F] last:border-0 bg-[#0A0A0A]"
                                    >
                                      <span className="text-sm text-[#888888]">{sub.name}</span>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-[#555555]">
                                          {sub.count}{mode === 'case_study' ? 'c' : 'q'}
                                        </span>
                                        <span className="text-[#0D9488] text-xs">→</span>
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
    </div>
  )
}
