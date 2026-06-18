'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendSent, setResendSent] = useState(false)
  const [resending, setResending] = useState(false)

  const isUnconfirmed = error.toLowerCase().includes('email not confirmed')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResendSent(false)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  async function handleResendConfirmation() {
    setResending(true)
    const supabase = createClient()
    await supabase.auth.resend({ type: 'signup', email })
    setResending(false)
    setResendSent(true)
  }

  async function handleGoogleLogin() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'stretch', justifyContent: 'center', background: 'var(--bg)' }}>

      {/* ── Brand panel (desktop only) ─────────────────────────────────── */}
      <div className="login-brand-panel" style={{
        flex: '1 1 0', maxWidth: 560,
        background: 'var(--teal-deep)',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        padding: '56px 52px', position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', width: 520, height: 520, borderRadius: '50%', background: 'rgba(255,255,255,.06)', top: -180, right: -160 }} />
        <div style={{ position: 'absolute', width: 360, height: 360, borderRadius: '50%', background: 'rgba(242,119,78,.18)', bottom: -120, left: -100 }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 13, position: 'relative' }}>
          <img src="/logo.png" alt="Skoolie" style={{ width: 44, height: 44, filter: 'invert(1) brightness(1.6)' }} />
          <span style={{ fontSize: 23, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>Skoolie</span>
        </div>

        {/* Hero copy */}
        <div style={{ position: 'relative' }}>
          <h1 style={{ fontSize: 38, fontWeight: 800, color: '#fff', lineHeight: 1.12, letterSpacing: '-0.025em', margin: '0 0 18px' }}>
            Pass with<br />confidence.
          </h1>
          <p style={{ fontSize: 17, color: 'rgba(255,255,255,.72)', lineHeight: 1.55, margin: 0, maxWidth: 360 }}>
            Smart MCQs, flashcards and clinical cases for pharmacy, medicine and nursing exams — built around how you actually study.
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 30, flexWrap: 'wrap' }}>
            {['12,000+ questions', 'Daily streaks', 'Tutor explanations'].map(t => (
              <span key={t} style={{ fontSize: 13, fontWeight: 700, color: '#fff', background: 'rgba(255,255,255,.14)', padding: '8px 14px', borderRadius: 999 }}>{t}</span>
            ))}
          </div>
        </div>

        <p style={{ position: 'relative', fontSize: 13, color: 'rgba(255,255,255,.5)', margin: 0 }}>
          Your healthcare test companion
        </p>
      </div>

      {/* ── Form pane ─────────────────────────────────────────────────────── */}
      <div style={{ flex: '1 1 0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 24px' }}>
        <div style={{ width: '100%', maxWidth: 396 }}>

          {/* Mobile logo (hidden on desktop) */}
          <div className="login-mobile-logo" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
            <img src="/logo.png" alt="Skoolie" style={{ width: 56, height: 56, marginBottom: 14, filter: 'var(--logo-filter)' }} />
            <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>Skoolie</span>
          </div>

          <h2 style={{ fontSize: 27, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', margin: '0 0 6px' }}>Welcome back</h2>
          <p style={{ fontSize: 15, color: 'var(--text-soft)', margin: '0 0 28px' }}>Sign in to keep your streak alive 🔥</p>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 7 }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@email.com"
                required
                style={{
                  width: '100%', padding: '14px 16px', borderRadius: 14,
                  background: 'var(--surface-2)', border: '1.5px solid var(--border)',
                  color: 'var(--text)', fontSize: 15, fontWeight: 500, outline: 'none',
                  fontFamily: 'inherit',
                  transition: 'border-color .15s ease',
                }}
                onFocus={e => { e.target.style.borderColor = 'var(--teal)' }}
                onBlur={e => { e.target.style.borderColor = 'var(--border)' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                  Password
                </label>
                <Link href="/forgot-password" style={{ fontSize: 13, fontWeight: 700, color: 'var(--teal)', textDecoration: 'none' }}>
                  Forgot?
                </Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                style={{
                  width: '100%', padding: '14px 16px', borderRadius: 14,
                  background: 'var(--surface-2)', border: '1.5px solid var(--border)',
                  color: 'var(--text)', fontSize: 15, fontWeight: 500, outline: 'none',
                  fontFamily: 'inherit',
                  transition: 'border-color .15s ease',
                }}
                onFocus={e => { e.target.style.borderColor = 'var(--teal)' }}
                onBlur={e => { e.target.style.borderColor = 'var(--border)' }}
              />
            </div>

            {error && (
              <div style={{ background: 'var(--red-tint)', padding: '14px 16px', borderRadius: 14 }}>
                {isUnconfirmed ? (
                  <div>
                    <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 800, color: 'var(--red)' }}>Email not confirmed</p>
                    <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--red)' }}>Check your inbox for a confirmation email, or resend it below.</p>
                    {resendSent ? (
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>✓ Confirmation email sent — check your inbox.</p>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendConfirmation}
                        disabled={resending}
                        style={{ background: 'none', border: 'none', padding: 0, fontSize: 13, fontWeight: 700, color: 'var(--teal)', cursor: 'pointer', textDecoration: 'underline', opacity: resending ? 0.5 : 1 }}
                      >
                        {resending ? 'Sending...' : 'Resend confirmation email →'}
                      </button>
                    )}
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: 14, color: 'var(--red)', fontWeight: 600 }}>{error}</p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: 15, borderRadius: 999,
                background: 'var(--teal)', color: 'var(--on-teal)',
                fontSize: 16, fontWeight: 800, border: 'none', cursor: 'pointer',
                boxShadow: '0 8px 20px -8px var(--teal)', marginTop: 4,
                opacity: loading ? 0.7 : 1,
                transition: 'opacity .15s ease',
                fontFamily: 'inherit',
              }}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '24px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: 13, color: 'var(--text-faint)', fontWeight: 600 }}>or</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          <button
            onClick={handleGoogleLogin}
            style={{
              width: '100%', padding: 14, borderRadius: 999,
              background: 'var(--surface)', border: '1.5px solid var(--border-strong)',
              color: 'var(--text)', fontSize: 15, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              fontFamily: 'inherit',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-soft)', margin: '26px 0 0' }}>
            Don&apos;t have an account?{' '}
            <Link href="/signup" style={{ color: 'var(--teal)', fontWeight: 800, textDecoration: 'none' }}>Sign up</Link>
          </p>
        </div>
      </div>

      {/* ── Responsive ────────────────────────────────────────────────────── */}
      <style>{`
        @media (min-width: 760px) {
          .login-mobile-logo { display: none !important; }
          .login-brand-panel { display: flex !important; }
        }
        @media (max-width: 759px) {
          .login-mobile-logo { display: flex !important; }
          .login-brand-panel { display: none !important; }
        }
      `}</style>
    </div>
  )
}
