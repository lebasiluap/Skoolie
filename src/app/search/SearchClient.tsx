'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────

export type CatalogEntry = {
  topic: string
  category: string | null
  subtopic: string | null
  mcq_count: number
  flashcard_count: number
  case_count: number
}

type ScoredEntry = CatalogEntry & { score: number }

// ─── Abbreviation dictionary ──────────────────────────────────────────────────
// Maps shorthand/acronyms → expanded text for fuzzy matching

const ABBREVS: Record<string, string> = {
  'cns': 'central nervous system neurology',
  'gi': 'gastroenterology gastrointestinal',
  'msk': 'musculoskeletal',
  'haem': 'haematology hematology',
  'hema': 'haematology hematology',
  'heme': 'haematology hematology',
  'cvs': 'cardiovascular cardiology',
  'cv': 'cardiovascular cardiology',
  'resp': 'respiratory',
  'endo': 'endocrinology',
  'ida': 'iron deficiency anaemia anemia',
  'scd': 'sickle cell disease',
  'tb': 'tuberculosis',
  'dm': 'diabetes mellitus',
  'htn': 'hypertension',
  'oa': 'osteoarthritis',
  'ra': 'rheumatoid arthritis',
  'cll': 'chronic lymphocytic leukaemia leukemia',
  'cml': 'chronic myeloid leukaemia leukemia',
  'aml': 'acute myeloid leukaemia leukemia',
  'all': 'acute lymphoblastic leukaemia leukemia',
  'vte': 'venous thromboembolism thrombosis',
  'pe': 'pulmonary embolism',
  'dvt': 'deep vein thrombosis',
  'itp': 'immune thrombocytopenic purpura',
  'dic': 'disseminated intravascular coagulation',
  'ap': 'anatomy physiology',
  'pharm': 'pharmacology',
  'path': 'pathophysiology',
  'as': 'ankylosing spondylitis',
  'psa': 'psoriatic arthritis',
  'sle': 'systemic lupus erythematosus lupus',
  'copd': 'chronic obstructive pulmonary disease',
  'gerd': 'gastroesophageal reflux disease',
  'gord': 'gastro oesophageal reflux disease',
  'ibd': 'inflammatory bowel disease',
  'ckd': 'chronic kidney disease',
  'aki': 'acute kidney injury',
  'mds': 'myelodysplastic syndrome',
  'mgus': 'monoclonal gammopathy',
  'hf': 'heart failure',
  'af': 'atrial fibrillation',
  'mi': 'myocardial infarction',
  'acs': 'acute coronary syndrome',
  'cad': 'coronary artery disease',
  'pvd': 'peripheral vascular disease',
  'gbs': 'guillain barre syndrome',
  'ms': 'multiple sclerosis',
  'pd': 'parkinsons disease',
  'ad': 'alzheimers disease',
  'tia': 'transient ischaemic attack',
  'cvd': 'cerebrovascular disease stroke',
  'pnh': 'paroxysmal nocturnal haemoglobinuria',
  'ttp': 'thrombotic thrombocytopenic purpura',
  'hus': 'haemolytic uraemic syndrome',
  'malt': 'mucosa associated lymphoid tissue',
  'dlbcl': 'diffuse large b cell lymphoma',
  'hl': 'hodgkin lymphoma',
  'nhl': 'non hodgkin lymphoma',
  'uti': 'urinary tract infection',
  'pcos': 'polycystic ovary syndrome',
  'ibs': 'irritable bowel syndrome',
  'uc': 'ulcerative colitis',
  'cd': 'crohn disease',
  'nash': 'non alcoholic steatohepatitis',
  'nafld': 'non alcoholic fatty liver disease',
  'pud': 'peptic ulcer disease',
}

// ─── Fuzzy matching utilities ─────────────────────────────────────────────────

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[_\-]/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Build a set of all trigrams (3-char substrings) for a string */
function trigrams(s: string): Set<string> {
  const padded = `  ${s}  `
  const set = new Set<string>()
  for (let i = 0; i < padded.length - 2; i++) {
    set.add(padded.slice(i, i + 3))
  }
  return set
}

/** Dice coefficient over trigrams — handles transpositions & typos */
function trigramSim(a: string, b: string): number {
  if (!a || !b) return 0
  if (a === b) return 1
  const ta = trigrams(a)
  const tb = trigrams(b)
  let shared = 0
  for (const t of ta) if (tb.has(t)) shared++
  return (2 * shared) / (ta.size + tb.size)
}

/** Levenshtein distance for short strings (handles single-char omissions) */
function lev(a: string, b: string): number {
  const m = a.length, n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const row = Array.from({ length: n + 1 }, (_, i) => i)
  for (let i = 1; i <= m; i++) {
    let prev = row[0]
    row[0] = i
    for (let j = 1; j <= n; j++) {
      const tmp = row[j]
      row[j] = a[i - 1] === b[j - 1]
        ? prev
        : 1 + Math.min(prev, row[j], row[j - 1])
      prev = tmp
    }
  }
  return row[n]
}

/** Score a query token against a field token */
function tokenSim(qt: string, ft: string): number {
  if (ft === qt) return 1.0
  if (ft.startsWith(qt)) return 0.95       // prefix match ("haematol" → "haematology")
  if (ft.includes(qt)) return 0.9          // substring match
  const ts = trigramSim(qt, ft)
  if (ts > 0.5) return ts
  // Levenshtein for short typos
  if (qt.length >= 4 && ft.length >= 3) {
    const dist = lev(qt, ft)
    const sim = 1 - dist / Math.max(qt.length, ft.length)
    if (sim > 0.65) return sim * 0.85
  }
  return 0
}

/** Expand abbreviations: "IDA" → "iron deficiency anaemia" */
function expandQuery(q: string): string {
  const words = q.split(/\s+/)
  const extras = words.flatMap(w => {
    const exp = ABBREVS[w]
    return exp ? [exp] : []
  })
  return extras.length ? `${q} ${extras.join(' ')}` : q
}

/** Score an entry against the user query — returns 0–1 */
function scoreEntry(rawQuery: string, entry: CatalogEntry): number {
  if (!rawQuery.trim()) return 0

  const qNorm = normalize(rawQuery)
  const qExp  = normalize(expandQuery(qNorm))

  // Build searchable fields
  const topicNorm   = normalize(entry.topic || '')
  const catNorm     = normalize(entry.category || '')
  const subNorm     = normalize(entry.subtopic || '')
  const combined    = [topicNorm, catNorm, subNorm].filter(Boolean).join(' ')

  const fields = [topicNorm, catNorm, subNorm, combined].filter(Boolean)

  let best = 0

  for (const q of [qNorm, qExp]) {
    if (!q) continue
    const qTokens = q.split(/\s+/).filter(t => t.length > 1)

    for (const field of fields) {
      // 1. Perfect match
      if (field === q) return 1.0

      // 2. Field fully contains query
      if (field.includes(q)) { best = Math.max(best, 0.95); continue }

      // 3. Query contains field (over-specified search)
      if (q.includes(field) && field.length > 3) { best = Math.max(best, 0.8); continue }

      // 4. Token-level matching
      const fTokens = field.split(/\s+/).filter(Boolean)
      let tokenScore = 0
      let matched = 0

      for (const qt of qTokens) {
        let best_t = 0
        // Against each field token
        for (const ft of fTokens) best_t = Math.max(best_t, tokenSim(qt, ft))
        // Also against raw field string
        if (field.includes(qt)) best_t = Math.max(best_t, 0.9)
        tokenScore += best_t
        if (best_t > 0.5) matched++
      }

      const avgToken  = qTokens.length > 0 ? tokenScore / qTokens.length : 0
      const coverage  = qTokens.length > 0 ? matched / qTokens.length     : 0

      if (coverage === 1.0 && avgToken >= 0.8) best = Math.max(best, 0.85)
      else if (coverage >= 0.75)               best = Math.max(best, 0.45 + avgToken * 0.35)
      else if (coverage >= 0.5)                best = Math.max(best, 0.2  + avgToken * 0.3)

      // 5. Full-field trigram similarity (catches scrambled / heavy-typo queries)
      best = Math.max(best, trigramSim(q, field) * 0.78)
    }
  }

  return best
}

// ─── Display helpers ───────────────────────────────────────────────────────────

function prettify(s: string | null): string {
  if (!s) return ''
  return s
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/\bAnd\b/g, '&')
    .replace(/\bOf\b/g, 'of')
    .replace(/\bThe\b/g, 'the')
    .replace(/\bIn\b/g, 'in')
    .replace(/\bA\b/g, 'a')
}

function displayCategory(cat: string | null): string {
  if (!cat) return ''
  // Already human-readable (contains space or &)
  if (/[\s&]/.test(cat)) return cat
  return prettify(cat)
}

function buildUrl(mode: 'mcq' | 'flashcard' | 'case', entry: CatalogEntry, limit = 10): string {
  const p = new URLSearchParams()
  if (entry.topic)    p.set('topic',    entry.topic)
  if (entry.category) p.set('category', entry.category)
  if (entry.subtopic) p.set('subtopic', entry.subtopic)
  if (mode !== 'case') p.set('limit', String(limit))
  const path = mode === 'case' ? '/practice/cases' : mode === 'flashcard' ? '/practice/flashcards' : '/practice/mcq'
  return `${path}?${p}`
}

// ─── System colour palette ────────────────────────────────────────────────────

const SYS_COLORS: Record<string, string> = {
  'haematology':             '#E53E3E',
  'hematology':              '#E53E3E',
  'central nervous system':  '#805AD5',
  'neurology':               '#805AD5',
  'respiratory':             '#38A169',
  'endocrinology':           '#DD6B20',
  'renal':                   '#3182CE',
  'nephrology':              '#3182CE',
  'gastroenterology':        '#D69E2E',
  'musculoskeletal':         '#E53E8A',
  'cardiovascular':          '#F56565',
  'cardiology':              '#F56565',
  'clinical pharmacy':       '#0E9E8E',
  'hospital pharmacy':       '#0E9E8E',
  'chemical pathology':      '#718096',
  'pharmacology':            '#9F7AEA',
  'microbiology':            '#48BB78',
  'infectious disease':      '#48BB78',
}

function sysColor(topic: string): string {
  return SYS_COLORS[topic.toLowerCase()] ?? 'var(--teal)'
}

// Quick-pick suggestions shown before user types
const QUICK_PICKS = [
  'Haematology', 'CNS', 'Respiratory', 'Endocrinology',
  'Renal', 'MSK', 'GI', 'IDA', 'Sickle Cell', 'DVT',
  'Pharmacology', 'Pathophysiology', 'COPD', 'Diabetes',
]

// ─── Main component ───────────────────────────────────────────────────────────

export default function SearchClient({ catalog }: { catalog: CatalogEntry[] }) {
  const router  = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState<ScoredEntry[]>([])
  const [hovered, setHovered] = useState(-1)

  // Auto-focus on mount
  useEffect(() => { inputRef.current?.focus() }, [])

  // Recompute results whenever query changes
  useEffect(() => {
    if (!query.trim()) { setResults([]); setHovered(-1); return }

    const THRESHOLD = 0.13
    const scored = catalog
      .map(e => ({ ...e, score: scoreEntry(query, e) }))
      .filter(e => e.score >= THRESHOLD)
      .sort((a, b) => {
        const diff = b.score - a.score
        if (Math.abs(diff) > 0.04) return diff
        // Tie-break: prefer entries with more content
        const aQ = a.mcq_count + a.flashcard_count + a.case_count
        const bQ = b.mcq_count + b.flashcard_count + b.case_count
        return bQ - aQ
      })
      .slice(0, 40)

    setResults(scored)
    setHovered(-1)
  }, [query, catalog])

  // Keyboard navigation
  const handleKey = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHovered(h => Math.min(h + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHovered(h => Math.max(h - 1, -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const target = hovered >= 0 ? results[hovered] : results[0]
      if (!target) return
      if (target.mcq_count > 0)       router.push(buildUrl('mcq',       target))
      else if (target.flashcard_count) router.push(buildUrl('flashcard', target))
      else if (target.case_count)      router.push(buildUrl('case',      target))
    } else if (e.key === 'Escape') {
      setQuery('')
      inputRef.current?.focus()
    }
  }, [results, hovered, router])

  // Derived display state
  const isEmpty    = query.trim().length === 0
  const hasResults = results.length > 0
  const noResults  = !isEmpty && !hasResults

  // Unique topics for browse-all section
  const allTopics = [...new Set(catalog.map(e => e.topic))].filter(Boolean).sort()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* ── Sticky search bar ─────────────────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        padding: '14px 18px',
      }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <label style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: 'var(--surface-2)',
            border: '1.5px solid var(--border-strong)',
            borderRadius: 18, padding: '0 16px',
            cursor: 'text',
          }}>
            {/* Search icon */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="var(--text-faint)" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"
              style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>

            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Search topics, conditions, drugs…"
              autoComplete="off"
              spellCheck={false}
              style={{
                flex: 1, border: 'none', outline: 'none',
                background: 'transparent', fontSize: 16, fontWeight: 600,
                color: 'var(--text)', padding: '15px 0', fontFamily: 'inherit',
              }}
            />

            {/* Clear button */}
            {query && (
              <button
                type="button"
                onClick={() => { setQuery(''); inputRef.current?.focus() }}
                aria-label="Clear search"
                style={{
                  width: 26, height: 26, borderRadius: '50%', border: 'none',
                  background: 'var(--border-strong)', color: 'var(--text-soft)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', flexShrink: 0, padding: 0,
                }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            )}
          </label>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '18px 18px 120px' }}>

        {/* ── Empty state — quick picks + browse all ──────────────────────── */}
        {isEmpty && (
          <div>
            {/* Quick picks */}
            <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
              Quick picks
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 32 }}>
              {QUICK_PICKS.map(s => (
                <button key={s} type="button" onClick={() => setQuery(s)}
                  style={{
                    padding: '7px 14px', borderRadius: 999,
                    border: '1px solid var(--border)', background: 'var(--surface)',
                    color: 'var(--text-soft)', fontSize: 13.5, fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'inherit', transition: 'all .12s ease',
                  }}>
                  {s}
                </button>
              ))}
            </div>

            {/* Browse all systems */}
            <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
              All systems ({allTopics.length})
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {allTopics.map(topic => {
                const entries = catalog.filter(e => e.topic === topic)
                const mcqs    = entries.reduce((s, e) => s + e.mcq_count, 0)
                const cards   = entries.reduce((s, e) => s + e.flashcard_count, 0)
                const color   = sysColor(topic)
                return (
                  <button key={topic} type="button" onClick={() => setQuery(topic)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 13, padding: '12px 14px',
                      borderRadius: 14, border: '1px solid var(--border)', background: 'var(--surface)',
                      cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', width: '100%',
                      transition: 'background .12s ease',
                    }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 11, flexShrink: 0,
                      background: `${color}18`, color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 17, fontWeight: 800,
                    }}>
                      {topic.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                      <p style={{ margin: 0, fontSize: 14.5, fontWeight: 800, color: 'var(--text)' }}>{topic}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-faint)', fontWeight: 600 }}>
                        {mcqs.toLocaleString()} MCQs · {cards.toLocaleString()} flashcards
                      </p>
                    </div>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 6l6 6-6 6"/>
                    </svg>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── No results ──────────────────────────────────────────────────── */}
        {noResults && (
          <div style={{ textAlign: 'center', padding: '56px 24px' }}>
            <div style={{
              width: 64, height: 64, borderRadius: 20, margin: '0 auto 20px',
              background: 'var(--surface-3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                <path d="M8 11h6M11 8v6" opacity=".4"/>
              </svg>
            </div>
            <p style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>
              No results for &ldquo;{query}&rdquo;
            </p>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--text-soft)', lineHeight: 1.65, maxWidth: 320, marginLeft: 'auto', marginRight: 'auto' }}>
              Try a shorter term, an abbreviation (e.g. <strong>CNS</strong>, <strong>MSK</strong>, <strong>IDA</strong>), or browse all topics below.
            </p>
            <button type="button" onClick={() => setQuery('')}
              style={{
                padding: '10px 22px', borderRadius: 12,
                border: '1px solid var(--border)', background: 'var(--surface)',
                color: 'var(--text)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}>
              Browse all topics
            </button>
          </div>
        )}

        {/* ── Results ─────────────────────────────────────────────────────── */}
        {hasResults && (
          <div>
            <p style={{ margin: '0 0 14px', fontSize: 11, fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
              {results.length} result{results.length !== 1 ? 's' : ''}
              <span style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0, marginLeft: 4 }}>
                — press Enter to practice top result
              </span>
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {results.map((entry, i) => {
                const active  = hovered === i
                const color   = sysColor(entry.topic)
                const catDisp = displayCategory(entry.category)
                const subDisp = prettify(entry.subtopic)
                const label   = subDisp || catDisp || entry.topic

                return (
                  <div
                    key={`${entry.topic}|${entry.category}|${entry.subtopic}|${i}`}
                    onMouseEnter={() => setHovered(i)}
                    onMouseLeave={() => setHovered(-1)}
                    style={{
                      background: active ? 'var(--teal-tint)' : 'var(--surface)',
                      border: active ? '1.5px solid var(--teal)' : '1px solid var(--border)',
                      borderRadius: 16, padding: '14px 16px',
                      transition: 'border-color .1s ease, background .1s ease',
                    }}
                  >
                    {/* ── Card header ─────────────────────────────────── */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                      {/* System initial badge */}
                      <div style={{
                        width: 38, height: 38, borderRadius: 11, flexShrink: 0,
                        background: `${color}18`, color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 17, fontWeight: 800,
                      }}>
                        {entry.topic.charAt(0).toUpperCase()}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Breadcrumb */}
                        <p style={{ margin: '0 0 2px', fontSize: 12.5, fontWeight: 700, color: 'var(--text-faint)', lineHeight: 1.3 }}>
                          {entry.topic}
                          {catDisp && (
                            <span style={{ color: 'var(--text-soft)' }}> › {catDisp}</span>
                          )}
                        </p>
                        {/* Main label */}
                        <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text)', lineHeight: 1.25 }}>
                          {label}
                        </p>
                      </div>
                    </div>

                    {/* ── Count badges + action buttons ───────────────── */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {/* Badges */}
                      <div style={{ display: 'flex', gap: 6, flex: 1, flexWrap: 'wrap' }}>
                        {entry.mcq_count > 0 && (
                          <span style={{
                            fontSize: 11.5, fontWeight: 700, color: 'var(--text-faint)',
                            background: 'var(--surface-2)', borderRadius: 6, padding: '3px 8px',
                          }}>
                            {entry.mcq_count.toLocaleString()} MCQs
                          </span>
                        )}
                        {entry.flashcard_count > 0 && (
                          <span style={{
                            fontSize: 11.5, fontWeight: 700, color: 'var(--text-faint)',
                            background: 'var(--surface-2)', borderRadius: 6, padding: '3px 8px',
                          }}>
                            {entry.flashcard_count.toLocaleString()} Cards
                          </span>
                        )}
                        {entry.case_count > 0 && (
                          <span style={{
                            fontSize: 11.5, fontWeight: 700, color: 'var(--amber)',
                            background: 'var(--surface-2)', borderRadius: 6, padding: '3px 8px',
                          }}>
                            {entry.case_count.toLocaleString()} Cases
                          </span>
                        )}
                      </div>

                      {/* Practice buttons */}
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {entry.mcq_count > 0 && (
                          <Link href={buildUrl('mcq', entry)}
                            style={{
                              padding: '7px 14px', borderRadius: 10,
                              background: 'var(--teal)', color: 'var(--on-teal)',
                              fontSize: 13, fontWeight: 800, textDecoration: 'none', whiteSpace: 'nowrap',
                            }}>
                            MCQs →
                          </Link>
                        )}
                        {entry.flashcard_count > 0 && (
                          <Link href={buildUrl('flashcard', entry)}
                            style={{
                              padding: '7px 14px', borderRadius: 10,
                              border: '1px solid var(--border)', background: active ? 'var(--surface)' : 'var(--surface)',
                              color: 'var(--teal)', fontSize: 13, fontWeight: 800,
                              textDecoration: 'none', whiteSpace: 'nowrap',
                            }}>
                            Cards →
                          </Link>
                        )}
                        {entry.case_count > 0 && (
                          <Link href={buildUrl('case', entry)}
                            style={{
                              padding: '7px 14px', borderRadius: 10,
                              border: '1px solid var(--border)', background: active ? 'var(--surface)' : 'var(--surface)',
                              color: 'var(--amber)', fontSize: 13, fontWeight: 800,
                              textDecoration: 'none', whiteSpace: 'nowrap',
                            }}>
                            Cases →
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Hover polish ─────────────────────────────────────────────────── */}
      <style>{`
        button:hover { opacity: .88; }
      `}</style>
    </div>
  )
}
