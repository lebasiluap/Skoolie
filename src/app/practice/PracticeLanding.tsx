'use client'

import { useState } from 'react'
import Link from 'next/link'

type Region = 'all' | 'universal' | 'ghana'

interface ModeStat {
  mode: 'mcq' | 'flashcard' | 'case_study'
  label: string
  icon: string
  description: string
  count: number
  path: string
  randomLimit: number
}

interface Props {
  mcqCount: number
  flashcardCount: number
  caseCount: number
  studyYear: string | null
  profession: string
}

const REGION_LABELS: Record<Region, string> = {
  all: 'All',
  universal: 'Global',
  ghana: 'Regional',
}

export default function PracticeLanding({ mcqCount, flashcardCount, caseCount, studyYear, profession }: Props) {
  const [region, setRegion] = useState<Region>('all')

  function buildUrl(path: string, extra: Record<string, string> = {}) {
    const params = new URLSearchParams(extra)
    if (region !== 'all') params.set('region', region)
    const qs = params.toString()
    return qs ? `${path}?${qs}` : path
  }

  const modes: ModeStat[] = [
    { mode: 'mcq',        label: 'MCQs',         icon: '📝', description: 'Multiple choice questions', count: mcqCount,       path: '/practice/mcq',        randomLimit: 10 },
    { mode: 'flashcard',  label: 'Flashcards',   icon: '🃏', description: 'Test your recall',          count: flashcardCount, path: '/practice/flashcards', randomLimit: 20 },
    { mode: 'case_study', label: 'Case Studies', icon: '🩺', description: 'Clinical scenarios',        count: caseCount,      path: '/practice/cases',      randomLimit: 0  },
  ]

  const PROF_LABELS: Record<string, string> = {
    pharmacy: 'Pharmacy',
    medicine: 'Medicine',
    nursing: 'Nursing',
    general: 'General',
  }

  const YEAR_LABELS: Record<string, string> = {
    year1: 'Year 1', year2: 'Year 2', year3: 'Year 3',
    year4: 'Year 4', year5: 'Year 5', year6: 'Year 6',
    practitioner: 'Practitioner',
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] pb-28">
      {/* Header */}
      <div className="bg-[#0A0A0A] px-5 pt-12 pb-6 border-b border-[#1F1F1F]">
        <h1 className="text-white text-2xl font-bold">Practice</h1>
        <p className="text-[#888888] text-sm mt-1">
          {PROF_LABELS[profession] ?? profession}
          {studyYear ? ` · ${YEAR_LABELS[studyYear] ?? studyYear}` : ''}
        </p>
      </div>

      <div className="px-5 py-5 flex flex-col gap-5">
        {/* Region toggle */}
        <div>
          <p className="text-[10px] font-semibold text-[#0D9488] uppercase tracking-widest mb-2">Question set</p>
          <div className="bg-[#141414] rounded-2xl p-1.5 flex gap-1 border border-[#1F1F1F]">
            {(['all', 'universal', 'ghana'] as Region[]).map(r => (
              <button
                key={r}
                onClick={() => setRegion(r)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  region === r
                    ? 'bg-[#0D9488] text-black shadow-sm'
                    : 'text-[#888888] hover:text-white'
                }`}
              >
                {r === 'all' ? '🌍 All' : r === 'universal' ? '🌐 Global' : '🇬🇭 Regional'}
              </button>
            ))}
          </div>
          <p className="text-xs text-[#555555] mt-1.5 px-1">
            {region === 'all' ? 'Showing all available questions' :
             region === 'universal' ? 'Showing globally applicable questions only' :
             'Showing Ghana-specific questions only'}
          </p>
        </div>

        {/* Mode cards */}
        <div className="flex flex-col gap-3">
          {modes.map(m => (
            <div key={m.mode} className="bg-[#141414] rounded-2xl border border-[#1F1F1F] overflow-hidden">
              {/* Card header */}
              <div className="px-5 pt-5 pb-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#0D9488]/15 border border-[#0D9488]/20 flex items-center justify-center text-2xl">
                  {m.icon}
                </div>
                <div className="flex-1">
                  <p className="text-base font-bold text-white">{m.label}</p>
                  <p className="text-xs text-[#888888]">{m.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-[#0D9488]">{m.count}</p>
                  <p className="text-[10px] text-[#555555]">{m.mode === 'case_study' ? 'cases' : 'questions'}</p>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-[#1F1F1F] mx-5" />

              {/* Action buttons */}
              <div className="px-5 py-4 flex gap-3">
                <Link
                  href={buildUrl(m.path, { random: '1', ...(m.randomLimit ? { limit: String(m.randomLimit) } : {}) })}
                  className="flex-1 py-3 rounded-full bg-[#0D9488] text-black text-sm font-semibold text-center hover:bg-[#0b7a6e] transition-colors"
                >
                  🎲 Start Random
                </Link>
                <Link
                  href={buildUrl(m.path)}
                  className="flex-1 py-3 rounded-full border border-[#2A2A2A] text-white text-sm font-semibold text-center hover:bg-[#1A1A1A] transition-colors"
                >
                  Browse Topics
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Bookmarks shortcut */}
        <Link
          href="/bookmarks"
          className="flex items-center justify-between px-5 py-4 bg-[#141414] rounded-2xl border border-[#1F1F1F] hover:bg-[#1A1A1A] transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">🔖</span>
            <div>
              <p className="text-sm font-semibold text-white">Bookmarks</p>
              <p className="text-xs text-[#888888]">Questions you&apos;ve saved</p>
            </div>
          </div>
          <span className="text-[#555555] text-lg">→</span>
        </Link>
      </div>
    </div>
  )
}
