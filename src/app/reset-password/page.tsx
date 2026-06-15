'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setDone(true)
      setTimeout(() => router.push('/dashboard'), 2000)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-[#0D9488]/15 border border-[#0D9488]/30 flex items-center justify-center mb-6">
          <div className="w-12 h-12 rounded-full bg-[#0D9488] flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M5 12l5 5 9-9" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">Password updated!</h1>
        <p className="text-[#888888] text-sm">Taking you to your dashboard...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col px-6 py-16">
      <h1 className="text-2xl font-bold text-white mb-2">Set new password</h1>
      <p className="text-[#888888] text-sm mb-8">Choose a strong password for your account.</p>

      <form onSubmit={handleReset} className="flex flex-col gap-4">
        <div>
          <label className="text-[10px] font-semibold text-[#555555] uppercase tracking-widest">New password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Min. 6 characters"
            required
            minLength={6}
            className="mt-2 w-full px-4 py-3.5 rounded-xl bg-[#141414] border border-[#2A2A2A] text-white placeholder-[#555555] focus:outline-none focus:border-[#0D9488] focus:ring-1 focus:ring-[#0D9488]/50 transition-colors"
          />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-[#555555] uppercase tracking-widest">Confirm password</label>
          <input
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="Repeat your password"
            required
            className="mt-2 w-full px-4 py-3.5 rounded-xl bg-[#141414] border border-[#2A2A2A] text-white placeholder-[#555555] focus:outline-none focus:border-[#0D9488] focus:ring-1 focus:ring-[#0D9488]/50 transition-colors"
          />
        </div>

        {error && (
          <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-xl">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-full bg-[#0D9488] text-black font-semibold text-base hover:bg-[#0b7a6e] transition-colors disabled:opacity-50"
        >
          {loading ? 'Updating...' : 'Update password'}
        </button>
      </form>
    </div>
  )
}
