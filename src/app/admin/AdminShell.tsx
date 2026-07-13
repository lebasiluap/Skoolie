'use client'

// Admin chrome. Two layouts, zero drawers:
//  - ≥900px: fixed grouped sidebar.
//  - <900px: sticky top bar with an always-visible horizontal pill nav —
//    one tap to any section (the old hamburger→drawer needed two and hid
//    where you were).
import Link from 'next/link'
import { usePathname } from 'next/navigation'

type NavItem = { href: string; label: string; short: string; icon: React.ReactNode }
type NavGroup = { title: string; items: NavItem[] }

const ICON = (d: React.ReactNode) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
)

const GROUPS: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      { href: '/admin', label: 'Dashboard', short: 'Home', icon: ICON(<><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></>) },
      { href: '/admin/users', label: 'Users', short: 'Users', icon: ICON(<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>) },
    ],
  },
  {
    title: 'Content',
    items: [
      { href: '/admin/questions', label: 'Questions', short: 'Questions', icon: ICON(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>) },
    ],
  },
  {
    title: 'Quality',
    items: [
      { href: '/admin/reports', label: 'Reports', short: 'Reports', icon: ICON(<><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></>) },
      { href: '/admin/audit', label: 'Miskey audit', short: 'Audit', icon: ICON(<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="12"/><line x1="11" y1="15" x2="11.01" y2="15"/></>) },
    ],
  },
]

function Badge({ n }: { n: number }) {
  if (n <= 0) return null
  return (
    <span style={{ marginLeft: 'auto', fontSize: 10.5, fontWeight: 800, minWidth: 19, textAlign: 'center', padding: '2px 6px', borderRadius: 999, background: 'var(--red)', color: '#fff', lineHeight: 1.4 }}>
      {n > 99 ? '99+' : n}
    </span>
  )
}

function Brand({ compact }: { compact?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: compact ? 30 : 34, height: compact ? 30 : 34, borderRadius: compact ? 10 : 11, background: 'linear-gradient(135deg, var(--teal) 0%, var(--teal-deep) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(14,158,142,.35)' }}>
        <span style={{ color: '#fff', fontWeight: 900, fontSize: compact ? 14 : 16 }}>S</span>
      </div>
      {!compact && (
        <div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.01em', lineHeight: 1.2 }}>Skoolie</p>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '.14em' }}>Admin</p>
        </div>
      )}
    </div>
  )
}

export default function AdminShell({ children, openReports = 0 }: { children: React.ReactNode; openReports?: number }) {
  const pathname = usePathname()

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>

      {/* ── Compact top bar + pill nav (narrow screens) ─────────────────── */}
      <header className="adm-topnav" style={{ position: 'sticky', top: 0, zIndex: 30, background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px 8px' }}>
          <Brand compact />
          <Link href="/dashboard" style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-faint)', textDecoration: 'none' }}>
            Back to app →
          </Link>
        </div>
        <nav style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '0 12px 10px', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }} aria-label="Admin sections">
          {GROUPS.flatMap(g => g.items).map(item => {
            const active = isActive(item.href)
            return (
              <Link key={item.href} href={item.href}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
                  padding: '8px 14px', borderRadius: 999, textDecoration: 'none',
                  fontSize: 13, fontWeight: 800, minHeight: 36,
                  background: active ? 'var(--teal)' : 'var(--surface-2)',
                  color: active ? 'var(--on-teal)' : 'var(--text-soft)',
                  border: '1px solid ' + (active ? 'var(--teal)' : 'var(--border)'),
                  transition: 'background .15s ease, color .15s ease',
                }}>
                {item.icon}
                {item.short}
                {item.href === '/admin/reports' && openReports > 0 && (
                  <span style={{ fontSize: 10.5, fontWeight: 800, padding: '1px 6px', borderRadius: 999, background: active ? 'rgba(255,255,255,.25)' : 'var(--red)', color: '#fff' }}>
                    {openReports > 99 ? '99+' : openReports}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>
      </header>

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

        {/* ── Grouped sidebar (desktop) ──────────────────────────────────── */}
        <aside className="adm-sidebar" style={{
          width: 228, flexShrink: 0, background: 'var(--surface)', borderRight: '1px solid var(--border)',
          flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', overflowY: 'auto',
        }}>
          <div style={{ padding: '20px 18px 14px' }}>
            <Link href="/admin" style={{ textDecoration: 'none' }}><Brand /></Link>
          </div>

          <nav style={{ flex: 1, padding: '4px 12px', display: 'flex', flexDirection: 'column', gap: 2 }} aria-label="Admin sections">
            {GROUPS.map(group => (
              <div key={group.title} style={{ marginBottom: 10 }}>
                <p style={{ margin: '8px 8px 6px', fontSize: 10, fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.12em' }}>
                  {group.title}
                </p>
                {group.items.map(item => {
                  const active = isActive(item.href)
                  return (
                    <Link key={item.href} href={item.href} className="adm-nav-link"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 11, padding: '9px 12px', borderRadius: 12,
                        textDecoration: 'none', fontSize: 13.5, fontWeight: active ? 800 : 600, minHeight: 38,
                        background: active ? 'var(--teal-tint)' : 'transparent',
                        color: active ? 'var(--teal)' : 'var(--text-soft)',
                        boxShadow: active ? 'inset 3px 0 0 var(--teal)' : 'none',
                        transition: 'background .15s ease, color .15s ease',
                        marginBottom: 2,
                      }}>
                      <span style={{ flexShrink: 0, opacity: active ? 1 : 0.65, display: 'inline-flex' }}>{item.icon}</span>
                      {item.label}
                      {item.href === '/admin/reports' && <Badge n={openReports} />}
                    </Link>
                  )
                })}
              </div>
            ))}
          </nav>

          <div style={{ padding: '14px 18px', borderTop: '1px solid var(--border)' }}>
            <Link href="/dashboard" className="adm-back-link"
              style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 700, color: 'var(--text-faint)', textDecoration: 'none' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6"/></svg>
              Back to app
            </Link>
          </div>
        </aside>

        {/* ── Main content ───────────────────────────────────────────────── */}
        <main style={{ flex: 1, minWidth: 0 }}>
          {children}
        </main>
      </div>

      <style>{`
        @media (min-width: 900px) {
          .adm-sidebar { display: flex !important; }
          .adm-topnav { display: none !important; }
        }
        @media (max-width: 899px) {
          .adm-sidebar { display: none !important; }
          .adm-topnav { display: block !important; }
        }
        .adm-topnav nav::-webkit-scrollbar { display: none; }
        .adm-nav-link:hover { background: var(--surface-2) !important; color: var(--text) !important; }
        .adm-back-link:hover { color: var(--teal) !important; }
        /* Shared admin interaction styles (used by every page) */
        .admin-table-row:hover { background: var(--surface-2); }
        .admin-cell-btn:hover { color: var(--teal) !important; }
        .admin-delete-btn:hover { opacity: 0.7; }
        .admin-page-btn:hover { background: var(--surface-3) !important; }
        .admin-input-focus:focus { border-color: var(--teal) !important; box-shadow: 0 0 0 3px var(--teal-tint); }
      `}</style>
    </div>
  )
}
