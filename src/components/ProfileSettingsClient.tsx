'use client'

import { useState, useEffect } from 'react'
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

// Toggle: stopPropagation prevents the parent row div from also firing
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onChange(!checked) }}
      type="button"
      style={{
        position: 'relative', width: 46, height: 26, borderRadius: 999,
        border: 'none', cursor: 'pointer', flexShrink: 0, padding: 0,
        background: checked ? 'var(--teal)' : 'var(--surface-3)',
        transition: 'background .2s ease',
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: 3, width: 20, height: 20,
        borderRadius: '50%', background: '#fff',
        boxShadow: '0 1px 4px rgba(0,0,0,.2)',
        transform: checked ? 'translateX(20px)' : 'translateX(0)',
        transition: 'transform .2s ease', display: 'block',
      }} />
    </button>
  )
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="var(--text-faint)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .2s ease', flexShrink: 0 }}>
      <path d="M9 6l6 6-6 6"/>
    </svg>
  )
}

function SettingRow({
  icon, iconBg, iconFg, title, subtitle, right, onClick, borderTop = false,
}: {
  icon: React.ReactNode; iconBg: string; iconFg: string;
  title: string; subtitle: string; right: React.ReactNode;
  onClick?: () => void; borderTop?: boolean;
}) {
  // Use div (not button) to avoid nesting buttons (Toggle is a button)
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px',
        borderTop: borderTop ? '1px solid var(--border)' : undefined,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background .15s ease',
      }}
      className="settings-row-item"
    >
      <div style={{ width: 40, height: 40, borderRadius: 12, background: iconBg, color: iconFg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1, textAlign: 'left' }}>
        <p style={{ margin: 0, fontSize: 14.5, fontWeight: 800, color: 'var(--text)' }}>{title}</p>
        <p style={{ margin: '1px 0 0', fontSize: 12.5, color: 'var(--text-faint)', fontWeight: 600 }}>{subtitle}</p>
      </div>
      {right}
      <style>{`.settings-row-item:hover { background: var(--surface-2); }`}</style>
    </div>
  )
}

export default function ProfileSettingsClient({ userId, initialStudyYear, initialAllowRepeat, initialShowTags }: Props) {
  const [studyYear, setStudyYear] = useState<StudyYear | null>(initialStudyYear)
  const [allowRepeat, setAllowRepeat] = useState(initialAllowRepeat)
  const [showTags, setShowTags] = useState(initialShowTags)
  const [yearPickerOpen, setYearPickerOpen] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    setIsDark(document.documentElement.dataset.theme === 'dark')
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.dataset.theme === 'dark')
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

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

  function toggleDark() {
    const fn = (window as Window & { __toggleTheme?: () => void }).__toggleTheme
    if (fn) fn()
  }

  const currentYearLabel = STUDY_YEARS.find(y => y.value === studyYear)?.label ?? 'Not set'

  return (
    <>
      {/* Study year */}
      <SettingRow
        icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>}
        iconBg="var(--teal-tint)" iconFg="var(--teal)"
        title="Study year"
        subtitle={saving === 'study_year' ? 'Saving…' : currentYearLabel}
        right={<Chevron open={yearPickerOpen} />}
        onClick={() => setYearPickerOpen(o => !o)}
        borderTop
      />

      {yearPickerOpen && (
        <div style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)', padding: '6px 0' }}>
          {STUDY_YEARS.map(y => (
            <button key={y.value} type="button" onClick={() => handleYearChange(y.value)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', padding: '10px 20px 10px 74px', border: 'none',
                background: studyYear === y.value ? 'var(--teal-tint)' : 'transparent',
                color: studyYear === y.value ? 'var(--teal)' : 'var(--text-soft)',
                fontSize: 14, fontWeight: studyYear === y.value ? 800 : 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
              {y.label}
              {studyYear === y.value && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12l6 6 10-10"/>
                </svg>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Repeat questions — Toggle is the only interactive element */}
      <SettingRow
        icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>}
        iconBg="var(--surface-3)" iconFg="var(--text-soft)"
        title="Repeat questions"
        subtitle={saving === 'allow_repeat_questions' ? 'Saving…' : 'Show already-answered questions'}
        right={
          <Toggle checked={allowRepeat} onChange={v => {
            setAllowRepeat(v)
            save({ allow_repeat_questions: v })
          }} />
        }
        borderTop
        // No onClick — toggle only
      />

      {/* Show topic tags — Toggle is the only interactive element */}
      <SettingRow
        icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>}
        iconBg="var(--surface-3)" iconFg="var(--text-soft)"
        title="Show topic tags"
        subtitle={saving === 'show_question_tags' ? 'Saving…' : 'Display topic/subtopic on questions'}
        right={
          <Toggle checked={showTags} onChange={v => {
            setShowTags(v)
            save({ show_question_tags: v })
          }} />
        }
        borderTop
        // No onClick — toggle only
      />

      {/* Dark mode */}
      <SettingRow
        icon={isDark
          ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
        }
        iconBg={isDark ? 'rgba(120,90,200,.12)' : 'rgba(250,200,60,.12)'}
        iconFg={isDark ? '#A855F7' : '#EAB308'}
        title="Dark mode"
        subtitle={isDark ? 'On' : 'Off'}
        right={<Toggle checked={isDark} onChange={toggleDark} />}
        borderTop
        // No onClick — toggle only
      />
    </>
  )
}
