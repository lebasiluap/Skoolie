'use client'

import { Fragment, useRef } from 'react'
import Link from 'next/link'
import { STORE_LINKS, AppleLogo, PlayLogo } from '@/components/StoreBadges'
import { useLandingMotion } from './useLandingMotion'
import {
  CappySimple,
  CappyIdle,
  CappyThinking,
  CappyHappy,
  NogginIdle,
  NogginHappy,
  BuddyIdle,
  BuddyChat,
  BuddyHappy,
} from './mascots'

/* Dark-section palette (no light-theme tokens exist for these) */
const DARK_BG = '#0C1211'
const DARK_CHIP = '#16221F'
const INK = '#E9F0EE'
const INK_SOFT = '#9DB0AB'
const INK_FAINT = '#6A7C77'
const TEAL_BRIGHT = '#24BBA8'
const CORAL_BRIGHT = '#F58A62'
/* Rapid Fire periwinkle (mobile-app palette, no web token) */
const PERI = '#7C6FCD'
const PERI_DEEP = '#5F53A8'
const PERI_LIGHT = '#9D93E3'
const PERI_TINT = '#EDEAF9'

const MARQUEE_ITEMS = [
  'MCQs',
  'Flashcards',
  'Clinical cases',
  'Rapid fire',
  'Daily challenge',
  'Streaks & leagues',
  'Time capsule',
  'Readiness insights',
]

function StoreBadge({
  href,
  logo,
  small,
  big,
}: {
  href: string
  logo: React.ReactNode
  small: string
  big: string
}) {
  return (
    <a
      href={href}
      className="lp-badge"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 12,
        background: DARK_CHIP,
        border: '1px solid rgba(233,240,238,.14)',
        color: '#fff',
        padding: '12px 22px',
        borderRadius: 16,
        minWidth: 190,
        boxShadow: '0 14px 34px -12px rgba(0,0,0,.6)',
        textDecoration: 'none',
      }}
    >
      {logo}
      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.2 }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.8 }}>
          {small}
        </span>
        <span style={{ fontSize: 18, fontWeight: 800 }}>{big}</span>
      </span>
    </a>
  )
}

function StoreBadgePair() {
  return (
    <>
      <StoreBadge href={STORE_LINKS.appstore} logo={<AppleLogo />} small="Download on the" big="App Store" />
      <StoreBadge href={STORE_LINKS.playstore} logo={<PlayLogo />} small="Get it on" big="Google Play" />
    </>
  )
}

function PhoneFrame({
  base,
  shadow,
  children,
}: {
  base: string
  shadow: string
  children: React.ReactNode
}) {
  return (
    <div
      className="lp-phone"
      data-tilt="1"
      data-base={base}
      style={{
        width: 272,
        background: DARK_CHIP,
        borderRadius: 46,
        padding: 10,
        boxShadow: shadow,
        transform: base,
        transformStyle: 'preserve-3d',
      }}
    >
      <div style={{ background: 'var(--bg)', borderRadius: 37, overflow: 'hidden', height: 540, position: 'relative' }}>
        {/* notch */}
        <div
          style={{
            position: 'absolute',
            top: 10,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 86,
            height: 22,
            background: DARK_CHIP,
            borderRadius: 999,
            zIndex: 3,
          }}
        />
        {children}
      </div>
    </div>
  )
}

const gridCard: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 26,
  padding: 'clamp(20px, 5vw, 28px)',
  boxShadow: '0 12px 28px -16px rgba(16,40,36,.20)',
}

const cardEyebrow: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: 2,
  textTransform: 'uppercase',
}

const cardTitle: React.CSSProperties = { margin: '22px 0 0', fontSize: 20, fontWeight: 900 }

const cardBody: React.CSSProperties = {
  margin: '8px 0 0',
  fontSize: 14.5,
  fontWeight: 600,
  lineHeight: 1.55,
  color: 'var(--text-soft)',
}

function StreakDay({ state, label }: { state: 'done' | 'frozen' | 'future'; label: string }) {
  return (
    <div className="lp-day" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      {state === 'future' ? (
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px dashed var(--border-strong)' }} />
      ) : (
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: state === 'frozen' ? PERI : 'var(--coral)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
          }}
        >
          {state === 'frozen' ? '🧊' : '✓'}
        </div>
      )}
      <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-faint)' }}>{label}</span>
    </div>
  )
}

export default function Landing() {
  const rootRef = useRef<HTMLDivElement>(null)
  useLandingMotion(rootRef)

  return (
    <div
      ref={rootRef}
      className="lp-root"
      style={{ background: DARK_BG, color: INK, overflowX: 'hidden', overflowY: 'clip' }}
    >
      {/* ══════════════ NAV ══════════════ */}
      <div
        className="lp-nav"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 90,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 32px',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          background: 'rgba(12,18,17,.74)',
          borderBottom: '1px solid rgba(233,240,238,.07)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <CappySimple size={36} />
          <span style={{ fontSize: 22, fontWeight: 900, color: TEAL_BRIGHT, letterSpacing: -0.5 }}>Skoolie</span>
        </div>
        <a
          href="https://skoolieapp.com"
          className="lp-nav-btn"
          style={{
            color: '#fff',
            fontWeight: 800,
            fontSize: 15,
            padding: '10px 22px',
            borderRadius: 999,
            boxShadow: '0 8px 24px -8px rgba(14,158,142,.6)',
            textDecoration: 'none',
          }}
        >
          Get the app
        </a>
      </div>

      {/* ══════════════ HERO ══════════════ */}
      <section
        className="lp-hero"
        style={{
          position: 'relative',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '140px 24px 120px',
          perspective: 1200,
        }}
      >
        {/* glow layers */}
        <div
          data-mouse="30"
          style={{
            position: 'absolute',
            inset: '-20%',
            pointerEvents: 'none',
            background: 'radial-gradient(ellipse 46% 38% at 32% 30%, rgba(14,158,142,.28), transparent 70%)',
          }}
        />
        <div
          data-mouse="-22"
          style={{
            position: 'absolute',
            inset: '-20%',
            pointerEvents: 'none',
            background: 'radial-gradient(ellipse 40% 32% at 72% 68%, rgba(242,119,78,.16), transparent 70%)',
          }}
        />
        {/* dot grid depth layer (heavy full-viewport paint — ≥700px only) */}
        <div
          className="lp-depth-lg"
          data-para="0.5"
          data-mouse="14"
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            opacity: 0.35,
            backgroundImage: 'radial-gradient(rgba(233,240,238,.14) 1.5px, transparent 1.5px)',
            backgroundSize: '34px 34px',
          }}
        />

        {/* floating mascots */}
        <div data-para="-0.9" data-mouse="28" style={{ position: 'absolute', top: '13%', right: '3%', zIndex: 2 }}>
          <div style={{ animation: 'lp-floaty 5.2s ease-in-out infinite', position: 'relative' }}>
            {/* Cappy speech bubble — same chat-bubble language as the cases
                mockup, dark-chip palette; ≥1150px only (lp-hero-bubble) so it
                never crowds the headline column */}
            <div
              className="lp-hero-bubble"
              style={{
                position: 'absolute',
                top: 4,
                right: '86%',
                whiteSpace: 'nowrap',
                background: 'rgba(20,29,27,.92)',
                border: '1px solid rgba(36,187,168,.4)',
                color: INK,
                fontSize: 13.5,
                fontWeight: 800,
                padding: '9px 14px',
                borderRadius: '16px 16px 4px 16px',
                boxShadow: '0 14px 30px -10px rgba(0,0,0,.5)',
              }}
            >
              I&apos;ll tell you what&apos;s next 👇
            </div>
            <CappyIdle
              size={180}
              style={{ width: 'clamp(76px, 12vw, 180px)', height: 'auto', filter: 'drop-shadow(0 30px 40px rgba(0,0,0,.45))' }}
            />
          </div>
        </div>
        <div data-para="-0.5" data-mouse="-22" style={{ position: 'absolute', bottom: '5%', left: '3%', zIndex: 2 }}>
          <div style={{ animation: 'lp-floaty2 6.4s ease-in-out infinite' }}>
            <NogginIdle
              size={150}
              style={{ width: 'clamp(64px, 11vw, 150px)', height: 'auto', filter: 'drop-shadow(0 26px 34px rgba(0,0,0,.45))' }}
            />
          </div>
        </div>
        <div
          className="lp-hero-buddy"
          data-para="-1.3"
          data-mouse="30"
          style={{ position: 'absolute', top: '14%', left: '5%', zIndex: 2 }}
        >
          <div style={{ animation: 'lp-bobble 4.6s ease-in-out infinite' }}>
            <BuddyIdle
              size={110}
              style={{ width: 'clamp(52px, 9vw, 110px)', height: 'auto', filter: 'drop-shadow(0 20px 28px rgba(0,0,0,.4))' }}
            />
          </div>
        </div>

        {/* floating game chips (hidden below 1150px, kept in the hero's outer
            margins so they never cross the 980px content column, and faded out
            via .lp-decor-hide once scrollY > 60 so they never meet the nav) */}
        <div
          className="lp-hero-decor"
          data-para="-0.9"
          data-mouse="26"
          style={{ position: 'absolute', bottom: '30%', right: '4%', zIndex: 1 }}
        >
          <div
            style={{
              animation: 'lp-floaty 4.4s ease-in-out .8s infinite',
              background: 'rgba(20,29,27,.9)',
              border: '1px solid rgba(36,187,168,.4)',
              color: TEAL_BRIGHT,
              fontWeight: 900,
              fontSize: 17,
              padding: '10px 18px',
              borderRadius: 999,
              boxShadow: '0 16px 32px -10px rgba(0,0,0,.5)',
            }}
          >
            +20 XP
          </div>
        </div>
        <div
          className="lp-hero-decor"
          data-para="-0.5"
          data-mouse="-24"
          style={{ position: 'absolute', bottom: '30%', left: '4%', zIndex: 1 }}
        >
          <div
            style={{
              animation: 'lp-floaty2 5.6s ease-in-out .4s infinite',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(20,29,27,.9)',
              border: '1px solid rgba(242,119,78,.45)',
              color: CORAL_BRIGHT,
              fontWeight: 900,
              fontSize: 17,
              padding: '10px 18px',
              borderRadius: 999,
              boxShadow: '0 16px 32px -10px rgba(0,0,0,.5)',
            }}
          >
            <span style={{ display: 'inline-block', animation: 'lp-flick 1.6s ease-in-out infinite' }}>🔥</span> 12-day
            streak
          </div>
        </div>
        <div
          className="lp-hero-decor"
          data-para="-1.1"
          data-mouse="22"
          style={{ position: 'absolute', top: '34%', left: '3%', zIndex: 1 }}
        >
          <div
            style={{
              animation: 'lp-bobble 5s ease-in-out 1.2s infinite',
              background: 'rgba(20,29,27,.9)',
              border: '1px solid rgba(157,147,227,.45)',
              color: PERI_LIGHT,
              fontWeight: 900,
              fontSize: 15,
              padding: '9px 16px',
              borderRadius: 999,
              boxShadow: '0 16px 32px -10px rgba(0,0,0,.5)',
            }}
          >
            ⚡ 2× Barrage
          </div>
        </div>

        {/* headline */}
        <div data-mouse="-10" style={{ position: 'relative', zIndex: 5, maxWidth: 980, margin: '0 auto' }}>
          <div
            className="lp-eyebrow"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(36,187,168,.12)',
              border: '1px solid rgba(36,187,168,.35)',
              color: TEAL_BRIGHT,
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: 2.5,
              textTransform: 'uppercase',
              padding: '8px 18px',
              borderRadius: 999,
              marginBottom: 28,
            }}
          >
            For pharmacy · medicine · nursing · dentistry · midwifery
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: 'clamp(42px, 8.5vw, 118px)',
              fontWeight: 900,
              lineHeight: 1.02,
              letterSpacing: '-0.028em',
              color: INK,
            }}
          >
            Know exactly what
            {/* forced break wraps "what" onto its own line below ~640px, so
                the br joins .lp-h2-br in sitting out on small screens and the
                H1 wraps naturally (font clamp tightened in globals.css) */}
            <br className="lp-h1-br" />
            {/* gradient scoped to one unwrappable word group so a line wrap
                never smears the teal→coral ramp into muddy midtones */}
            <span style={{ color: TEAL_BRIGHT }}>to study</span>{' '}
            <span
              style={{
                whiteSpace: 'nowrap',
                background: `linear-gradient(100deg, ${TEAL_BRIGHT} 0%, ${CORAL_BRIGHT} 88%)`,
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              next.
            </span>
          </h1>
          <p
            style={{
              margin: '26px auto 0',
              maxWidth: 680,
              fontSize: 'clamp(17px, 2vw, 21px)',
              fontWeight: 600,
              lineHeight: 1.55,
              color: INK_SOFT,
            }}
          >
            Personalized MCQs, flashcards and clinical cases that adapt to your profession, your year, and your
            weakest topics — with streaks, leagues and a readiness score that keep you consistent until exam day.
          </p>
          <div
            style={{
              display: 'flex',
              gap: 'clamp(18px, 4vw, 44px)',
              justifyContent: 'center',
              alignItems: 'baseline',
              flexWrap: 'wrap',
              marginTop: 32,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <span
                data-count="50000"
                data-suffix="+"
                style={{
                  fontSize: 'clamp(28px, 3.4vw, 42px)',
                  fontWeight: 900,
                  color: TEAL_BRIGHT,
                  letterSpacing: -1,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                50,000+
              </span>
              <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: INK_FAINT }}>
                Questions
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <span
                data-count="5"
                style={{
                  fontSize: 'clamp(28px, 3.4vw, 42px)',
                  fontWeight: 900,
                  color: CORAL_BRIGHT,
                  letterSpacing: -1,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                5
              </span>
              <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: INK_FAINT }}>
                Professions
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <span
                data-count="100"
                data-suffix="%"
                style={{
                  fontSize: 'clamp(28px, 3.4vw, 42px)',
                  fontWeight: 900,
                  color: INK,
                  letterSpacing: -1,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                100%
              </span>
              <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: INK_FAINT }}>
                Answers explained
              </span>
            </div>
          </div>
          <p
            style={{
              margin: '36px 0 0',
              /* tracked uppercase runs ~320px at 14px/2px — clamp both so the
                 line stays single-line down to a 320px viewport */
              fontSize: 'clamp(12.5px, 3.6vw, 14px)',
              fontWeight: 900,
              letterSpacing: 'clamp(1.1px, 0.5vw, 2px)',
              textTransform: 'uppercase',
              color: CORAL_BRIGHT,
            }}
          >
            Stop wondering what to revise.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginTop: 16 }}>
            <StoreBadgePair />
          </div>
        </div>

        {/* scroll cue — big teal pill + bouncing chevron; smooth-scrolls to the
            practice-modes section on tap. Fades out (lp-decor-hide, toggled by
            useLandingMotion) once the user scrolls, exactly like the chips. */}
        <button
          type="button"
          className="lp-scroll-cue"
          aria-label="Scroll to explore"
          onClick={() => {
            const target = document.getElementById('lp-explore')
            if (!target) return
            const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
            target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
          }}
        >
          <span>Scroll to explore</span>
          <span className="lp-cue-chev" aria-hidden="true">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 9l8 8 8-8" />
            </svg>
          </span>
        </button>
      </section>

      {/* ══════════════ MARQUEE ══════════════ */}
      <div
        style={{
          background: 'var(--teal-deep)',
          padding: '18px 0',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          transform: 'rotate(-1.2deg) scale(1.02)',
          boxShadow: '0 20px 50px -20px rgba(0,0,0,.6)',
          position: 'relative',
          zIndex: 6,
        }}
      >
        {/* reveal lives on its own wrapper — the outer bar owns rotate() and
            the track owns the marquee animation, so neither gets clobbered */}
        <div data-reveal="blur">
          <div style={{ display: 'inline-flex', gap: 44, animation: 'lp-marquee 26s linear infinite', willChange: 'transform' }}>
            {/* 4 copies (-50% loop = 2 sets) so one set narrower than a 1920px
                viewport can never expose a gap at the tail of the loop */}
            {[0, 1, 2, 3].map((dup) =>
              MARQUEE_ITEMS.map((item, i) => (
                <Fragment key={`${dup}-${i}`}>
                  <span style={{ color: '#fff', fontWeight: 900, fontSize: 18 }}>{item}</span>
                  <span className="lp-star" style={{ color: '#7ED9CC', fontWeight: 900 }}>
                    ✦
                  </span>
                </Fragment>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ══════════════ CREDIBILITY STRIP ══════════════ */}
      <section
        aria-label="Why you can trust Skoolie"
        style={{ background: DARK_BG, color: INK, padding: 'clamp(56px, 7vw, 88px) 24px', position: 'relative' }}
      >
        <div
          style={{
            maxWidth: 1160,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(230px, 100%), 1fr))',
            gap: 14,
          }}
        >
          {(
            [
              { icon: '⚕️', text: '100% built by a pharmacist (PharmD)' },
              { icon: '📚', text: 'Drawn from trusted clinical textbooks' },
              { icon: '💡', text: 'An explanation with every answer' },
              { icon: '📊', text: 'Difficulty calibrated by real student performance' },
            ] as const
          ).map((c, i) => (
            <div key={c.text} data-reveal="up" data-reveal-delay={i * 80}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  height: '100%',
                  background: DARK_CHIP,
                  border: '1px solid rgba(233,240,238,.12)',
                  borderRadius: 18,
                  padding: '16px 18px',
                  boxShadow: '0 14px 34px -16px rgba(0,0,0,.5)',
                }}
              >
                <span style={{ fontSize: 22, flexShrink: 0 }} aria-hidden="true">
                  {c.icon}
                </span>
                <span style={{ fontSize: 14.5, fontWeight: 800, lineHeight: 1.4, color: INK }}>{c.text}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════ TRANSFORMATION BEAT ══════════════ */}
      <section
        style={{
          background: 'var(--bg)',
          color: 'var(--text)',
          padding: 'clamp(72px, 9vw, 120px) 24px 0',
          position: 'relative',
        }}
      >
        <div style={{ maxWidth: 620, margin: '0 auto' }}>
          <div
            data-reveal="blur"
            style={{
              textAlign: 'center',
              fontSize: 13,
              fontWeight: 900,
              letterSpacing: 3,
              textTransform: 'uppercase',
              color: 'var(--coral-deep)',
            }}
          >
            From lost to locked in
          </div>
          <div style={{ marginTop: 30, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div data-reveal="left" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              {/* mascots shrink a touch on narrow screens so the bubbles keep
                  near-full width instead of getting squeezed */}
              <BuddyIdle size={52} style={{ flexShrink: 0, width: 'clamp(40px, 12vw, 52px)', height: 'auto' }} />
              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '4px 18px 18px 18px',
                  padding: '13px 18px',
                  boxShadow: '0 10px 24px -12px rgba(16,40,36,.18)',
                  fontSize: 'clamp(15px, 2vw, 17px)',
                  fontWeight: 800,
                  lineHeight: 1.45,
                  color: 'var(--text-soft)',
                }}
              >
                I have no idea what to revise.
              </div>
            </div>
            <div
              data-reveal="right"
              data-reveal-delay="200"
              style={{ display: 'flex', gap: 12, alignItems: 'flex-start', justifyContent: 'flex-end' }}
            >
              <div
                style={{
                  background: 'var(--teal)',
                  color: '#fff',
                  borderRadius: '18px 4px 18px 18px',
                  padding: '13px 18px',
                  boxShadow: '0 14px 30px -12px rgba(14,158,142,.5)',
                  fontSize: 'clamp(15px, 2vw, 17px)',
                  fontWeight: 800,
                  lineHeight: 1.45,
                }}
              >
                I know exactly what to practice today.
              </div>
              <CappyHappy size={52} style={{ flexShrink: 0, width: 'clamp(40px, 12vw, 52px)', height: 'auto' }} />
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════ PHONES / PRACTICE MODES ══════════════ */}
      <section
        id="lp-explore"
        style={{
          background: 'var(--bg)',
          color: 'var(--text)',
          padding: 'clamp(90px, 10vw, 140px) 24px clamp(100px, 12vw, 160px)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* depth layers — glows + drifting emojis run at every width (cheap
            composited transforms; they carry mobile's ambient motion), only
            the dot grid (lp-depth-lg) sits out < 700px */}
        <div
          data-para="0.6"
          style={{
            position: 'absolute',
            top: -80,
            right: -120,
            width: 480,
            height: 480,
            borderRadius: '50%',
            pointerEvents: 'none',
            background: 'radial-gradient(circle, rgba(14,158,142,.10), transparent 70%)',
          }}
        />
        <div
          data-para="-0.45"
          style={{
            position: 'absolute',
            bottom: -120,
            left: -140,
            width: 520,
            height: 520,
            borderRadius: '50%',
            pointerEvents: 'none',
            background: 'radial-gradient(circle, rgba(242,119,78,.08), transparent 70%)',
          }}
        />
        <div
          className="lp-depth-lg"
          data-para="0.3"
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            opacity: 0.5,
            backgroundImage: 'radial-gradient(rgba(16,40,36,.09) 1.5px, transparent 1.5px)',
            backgroundSize: '30px 30px',
          }}
        />
        <div
          data-para="-0.6"
          aria-hidden="true"
          style={{ position: 'absolute', top: '14%', left: '4%', fontSize: 'clamp(44px, 10vw, 58px)', opacity: 0.12, pointerEvents: 'none' }}
        >
          <div style={{ animation: 'lp-floaty2 7s ease-in-out infinite' }}>💊</div>
        </div>
        <div
          data-para="0.45"
          aria-hidden="true"
          style={{ position: 'absolute', top: '38%', right: '3%', fontSize: 'clamp(54px, 12vw, 74px)', opacity: 0.12, pointerEvents: 'none' }}
        >
          <div style={{ animation: 'lp-floaty 6.2s ease-in-out .5s infinite' }}>🩺</div>
        </div>
        <div
          data-para="-0.3"
          aria-hidden="true"
          style={{ position: 'absolute', bottom: '10%', left: '7%', fontSize: 'clamp(36px, 8vw, 46px)', opacity: 0.12, pointerEvents: 'none' }}
        >
          <div style={{ animation: 'lp-bobble 5.4s ease-in-out 1s infinite' }}>🧠</div>
        </div>
        <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div
            data-reveal="blur"
            style={{ fontSize: 13, fontWeight: 900, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--teal)' }}
          >
            Practice that teaches
          </div>
          <h2
            data-reveal="flip"
            data-reveal-delay="80"
            style={{
              margin: '14px auto 0',
              maxWidth: 720,
              fontSize: 'clamp(34px, 5vw, 62px)',
              fontWeight: 900,
              letterSpacing: '-0.03em',
              lineHeight: 1.06,
            }}
          >
            Every question makes you
            <br className="lp-h2-br" />
            a safer clinician.
          </h2>
          <p
            data-reveal="160"
            style={{
              margin: '20px auto 0',
              maxWidth: 560,
              fontSize: 18,
              fontWeight: 600,
              lineHeight: 1.55,
              color: 'var(--text-soft)',
            }}
          >
            Over 50,000 MCQs, flashcards, and full clinical cases — every answer comes with an explanation that
            actually teaches.
          </p>

          <div
            className="lp-phones"
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '48px clamp(24px, 3vw, 44px)',
              marginTop: 130,
              perspective: 1400,
              flexWrap: 'wrap',
            }}
          >
            {/* Phone 1: MCQ — enters from the left (reveal sits on an inner
                wrapper so the parallax transform on the outer never stomps it) */}
            <div data-para="0.25" data-para-min="1050">
              <div data-reveal="left">
              <PhoneFrame base="rotateY(14deg) rotateX(2deg)" shadow="0 40px 80px -30px rgba(16,40,36,.5)">
                <div style={{ padding: '48px 16px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <CappySimple size={34} style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1, height: 8, background: 'var(--border)', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ width: '65%', height: '100%', background: 'var(--teal)', borderRadius: 999 }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 900, color: 'var(--text-soft)' }}>13/20</span>
                  </div>
                  <div
                    style={{
                      marginTop: 14,
                      background: 'var(--surface)',
                      borderRadius: 18,
                      padding: 14,
                      boxShadow: '0 8px 20px -10px rgba(16,40,36,.15)',
                      textAlign: 'left',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 9,
                        fontWeight: 900,
                        letterSpacing: 1.5,
                        textTransform: 'uppercase',
                        color: 'var(--teal)',
                      }}
                    >
                      Cardiovascular · Pharmacology
                    </div>
                    <div style={{ marginTop: 6, fontSize: 12.5, fontWeight: 800, lineHeight: 1.45, color: 'var(--text)' }}>
                      A 58-year-old on furosemide presents with muscle weakness. Which electrolyte should be checked
                      first?
                    </div>
                  </div>
                  <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 7, textAlign: 'left' }}>
                    <div
                      style={{
                        background: 'var(--surface)',
                        border: '1.5px solid var(--border)',
                        borderRadius: 13,
                        padding: '10px 12px',
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: 'var(--text-soft)',
                      }}
                    >
                      Sodium
                    </div>
                    <div
                      style={{
                        background: 'var(--teal-tint)',
                        border: '1.5px solid var(--teal)',
                        borderRadius: 13,
                        padding: '10px 12px',
                        fontSize: 11.5,
                        fontWeight: 800,
                        color: 'var(--teal-deep)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      Potassium{' '}
                      <span
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          background: 'var(--teal)',
                          color: '#fff',
                          fontSize: 10,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        ✓
                      </span>
                    </div>
                    <div
                      style={{
                        background: 'var(--surface)',
                        border: '1.5px solid var(--border)',
                        borderRadius: 13,
                        padding: '10px 12px',
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: 'var(--text-soft)',
                      }}
                    >
                      Calcium
                    </div>
                    <div
                      style={{
                        background: 'var(--surface)',
                        border: '1.5px solid var(--border)',
                        borderRadius: 13,
                        padding: '10px 12px',
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: 'var(--text-soft)',
                      }}
                    >
                      Magnesium
                    </div>
                  </div>
                  <div
                    className="lp-submit-pulse"
                    style={{
                      marginTop: 12,
                      background: 'var(--teal)',
                      color: '#fff',
                      borderRadius: 13,
                      padding: 11,
                      fontSize: 12,
                      fontWeight: 900,
                      textAlign: 'center',
                      letterSpacing: 0.5,
                    }}
                  >
                    SUBMIT
                  </div>
                </div>
              </PhoneFrame>
              <div style={{ marginTop: 24, fontSize: 17, fontWeight: 900, color: 'var(--text)' }}>Question bank</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-soft)', maxWidth: 240, margin: '4px auto 0' }}>
                MCQs with explanations that teach, not just grade
              </div>
              </div>
            </div>

            {/* Phone 2: Flashcards (center, forward) — zooms in */}
            <div data-para="-0.15" data-para-min="1050" style={{ zIndex: 3 }}>
              <div data-reveal="zoom" data-reveal-delay="80">
              <PhoneFrame base="scale(1.08)" shadow="0 50px 100px -30px rgba(16,40,36,.55)">
                <div
                  style={{
                    padding: '48px 16px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    boxSizing: 'border-box',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 900,
                        letterSpacing: 1.5,
                        textTransform: 'uppercase',
                        color: 'var(--text-soft)',
                      }}
                    >
                      Flashcards · Renal
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 900, color: 'var(--teal)' }}>24 left</span>
                  </div>
                  <div style={{ marginTop: 14, position: 'relative', flex: 1 }}>
                    <div
                      style={{
                        position: 'absolute',
                        inset: '10px -6px auto',
                        height: '84%',
                        background: 'var(--surface-3)',
                        borderRadius: 20,
                        transform: 'rotate(3deg)',
                      }}
                    />
                    <div
                      style={{
                        position: 'relative',
                        background: 'var(--surface)',
                        borderRadius: 20,
                        height: '88%',
                        boxShadow: '0 14px 30px -14px rgba(16,40,36,.25)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 20,
                        boxSizing: 'border-box',
                        textAlign: 'center',
                      }}
                    >
                      <NogginHappy size={84} />
                      <div style={{ marginTop: 12, fontSize: 14, fontWeight: 800, lineHeight: 1.4, color: 'var(--text)' }}>
                        What is the mechanism of action of furosemide?
                      </div>
                      <div
                        style={{
                          marginTop: 10,
                          fontSize: 10,
                          fontWeight: 800,
                          letterSpacing: 1.5,
                          textTransform: 'uppercase',
                          color: 'var(--text-faint)',
                        }}
                      >
                        Tap to flip
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                    <div
                      style={{
                        flex: 1,
                        background: 'var(--red-tint)',
                        color: 'var(--red)',
                        borderRadius: 13,
                        padding: 11,
                        fontSize: 12,
                        fontWeight: 900,
                        textAlign: 'center',
                      }}
                    >
                      Again
                    </div>
                    <div
                      style={{
                        flex: 1,
                        background: 'var(--green-tint)',
                        color: 'var(--green)',
                        borderRadius: 13,
                        padding: 11,
                        fontSize: 12,
                        fontWeight: 900,
                        textAlign: 'center',
                      }}
                    >
                      Got it
                    </div>
                  </div>
                </div>
              </PhoneFrame>
              <div style={{ marginTop: 30, fontSize: 17, fontWeight: 900, color: 'var(--text)' }}>Flashcards</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-soft)', maxWidth: 240, margin: '4px auto 0' }}>
                Spaced repetition with Noggin cheering you on
              </div>
              </div>
            </div>

            {/* Phone 3: Cases — enters from the right */}
            <div data-para="0.25" data-para-min="1050">
              <div data-reveal="right" data-reveal-delay="160">
              <PhoneFrame base="rotateY(-14deg) rotateX(2deg)" shadow="0 40px 80px -30px rgba(16,40,36,.5)">
                <div style={{ padding: '48px 16px 16px', textAlign: 'left' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <span
                      style={{
                        background: 'var(--teal)',
                        color: '#fff',
                        fontSize: 10,
                        fontWeight: 900,
                        padding: '6px 12px',
                        borderRadius: 999,
                      }}
                    >
                      Vignette
                    </span>
                    <span
                      style={{
                        background: 'var(--surface)',
                        color: 'var(--text-soft)',
                        fontSize: 10,
                        fontWeight: 800,
                        padding: '6px 12px',
                        borderRadius: 999,
                        border: '1px solid var(--border)',
                      }}
                    >
                      History
                    </span>
                    <span
                      style={{
                        background: 'var(--surface)',
                        color: 'var(--text-soft)',
                        fontSize: 10,
                        fontWeight: 800,
                        padding: '6px 12px',
                        borderRadius: 999,
                        border: '1px solid var(--border)',
                      }}
                    >
                      Findings
                    </span>
                  </div>
                  <div style={{ marginTop: 12, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <BuddyChat size={46} style={{ flexShrink: 0 }} />
                    <div
                      style={{
                        background: 'var(--surface)',
                        borderRadius: '4px 16px 16px 16px',
                        padding: 12,
                        boxShadow: '0 8px 20px -10px rgba(16,40,36,.15)',
                      }}
                    >
                      <div style={{ fontSize: 11.5, fontWeight: 700, lineHeight: 1.5, color: 'var(--text)' }}>
                        A 34-year-old woman presents to the clinic with a 3-day history of fever, rigors, and right
                        flank pain…
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      marginTop: 12,
                      background: 'var(--surface)',
                      borderRadius: 16,
                      padding: 12,
                      boxShadow: '0 8px 20px -10px rgba(16,40,36,.15)',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 9,
                        fontWeight: 900,
                        letterSpacing: 1.5,
                        textTransform: 'uppercase',
                        color: 'var(--amber)',
                      }}
                    >
                      Investigations
                    </div>
                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: 11,
                          fontWeight: 700,
                          color: 'var(--text-soft)',
                        }}
                      >
                        <span>WBC</span>
                        <span style={{ color: 'var(--red)', fontWeight: 900 }}>16.2 ×10⁹/L ↑</span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: 11,
                          fontWeight: 700,
                          color: 'var(--text-soft)',
                        }}
                      >
                        <span>Creatinine</span>
                        <span style={{ color: 'var(--text)', fontWeight: 900 }}>88 µmol/L</span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: 11,
                          fontWeight: 700,
                          color: 'var(--text-soft)',
                        }}
                      >
                        <span>Urine nitrites</span>
                        <span style={{ color: 'var(--red)', fontWeight: 900 }}>Positive</span>
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      marginTop: 12,
                      background: 'var(--surface)',
                      borderRadius: 16,
                      padding: 12,
                      border: '1.5px solid var(--border)',
                    }}
                  >
                    <div style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--text)' }}>
                      What is the most likely diagnosis?
                    </div>
                    <div
                      style={{
                        marginTop: 8,
                        background: 'var(--teal-tint)',
                        borderRadius: 10,
                        padding: '8px 10px',
                        fontSize: 11,
                        fontWeight: 800,
                        color: 'var(--teal-deep)',
                      }}
                    >
                      Acute pyelonephritis
                    </div>
                  </div>
                </div>
              </PhoneFrame>
              <div style={{ marginTop: 24, fontSize: 17, fontWeight: 900, color: 'var(--text)' }}>Clinical cases</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-soft)', maxWidth: 240, margin: '4px auto 0' }}>
                Full vignettes that rehearse real clinical reasoning
              </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════ WHY IT WORKS (LEARNING SCIENCE) ══════════════ */}
      <section
        style={{ background: 'var(--bg)', color: 'var(--text)', padding: '0 24px clamp(70px, 8vw, 110px)', position: 'relative' }}
      >
        <div style={{ maxWidth: 1160, margin: '0 auto' }}>
          <div
            data-reveal="blur"
            style={{
              textAlign: 'center',
              fontSize: 13,
              fontWeight: 900,
              letterSpacing: 3,
              textTransform: 'uppercase',
              color: 'var(--teal)',
              marginBottom: 34,
            }}
          >
            Built on learning science
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))',
              gap: 16,
            }}
          >
            {(
              [
                {
                  title: 'Active recall',
                  color: 'var(--teal-deep)',
                  body: 'Answering questions forces your brain to retrieve — which builds memory far faster than re-reading notes.',
                },
                {
                  title: 'Spaced repetition',
                  color: 'var(--coral-deep)',
                  body: 'Flashcards and the Time Capsule resurface material right before you would forget it.',
                },
                {
                  title: 'Immediate feedback',
                  color: 'var(--amber)',
                  body: 'Every answer is explained on the spot, so a mistake becomes understanding within seconds.',
                },
                {
                  title: 'Habit streaks',
                  color: PERI_DEEP,
                  body: 'Short daily sessions beat cramming — streaks and leagues keep you showing up until exam day.',
                },
              ] as const
            ).map((c, i) => (
              <div key={c.title} data-reveal="up" data-reveal-delay={i * 80}>
                <div style={{ ...gridCard, padding: '20px 22px', borderRadius: 20, height: '100%' }}>
                  <div style={{ ...cardEyebrow, color: c.color }}>{c.title}</div>
                  <p style={cardBody}>{c.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ GAMIFICATION GRID ══════════════ */}
      <section
        style={{
          background: 'var(--bg)',
          color: 'var(--text)',
          padding: '40px 24px clamp(100px, 11vw, 150px)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* depth layers — glows + drifting emojis at every width; only the
            dot grid (lp-depth-lg) hidden < 700px */}
        <div
          data-para="0.8"
          style={{
            position: 'absolute',
            bottom: -140,
            left: -160,
            width: 560,
            height: 560,
            borderRadius: '50%',
            pointerEvents: 'none',
            background: 'radial-gradient(circle, rgba(242,119,78,.10), transparent 70%)',
          }}
        />
        <div
          data-para="-0.5"
          style={{
            position: 'absolute',
            top: -100,
            right: -140,
            width: 460,
            height: 460,
            borderRadius: '50%',
            pointerEvents: 'none',
            background: 'radial-gradient(circle, rgba(14,158,142,.09), transparent 70%)',
          }}
        />
        <div
          className="lp-depth-lg"
          data-para="0.35"
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            opacity: 0.4,
            backgroundImage: 'radial-gradient(rgba(16,40,36,.09) 1.5px, transparent 1.5px)',
            backgroundSize: '26px 26px',
          }}
        />
        <div
          data-para="-0.55"
          aria-hidden="true"
          style={{ position: 'absolute', top: '10%', left: '3%', fontSize: 'clamp(46px, 10vw, 60px)', opacity: 0.12, pointerEvents: 'none' }}
        >
          <div style={{ animation: 'lp-floaty 6.6s ease-in-out infinite' }}>🔥</div>
        </div>
        <div
          data-para="0.4"
          aria-hidden="true"
          style={{ position: 'absolute', top: '48%', right: '2.5%', fontSize: 'clamp(38px, 8vw, 48px)', opacity: 0.12, pointerEvents: 'none' }}
        >
          <div style={{ animation: 'lp-bobble 5.8s ease-in-out .7s infinite' }}>⚡</div>
        </div>
        <div
          data-para="-0.35"
          aria-hidden="true"
          style={{ position: 'absolute', bottom: '6%', right: '8%', fontSize: 'clamp(50px, 11vw, 66px)', opacity: 0.12, pointerEvents: 'none' }}
        >
          <div style={{ animation: 'lp-floaty2 7.4s ease-in-out 1.2s infinite' }}>🏆</div>
        </div>
        <div style={{ maxWidth: 1160, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', maxWidth: 700, margin: '0 auto 70px' }}>
            <div
              data-reveal="blur"
              style={{
                fontSize: 13,
                fontWeight: 900,
                letterSpacing: 3,
                textTransform: 'uppercase',
                color: 'var(--coral-deep)',
              }}
            >
              Consistency, engineered
            </div>
            <h2
              data-reveal="80"
              style={{
                margin: '14px 0 0',
                fontSize: 'clamp(34px, 5vw, 62px)',
                fontWeight: 900,
                letterSpacing: '-0.03em',
                lineHeight: 1.06,
              }}
            >
              Studying that fights back.
            </h2>
            <p
              data-reveal="160"
              style={{
                margin: '20px auto 0',
                maxWidth: 540,
                fontSize: 18,
                fontWeight: 600,
                lineHeight: 1.55,
                color: 'var(--text-soft)',
              }}
            >
              Streaks, leagues, barrages, and combos make showing up every day the easy part — consistency without
              the willpower.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              /* min(320px, 100%) so a 360px viewport can't force overflow */
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))',
              gap: 22,
              perspective: 1200,
            }}
          >
            {/* Streaks — cards alternate up / zoom / rise-rotate. Each card sits
                in a parallax shim (odd +0.08 / even -0.08, ≥700px only) so the
                grid subtly scissors as you scroll. */}
            <div data-para="0.08" data-para-min="700">
            <div className="lp-breathe" data-tilt="1" data-reveal="up" style={gridCard}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ ...cardEyebrow, color: 'var(--coral-deep)' }}>Streaks &amp; freezes</div>
                <div style={{ fontSize: 26, animation: 'lp-flick 1.8s ease-in-out infinite', display: 'inline-block' }}>
                  🔥
                </div>
              </div>
              <div className="lp-week" style={{ marginTop: 20, display: 'flex', gap: 6, justifyContent: 'space-between' }}>
                <StreakDay state="done" label="M" />
                <StreakDay state="done" label="T" />
                <StreakDay state="frozen" label="W" />
                <StreakDay state="done" label="T" />
                <StreakDay state="done" label="F" />
                <StreakDay state="future" label="S" />
                <StreakDay state="future" label="S" />
              </div>
              <h3 style={cardTitle}>Keep the fire alive</h3>
              <p style={cardBody}>
                One session a day keeps your streak burning — and a streak freeze quietly saves you the night you
                can&apos;t make it.
              </p>
            </div>
            </div>

            {/* Leagues */}
            <div data-para="-0.08" data-para-min="700">
            <div className="lp-breathe" data-tilt="1" data-reveal="zoom" data-reveal-delay="80" style={gridCard}>
              <div style={{ ...cardEyebrow, color: 'var(--teal-deep)' }}>Weekly leagues</div>
              <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div
                  className="lp-row"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    background: 'var(--teal-tint)',
                    borderRadius: 12,
                    padding: '9px 12px',
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 900, color: 'var(--gold)' }}>1</span>
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      background: 'var(--teal)',
                      color: '#fff',
                      fontSize: 11,
                      fontWeight: 900,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    AK
                  </div>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 800 }}>Akosua</span>
                  <span style={{ fontSize: 12, fontWeight: 900, color: 'var(--teal-deep)' }}>2,140 XP</span>
                </div>
                <div
                  className="lp-row lp-row-you"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    background: 'var(--surface-2)',
                    borderRadius: 12,
                    padding: '9px 12px',
                    border: '2px solid var(--teal)',
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 900, color: 'var(--text-faint)' }}>2</span>
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      background: 'var(--coral)',
                      color: '#fff',
                      fontSize: 11,
                      fontWeight: 900,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    You
                  </div>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 900 }}>You</span>
                  <span style={{ fontSize: 12, fontWeight: 900, color: 'var(--teal-deep)' }}>2,085 XP</span>
                </div>
                <div
                  className="lp-row"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    background: 'var(--surface-2)',
                    borderRadius: 12,
                    padding: '9px 12px',
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 900, color: 'var(--text-faint)' }}>3</span>
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      background: PERI,
                      color: '#fff',
                      fontSize: 11,
                      fontWeight: 900,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    KW
                  </div>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 800 }}>Kwame</span>
                  <span style={{ fontSize: 12, fontWeight: 900, color: 'var(--text-soft)' }}>1,930 XP</span>
                </div>
              </div>
              <h3 style={cardTitle}>Climb the ladder</h3>
              <p style={cardBody}>Earn XP, race your cohort each week, and rise from Fresher all the way to Professor.</p>
            </div>
            </div>

            {/* Daily challenge */}
            <div data-para="0.08" data-para-min="700">
            <div className="lp-breathe" data-tilt="1" data-reveal="rise-rotate" data-reveal-delay="160" style={gridCard}>
              <div style={{ ...cardEyebrow, color: 'var(--amber)' }}>Daily challenge</div>
              <div
                style={{
                  marginTop: 18,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  background: 'var(--amber-tint)',
                  borderRadius: 18,
                  padding: 16,
                }}
              >
                <div style={{ position: 'relative', width: 58, height: 58, flexShrink: 0 }}>
                  <svg width="58" height="58" viewBox="0 0 58 58">
                    <circle cx="29" cy="29" r="24" fill="none" stroke="#F3DFC0" strokeWidth="7" />
                    <circle
                      cx="29"
                      cy="29"
                      r="24"
                      fill="none"
                      stroke="var(--amber)"
                      strokeWidth="7"
                      strokeLinecap="round"
                      strokeDasharray="106 151"
                      transform="rotate(-90 29 29)"
                    />
                  </svg>
                  <span
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 13,
                      fontWeight: 900,
                      color: 'var(--text)',
                    }}
                  >
                    7/10
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--text)' }}>Today&apos;s challenge</div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-soft)', marginTop: 2 }}>
                    3 questions to go — 5 minutes on a trotro is enough.
                  </div>
                </div>
              </div>
              <h3 style={cardTitle}>Five minutes a day</h3>
              <p style={cardBody}>
                A fresh bite-sized challenge every day keeps concepts warm between big study sessions.
              </p>
            </div>
            </div>

            {/* Rapid fire */}
            <div data-para="-0.08" data-para-min="700">
            <div className="lp-breathe" data-tilt="1" data-reveal="up" style={gridCard}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ ...cardEyebrow, color: PERI_DEEP }}>Rapid fire</div>
                <div
                  style={{
                    background: PERI_TINT,
                    color: PERI_DEEP,
                    fontSize: 13,
                    fontWeight: 900,
                    padding: '5px 12px',
                    borderRadius: 999,
                  }}
                >
                  ×3 combo
                </div>
              </div>
              <div style={{ marginTop: 20, height: 12, background: PERI_TINT, borderRadius: 999, overflow: 'hidden' }}>
                {/* full-width bar depleted to 62% via scaleX on reveal (transform-only) */}
                <div
                  className="lp-combo-fill"
                  style={{
                    width: '100%',
                    height: '100%',
                    background: `linear-gradient(90deg, ${PERI}, ${PERI_LIGHT})`,
                    borderRadius: 999,
                  }}
                />
              </div>
              <div
                style={{
                  marginTop: 10,
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 12,
                  fontWeight: 800,
                  color: 'var(--text-faint)',
                }}
              >
                <span>Beat the clock</span>
                <span style={{ color: PERI_DEEP }}>00:08</span>
              </div>
              <h3 style={cardTitle}>Blitz mode</h3>
              <p style={cardBody}>
                A depleting timer, stacking combos, and surprise 2× barrage windows. Pure adrenaline revision.
              </p>
            </div>
            </div>

            {/* Time capsule */}
            <div data-para="0.08" data-para-min="700">
            <div className="lp-breathe" data-tilt="1" data-reveal="zoom" data-reveal-delay="80" style={gridCard}>
              <div style={{ ...cardEyebrow, color: 'var(--teal-deep)' }}>Time capsule</div>
              <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    background: 'var(--surface-2)',
                    borderRadius: 12,
                    padding: '10px 12px',
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--red)', flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>
                    Loop diuretics — site of action
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-faint)' }}>3 wks ago</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    background: 'var(--surface-2)',
                    borderRadius: 12,
                    padding: '10px 12px',
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--red)', flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>
                    Nephrotic vs nephritic syndrome
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-faint)' }}>1 mo ago</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    background: 'var(--teal-tint)',
                    borderRadius: 12,
                    padding: '10px 12px',
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 12.5, fontWeight: 800, color: 'var(--teal-deep)' }}>Retry now →</span>
                </div>
              </div>
              <h3 style={cardTitle}>Meet your past mistakes</h3>
              <p style={cardBody}>
                Every question you got wrong comes back to be conquered — exactly when you&apos;re ready for the
                rematch.
              </p>
            </div>
            </div>

            {/* Search & bookmarks */}
            <div data-para="-0.08" data-para-min="700">
            <div className="lp-breathe" data-tilt="1" data-reveal="rise-rotate" data-reveal-delay="160" style={gridCard}>
              <div style={{ ...cardEyebrow, color: 'var(--teal-deep)' }}>Search &amp; bookmarks</div>
              <div
                style={{
                  marginTop: 18,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: 'var(--surface-2)',
                  border: '1.5px solid var(--border)',
                  borderRadius: 14,
                  padding: '11px 14px',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-soft)" strokeWidth="2.6" strokeLinecap="round">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21 l-4.3 -4.3" />
                </svg>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-faint)' }}>pyelonephritis…</span>
              </div>
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 7 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px' }}>
                  <span style={{ color: 'var(--gold)', fontSize: 15 }}>🔖</span>
                  <span style={{ flex: 1, fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>
                    Empirical antibiotics for acute pyelonephritis
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px' }}>
                  <span style={{ color: 'var(--gold)', fontSize: 15 }}>🔖</span>
                  <span style={{ flex: 1, fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>
                    Imaging criteria — complicated UTI
                  </span>
                </div>
              </div>
              <h3 style={cardTitle}>Save it, find it, drill it</h3>
              <p style={cardBody}>
                Look up any concept instantly, bookmark the tricky ones, and practice your saved set on demand.
              </p>
            </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════ INSIGHTS ══════════════ */}
      <section
        style={{
          background: 'var(--surface-3)',
          color: 'var(--text)',
          padding: 'clamp(96px, 11vw, 150px) 24px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* depth layers — glows + drifting emojis run at every width (no
            dot grid in this section, so nothing sits out on mobile) */}
        <div
          data-para="-0.6"
          style={{
            position: 'absolute',
            top: '10%',
            right: -100,
            width: 460,
            height: 460,
            borderRadius: '50%',
            pointerEvents: 'none',
            background: 'radial-gradient(circle, rgba(14,158,142,.12), transparent 70%)',
          }}
        />
        <div
          data-para="0.5"
          style={{
            position: 'absolute',
            bottom: -120,
            left: -120,
            width: 440,
            height: 440,
            borderRadius: '50%',
            pointerEvents: 'none',
            background: 'radial-gradient(circle, rgba(242,119,78,.09), transparent 70%)',
          }}
        />
        <div
          data-para="-0.4"
          aria-hidden="true"
          style={{ position: 'absolute', top: '12%', left: '3%', fontSize: 'clamp(40px, 9vw, 52px)', opacity: 0.12, pointerEvents: 'none' }}
        >
          <div style={{ animation: 'lp-floaty 6.8s ease-in-out .3s infinite' }}>📈</div>
        </div>
        <div
          data-para="0.35"
          aria-hidden="true"
          style={{ position: 'absolute', bottom: '8%', right: '4%', fontSize: 'clamp(48px, 10vw, 62px)', opacity: 0.12, pointerEvents: 'none' }}
        >
          <div style={{ animation: 'lp-floaty2 7.6s ease-in-out infinite' }}>💉</div>
        </div>
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            maxWidth: 1100,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(340px, 100%), 1fr))',
            gap: 'clamp(44px, 7vw, 70px)',
            alignItems: 'center',
          }}
        >
          <div>
            <div
              data-reveal="left"
              style={{ fontSize: 13, fontWeight: 900, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--teal)' }}
            >
              Know where you stand
            </div>
            <h2
              data-reveal="left"
              data-reveal-delay="80"
              style={{
                margin: '14px 0 0',
                fontSize: 'clamp(31px, 4.5vw, 56px)',
                fontWeight: 900,
                letterSpacing: '-0.03em',
                lineHeight: 1.08,
              }}
            >
              Walk into exam day with nothing left to guess.
            </h2>
            <p
              data-reveal="left"
              data-reveal-delay="160"
              style={{ margin: '20px 0 0', fontSize: 18, fontWeight: 600, lineHeight: 1.6, color: 'var(--text-soft)' }}
            >
              Your Readiness Score updates continuously from recent accuracy, consistency, weak topics, question
              difficulty and long-term retention — then turns it all into a prioritized daily plan.
            </p>
            <div
              data-reveal="left"
              data-reveal-delay="240"
              style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 12 }}
            >
              {[
                'Recent accuracy, weighted by question difficulty',
                'Consistency and long-term retention, tracked over time',
                'Weak topics turned into your next study session',
              ].map((line) => (
                /* flex-start (not center) so when a line wraps on narrow
                   screens the check pins to the first line — no hanging
                   indent, no floating checkmark between wrapped lines */
                <div key={line} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <span
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      background: 'var(--teal)',
                      color: '#fff',
                      fontSize: 13,
                      fontWeight: 900,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    ✓
                  </span>
                  <span style={{ fontSize: 15.5, fontWeight: 700, lineHeight: 1.45, marginTop: 2 }}>{line}</span>
                </div>
              ))}
            </div>
          </div>
          <div data-reveal="right" data-reveal-delay="120" style={{ perspective: 1000 }}>
            <div
              className="lp-breathe"
              data-tilt="1"
              style={{
                background: 'var(--surface)',
                borderRadius: 30,
                padding: 'clamp(22px, 4.5vw, 34px)',
                boxShadow: '0 28px 56px -22px rgba(16,40,36,.32)',
                border: '1px solid var(--border)',
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 900,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  color: 'var(--text-faint)',
                }}
              >
                Exam readiness
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                  gap: 'clamp(18px, 3vw, 28px)',
                  marginTop: 18,
                }}
              >
                <div style={{ position: 'relative', width: 150, height: 150, flexShrink: 0 }}>
                  <svg width="150" height="150" viewBox="0 0 150 150">
                    <circle cx="75" cy="75" r="62" fill="none" stroke="var(--surface-3)" strokeWidth="14" />
                    <circle
                      data-ring="1"
                      cx="75"
                      cy="75"
                      r="62"
                      fill="none"
                      stroke="var(--teal)"
                      strokeWidth="14"
                      strokeLinecap="round"
                      strokeDasharray="0 390"
                      transform="rotate(-90 75 75)"
                      style={{ transition: 'stroke-dasharray 1.4s cubic-bezier(.3,.8,.3,1)' }}
                    />
                  </svg>
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span
                      data-ringnum="1"
                      style={{ fontSize: 38, fontWeight: 900, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}
                    >
                      0%
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-faint)', letterSpacing: 1 }}>
                      READY
                    </span>
                  </div>
                </div>
                <div style={{ flex: '1 1 190px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {(
                    [
                      { label: 'Cardiovascular', pct: 86, color: 'var(--green)', delay: '.2s' },
                      { label: 'Endocrine', pct: 61, color: 'var(--amber)', delay: '.35s' },
                      { label: 'Renal', pct: 43, color: 'var(--red)', delay: '.5s' },
                    ] as const
                  ).map((t) => (
                    <div key={t.label}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: 12.5,
                          fontWeight: 800,
                          marginBottom: 5,
                        }}
                      >
                        <span>{t.label}</span>
                        <span style={{ color: t.color }}>{t.pct}%</span>
                      </div>
                      <div style={{ height: 8, background: 'var(--surface-3)', borderRadius: 999, overflow: 'hidden' }}>
                        <div
                          data-bar={t.pct}
                          style={{
                            width: '0%',
                            height: '100%',
                            background: t.color,
                            borderRadius: 999,
                            transition: `width 1.2s ${t.delay} cubic-bezier(.3,.8,.3,1)`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div
                style={{
                  marginTop: 24,
                  background: 'var(--teal-tint)',
                  borderRadius: 16,
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <CappyThinking size={38} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--teal-deep)' }}>
                  Do this next: 15 renal MCQs — your fastest path to +4% readiness.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════ TAILORED ══════════════ */}
      <section
        style={{ background: 'var(--bg)', padding: 'clamp(96px, 11vw, 150px) 20px', position: 'relative', overflow: 'hidden' }}
      >
        <div
          data-reveal="zoom"
          style={{
            maxWidth: 1100,
            margin: '0 auto',
            background: 'linear-gradient(140deg, #0A6E62, #084F47)',
            borderRadius: 'clamp(28px, 5vw, 44px)',
            padding: 'clamp(32px, 6vw, 80px) clamp(20px, 5vw, 80px)',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 40px 80px -30px rgba(10,110,98,.5)',
          }}
        >
          <div
            data-para="-0.8"
            style={{
              position: 'absolute',
              top: -60,
              right: -60,
              width: 340,
              height: 340,
              borderRadius: '50%',
              pointerEvents: 'none',
              background: 'rgba(255,255,255,.07)',
            }}
          />
          <div
            data-para="0.7"
            style={{
              position: 'absolute',
              bottom: -80,
              left: -40,
              width: 300,
              height: 300,
              borderRadius: '50%',
              pointerEvents: 'none',
              background: 'rgba(255,255,255,.06)',
            }}
          />
          <div
            data-para="-0.4"
            style={{
              position: 'absolute',
              top: '32%',
              left: '6%',
              width: 150,
              height: 150,
              borderRadius: '50%',
              pointerEvents: 'none',
              border: '2px solid rgba(255,255,255,.10)',
            }}
          />
          <div style={{ position: 'relative', textAlign: 'center', color: '#fff' }}>
            <div
              data-reveal="blur"
              style={{ fontSize: 13, fontWeight: 900, letterSpacing: 3, textTransform: 'uppercase', color: '#7ED9CC' }}
            >
              Made for your program
            </div>
            <h2
              data-reveal="80"
              style={{
                margin: '14px auto 0',
                maxWidth: 680,
                fontSize: 'clamp(29px, 4.5vw, 54px)',
                fontWeight: 900,
                letterSpacing: '-0.03em',
                lineHeight: 1.08,
              }}
            >
              Questions tailored to your profession, your year, your country.
            </h2>
            <p
              data-reveal="160"
              style={{
                margin: '18px auto 0',
                maxWidth: 560,
                fontSize: 17,
                fontWeight: 600,
                lineHeight: 1.6,
                color: '#C8E6E0',
              }}
            >
              Pick who you are once — Skoolie serves the syllabus that matters, from Year 1 foundations to
              practitioner-level cases.
            </p>
            <div
              data-reveal="220"
              style={{ marginTop: 40, display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}
            >
              {['💊 Pharmacy', '🩺 Medicine', '💉 Nursing', '🦷 Dentistry', '🤰 Midwifery'].map((chip) => (
                <span
                  key={chip}
                  style={{
                    background: 'rgba(255,255,255,.14)',
                    border: '1px solid rgba(255,255,255,.25)',
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 800,
                    padding: '9px 18px',
                    borderRadius: 999,
                  }}
                >
                  {chip}
                </span>
              ))}
            </div>
            <div
              data-reveal="280"
              style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}
            >
              {['Year 1', 'Year 3', 'Year 5', 'Year 6', 'Practitioner', '🇬🇭 Ghana', '🇺🇸 USA', '🇳🇬 Nigeria'].map((chip) =>
                chip === 'Year 5' ? (
                  <span
                    key={chip}
                    style={{
                      background: 'var(--coral)',
                      color: '#fff',
                      fontSize: 13,
                      fontWeight: 900,
                      padding: '8px 16px',
                      borderRadius: 999,
                    }}
                  >
                    {chip}
                  </span>
                ) : (
                  <span
                    key={chip}
                    style={{
                      background: 'rgba(0,0,0,.22)',
                      color: '#A9DBD2',
                      fontSize: 13,
                      fontWeight: 800,
                      padding: '8px 16px',
                      borderRadius: 999,
                    }}
                  >
                    {chip}
                  </span>
                )
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════ CTA + FOOTER ══════════════ */}
      <section
        style={{
          background: DARK_BG,
          color: INK,
          padding: 'clamp(110px, 12vw, 160px) 24px 80px',
          position: 'relative',
          overflow: 'hidden',
          textAlign: 'center',
        }}
      >
        <div
          data-mouse="26"
          style={{
            position: 'absolute',
            inset: '-10%',
            pointerEvents: 'none',
            background: 'radial-gradient(ellipse 50% 40% at 50% 45%, rgba(14,158,142,.22), transparent 70%)',
          }}
        />
        {/* depth layers — glows at every width; only the dot grid
            (lp-depth-lg) hidden < 700px */}
        <div
          data-para="-0.3"
          style={{
            position: 'absolute',
            top: '4%',
            left: -140,
            width: 480,
            height: 480,
            borderRadius: '50%',
            pointerEvents: 'none',
            background: 'radial-gradient(circle, rgba(36,187,168,.10), transparent 70%)',
          }}
        />
        <div
          data-para="0.5"
          style={{
            position: 'absolute',
            bottom: '10%',
            right: -160,
            width: 520,
            height: 520,
            borderRadius: '50%',
            pointerEvents: 'none',
            background: 'radial-gradient(circle, rgba(242,119,78,.09), transparent 70%)',
          }}
        />
        <div
          className="lp-depth-lg"
          data-para="0.25"
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            opacity: 0.3,
            backgroundImage: 'radial-gradient(rgba(233,240,238,.14) 1.5px, transparent 1.5px)',
            backgroundSize: '34px 34px',
          }}
        />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 800, margin: '0 auto' }}>
          <div
            data-reveal="pop"
            style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 4, marginBottom: 34 }}
          >
            <div data-para="-0.2" style={{ zIndex: 1 }}>
              <div style={{ animation: 'lp-bobble 5s ease-in-out .3s infinite', position: 'relative' }}>
                {/* Noggin speech bubble — same chat-bubble language as the
                    cases mockup; bobbles with him. Below 700px the mascot trio
                    compresses and the nowrap bubble slides under Cappy
                    (higher z-index), so it sits out (lp-cta-bubble) */}
                <div
                  className="lp-cta-bubble"
                  style={{
                    position: 'absolute',
                    bottom: '98%',
                    left: -10,
                    marginBottom: 8,
                    whiteSpace: 'nowrap',
                    background: DARK_CHIP,
                    border: '1px solid rgba(242,119,78,.45)',
                    color: INK,
                    fontSize: 13,
                    fontWeight: 800,
                    padding: '8px 13px',
                    borderRadius: '16px 16px 16px 4px',
                    boxShadow: '0 12px 26px -10px rgba(0,0,0,.5)',
                  }}
                >
                  Your streak starts today 🔥
                </div>
                <NogginHappy size={92} style={{ width: 'clamp(64px, 20vw, 92px)', height: 'auto' }} />
              </div>
            </div>
            <div data-para="-0.35" style={{ zIndex: 2 }}>
              <div style={{ animation: 'lp-floaty 4.6s ease-in-out infinite' }}>
                <CappyHappy
                  size={130}
                  style={{ width: 'clamp(92px, 28vw, 130px)', height: 'auto', filter: 'drop-shadow(0 20px 30px rgba(0,0,0,.5))' }}
                />
              </div>
            </div>
            <div data-para="-0.25" style={{ zIndex: 1 }}>
              <div style={{ animation: 'lp-floaty2 5.4s ease-in-out .6s infinite' }}>
                <BuddyHappy size={86} style={{ width: 'clamp(60px, 18vw, 86px)', height: 'auto' }} />
              </div>
            </div>
          </div>
          <h2
            data-reveal="flip"
            data-reveal-delay="80"
            style={{ margin: 0, fontSize: 'clamp(36px, 6vw, 78px)', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.05 }}
          >
            Your exam is coming.
            <br />
            <span style={{ color: TEAL_BRIGHT }}>You&apos;ll know you&apos;re ready.</span>
          </h2>
          <p
            data-reveal="160"
            style={{ margin: '22px auto 0', maxWidth: 480, fontSize: 18, fontWeight: 600, lineHeight: 1.55, color: INK_SOFT }}
          >
            Pick your profession, your year, your country — and let Skoolie tell you exactly what to study next,
            every day until the exam.
          </p>
          <div
            data-reveal="240"
            style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginTop: 36 }}
          >
            <StoreBadgePair />
          </div>
        </div>

        {/* footer */}
        <div
          style={{
            position: 'relative',
            maxWidth: 1100,
            margin: '120px auto 0',
            paddingTop: 28,
            borderTop: '1px solid rgba(233,240,238,.1)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 16,
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: 13.5, fontWeight: 700, color: INK_FAINT }}>
            © 2026 Skoolie · Made for health students
          </span>
          <div style={{ display: 'flex', gap: '10px 22px', alignItems: 'center', flexWrap: 'wrap' }}>
            <Link href="/terms" style={{ fontSize: 13.5, fontWeight: 800, color: INK_SOFT, textDecoration: 'none' }}>
              Terms
            </Link>
            <Link href="/privacy" style={{ fontSize: 13.5, fontWeight: 800, color: INK_SOFT, textDecoration: 'none' }}>
              Privacy
            </Link>
            <a
              href="mailto:support@skoolieapp.com"
              style={{ fontSize: 13.5, fontWeight: 800, color: TEAL_BRIGHT, textDecoration: 'none' }}
            >
              support@skoolieapp.com
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
