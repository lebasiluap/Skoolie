'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { StudyYear } from '@/types'

const STUDY_YEARS: { value: StudyYear; label: string }[] = [
  { value: 'year1', label: 'Year 1' },
  { value: 'year2', label: 'Year 2' },
  { value: 'year3', label: 'Year 3' },
  { value: 'year4', label: 'Year 4' },
  { value: 'year5', label: 'Year 5' },
  { value: 'year6', label: 'Year 6' },
  { value: 'practitioner', label: 'Practitioner' },
]

interface Props {
  userId: string
  initialStudyYear: StudyYear | null
  initialAllowRepeat: boolean
  initialShowTags: boolean
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
        checked ? 'bg-[#0D9488]' : 'bg-[#2A2A2A]'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

export default function ProfileSettingsClient({
  userId,
  initialStudyYear,
  initialAllowRepeat,
  initialShowTags,
}: Props) {
  const [studyYear, setStudyYear] = useState<StudyYear | null>(initialStudyYear)
  const [allowRepeat, setAllowRepeat] = useState(initialAllowRepeat)
  const [showTags, setShowTags] = useState(initialShowTags)
  const [yearPickerOpen, setYearPickerOpen] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)

  async function save(patch: Record<string, unknown>) {
    const key = Object.keys(patch)[0]
    setSaving(key)
    const supabase = createClient()
    await supabase.from('user_profiles').update(patch).eq('id', userId)
    setSaving(null)
  }

  async function handleYearChange(year: StudyYear) {
    setStudyYear(year)
    setYearPickerOpen(false)
    await save({ study_year: year })
  }

  async function handleAllowRepeatChange(val: boolean) {
    setAllowRepeat(val)
    await save({ allow_repeat_questions: val })
  }

  async function handleShowTagsChange(val: boolean) {
    setShowTags(val)
    await save({ show_question_tags: val })
  }

  const currentYearLabel = STUDY_YEARS.find(y => y.value === studyYear)?.label ?? 'Not set'

  return (
    <div className="flex flex-col">
      {/* Study year */}
      <div>
        <button
          onClick={() => setYearPickerOpen(o => !o)}
          className="w-full flex items-center justify-between px-4 py-4 border-b border-[#1F1F1F] hover:bg-[#1A1A1A] transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">🎓</span>
            <div className="text-left">
              <p className="text-sm font-semibold text-white">Study year</p>
              <p className="text-xs text-[#888888]">
                {saving === 'study_year' ? 'Saving…' : currentYearLabel}
              </p>
            </div>
          </div>
          <span className={`text-[#555555] text-lg transition-transform duration-200 ${yearPickerOpen ? 'rotate-90' : ''}`}>→</span>
        </button>

        {yearPickerOpen && (
          <div className="border-b border-[#1F1F1F] bg-[#0A0A0A]">
            {STUDY_YEARS.map(y => (
              <button
                key={y.value}
                onClick={() => handleYearChange(y.value)}
                className={`w-full text-left px-6 py-2.5 text-sm transition-colors ${
                  studyYear === y.value
                    ? 'text-[#0D9488] font-semibold bg-[#0D9488]/10'
                    : 'text-[#888888] hover:bg-[#1A1A1A] hover:text-white'
                }`}
              >
                {y.label}
                {studyYear === y.value && ' ✓'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Allow repeat questions */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-[#1F1F1F]">
        <div className="flex items-center gap-3">
          <span className="text-xl">🔁</span>
          <div>
            <p className="text-sm font-semibold text-white">Repeat questions</p>
            <p className="text-xs text-[#888888]">
              {saving === 'allow_repeat_questions' ? 'Saving…' : 'Show already-answered questions'}
            </p>
          </div>
        </div>
        <Toggle checked={allowRepeat} onChange={handleAllowRepeatChange} />
      </div>

      {/* Show question tags */}
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-3">
          <span className="text-xl">🏷️</span>
          <div>
            <p className="text-sm font-semibold text-white">Show topic tags</p>
            <p className="text-xs text-[#888888]">
              {saving === 'show_question_tags' ? 'Saving…' : 'Display topic/subtopic on questions'}
            </p>
          </div>
        </div>
        <Toggle checked={showTags} onChange={handleShowTagsChange} />
      </div>
    </div>
  )
}
