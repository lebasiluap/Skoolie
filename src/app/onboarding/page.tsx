'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profession } from '@/types'

const professions: { value: Profession; label: string; icon: string; description: string }[] = [
  { value: 'pharmacy', label: 'Pharmacy', icon: '💊', description: 'Pharmacology, Clinical Pharmacy & more' },
  { value: 'medicine', label: 'Medicine', icon: '🩺', description: 'Anatomy, Pathology, Clinical Medicine & more' },
  { value: 'nursing', label: 'Nursing', icon: '💉', description: 'Patient Care, Pharmacology & more' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [selected, setSelected] = useState<Profession | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleContinue() {
    if (!selected) return
    setLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    // Create user profile
    const { error } = await supabase.from('user_profiles').upsert({
      id: user.id,
      email: user.email!,
      full_name: user.user_metadata?.full_name || user.email!.split('@')[0],
      profession: selected,
      country: 'Ghana',
    })

    if (error) {
      console.error(error)
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-white flex flex-col px-6 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-[#101010]">Who are you?</h1>
        <p className="text-gray-500 mt-2 text-sm leading-relaxed">
          This personalises your content and your leaderboard rankings.
        </p>
      </div>

      <div className="flex flex-col gap-4 flex-1">
        {professions.map(p => (
          <button
            key={p.value}
            onClick={() => setSelected(p.value)}
            className={`w-full text-left px-5 py-5 rounded-2xl border-2 transition-all flex items-center gap-4 ${
              selected === p.value
                ? 'border-[#0D9488] bg-[#f0fdfb]'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <span className="text-3xl">{p.icon}</span>
            <div>
              <p className={`font-semibold text-base ${selected === p.value ? 'text-[#0D9488]' : 'text-[#101010]'}`}>
                {p.label}
              </p>
              <p className="text-gray-500 text-sm mt-0.5">{p.description}</p>
            </div>
            {selected === p.value && (
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
          onClick={handleContinue}
          disabled={!selected || loading}
          className="w-full py-3.5 rounded-full bg-[#0D9488] text-white font-semibold text-base hover:bg-[#0b7a6e] transition-colors disabled:opacity-40"
        >
          {loading ? 'Setting up your account...' : 'Continue'}
        </button>
        {!selected && (
          <p className="text-center text-xs text-gray-400 mt-3">Select a profession to continue</p>
        )}
      </div>
    </div>
  )
}
