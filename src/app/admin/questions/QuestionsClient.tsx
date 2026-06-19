'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteQuestion, updateQuestionField } from './actions'

interface Question {
  id: string
  topic: string
  category: string | null
  subtopic: string | null
  question_type: string
  difficulty: string
  question_text: string
  correct_answer: string
  access_key: string | null
  high_yield: boolean | null
  region: string | null
}

interface Props {
  questions: Question[]
  total: number
  page: number
  perPage: number
  topics: string[]
  courses: string[]
  filters: {
    topic?: string
    type?: string
    course?: string
    difficulty?: string
    subtopic?: string
    q?: string
  }
}

const DIFF_STYLE: Record<string, { bg: string; color: string }> = {
  easy:   { bg: 'var(--green-tint)',  color: 'var(--green)' },
  medium: { bg: 'var(--amber-tint)',  color: 'var(--amber)' },
  hard:   { bg: 'var(--red-tint)',    color: 'var(--red)' },
}
const TYPE_STYLE: Record<string, { bg: string; color: string }> = {
  mcq:        { bg: 'var(--teal-tint)',         color: 'var(--teal)' },
  flashcard:  { bg: 'rgba(120,90,200,.12)',      color: '#A855F7' },
  case_study: { bg: 'var(--amber-tint)',         color: 'var(--amber)' },
}

export default function QuestionsClient({ questions, total, page, perPage, topics, courses, filters }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [search, setSearch] = useState(filters.q ?? '')
  const [subtopicSearch, setSubtopicSearch] = useState(filters.subtopic ?? '')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editField, setEditField] = useState<string>('')
  const [editValue, setEditValue] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [confirmDeleteText, setConfirmDeleteText] = useState<string>('')

  const totalPages = Math.ceil(total / perPage)
  const hasFilters = !!(filters.topic || filters.type || filters.course || filters.difficulty || filters.q || filters.subtopic)

  function buildUrl(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams()
    const merged = { ...filters, page: String(page), ...overrides }
    Object.entries(merged).forEach(([k, v]) => { if (v) params.set(k, v) })
    return `/admin/questions?${params.toString()}`
  }

  function applySearch() {
    router.push(buildUrl({ q: search || undefined, subtopic: subtopicSearch || undefined, page: '1' }))
  }

  function clearAll() {
    setSearch('')
    setSubtopicSearch('')
    router.push('/admin/questions')
  }

  function startEdit(id: string, field: string, current: string) {
    setEditingId(id); setEditField(field); setEditValue(current ?? '')
  }

  async function saveEdit() {
    if (!editingId) return
    setSaving(true)
    await updateQuestionField(editingId, editField, editValue)
    setSaving(false)
    setEditingId(null)
    startTransition(() => router.refresh())
  }

  function handleDelete(id: string, text: string) {
    setConfirmDeleteId(id); setConfirmDeleteText(text)
  }

  async function confirmDelete() {
    if (!confirmDeleteId) return
    setDeleting(confirmDeleteId); setConfirmDeleteId(null)
    await deleteQuestion(confirmDeleteId)
    setDeleting(null)
    startTransition(() => router.refresh())
  }

  const inputStyle: React.CSSProperties = {
    background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)',
    borderRadius: 12, padding: '9px 13px', fontSize: 13.5, fontFamily: 'inherit',
    outline: 'none', transition: 'border-color .15s ease',
  }
  const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' }

  return (
    <div style={{ padding: 'clamp(20px,3vw,36px) clamp(16px,3vw,32px)', maxWidth: 1400, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.02em' }}>Questions</h1>
        <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--text-faint)', fontWeight: 600 }}>
          {total.toLocaleString()} matching · page {page} of {totalPages || 1}
          {hasFilters && <span style={{ color: 'var(--teal)', marginLeft: 6 }}>• filtered</span>}
        </p>
      </div>

      {/* Filter row 1: dropdowns */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
        <select
          value={filters.topic ?? ''}
          onChange={e => router.push(buildUrl({ topic: e.target.value || undefined, page: '1' }))}
          style={{ ...selectStyle, minWidth: 160 }}
        >
          <option value="">All topics</option>
          {topics.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <select
          value={filters.type ?? ''}
          onChange={e => router.push(buildUrl({ type: e.target.value || undefined, page: '1' }))}
          style={selectStyle}
        >
          <option value="">All types</option>
          <option value="mcq">MCQ</option>
          <option value="flashcard">Flashcard</option>
          <option value="case_study">Case study</option>
        </select>

        <select
          value={filters.course ?? ''}
          onChange={e => router.push(buildUrl({ course: e.target.value || undefined, page: '1' }))}
          style={{ ...selectStyle, minWidth: 160 }}
        >
          <option value="">All courses</option>
          {courses.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select
          value={filters.difficulty ?? ''}
          onChange={e => router.push(buildUrl({ difficulty: e.target.value || undefined, page: '1' }))}
          style={selectStyle}
        >
          <option value="">All difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>

      {/* Filter row 2: text search */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 22 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && applySearch()}
          placeholder="Search question text…"
          style={{ ...inputStyle, flex: 2, minWidth: 200 }}
          className="admin-input-focus"
        />
        <input
          value={subtopicSearch}
          onChange={e => setSubtopicSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && applySearch()}
          placeholder="Filter subtopic…"
          style={{ ...inputStyle, flex: 1, minWidth: 140 }}
          className="admin-input-focus"
        />
        <button
          onClick={applySearch}
          style={{ padding: '9px 20px', background: 'var(--teal)', color: 'var(--on-teal)', border: 'none', borderRadius: 12, fontSize: 13.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
        >
          Search
        </button>
        {hasFilters && (
          <button
            onClick={clearAll}
            style={{ padding: '9px 16px', background: 'var(--surface-3)', color: 'var(--text-soft)', border: 'none', borderRadius: 12, fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Clear all
          </button>
        )}
      </div>

      {/* Delete confirmation modal */}
      {confirmDeleteId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(6px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 24, boxShadow: 'var(--shadow-lg)', padding: 28, width: '100%', maxWidth: 440 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--red-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>Delete question?</h3>
            </div>
            <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--text-faint)', fontWeight: 600 }}>This cannot be undone.</p>
            <p style={{ margin: '0 0 24px', fontSize: 13, color: 'var(--text-soft)', lineHeight: 1.6, background: 'var(--surface-3)', borderRadius: 12, padding: '10px 14px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {confirmDeleteText}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmDeleteId(null)} style={{ padding: '10px 18px', border: 'none', background: 'transparent', color: 'var(--text-soft)', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={confirmDelete} style={{ padding: '10px 20px', border: 'none', borderRadius: 12, background: 'var(--red)', color: '#fff', fontSize: 13.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>Yes, delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editingId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(6px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 24, boxShadow: 'var(--shadow-lg)', padding: 28, width: '100%', maxWidth: 500 }}>
            <h3 style={{ margin: '0 0 3px', fontSize: 16, fontWeight: 800, color: 'var(--text)', textTransform: 'capitalize' }}>Edit {editField.replace(/_/g, ' ')}</h3>
            <p style={{ margin: '0 0 16px', fontSize: 12, color: 'var(--text-faint)', fontWeight: 600 }}>ID: {editingId}</p>

            {['difficulty', 'question_type', 'region'].includes(editField) ? (
              <select value={editValue} onChange={e => setEditValue(e.target.value)} style={{ ...selectStyle, width: '100%', marginBottom: 20 }}>
                {editField === 'difficulty' && ['easy', 'medium', 'hard'].map(v => <option key={v} value={v}>{v}</option>)}
                {editField === 'question_type' && ['mcq', 'flashcard', 'case_study'].map(v => <option key={v} value={v}>{v}</option>)}
                {editField === 'region' && ['universal', 'ghana'].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            ) : (
              <textarea value={editValue} onChange={e => setEditValue(e.target.value)}
                rows={editField === 'question_text' ? 5 : 2}
                style={{ ...inputStyle, width: '100%', marginBottom: 20, resize: 'none', boxSizing: 'border-box' }}
                className="admin-input-focus"
              />
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setEditingId(null)} style={{ padding: '10px 18px', border: 'none', background: 'transparent', color: 'var(--text-soft)', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={saveEdit} disabled={saving} style={{ padding: '10px 24px', border: 'none', borderRadius: 12, background: 'var(--teal)', color: 'var(--on-teal)', fontSize: 13.5, fontWeight: 800, cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {questions.length === 0 ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>No questions match your filters</p>
          <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--text-faint)', fontWeight: 600 }}>Try clearing some filters.</p>
          <button onClick={clearAll} style={{ padding: '10px 24px', background: 'var(--teal)', color: 'var(--on-teal)', border: 'none', borderRadius: 999, fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
            Clear all filters
          </button>
        </div>
      ) : (
        <>
          {/* Table */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, boxShadow: 'var(--shadow)', overflowX: 'auto', marginBottom: 20 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Topic', 'Course', 'Subtopic', 'Type', 'Difficulty', 'Question', 'Region', 'Access', 'Actions'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '12px 14px', fontSize: 11, fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.08em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {questions.map((q, rowIdx) => {
                  const diffS = DIFF_STYLE[q.difficulty] ?? { bg: 'var(--surface-3)', color: 'var(--text-faint)' }
                  const typeS = TYPE_STYLE[q.question_type] ?? { bg: 'var(--surface-3)', color: 'var(--text-faint)' }
                  const isLast = rowIdx === questions.length - 1

                  return (
                    <tr key={q.id} style={{ borderBottom: isLast ? 'none' : '1px solid var(--border)' }} className="admin-table-row">
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        <button onClick={() => startEdit(q.id, 'topic', q.topic)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: 'inherit', textAlign: 'left' }} className="admin-cell-btn">
                          {q.topic}
                        </button>
                      </td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        <button onClick={() => startEdit(q.id, 'category', q.category ?? '')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 12.5, color: 'var(--text-soft)', fontFamily: 'inherit', textAlign: 'left' }} className="admin-cell-btn">
                          {q.category ?? '—'}
                        </button>
                      </td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        <button onClick={() => startEdit(q.id, 'subtopic', q.subtopic ?? '')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 12.5, color: 'var(--text-soft)', fontFamily: 'inherit', textAlign: 'left' }} className="admin-cell-btn">
                          {q.subtopic ? q.subtopic.slice(0, 24) + (q.subtopic.length > 24 ? '…' : '') : '—'}
                        </button>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <button onClick={() => startEdit(q.id, 'question_type', q.question_type)} style={{ background: typeS.bg, color: typeS.color, border: 'none', borderRadius: 999, padding: '4px 10px', fontSize: 11.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                          {q.question_type}
                        </button>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <button onClick={() => startEdit(q.id, 'difficulty', q.difficulty)} style={{ background: diffS.bg, color: diffS.color, border: 'none', borderRadius: 999, padding: '4px 10px', fontSize: 11.5, fontWeight: 800, cursor: 'pointer', textTransform: 'capitalize', fontFamily: 'inherit' }}>
                          {q.difficulty}
                        </button>
                      </td>
                      <td style={{ padding: '10px 14px', maxWidth: 280 }}>
                        <button onClick={() => startEdit(q.id, 'question_text', q.question_text)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 12.5, color: 'var(--text-soft)', fontFamily: 'inherit', textAlign: 'left', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} className="admin-cell-btn">
                          {q.question_text}
                        </button>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <button onClick={() => startEdit(q.id, 'region', q.region ?? 'universal')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 12.5, color: 'var(--text-soft)', fontFamily: 'inherit' }} className="admin-cell-btn">
                          {q.region ?? '—'}
                        </button>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <button onClick={() => startEdit(q.id, 'access_key', q.access_key ?? '')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit' }} className="admin-cell-btn">
                          {q.access_key
                            ? <span style={{ background: 'var(--teal-tint)', color: 'var(--teal)', padding: '3px 8px', borderRadius: 999, fontSize: 11.5, fontWeight: 800 }}>{q.access_key}</span>
                            : <span style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>public</span>
                          }
                        </button>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <button onClick={() => handleDelete(q.id, q.question_text)} disabled={deleting === q.id} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 12.5, fontWeight: 700, color: 'var(--red)', fontFamily: 'inherit', opacity: deleting === q.id ? 0.4 : 1 }} className="admin-delete-btn">
                          {deleting === q.id ? '…' : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-faint)', fontWeight: 600 }}>
              Showing {((page - 1) * perPage) + 1}–{Math.min(page * perPage, total)} of {total.toLocaleString()}
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              {page > 1 && (
                <a href={buildUrl({ page: String(page - 1) })} style={{ padding: '8px 18px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text-soft)', fontSize: 13.5, fontWeight: 700, textDecoration: 'none' }} className="admin-page-btn">← Prev</a>
              )}
              <span style={{ padding: '8px 14px', fontSize: 13.5, fontWeight: 700, color: 'var(--text-faint)' }}>
                {page} / {totalPages}
              </span>
              {page < totalPages && (
                <a href={buildUrl({ page: String(page + 1) })} style={{ padding: '8px 18px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text-soft)', fontSize: 13.5, fontWeight: 700, textDecoration: 'none' }} className="admin-page-btn">Next →</a>
              )}
            </div>
          </div>
        </>
      )}

      <style>{`
        .admin-table-row:hover { background: var(--surface-2); }
        .admin-cell-btn:hover { color: var(--teal) !important; }
        .admin-delete-btn:hover { opacity: 0.7; }
        .admin-page-btn:hover { background: var(--surface-3) !important; }
        .admin-input-focus:focus { border-color: var(--teal) !important; box-shadow: 0 0 0 3px var(--teal-tint); }
      `}</style>
    </div>
  )
}
