// Shared admin UI kit — single source of truth for the CMS look.
// Design scale: page pad clamp / cards 20 / modals 24 / inputs+buttons 12 /
// chips 999 / eyebrow 11-800-uppercase / body 13.5 / titles 24-900.
// No hooks here, so both server and client components can import freely.

import React from 'react'

// ── Layout constants ─────────────────────────────────────────────────────────
export const PAGE_PAD = 'clamp(20px,3vw,36px) clamp(16px,3vw,32px)'

export const RAD = { card: 20, modal: 24, input: 12, btn: 12, chipBtn: 10, pill: 999 } as const

// ── Text styles ──────────────────────────────────────────────────────────────
export const titleStyle: React.CSSProperties = {
  margin: 0, fontSize: 24, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.02em',
}
export const subtitleStyle: React.CSSProperties = {
  margin: '3px 0 0', fontSize: 13, color: 'var(--text-faint)', fontWeight: 600,
}
export const eyebrowStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.08em',
}

// ── Controls ─────────────────────────────────────────────────────────────────
export const inputStyle: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)',
  borderRadius: RAD.input, padding: '9px 13px', fontSize: 13.5, fontFamily: 'inherit',
  outline: 'none', transition: 'border-color .15s ease', boxSizing: 'border-box',
}
export const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' }

export const primaryBtn: React.CSSProperties = {
  padding: '9px 20px', background: 'var(--teal)', color: 'var(--on-teal)', border: 'none',
  borderRadius: RAD.btn, fontSize: 13.5, fontWeight: 800, cursor: 'pointer',
  fontFamily: 'inherit', whiteSpace: 'nowrap',
}
export const ghostBtn: React.CSSProperties = {
  padding: '9px 16px', background: 'var(--surface-3)', color: 'var(--text-soft)', border: 'none',
  borderRadius: RAD.btn, fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
}
export const dangerBtn: React.CSSProperties = {
  ...primaryBtn, background: 'var(--red)', color: '#fff',
}
export const textBtn: React.CSSProperties = {
  padding: '10px 18px', border: 'none', background: 'transparent', color: 'var(--text-soft)',
  fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
}
export const linkBtn: React.CSSProperties = {
  background: 'none', border: 'none', padding: '2px 0', margin: 0,
  color: 'var(--teal)', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
}
export const actionBtn: React.CSSProperties = {
  padding: '8px 16px', border: '1px solid var(--border)', borderRadius: RAD.btn - 1,
  fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
}

// ── Table styles ─────────────────────────────────────────────────────────────
export const thStyle: React.CSSProperties = {
  textAlign: 'left', padding: '12px 14px', ...eyebrowStyle, whiteSpace: 'nowrap',
}
export const tdStyle: React.CSSProperties = { padding: '11px 14px', whiteSpace: 'nowrap' }

// ── Components ───────────────────────────────────────────────────────────────
export function PageHeader({ title, sub, right }: { title: string; sub?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 22, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
      <div>
        <h1 style={titleStyle}>{title}</h1>
        {sub != null && <p style={subtitleStyle}>{sub}</p>}
      </div>
      {right}
    </div>
  )
}

export function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: RAD.card, boxShadow: 'var(--shadow)', overflow: 'hidden', ...style }}>
      {children}
    </div>
  )
}

export function Section({ title }: { title: string }) {
  return <p style={{ ...eyebrowStyle, margin: '0 0 10px', letterSpacing: '.1em' }}>{title}</p>
}

export function Chip({ text, tone = 'teal' }: { text: React.ReactNode; tone?: 'teal' | 'muted' | 'green' | 'amber' | 'red' | 'coral' | 'purple' }) {
  const tones: Record<string, { bg: string; color: string }> = {
    teal:   { bg: 'var(--teal-tint)',  color: 'var(--teal)' },
    muted:  { bg: 'var(--surface-3)',  color: 'var(--text-faint)' },
    green:  { bg: 'var(--green-tint)', color: 'var(--green)' },
    amber:  { bg: 'var(--amber-tint)', color: 'var(--amber)' },
    red:    { bg: 'var(--red-tint)',   color: 'var(--red)' },
    coral:  { bg: 'var(--coral-tint)', color: 'var(--coral)' },
    purple: { bg: 'var(--purple-tint)', color: 'var(--purple)' },
  }
  const t = tones[tone] ?? tones.teal
  return (
    <span style={{ fontSize: 11.5, fontWeight: 800, padding: '4px 10px', borderRadius: RAD.pill, textTransform: 'capitalize', background: t.bg, color: t.color, whiteSpace: 'nowrap' }}>
      {text}
    </span>
  )
}

export function EmptyState({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <Card style={{ padding: '48px 24px', textAlign: 'center' }}>
      <p style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{title}</p>
      {sub && <p style={{ margin: action ? '0 0 20px' : 0, fontSize: 13, color: 'var(--text-faint)', fontWeight: 600 }}>{sub}</p>}
      {action}
    </Card>
  )
}

export function StatCard({ label, value, sub, color, pill }: {
  label: string
  value: string | number
  sub?: string
  color?: string
  pill?: { text: string; color: string; bg: string }
}) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: RAD.card, boxShadow: 'var(--shadow)', padding: '18px 20px' }}>
      <p style={{ ...eyebrowStyle, margin: '0 0 6px', letterSpacing: '.1em' }}>{label}</p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <p style={{ margin: 0, fontSize: 28, fontWeight: 900, color: color ?? 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</p>
        {pill && <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: RAD.pill, background: pill.bg, color: pill.color }}>{pill.text}</span>}
      </div>
      {sub && <p style={{ margin: '5px 0 0', fontSize: 12, color: 'var(--text-faint)', fontWeight: 600 }}>{sub}</p>}
    </div>
  )
}

export function Row({ children, last }: { children: React.ReactNode; last?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '12px 18px', borderBottom: last ? 'none' : '1px solid var(--border)' }}
      className="admin-table-row">
      {children}
    </div>
  )
}

export function MiniBar({ value, max, color = 'var(--teal)' }: { value: number; max: number; color?: string }) {
  return (
    <div style={{ height: 4, borderRadius: RAD.pill, background: 'var(--surface-3)', overflow: 'hidden', flex: 1, margin: '0 10px' }}>
      <div style={{ height: '100%', background: color, borderRadius: RAD.pill, width: `${Math.min(100, Math.max(2, (value / Math.max(max, 1)) * 100))}%` }} />
    </div>
  )
}

export function ModalScrim({ children, onClose, z = 50 }: { children: React.ReactNode; onClose?: () => void; z?: number }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(6px)', zIndex: z, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, overflowY: 'auto' }}
      onClick={onClose}>
      {children}
    </div>
  )
}

export const modalSheet: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: RAD.modal,
  boxShadow: 'var(--shadow-lg)', padding: 28, width: '100%', maxWidth: 500,
  maxHeight: '92vh', overflowY: 'auto',
}

// ── Data helpers ─────────────────────────────────────────────────────────────
export const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

/**
 * Normalize MCQ options for display, mirroring the mobile app's reader
 * (SkoolieApp/lib/answers.ts). Handles every shape in the bank:
 * string[] (with or without "A. " prefixes), {A,B,C,D} keyed objects,
 * and [{key,value}] object arrays. Letter prefixes are stripped so the
 * rendered letter never duplicates.
 */
export function normalizeMcqOptions(raw: unknown): { letter: string; text: string }[] {
  const strip = (s: string) => s.replace(/^\s*[A-F][.):]\s*/, '').trim()
  if (Array.isArray(raw)) {
    return raw.map((x, i) => {
      if (x && typeof x === 'object') {
        const o = x as Record<string, unknown>
        return { letter: String(o.key ?? OPTION_LETTERS[i]), text: strip(String(o.value ?? '')) }
      }
      return { letter: OPTION_LETTERS[i], text: strip(String(x ?? '')) }
    })
  }
  if (raw && typeof raw === 'object') {
    return OPTION_LETTERS.filter(k => (raw as Record<string, unknown>)[k] != null)
      .map(k => ({ letter: k, text: strip(String((raw as Record<string, unknown>)[k])) }))
  }
  return []
}

/** Resolve the keyed correct option to a letter ("B", "B. text", or full text). */
export function resolveKeyLetter(options: { letter: string; text: string }[], correctAnswer: string | null | undefined): string | null {
  const ca = (correctAnswer ?? '').trim()
  if (!ca) return null
  if (/^[A-F]$/i.test(ca)) return ca.toUpperCase()
  const m = ca.match(/^([A-F])[.):]\s*/i)
  if (m) return m[1].toUpperCase()
  const hit = options.find(o => o.text.toLowerCase() === ca.toLowerCase())
  return hit ? hit.letter : null
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}
