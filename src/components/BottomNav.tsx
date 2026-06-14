'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  )
}

function PracticeIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9"/>
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
    </svg>
  )
}

function ProgressIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  )
}

function ProfileIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  )
}

const NAV_ITEMS = [
  { label: 'Home',     href: '/dashboard',    Icon: HomeIcon     },
  { label: 'Practice', href: '/practice/mcq', Icon: PracticeIcon },
  { label: 'Progress', href: '/progress',     Icon: ProgressIcon },
  { label: 'Profile',  href: '/profile',      Icon: ProfileIcon  },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-2 py-2 flex justify-around safe-area-inset-bottom">
      {NAV_ITEMS.map(({ label, href, Icon }) => {
        const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href.split('/').slice(0, 2).join('/')))
        return (
          <Link
            key={label}
            href={href}
            className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-2xl transition-all duration-200 ${
              active ? 'text-[#0D9488]' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Icon active={active} />
            <span className={`text-[10px] font-semibold tracking-wide ${active ? 'text-[#0D9488]' : 'text-gray-400'}`}>
              {label}
            </span>
            {active && <div className="w-1 h-1 rounded-full bg-[#0D9488]" />}
          </Link>
        )
      })}
    </div>
  )
}
