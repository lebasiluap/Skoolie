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
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-[#f0fdfb] flex items-center justify-center mb-6">
          <div className="w-12 h-12 rounded-full bg-[#0D9488] flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M5 12l5 5 9-9" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-[#101010] mb-3">Password updated!</h1>
        <p className="text-gray-400 text-sm">Taking you to your dashboard...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col px-6 py-16">
      <h1 className="text-2xl font-bold text-[#101010] mb-2">Set new password</h1>
      <p className="text-gray-500 text-sm mb-8">Choose a strong password for your account.</p>

      <form onSubmit={handleReset} className="flex flex-col gap-4">
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">New password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Min. 6 characters"
            required
            minLength={6}
            className="mt-1 w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-[#101010] placeholder-gray-400 focus:outline-none focus:border-[#0D9488] focus:ring-1 focus:ring-[#0D9488]"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Confirm password</label>
          <input
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="Repeat your password"
            required
            className="mt-1 w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-[#101010] placeholder-gray-400 focus:outline-none focus:border-[#0D9488] focus:ring-1 focus:ring-[#0D9488]"
          />
        </div>

        {error && (
          <p className="text-red-500 text-sm bg-red-50 px-4 py-3 rounded-xl">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-full bg-[#0D9488] text-white font-semibold text-base hover:bg-[#0b7a6e] transition-colors disabled:opacity-60"
        >
          {loading ? 'Updating...' : 'Update password'}
        </button>
      </form>
    </div>
  )
}
