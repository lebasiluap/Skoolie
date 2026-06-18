'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profession, StudyYear } from '@/types'

const PROFESSIONS: { value: Profession; label: string; icon: string; description: string; color: string; bg: string }[] = [
  { value: 'pharmacy', label: 'Pharmacy',  icon: '💊', description: 'Pharmacology, Clinical Pharmacy & more', color: 'var(--teal)',   bg: 'var(--teal-tint)' },
  { value: 'medicine', label: 'Medicine',  icon: '🩺', description: 'Anatomy, Pathology, Clinical Medicine & more', color: 'var(--green)',  bg: 'var(--green-tint)' },
  { value: 'nursing',  label: 'Nursing',   icon: '💉', description: 'Patient Care, Pharmacology & more', color: 'var(--coral)',  bg: 'var(--coral-tint)' },
]

// Year options per profession
const ALL_YEARS: { value: StudyYear; label: string; sub: string }[] = [
  { value: 'year1', label: 'Year 1', sub: 'First year' },
  { value: 'year2', label: 'Year 2', sub: 'Second year' },
  { value: 'year3', label: 'Year 3', sub: 'Third year' },
  { value: 'year4', label: 'Year 4', sub: 'Fourth year' },
  { value: 'year5', label: 'Year 5', sub: 'Fifth year' },
  { value: 'year6', label: 'Year 6', sub: 'Final year / internship' },
  { value: 'practitioner', label: 'Practitioner', sub: 'Qualified & practising' },
]

const YEARS_FOR_PROFESSION: Record<Profession, StudyYear[]> = {
  pharmacy:  ['year1','year2','year3','year4','year5','year6','practitioner'],
  medicine:  ['year1','year2','year3','year4','year5','year6','practitioner'],
  nursing:   ['year1','year2','year3','year4','practitioner'],
  general:   ['year1','year2','year3','year4','year5','year6','practitioner'],
}

type Step = 'profession' | 'year'

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('profession')
  const [profession, setProfession] = useState<Profession | null>(null)
  const [studyYear, setStudyYear] = useState<StudyYear | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleFinish() {
    if (!profession || !studyYear) return
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { error } = await supabase.from('user_profiles').upsert({
      id: user.id, email: user.email!,
      full_name: user.user_metadata?.full_name || user.email!.split('@')[0],
      profession, study_year: studyYear, country: 'Ghana',
    })
    if (error) { console.error(error); setLoading(false); return }
    router.push('/dashboard')
  }

  const availableYears = profession ? ALL_YEARS.filter(y => YEARS_FOR_PROFESSION[profession].includes(y.value)) : []
  const selectedProf = PROFESSIONS.find(p => p.value === profession)

  // ── Step 1: Profession ──────────────────────────────────────────────────────
  if (step === 'profession') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', padding: 'clamp(28px,5vw,60px) clamp(20px,5vw,40px)' }}>
        {/* Progress */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 36 }}>
          <div style={{ height: 4, flex: 1, borderRadius: 999, background: 'var(--teal)' }} />
          <div style={{ height: 4, flex: 1, borderRadius: 999, background: 'var(--surface-3)' }} />
        </div>

        <div style={{ maxWidth: 460, width: '100%', margin: '0 auto', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: 28 }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: 'var(--teal-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, marginBottom: 16 }}>👤</div>
            <h1 style={{ margin: 0, fontSize: 'clamp(26px,4vw,32px)', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.025em' }}>Who are you?</h1>
            <p style={{ margin: '8px 0 0', fontSize: 15, color: 'var(--text-soft)', fontWeight: 600, lineHeight: 1.5 }}>
              This personalises your content and leaderboard.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
            {PROFESSIONS.map(p => {
              const selected = profession === p.value
              return (
                <button key={p.value} type="button" onClick={() => setProfession(p.value)}
                  style={{
                    width: '100%', textAlign: 'left', padding: '18px 20px',
                    borderRadius: 20, border: `2px solid ${selected ? p.color : 'var(--border)'}`,
                    background: selected ? p.bg : 'var(--surface)',
                    display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer',
                    fontFamily: 'inherit', transition: 'all .18s ease', boxShadow: selected ? 'var(--shadow)' : 'none',
                  }}>
                  <div style={{ width: 50, height: 50, borderRadius: 14, background: selected ? p.color : 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0, transition: 'background .18s ease' }}>
                    {p.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: selected ? p.color : 'var(--text)' }}>{p.label}</p>
                    <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--text-faint)', fontWeight: 600 }}>{p.description}</p>
                  </div>
                  {selected && (
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 12l6 6 10-10"/>
                      </svg>
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          <div style={{ marginTop: 28 }}>
            <button type="button" onClick={() => profession && setStep('year')} disabled={!profession}
              style={{
                width: '100%', padding: '16px 0', borderRadius: 999, border: 'none',
                background: profession ? 'var(--teal)' : 'var(--surface-3)',
                color: profession ? 'var(--on-teal)' : 'var(--text-faint)',
                fontSize: 16, fontWeight: 800, cursor: profession ? 'pointer' : 'default',
                fontFamily: 'inherit', transition: 'all .18s ease',
              }}>
              Continue
            </button>
            {!profession && (
              <p style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--text-faint)', fontWeight: 600, marginTop: 10 }}>Select a profession to continue</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Step 2: Year ────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', padding: 'clamp(28px,5vw,60px) clamp(20px,5vw,40px)' }}>
      {/* Progress */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 36 }}>
        <div style={{ height: 4, flex: 1, borderRadius: 999, background: 'var(--teal)' }} />
        <div style={{ height: 4, flex: 1, borderRadius: 999, background: 'var(--teal)' }} />
      </div>

      <div style={{ maxWidth: 460, width: '100%', margin: '0 auto', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <button type="button" onClick={() => setStep('profession')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: 'transparent', color: 'var(--text-faint)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 16, padding: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6"/></svg>
          Back
        </button>

        <div style={{ marginBottom: 24 }}>
          {selectedProf && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderRadius: 999, background: selectedProf.bg, marginBottom: 14 }}>
              <span style={{ fontSize: 16 }}>{selectedProf.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: selectedProf.color }}>{selectedProf.label}</span>
            </div>
          )}
          <h1 style={{ margin: 0, fontSize: 'clamp(26px,4vw,32px)', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.025em' }}>What year are you in?</h1>
          <p style={{ margin: '8px 0 0', fontSize: 15, color: 'var(--text-soft)', fontWeight: 600, lineHeight: 1.5 }}>
            We&apos;ll prioritise content matched to your level.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
          {availableYears.map(y => {
            const selected = studyYear === y.value
            return (
              <button key={y.value} type="button" onClick={() => setStudyYear(y.value)}
                style={{
                  width: '100%', textAlign: 'left', padding: '16px 20px',
                  borderRadius: 18, border: `2px solid ${selected ? 'var(--teal)' : 'var(--border)'}`,
                  background: selected ? 'var(--teal-tint)' : 'var(--surface)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all .18s ease',
                  boxShadow: selected ? 'var(--shadow)' : 'none',
                }}>
                <div>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: selected ? 'var(--teal)' : 'var(--text)' }}>{y.label}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--text-faint)', fontWeight: 600 }}>{y.sub}</p>
                </div>
                {selected && (
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 12l6 6 10-10"/>
                    </svg>
                  </div>
                )}
              </button>
            )
          })}
        </div>

        <div style={{ marginTop: 28 }}>
          <button type="button" onClick={handleFinish} disabled={!studyYear || loading}
            style={{
              width: '100%', padding: '16px 0', borderRadius: 999, border: 'none',
              background: studyYear && !loading ? 'var(--teal)' : 'var(--surface-3)',
              color: studyYear && !loading ? 'var(--on-teal)' : 'var(--text-faint)',
              fontSize: 16, fontWeight: 800, cursor: studyYear && !loading ? 'pointer' : 'default',
              fontFamily: 'inherit', transition: 'all .18s ease',
            }}>
            {loading ? 'Setting up your account…' : 'Get started'}
          </button>
          {!studyYear && (
            <p style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--text-faint)', fontWeight: 600, marginTop: 10 }}>Select your year to continue</p>
          )}
        </div>
      </div>
    </div>
  )
}
