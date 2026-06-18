'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

// ── Icons ────────────────────────────────────────────────────────────────────

function DashIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.7V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.7"/><path d="M9.5 21v-6h5v6"/>
    </svg>
  )
}
function PracticeIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="4" width="14" height="17" rx="2.5"/><path d="M9 4.5V3.6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v.9"/><path d="M9 13.2l2 2 4-4.5"/>
    </svg>
  )
}
function ProgressIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 20.5V12"/><path d="M12 20.5V4"/><path d="M19 20.5v-6"/>
    </svg>
  )
}
function ProfileIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>
    </svg>
  )
}
function SearchIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
    </svg>
  )
}
function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"/>
    </svg>
  )
}
function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  )
}

// ── Nav items ────────────────────────────────────────────────────────────────

const NAV = [
  { label: 'Dashboard', href: '/dashboard',  Icon: DashIcon     },
  { label: 'Practice',  href: '/practice',   Icon: PracticeIcon },
  { label: 'Search',    href: '/search',     Icon: SearchIcon   },
  { label: 'Progress',  href: '/progress',   Icon: ProgressIcon },
  { label: 'Profile',   href: '/profile',    Icon: ProfileIcon  },
] as const

function isActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === href
  return pathname.startsWith(href.split('/').slice(0, 2).join('/'))
}

const RUNNER_PATHS: string[] = []  // nav visible everywhere

// ── Theme toggle ─────────────────────────────────────────────────────────────

function ThemeToggle({ className = '' }: { className?: string }) {
  function toggle() {
    const w = window as Window & { __toggleTheme?: () => void }
    w.__toggleTheme?.()
  }
  return (
    <button onClick={toggle} aria-label="Toggle theme" className={className}>
      <span className="dark-icon hidden" aria-hidden="true"><SunIcon /></span>
      <span className="light-icon" aria-hidden="true"><MoonIcon /></span>
      <style>{`
        html[data-theme="dark"] .dark-icon { display: flex !important; }
        html[data-theme="dark"] .light-icon { display: none !important; }
      `}</style>
    </button>
  )
}

// ── Avatar chip ───────────────────────────────────────────────────────────────

function AvatarChip({ size, fontSize }: { size: number; fontSize: number }) {
  const [info, setInfo] = useState<{ initials: string; avatarUrl: string | null; name: string }>({
    initials: '…',
    avatarUrl: null,
    name: 'My account',
  })

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('user_profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single()
        .then(({ data: profile }) => {
          if (!profile) return
          const initials =
            (profile.full_name as string)
              ?.split(' ')
              .filter(Boolean)
              .map((n: string) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2) ?? '?'
          setInfo({
            initials,
            avatarUrl: (profile.avatar_url as string) ?? null,
            name: (profile.full_name as string) ?? 'My account',
          })
        })
    })
  }, [])

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'var(--teal)', color: 'var(--on-teal)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 800, fontSize, flexShrink: 0, overflow: 'hidden',
    }}>
      {info.avatarUrl ? (
        <img src={info.avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : info.initials}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function BottomNav() {
  const pathname = usePathname()
  const isRunner = RUNNER_PATHS.some(p => pathname.startsWith(p))

  const [userName, setUserName] = useState('My account')
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('user_profiles').select('full_name').eq('id', user.id).single()
        .then(({ data }) => { if (data?.full_name) setUserName(data.full_name as string) })
    })
  }, [])

  const pageTitle = (() => {
    if (pathname.startsWith('/dashboard')) return 'Dashboard'
    if (pathname.startsWith('/practice')) return 'Practice'
    if (pathname.startsWith('/progress'))  return 'Progress'
    if (pathname.startsWith('/profile'))   return 'Profile'
    if (pathname.startsWith('/bookmarks')) return 'Bookmarks'
    return 'Skoolie'
  })()

  return (
    <>
      {/* ── Desktop sidebar (≥980px) ─────────────────────────────────────── */}
      <aside className="app-sidebar" style={{
        width: 250, height: '100vh', position: 'fixed', top: 0, left: 0,
        background: 'var(--surface)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', padding: '22px 16px', zIndex: 40,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '6px 8px 22px' }}>
          <img src="/logo.png" alt="Skoolie" style={{ width: 38, height: 38, filter: 'var(--logo-filter)' }} />
          <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>Skoolie</span>
        </div>

        {/* Nav items */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {NAV.map(({ label, href, Icon }) => {
            const active = isActive(pathname, href)
            return (
              <Link key={href} href={href} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px',
                borderRadius: 14, fontSize: 14, fontWeight: 700, textDecoration: 'none',
                background: active ? 'var(--teal-tint)' : 'transparent',
                color: active ? 'var(--teal)' : 'var(--text-soft)',
                transition: 'background .15s ease, color .15s ease',
              }}>
                <Icon />
                {label}
              </Link>
            )
          })}
        </nav>

        <div style={{ flex: 1 }} />

        {/* Theme toggle */}
        <ThemeToggle className="sidebar-theme-toggle" />
        <style>{`
          .sidebar-theme-toggle {
            display: flex; align-items: center; gap: 12px; padding: 11px 14px;
            border-radius: 14px; border: none; background: transparent;
            color: var(--text-soft); font-size: 14px; font-weight: 700;
            cursor: pointer; width: 100%; font-family: inherit;
          }
          .sidebar-theme-toggle::after { content: 'Dark mode'; }
          html[data-theme="dark"] .sidebar-theme-toggle::after { content: 'Light mode'; }
        `}</style>

        {/* User chip */}
        <Link href="/profile" style={{
          display: 'flex', alignItems: 'center', gap: 11, padding: '10px 8px', marginTop: 6,
          borderTop: '1px solid var(--border)', textDecoration: 'none',
        }}>
          <AvatarChip size={38} fontSize={14} />
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userName}</p>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-faint)', fontWeight: 600 }}>My account</p>
          </div>
        </Link>
      </aside>

      {/* ── Mobile top bar (<980px) ───────────────────────────────────────── */}
      <header className="app-topbar" style={{
        position: 'sticky', top: 0, zIndex: 30, background: 'var(--surface)',
        borderBottom: '1px solid var(--border)', padding: '13px 18px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo.png" alt="Skoolie" style={{ width: 32, height: 32, filter: 'var(--logo-filter)' }} />
          <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>{pageTitle}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link href="/search" aria-label="Search" style={{
            width: 38, height: 38, borderRadius: '50%',
            border: '1px solid var(--border)', background: 'var(--surface-2)',
            color: 'var(--text-soft)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', textDecoration: 'none',
          }}>
            <SearchIcon />
          </Link>
          <ThemeToggle className="topbar-theme-btn" />
          <style>{`
            .topbar-theme-btn {
              width: 38px; height: 38px; border-radius: 50%;
              border: 1px solid var(--border); background: var(--surface-2);
              color: var(--text-soft); display: flex; align-items: center;
              justify-content: center; cursor: pointer;
            }
          `}</style>
          <Link href="/profile" style={{ textDecoration: 'none' }}>
            <AvatarChip size={38} fontSize={13} />
          </Link>
        </div>
      </header>

      {/* ── Mobile bottom tab bar (<980px, hidden in runners) ────────────── */}
      {!isRunner && (
        <nav className="app-bottomnav" style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
          background: 'var(--surface)', borderTop: '1px solid var(--border)',
          padding: '6px 8px', display: 'flex', justifyContent: 'space-around',
        }}>
          {NAV.map(({ label, href, Icon }) => {
            const active = isActive(pathname, href)
            return (
              <Link key={href} href={href} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                padding: '6px 14px', borderRadius: 16, textDecoration: 'none',
                color: active ? 'var(--teal)' : 'var(--text-faint)',
                transition: 'color .15s ease',
              }}>
                <Icon />
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.02em' }}>{label}</span>
                {active && <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--teal)' }} />}
              </Link>
            )
          })}
        </nav>
      )}

      {/* ── Responsive show/hide ──────────────────────────────────────────── */}
      <style>{`
        @media (min-width: 980px) {
          .app-sidebar   { display: flex !important; }
          .app-topbar    { display: none !important; }
          .app-bottomnav { display: none !important; }
          body           { padding-left: 250px; }
        }
        @media (max-width: 979px) {
          .app-sidebar   { display: none !important; }
          .app-topbar    { display: flex !important; }
          .app-bottomnav { display: flex !important; }
          body           { padding-left: 0; }
        }
      `}</style>
    </>
  )
}
