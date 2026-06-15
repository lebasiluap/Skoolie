'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    if (data.user) {
      if (data.session) {
        router.push('/onboarding')
      } else {
        router.push('/verify-email')
      }
    }
  }

  async function handleGoogleSignup() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/onboarding` },
    })
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col px-6">
      {/* Brand */}
      <div className="pt-14 pb-8">
        <h2 className="text-3xl font-bold text-white">Create account</h2>
        <p className="text-[#888888] mt-2 text-sm">Join thousands of healthcare students</p>
      </div>

      {/* Form */}
      <div className="flex-1 pb-12">
        <form onSubmit={handleSignup} className="flex flex-col gap-4">
          <div>
            <label className="text-[10px] font-semibold text-[#555555] uppercase tracking-widest">Full name</label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Your full name"
              required
              className="mt-2 w-full px-4 py-3.5 rounded-xl bg-[#141414] border border-[#2A2A2A] text-white placeholder-[#555555] focus:outline-none focus:border-[#0D9488] focus:ring-1 focus:ring-[#0D9488]/50 transition-colors"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-[#555555] uppercase tracking-widest">Email address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@email.com"
              required
              className="mt-2 w-full px-4 py-3.5 rounded-xl bg-[#141414] border border-[#2A2A2A] text-white placeholder-[#555555] focus:outline-none focus:border-[#0D9488] focus:ring-1 focus:ring-[#0D9488]/50 transition-colors"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-[#555555] uppercase tracking-widest">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Create a strong password"
              required
              minLength={6}
              className="mt-2 w-full px-4 py-3.5 rounded-xl bg-[#141414] border border-[#2A2A2A] text-white placeholder-[#555555] focus:outline-none focus:border-[#0D9488] focus:ring-1 focus:ring-[#0D9488]/50 transition-colors"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-xl">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-full bg-[#0D9488] text-black font-semibold text-base hover:bg-[#0b7a6e] transition-colors disabled:opacity-50 mt-2"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-[#2A2A2A]" />
          <span className="text-[#555555] text-sm">or</span>
          <div className="flex-1 h-px bg-[#2A2A2A]" />
        </div>

        <button
          onClick={handleGoogleSignup}
          className="w-full py-3.5 rounded-full border border-[#2A2A2A] bg-[#141414] text-white font-semibold text-base hover:bg-[#1A1A1A] transition-colors flex items-center justify-center gap-2"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <p className="text-center text-sm text-[#888888] mt-8">
          Already have an account?{' '}
          <Link href="/login" className="text-[#0D9488] font-semibold">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
