'use client'

import { useEffect, useState } from 'react'

/** Paste the real store URLs here once the app is live. */
export const STORE_LINKS = {
  appstore: '#',
  playstore: '#',
}

type Platform = 'ios' | 'android' | 'unknown'

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'unknown'
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'unknown'
}

function AppleLogo() {
  return (
    <svg width="22" height="26" viewBox="0 0 22 26" fill="currentColor" aria-hidden="true">
      <path d="M18.3 13.8c0-3 2.5-4.5 2.6-4.6-1.4-2.1-3.6-2.4-4.4-2.4-1.9-.2-3.6 1.1-4.6 1.1-1 0-2.4-1.1-4-1-2 0-3.9 1.2-5 3-2.1 3.7-.5 9.2 1.5 12.2 1 1.5 2.2 3.1 3.8 3 1.5-.1 2.1-1 4-1s2.4 1 4 .9c1.6 0 2.7-1.5 3.7-3 1.2-1.7 1.6-3.3 1.7-3.4-.1 0-3.2-1.3-3.3-4.8zM15.3 4.8c.8-1 1.4-2.4 1.2-3.8-1.2 0-2.7.8-3.5 1.8-.8.9-1.5 2.3-1.3 3.7 1.4.1 2.8-.7 3.6-1.7z" />
    </svg>
  )
}

function PlayLogo() {
  return (
    <svg width="22" height="24" viewBox="0 0 24 26" aria-hidden="true">
      <path d="M1.3.8C1 1.2.8 1.7.8 2.4v21.2c0 .7.2 1.2.5 1.6L13.4 13 1.3.8z" fill="#00D7FE" />
      <path d="M17.4 17.1 13.4 13 1.3 25.2c.5.5 1.3.6 2.2.1l13.9-8.2" fill="#FF3A44" />
      <path d="M17.4 8.9 3.5.7C2.6.2 1.8.3 1.3.8L13.4 13l4-4.1z" fill="#00F076" />
      <path d="M17.4 8.9 13.4 13l4 4.1 4.6-2.7c1.4-.8 1.4-2 0-2.8l-4.6-2.7z" fill="#FFC900" />
    </svg>
  )
}

function Badge({
  href,
  store,
  emphasized,
  dimmed,
  small,
  big,
  logo,
}: {
  href: string
  store: 'appstore' | 'playstore'
  emphasized: boolean
  dimmed: boolean
  small: string
  big: string
  logo: React.ReactNode
}) {
  return (
    <a
      href={href}
      data-store={store}
      className={`inline-flex items-center gap-3 rounded-2xl px-5 py-3 min-w-[190px] transition-all duration-200 hover:-translate-y-0.5 ${
        emphasized ? 'scale-[1.04] ring-4 ring-[var(--teal)]/35' : ''
      } ${dimmed ? 'opacity-70' : ''}`}
      style={{ background: '#16221F', color: '#FFFFFF', boxShadow: 'var(--shadow)' }}
    >
      {logo}
      <span className="flex flex-col items-start leading-tight">
        <span className="text-[11px] font-semibold uppercase tracking-wide opacity-80">{small}</span>
        <span className="text-lg font-extrabold">{big}</span>
      </span>
    </a>
  )
}

export default function StoreBadges() {
  const [platform, setPlatform] = useState<Platform>('unknown')

  useEffect(() => {
    setPlatform(detectPlatform())
  }, [])

  return (
    <div className="flex flex-wrap items-center justify-center gap-4">
      <Badge
        href={STORE_LINKS.appstore}
        store="appstore"
        emphasized={platform === 'ios'}
        dimmed={platform === 'android'}
        small="Download on the"
        big="App Store"
        logo={<AppleLogo />}
      />
      <Badge
        href={STORE_LINKS.playstore}
        store="playstore"
        emphasized={platform === 'android'}
        dimmed={platform === 'ios'}
        small="Get it on"
        big="Google Play"
        logo={<PlayLogo />}
      />
    </div>
  )
}
