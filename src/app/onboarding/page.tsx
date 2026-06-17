'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profession, StudyYear } from '@/types'

const PROFESSIONS: { value: Profession; label: string; icon: string; description: string }[] = [
  { value: 'pharmacy', label: 'Pharmacy',  icon: '💊', description: 'Pharmacology, Clinical Pharmacy & more' },
  { value: 'medicine', label: 'Medicine',  icon: '🩺', description: 'Anatomy, Pathology, Clinical Medicine & more' },
  { value: 'nursing',  label: 'Nursing',   icon: '💉', description: 'Patient Care, Pharmacology & more' },
]

const STUDY_YEARS: { value: StudyYear; label: string; sub: string }[] = [
  { value: 'year1', label: 'Year 1', sub: 'First year of study' },
  { value: 'year2', label: 'Year 2', sub: 'Second year of study' },
  { value: 'year3', label: 'Year 3', sub: 'Third year of study' },
  { value: 'year4', label: 'Year 4', sub: 'Fourth year of study' },
  { value: 'year5', label: 'Year 5', sub: 'Fifth year of study' },
  { value: 'year6', label: 'Year 6', sub: 'Final year / internship' },
  { value: 'practitioner', label: 'Practitioner', sub: 'Qualified & practising' },
]

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

    if (!user) {
      router.push('/login')
      return
    }

    const { error } = await supabase.from('user_profiles').upsert({
      id: user.id,
      email: user.email!,
      full_name: user.user_metadata?.full_name || user.email!.split('@')[0],
      profession,
      study_year: studyYear,
      country: 'Ghana',
    })

    if (error) {
      console.error(error)
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  // ── Step 1: Profession ────────────────────────────────────────────────────
  if (step === 'profession') {
    return (
      <div className="min-h-screen bg-white flex flex-col px-6 py-12">
        <div className="mb-2">
          <div className="flex gap-1.5 mb-8">
            <div className="h-1 flex-1 rounded-full bg-[#0D9488]" />
            <div className="h-1 flex-1 rounded-full bg-gray-200" />
          </div>
          <h1 className="text-3xl font-bold text-[#101010]">Who are you?</h1>
          <p className="text-gray-500 mt-2 text-sm leading-relaxed">
            This personalises your content and your leaderboard rankings.
          </p>
        </div>

        <div className="flex flex-col gap-4 flex-1 mt-6">
          {PROFESSIONS.map(p => (
            <button
              key={p.value}
              onClick={() => setProfession(p.value)}
              className={`w-full text-left px-5 py-5 rounded-2xl border-2 transition-all flex items-center gap-4 ${
                profession === p.value
                  ? 'border-[#0D9488] bg-[#f0fdfb]'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <span className="text-3xl">{p.icon}</span>
              <div>
                <p className={`font-semibold text-base ${profession === p.value ? 'text-[#0D9488]' : 'text-[#101010]'}`}>
                  {p.label}
                </p>
                <p className="text-gray-500 text-sm mt-0.5">{p.description}</p>
              </div>
              {profession === p.value && (
                <div className="ml-auto w-6 h-6 rounded-full bg-[#0D9488] flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>

        <div className="mt-8">
          <button
            onClick={() => profession && setStep('year')}
            disabled={!profession}
            className="w-full py-3.5 rounded-full bg-[#0D9488] text-white font-semibold text-base hover:bg-[#0b7a6e] transition-colors disabled:opacity-40"
          >
            Continue
          </button>
          {!profession && (
            <p className="text-center text-xs text-gray-400 mt-3">Select a profession to continue</p>
          )}
        </div>
      </div>
    )
  }

  // ── Step 2: Year ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white flex flex-col px-6 py-12">
      <div className="mb-2">
        <div className="flex gap-1.5 mb-8">
          <div className="h-1 flex-1 rounded-full bg-[#0D9488]" />
          <div className="h-1 flex-1 rounded-full bg-[#0D9488]" />
        </div>
        <button
          onClick={() => setStep('profession')}
          className="text-sm text-gray-400 mb-4 flex items-center gap-1"
        >
          ← Back
        </button>
        <h1 className="text-3xl font-bold text-[#101010]">What year are you in?</h1>
        <p className="text-gray-500 mt-2 text-sm leading-relaxed">
          We'll prioritise content matched to your level.
        </p>
      </div>

      <div className="flex flex-col gap-3 flex-1 mt-6">
        {STUDY_YEARS.map(y => (
          <button
            key={y.value}
            onClick={() => setStudyYear(y.value)}
            className={`w-full text-left px-5 py-4 rounded-2xl border-2 transition-all flex items-center justify-between ${
              studyYear === y.value
                ? 'border-[#0D9488] bg-[#f0fdfb]'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div>
              <p className={`font-semibold text-sm ${studyYear === y.value ? 'text-[#0D9488]' : 'text-[#101010]'}`}>
                {y.label}
              </p>
              <p className="text-gray-400 text-xs mt-0.5">{y.sub}</p>
            </div>
            {studyYear === y.value && (
              <div className="w-6 h-6 rounded-full bg-[#0D9488] flex items-center justify-center shrink-0">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="mt-8">
        <button
          onClick={handleFinish}
          disabled={!studyYear || loading}
          className="w-full py-3.5 rounded-full bg-[#0D9488] text-white font-semibold text-base hover:bg-[#0b7a6e] transition-colors disabled:opacity-40"
        >
          {loading ? 'Setting up your account...' : 'Get started'}
        </button>
        {!studyYear && (
          <p className="text-center text-xs text-gray-400 mt-3">Select your year to continue</p>
        )}
      </div>
    </div>
  )
}
