'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  {
    href: '/admin', label: 'Dashboard',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  },
  {
    href: '/admin/users', label: 'Users',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  },
  {
    href: '/admin/questions', label: 'Questions',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  },
]

function NavLink({ href, label, icon, active, onClick }: { href: string; label: string; icon: React.ReactNode; active: boolean; onClick?: () => void }) {
  return (
    <Link href={href} onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 11, padding: '10px 14px', borderRadius: 14,
        textDecoration: 'none', fontSize: 14, fontWeight: active ? 800 : 600, transition: 'all .15s ease',
        background: active ? 'var(--teal-tint)' : 'transparent',
        color: active ? 'var(--teal)' : 'var(--text-soft)',
      }}
      className="admin-nav-link"
    >
      <span style={{ flexShrink: 0, opacity: active ? 1 : 0.7 }}>{icon}</span>
      {label}
    </Link>
  )
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  const sidebarContent = (
    <>
      {/* Logo */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 12, background: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ color: 'var(--on-teal)', fontWeight: 900, fontSize: 16 }}>S</span>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '.12em' }}>Skoolie</p>
          <p style={{ margin: 0, fontSize: 13.5, fontWeight: 800, color: 'var(--text)' }}>Admin Panel</p>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 3 }}>
        {NAV.map(({ href, label, icon }) => (
          <NavLink key={href} href={href} label={label} icon={icon} active={isActive(href)} onClick={() => setMobileOpen(false)} />
        ))}
      </nav>

      {/* Back to app */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
        <Link href="/dashboard" onClick={() => setMobileOpen(false)}
          style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600, color: 'var(--text-faint)', textDecoration: 'none' }}
          className="admin-back-link">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6"/></svg>
          Back to app
        </Link>
      </div>
    </>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex' }}>

      {/* Desktop sidebar */}
      <aside style={{
        width: 220, flexShrink: 0, background: 'var(--surface)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh',
      }} className="admin-sidebar-desktop">
        {sidebarContent}
      </aside>

      {/* Mobile top bar */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 30,
        background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }} className="admin-topbar-mobile">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 10, background: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'var(--on-teal)', fontWeight: 900, fontSize: 13 }}>S</span>
          </div>
          <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text)' }}>Admin</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)}
          style={{ width: 36, height: 36, borderRadius: 999, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
          {mobileOpen
            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          }
        </button>
      </div>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setMobileOpen(false)}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.4)', backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 240, background: 'var(--surface)', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)' }}
            onClick={e => e.stopPropagation()}>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Main content */}
      <main style={{ flex: 1, minWidth: 0, overflowX: 'auto' }} className="admin-main">
        {children}
      </main>

      <style>{`
        @media (min-width: 900px) {
          .admin-sidebar-desktop { display: flex !important; }
          .admin-topbar-mobile { display: none !important; }
          .admin-main { padding-top: 0 !important; }
        }
        @media (max-width: 899px) {
          .admin-sidebar-desktop { display: none !important; }
          .admin-topbar-mobile { display: flex !important; }
          .admin-main { padding-top: 60px; }
        }
        .admin-nav-link:hover { background: var(--surface-3) !important; color: var(--text) !important; }
        .admin-back-link:hover { color: var(--teal) !important; }
      `}</style>
    </div>
  )
}
