'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface TopicRow {
  topic: string
  subtopic: string | null
  count: number
}

interface Props {
  topicRows: TopicRow[]
  mode: 'mcq' | 'flashcard'
  totalAvailable: number
}

const DIFFICULTIES = ['all', 'easy', 'medium', 'hard'] as const
type Difficulty = typeof DIFFICULTIES[number]

const LIMITS = [5, 10, 20, 40] as const

// Map topics to icons
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
}

function getIcon(topic: string) {
  return TOPIC_ICONS[topic] ?? '📚'
}

export default function TopicSelectorClient({ topicRows, mode, totalAvailable }: Props) {
  const router = useRouter()
  const [difficulty, setDifficulty] = useState<Difficulty>('all')
  const [limit, setLimit] = useState<number>(10)
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null)

  // Group rows by topic
  const grouped = topicRows.reduce<Record<string, { total: number; subtopics: { name: string; count: number }[] }>>(
    (acc, row) => {
      if (!acc[row.topic]) acc[row.topic] = { total: 0, subtopics: [] }
      acc[row.topic].total += row.count
      if (row.subtopic) acc[row.topic].subtopics.push({ name: row.subtopic, count: row.count })
      return acc
    },
    {}
  )

  // Sort: largest topic first
  const sortedTopics = Object.entries(grouped).sort((a, b) => b[1].total - a[1].total)

  function buildUrl(topic?: string, subtopic?: string) {
    const params = new URLSearchParams()
    if (topic) params.set('topic', topic)
    if (subtopic) params.set('subtopic', subtopic)
    if (difficulty !== 'all') params.set('difficulty', difficulty)
    params.set('limit', String(limit))
    return `/practice/${mode}?${params.toString()}`
  }

  function handleStartAll() {
    router.push(buildUrl())
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white px-5 py-4 flex items-center gap-3 border-b border-gray-100">
        <Link
          href="/dashboard"
          className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500"
        >
          ←
        </Link>
        <div>
          <h1 className="text-base font-bold text-[#101010]">
            {mode === 'mcq' ? 'MCQ Practice' : 'Flashcards'}
          </h1>
          <p className="text-xs text-gray-400">{totalAvailable} questions available</p>
        </div>
      </div>

      <div className="flex-1 px-5 py-5 flex flex-col gap-5 pb-32">
        {/* Difficulty filter */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Difficulty</p>
          <div className="flex gap-2">
            {DIFFICULTIES.map(d => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all capitalize ${
                  difficulty === d
                    ? d === 'all' ? 'bg-[#101010] text-white border-[#101010]'
                    : d === 'easy' ? 'bg-green-500 text-white border-green-500'
                    : d === 'medium' ? 'bg-orange-400 text-white border-orange-400'
                    : 'bg-red-500 text-white border-red-500'
                    : 'bg-white text-gray-500 border-gray-200'
                }`}
              >
                {d === 'all' ? 'All levels' : d}
              </button>
            ))}
          </div>
        </div>

        {/* Question count */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Questions per session</p>
          <div className="flex gap-2">
            {LIMITS.map(n => (
              <button
                key={n}
                onClick={() => setLimit(n)}
                className={`w-12 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  limit === n
                    ? 'bg-[#0D9488] text-white border-[#0D9488]'
                    : 'bg-white text-gray-500 border-gray-200'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Quick start — all */}
        <button
          onClick={handleStartAll}
          className="w-full py-3.5 rounded-2xl bg-[#0D9488] text-white font-semibold text-sm flex items-center justify-between px-5"
        >
          <span>🎲 Surprise me</span>
          <span className="opacity-70 text-xs">Random {limit} questions →</span>
        </button>

        {/* Topic list */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Choose a topic</p>
          <div className="flex flex-col gap-2">
            {sortedTopics.map(([topic, data]) => {
              const isExpanded = expandedTopic === topic
              const hasSubtopics = data.subtopics.length > 1

              return (
                <div key={topic} className="bg-white rounded-2xl overflow-hidden shadow-sm">
                  {/* Topic row */}
                  <div className="flex items-center gap-3 px-4 py-3.5">
                    <span className="text-xl">{getIcon(topic)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#101010] truncate">{topic}</p>
                      <p className="text-xs text-gray-400">{data.total} questions</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Start all for this topic */}
                      <Link
                        href={buildUrl(topic)}
                        className="px-3 py-1.5 rounded-full bg-[#f0fdfb] text-[#0D9488] text-xs font-semibold"
                      >
                        Start →
                      </Link>
                      {/* Expand to see subtopics */}
                      {hasSubtopics && (
                        <button
                          onClick={() => setExpandedTopic(isExpanded ? null : topic)}
                          className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-xs transition-transform"
                          style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                        >
                          ↓
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Subtopics */}
                  {isExpanded && hasSubtopics && (
                    <div className="border-t border-gray-100">
                      {data.subtopics
                        .sort((a, b) => b.count - a.count)
                        .map(sub => (
                          <Link
                            key={sub.name}
                            href={buildUrl(topic, sub.name)}
                            className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                          >
                            <span className="text-sm text-gray-600">{sub.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400">{sub.count}q</span>
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
        </div>
      </div>
    </div>
  )
}
