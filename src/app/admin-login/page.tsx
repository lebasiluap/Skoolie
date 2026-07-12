'use client'

// Discreet sign-in for the admin CMS. Public web login is retired (Skoolie
// lives in the mobile app), but /admin needs a browser session cookie — this
// page mints one via Google OAuth, then the /admin layout enforces that only
// the admin account gets in (everyone else bounces to /dashboard).
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AdminLoginPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        router.replace('/admin')
      } else {
        setChecking(false)
      }
    })
  }, [router])

  async function signIn() {
    setBusy(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/admin` },
    })
    if (error) {
      setError('Could not start sign-in. Try again.')
      setBusy(false)
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 380, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 24, padding: '36px 32px', textAlign: 'center', boxShadow: 'var(--shadow)' }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.02em' }}>Skoolie Admin</h1>
        <p style={{ margin: '8px 0 24px', fontSize: 13.5, color: 'var(--text-faint)', fontWeight: 600 }}>
          Restricted area. Sign in to continue.
        </p>

        {checking ? (
          <p style={{ fontSize: 13, color: 'var(--text-faint)', fontWeight: 600 }}>Checking session…</p>
        ) : (
          <button
            onClick={signIn}
            disabled={busy}
            style={{
              width: '100%', padding: '13px 16px', borderRadius: 14, border: 'none', cursor: busy ? 'default' : 'pointer',
              background: 'var(--teal)', color: '#fff', fontSize: 14.5, fontWeight: 800, fontFamily: 'inherit', opacity: busy ? 0.7 : 1,
            }}
          >
            {busy ? 'Redirecting…' : 'Continue with Google'}
          </button>
        )}

        {error && (
          <p style={{ marginTop: 14, fontSize: 12.5, color: 'var(--red)', fontWeight: 700 }}>{error}</p>
        )}
      </div>
    </main>
  )
}
