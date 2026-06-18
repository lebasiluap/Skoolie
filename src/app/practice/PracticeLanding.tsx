'use client'

import { useState } from 'react'
import Link from 'next/link'

type Region = 'all' | 'universal' | 'ghana'

interface Props {
  mcqCount: number
  flashcardCount: number
  caseCount: number
  studyYear: string | null
  profession: string
}

const PROF_LABELS: Record<string, string> = {
  pharmacy: 'Pharmacy',
  medicine: 'Medicine',
  nursing: 'Nursing',
  general: 'General',
}
const YEAR_LABELS: Record<string, string> = {
  year1: 'Year 1', year2: 'Year 2', year3: 'Year 3',
  year4: 'Year 4', year5: 'Year 5', year6: 'Year 6',
  practitioner: 'Practitioner',
}

// Sparkle icon for "Smart start"
function SparkleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.5l1.9 5.2 5.6.3-4.4 3.5 1.5 5.4L12 19.3 7.4 22.4l1.5-5.4L4.5 8l5.6-.3z"/>
    </svg>
  )
}

export default function PracticeLanding({ mcqCount, flashcardCount, caseCount, studyYear, profession }: Props) {
  const [region, setRegion] = useState<Region>('all')

  function buildUrl(path: string, extra: Record<string, string> = {}) {
    const params = new URLSearchParams(extra)
    if (region !== 'all') params.set('region', region)
    const qs = params.toString()
    return qs ? `${path}?${qs}` : path
  }

  const modes = [
    {
      label: 'MCQs',
      description: 'Multiple choice questions',
      count: mcqCount,
      countLabel: 'questions',
      path: '/practice/mcq',
      randomLimit: 10,
      iconBg: 'var(--teal-tint)',
      iconFg: 'var(--teal)',
      countColor: 'var(--teal)',
      primaryBg: 'var(--teal)',
      primaryFg: 'var(--on-teal)',
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 6.5h11M9 12h11M9 17.5h11"/><path d="M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01"/>
        </svg>
      ),
    },
    {
      label: 'Flashcards',
      description: 'Test your recall',
      count: flashcardCount,
      countLabel: 'cards',
      path: '/practice/flashcards',
      randomLimit: 20,
      iconBg: 'var(--coral-tint)',
      iconFg: 'var(--coral-deep)',
      countColor: 'var(--coral)',
      primaryBg: 'var(--coral)',
      primaryFg: '#fff',
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="7.5" width="13.5" height="12" rx="2.5"/><path d="M7 7.5V6a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-1.5"/>
        </svg>
      ),
    },
    {
      label: 'Case Studies',
      description: 'Clinical scenarios',
      count: caseCount,
      countLabel: 'cases',
      path: '/practice/cases',
      randomLimit: 0,
      iconBg: 'var(--amber-tint)',
      iconFg: 'var(--amber)',
      countColor: 'var(--amber)',
      primaryBg: 'var(--amber)',
      primaryFg: '#fff',
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="4" width="14" height="17" rx="2.5"/><path d="M9 4.5V3.6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v.9"/><path d="M8 13h2l1-2 1.6 4 1-2h1.4"/>
        </svg>
      ),
    },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 100 }}>
      <div style={{ maxWidth: 1140, margin: '0 auto', padding: 'clamp(18px,3.5vw,38px) clamp(16px,3.5vw,38px) 0' }}>

        {/* Title */}
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ margin: 0, fontSize: 'clamp(26px,3vw,32px)', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.025em' }}>Practice</h1>
          <p style={{ margin: '5px 0 0', fontSize: 15, color: 'var(--text-soft)', fontWeight: 600 }}>
            {PROF_LABELS[profession] ?? profession}
            {studyYear ? ` · ${YEAR_LABELS[studyYear] ?? studyYear}` : ''}
          </p>
        </div>

        {/* Region segmented control */}
        <div style={{ marginBottom: 22 }}>
          <p style={{ margin: '0 0 9px', fontSize: 12, fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Question set</p>
          <div style={{ display: 'inline-flex', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 5, gap: 4, boxShadow: 'var(--shadow)' }}>
            {(['all', 'universal', 'ghana'] as Region[]).map(r => (
              <button
                key={r}
                onClick={() => setRegion(r)}
                style={{
                  padding: '9px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 700,
                  background: region === r ? 'var(--teal)' : 'transparent',
                  color: region === r ? 'var(--on-teal)' : 'var(--text-soft)',
                  transition: 'background .15s ease, color .15s ease',
                  fontFamily: 'inherit',
                }}
              >
                {r === 'all' ? 'All' : r === 'universal' ? 'Global' : 'Regional'}
              </button>
            ))}
          </div>
        </div>

        {/* Mode cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(290px,1fr))', gap: 16 }}>
          {modes.map(m => (
            <div key={m.label} className="practice-card" style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 20, boxShadow: 'var(--shadow)', overflow: 'hidden',
            }}>
              <div style={{ padding: '20px 20px 16px', display: 'flex', alignItems: 'center', gap: 15 }}>
                <div style={{ width: 52, height: 52, borderRadius: 15, background: m.iconBg, color: m.iconFg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {m.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>{m.label}</p>
                  <p style={{ margin: '1px 0 0', fontSize: 13, color: 'var(--text-faint)', fontWeight: 600 }}>{m.description}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: m.countColor }}>{m.count.toLocaleString()}</p>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--text-faint)', fontWeight: 600 }}>{m.countLabel}</p>
                </div>
              </div>
              <div style={{ padding: '0 20px 20px', display: 'flex', gap: 11 }}>
                <Link
                  href={buildUrl(m.path, { random: '1', ...(m.randomLimit ? { limit: String(m.randomLimit) } : {}) })}
                  className="practice-primary-btn"
                  style={{
                    flex: 1, padding: 13, borderRadius: 999,
                    background: m.primaryBg, color: m.primaryFg,
                    border: 'none', fontSize: 14, fontWeight: 800, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                    textDecoration: 'none',
                  }}
                >
                  <SparkleIcon />
                  Smart start
                </Link>
                <Link
                  href={buildUrl(m.path)}
                  style={{
                    flex: 1, padding: 13, borderRadius: 999,
                    background: 'var(--surface-2)', color: 'var(--text)',
                    border: '1px solid var(--border)', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    textDecoration: 'none',
                  }}
                >
                  {m.label === 'Case Studies' ? 'Start case' : 'Browse topics'}
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Bookmarks shortcut */}
        <Link
          href="/bookmarks"
          className="practice-bookmark-row"
          style={{
            width: '100%', marginTop: 16,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 18, boxShadow: 'var(--shadow)', padding: '17px 20px',
            display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer',
            textDecoration: 'none',
          }}
        >
          <div style={{ width: 42, height: 42, borderRadius: 12, background: 'var(--surface-3)', color: 'var(--text-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 4h10a1 1 0 0 1 1 1v15.5l-6-4-6 4V5a1 1 0 0 1 1-1z"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>Bookmarks</p>
            <p style={{ margin: '1px 0 0', fontSize: 13, color: 'var(--text-faint)', fontWeight: 600 }}>Questions you&apos;ve saved</p>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 6l6 6-6 6"/>
          </svg>
        </Link>
      </div>

      <style>{`
        .practice-card {
          transition: transform .24s cubic-bezier(.2,.75,.25,1), box-shadow .24s ease;
        }
        .practice-card:hover {
          transform: translateY(-5px);
          box-shadow: var(--shadow-lg);
        }
        .practice-primary-btn {
          transition: transform .18s ease, filter .18s ease;
        }
        .practice-primary-btn:hover {
          transform: translateY(-2px);
          filter: brightness(1.06);
        }
        .practice-bookmark-row {
          transition: transform .22s cubic-bezier(.2,.75,.25,1), box-shadow .22s ease, border-color .22s ease;
        }
        .practice-bookmark-row:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-lg);
          border-color: var(--teal) !important;
        }
      `}</style>
    </div>
  )
}
