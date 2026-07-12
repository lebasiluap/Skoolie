'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteQuestion, updateQuestionField } from './actions'
import NewQuestionModal from './NewQuestionModal'
import {
  PAGE_PAD, inputStyle, selectStyle, primaryBtn, ghostBtn, dangerBtn, textBtn,
  thStyle, PageHeader, EmptyState, Chip, ModalScrim, modalSheet,
} from '../ui'

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
    id?: string
  }
}

const DIFF_TONE: Record<string, 'green' | 'amber' | 'red'> = { easy: 'green', medium: 'amber', hard: 'red' }
const TYPE_TONE: Record<string, 'teal' | 'purple' | 'amber'> = { mcq: 'teal', flashcard: 'purple', case_study: 'amber' }

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
  const [actionError, setActionError] = useState<string | null>(null)

  const totalPages = Math.ceil(total / perPage)
  const hasFilters = !!(filters.topic || filters.type || filters.course || filters.difficulty || filters.q || filters.subtopic || filters.id)

  function buildUrl(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams()
    const merged = { ...filters, page: String(page), ...overrides }
    Object.entries(merged).forEach(([k, v]) => { if (v) params.set(k, v) })
    return `/admin/questions?${params.toString()}`
  }

  function applySearch() {
    router.push(buildUrl({ q: search || undefined, subtopic: subtopicSearch || undefined, id: undefined, page: '1' }))
  }

  function clearAll() {
    setSearch('')
    setSubtopicSearch('')
    router.push('/admin/questions')
  }

  function startEdit(id: string, field: string, current: string) {
    setActionError(null)
    setEditingId(id); setEditField(field); setEditValue(current ?? '')
  }

  async function saveEdit() {
    if (!editingId) return
    setSaving(true)
    const res = await updateQuestionField(editingId, editField, editValue)
    setSaving(false)
    if (!res.ok) { setActionError(res.error); return }
    setEditingId(null)
    startTransition(() => router.refresh())
  }

  function handleDelete(id: string, text: string) {
    setActionError(null)
    setConfirmDeleteId(id); setConfirmDeleteText(text)
  }

  async function confirmDelete() {
    if (!confirmDeleteId) return
    setDeleting(confirmDeleteId); setConfirmDeleteId(null)
    const res = await deleteQuestion(confirmDeleteId)
    setDeleting(null)
    if (!res.ok) { setActionError(res.error); return }
    startTransition(() => router.refresh())
  }

  return (
    <div style={{ padding: PAGE_PAD, maxWidth: 1400, margin: '0 auto' }}>

      <PageHeader
        title="Questions"
        sub={<>
          {total.toLocaleString()} matching · page {page} of {totalPages || 1}
          {hasFilters && <span style={{ color: 'var(--teal)', marginLeft: 6 }}>• filtered</span>}
        </>}
        right={<NewQuestionModal topics={topics} courses={courses} />}
      />

      {/* Single-question filter (from Reports / Miskey audit deep links) */}
      {filters.id && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <Chip text={`Single question · ${filters.id.slice(0, 8)}…`} tone="amber" />
          <button onClick={() => router.push('/admin/questions')} style={{ ...ghostBtn, padding: '5px 12px', fontSize: 12.5 }}>
            Show all
          </button>
        </div>
      )}

      {/* Surfaced action errors (saves/deletes no longer fail silently) */}
      {actionError && (
        <div style={{ background: 'var(--red-tint)', color: 'var(--red)', borderRadius: 14, padding: '12px 16px', fontSize: 13.5, fontWeight: 700, marginBottom: 14, display: 'flex', justifyContent: 'space-between', gap: 10 }}>
          <span>Action failed: {actionError}</span>
          <button onClick={() => setActionError(null)} style={{ background: 'none', border: 'none', color: 'var(--red)', fontWeight: 900, cursor: 'pointer', fontFamily: 'inherit' }}>×</button>
        </div>
      )}

      {/* Filter row 1: dropdowns */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
        <select
          aria-label="Filter by topic"
          value={filters.topic ?? ''}
          onChange={e => router.push(buildUrl({ topic: e.target.value || undefined, id: undefined, page: '1' }))}
          style={{ ...selectStyle, minWidth: 160 }}
        >
          <option value="">All topics</option>
          {topics.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <select
          aria-label="Filter by type"
          value={filters.type ?? ''}
          onChange={e => router.push(buildUrl({ type: e.target.value || undefined, id: undefined, page: '1' }))}
          style={selectStyle}
        >
          <option value="">All types</option>
          <option value="mcq">MCQ</option>
          <option value="flashcard">Flashcard</option>
          <option value="case_study">Case study</option>
        </select>

        <select
          aria-label="Filter by course"
          value={filters.course ?? ''}
          onChange={e => router.push(buildUrl({ course: e.target.value || undefined, id: undefined, page: '1' }))}
          style={{ ...selectStyle, minWidth: 160 }}
        >
          <option value="">All courses</option>
          {courses.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select
          aria-label="Filter by difficulty"
          value={filters.difficulty ?? ''}
          onChange={e => router.push(buildUrl({ difficulty: e.target.value || undefined, id: undefined, page: '1' }))}
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
          aria-label="Search question text"
          style={{ ...inputStyle, flex: 2, minWidth: 200 }}
          className="admin-input-focus"
        />
        <input
          value={subtopicSearch}
          onChange={e => setSubtopicSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && applySearch()}
          placeholder="Filter subtopic…"
          aria-label="Filter by subtopic"
          style={{ ...inputStyle, flex: 1, minWidth: 140 }}
          className="admin-input-focus"
        />
        <button onClick={applySearch} style={primaryBtn}>
          Search
        </button>
        {hasFilters && (
          <button onClick={clearAll} style={ghostBtn}>
            Clear all
          </button>
        )}
      </div>

      {/* Delete confirmation modal */}
      {confirmDeleteId && (
        <ModalScrim onClose={() => setConfirmDeleteId(null)}>
          <div style={{ ...modalSheet, maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--red-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>Delete question?</h3>
            </div>
            <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--text-faint)', fontWeight: 600 }}>
              This cannot be undone. Any user reports on it are deleted too.
            </p>
            <p style={{ margin: '0 0 24px', fontSize: 13, color: 'var(--text-soft)', lineHeight: 1.6, background: 'var(--surface-3)', borderRadius: 12, padding: '10px 14px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {confirmDeleteText}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmDeleteId(null)} style={textBtn}>Cancel</button>
              <button onClick={confirmDelete} style={{ ...dangerBtn, padding: '10px 20px' }}>Yes, delete</button>
            </div>
          </div>
        </ModalScrim>
      )}

      {/* Edit modal */}
      {editingId && (
        <ModalScrim onClose={() => setEditingId(null)}>
          <div style={modalSheet} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 3px', fontSize: 16, fontWeight: 800, color: 'var(--text)', textTransform: 'capitalize' }}>Edit {editField.replace(/_/g, ' ')}</h3>
            <p style={{ margin: '0 0 16px', fontSize: 12, color: 'var(--text-faint)', fontWeight: 600 }}>ID: {editingId}</p>

            {editField === 'question_type' && (
              <p style={{ margin: '0 0 14px', fontSize: 12.5, fontWeight: 700, color: 'var(--amber)', background: 'var(--amber-tint)', borderRadius: 11, padding: '9px 13px', lineHeight: 1.5 }}>
                Careful: converting between MCQ and flashcard does NOT convert the options/answer format — only change this if the underlying data already matches the new type.
              </p>
            )}

            {['difficulty', 'question_type', 'region'].includes(editField) ? (
              <select value={editValue} onChange={e => setEditValue(e.target.value)} style={{ ...selectStyle, width: '100%', marginBottom: 20 }}>
                {editField === 'difficulty' && ['easy', 'medium', 'hard'].map(v => <option key={v} value={v}>{v}</option>)}
                {editField === 'question_type' && ['mcq', 'flashcard', 'case_study'].map(v => <option key={v} value={v}>{v}</option>)}
                {editField === 'region' && ['universal', 'ghana'].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            ) : (
              <textarea value={editValue} onChange={e => setEditValue(e.target.value)}
                rows={editField === 'question_text' ? 5 : 2}
                style={{ ...inputStyle, width: '100%', marginBottom: 20, resize: 'none' }}
                className="admin-input-focus"
              />
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setEditingId(null)} style={textBtn}>Cancel</button>
              <button onClick={saveEdit} disabled={saving} style={{ ...primaryBtn, padding: '10px 24px', opacity: saving ? 0.6 : 1, cursor: saving ? 'default' : 'pointer' }}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </ModalScrim>
      )}

      {/* Empty state */}
      {questions.length === 0 ? (
        <EmptyState
          title={hasFilters ? 'No questions match your filters' : 'No questions yet'}
          sub={hasFilters ? 'Try clearing some filters.' : 'Create your first question with the button above.'}
          action={hasFilters ? (
            <button onClick={clearAll} style={{ ...primaryBtn, borderRadius: 999, padding: '10px 24px' }}>
              Clear all filters
            </button>
          ) : undefined}
        />
      ) : (
        <>
          {/* Table */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, boxShadow: 'var(--shadow)', overflowX: 'auto', marginBottom: 20 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Topic', 'Course', 'Subtopic', 'Type', 'Difficulty', 'Question', 'Region', 'Access', 'Actions'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {questions.map((q, rowIdx) => {
                  const isLast = rowIdx === questions.length - 1

                  return (
                    <tr key={q.id} style={{ borderBottom: isLast ? 'none' : '1px solid var(--border)' }} className="admin-table-row">
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        <button onClick={() => startEdit(q.id, 'topic', q.topic)} title="Edit topic" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: 'inherit', textAlign: 'left' }} className="admin-cell-btn">
                          {q.topic}
                        </button>
                      </td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        <button onClick={() => startEdit(q.id, 'category', q.category ?? '')} title="Edit course" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 12.5, color: 'var(--text-soft)', fontFamily: 'inherit', textAlign: 'left' }} className="admin-cell-btn">
                          {q.category ?? '—'}
                        </button>
                      </td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        <button onClick={() => startEdit(q.id, 'subtopic', q.subtopic ?? '')} title="Edit subtopic" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 12.5, color: 'var(--text-soft)', fontFamily: 'inherit', textAlign: 'left' }} className="admin-cell-btn">
                          {q.subtopic ? q.subtopic.slice(0, 24) + (q.subtopic.length > 24 ? '…' : '') : '—'}
                        </button>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <button onClick={() => startEdit(q.id, 'question_type', q.question_type)} title="Edit type" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit' }}>
                          <Chip text={q.question_type.replace('_', ' ')} tone={TYPE_TONE[q.question_type] ?? 'muted'} />
                        </button>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <button onClick={() => startEdit(q.id, 'difficulty', q.difficulty)} title="Edit difficulty" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit' }}>
                          <Chip text={q.difficulty} tone={DIFF_TONE[q.difficulty] ?? 'muted'} />
                        </button>
                      </td>
                      <td style={{ padding: '10px 14px', maxWidth: 280 }}>
                        <button onClick={() => startEdit(q.id, 'question_text', q.question_text)} title="Edit question text" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 12.5, color: 'var(--text-soft)', fontFamily: 'inherit', textAlign: 'left', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} className="admin-cell-btn">
                          {q.question_text}
                        </button>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <button onClick={() => startEdit(q.id, 'region', q.region ?? 'universal')} title="Edit region" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 12.5, color: 'var(--text-soft)', fontFamily: 'inherit' }} className="admin-cell-btn">
                          {q.region ?? '—'}
                        </button>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <button onClick={() => startEdit(q.id, 'access_key', q.access_key ?? '')} title="Edit access key" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit' }} className="admin-cell-btn">
                          {q.access_key
                            ? <Chip text={q.access_key} />
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
    </div>
  )
}
