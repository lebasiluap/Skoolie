'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSent(true)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-[#f0fdfb] flex items-center justify-center mb-6">
          <span className="text-4xl">📩</span>
        </div>
        <h1 className="text-2xl font-bold text-[#101010] mb-3">Reset link sent</h1>
        <p className="text-gray-500 text-sm leading-relaxed max-w-xs mb-10">
          Check your inbox at <span className="font-semibold text-[#101010]">{email}</span> for a link to reset your password.
        </p>
        <Link
          href="/login"
          className="w-full max-w-xs py-3 rounded-full border border-gray-200 text-[#101010] font-semibold text-sm hover:bg-gray-50 transition-colors text-center block"
        >
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col px-6 py-16">
      <Link href="/login" className="text-[#0D9488] text-sm font-semibold mb-10 block">
        ← Back to sign in
      </Link>

      <h1 className="text-2xl font-bold text-[#101010] mb-2">Forgot password?</h1>
      <p className="text-gray-500 text-sm mb-8">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email address</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@email.com"
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
          {loading ? 'Sending...' : 'Send reset link'}
        </button>
      </form>
    </div>
  )
}
