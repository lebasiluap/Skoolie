'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { NewQuestion } from './types'

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== 'lebasiluap@gmail.com') {
    throw new Error('Unauthorized')
  }
  return supabase
}

export type ActionResult = { ok: true; changed?: boolean } | { ok: false; error: string }

export async function archiveQuestion(id: string): Promise<ActionResult> {
  const supabase = await assertAdmin()
  const { data, error } = await supabase.rpc('admin_archive_question', { p_id: id })
  if (error) return { ok: false, error: error.message }
  if (data !== 1) return { ok: false, error: 'Archive was not confirmed. Reload and retry.' }
  revalidatePath('/admin/questions')
  return { ok: true }
}

export async function updateQuestionField(id: string, field: string, value: string, expected: string | null): Promise<ActionResult> {
  const supabase = await assertAdmin()

  const ALLOWED_FIELDS = [
    'topic', 'category', 'subtopic', 'difficulty',
    'question_text', 'correct_answer', 'explanation', 'region',
    'access_key', 'high_yield',
  ]
  if (!ALLOWED_FIELDS.includes(field)) return { ok: false, error: 'Field not allowed' }

  const { data, error } = await supabase.rpc('admin_edit_question', {
    p_id: id, p_field: field, p_value: value, p_expected: expected,
  })
  if (error) return { ok: false, error: error.message }
  if (!data || typeof data.changed !== 'boolean') return { ok: false, error: 'Save was not confirmed. Reload and retry.' }
  revalidatePath('/admin/questions')
  revalidatePath('/admin/reports')
  return { ok: true, changed: data.changed }
}

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']
const VALID_PROFESSIONS = ['medicine', 'nursing', 'pharmacy', 'dentistry', 'midwifery']

/** Create a new MCQ or flashcard. Validates required fields + shape server-side. */
export async function createQuestion(input: NewQuestion): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const supabase = await assertAdmin()

  const professions = (input.professions ?? []).filter(p => VALID_PROFESSIONS.includes(p))
  const type = input.question_type
  const req = (v: string | undefined) => (v ?? '').trim()

  if (professions.length === 0) return { ok: false, error: 'Pick at least one profession.' }
  if (!req(input.course) || !req(input.topic) || !req(input.subtopic)) return { ok: false, error: 'Course, topic and subtopic are required.' }
  if (!req(input.question_text)) return { ok: false, error: type === 'flashcard' ? 'Front text is required.' : 'Question text is required.' }
  if (!req(input.explanation)) return { ok: false, error: 'Explanation is required.' }
  if (!['easy', 'medium', 'hard'].includes(input.difficulty)) return { ok: false, error: 'Invalid difficulty.' }
  if (!['universal', 'ghana'].includes(input.region)) return { ok: false, error: 'Invalid region.' }

  // Canonical bank format: options are letter-prefixed strings ("A. text").
  // Both readers depend on this — the app strips the prefix (lib/answers.ts),
  // the web re-letters it (MCQClient shuffle). Do NOT store objects here.
  let optionsJson: string[] = []
  let correct = req(input.correct_answer)

  if (type === 'mcq') {
    const opts = (input.options ?? []).map(o => o.trim()).filter(Boolean)
    if (opts.length < 2) return { ok: false, error: 'Provide at least 2 answer options.' }
    if (opts.length > 6) return { ok: false, error: 'Maximum 6 options.' }
    correct = correct.toUpperCase()
    if (!LETTERS.slice(0, opts.length).includes(correct)) {
      return { ok: false, error: `Correct answer must be a letter A–${LETTERS[opts.length - 1]}.` }
    }
    optionsJson = opts.map((value, i) => `${LETTERS[i]}. ${value.replace(/^\s*[A-F][.):]\s*/, '')}`)
  } else {
    if (!correct) return { ok: false, error: 'Back / answer text is required.' }
  }

  const row = {
    question_type: type,
    professions,
    course: req(input.course),
    category: req(input.course),          // admin filter + app category mirror the course
    topic: req(input.topic),
    subtopic: req(input.subtopic),
    difficulty: input.difficulty,
    difficulty_source: 'manual',
    region: input.region,
    high_yield: !!input.high_yield,
    question_text: req(input.question_text),
    explanation: req(input.explanation),
    options: optionsJson,
    correct_answer: correct,
    distractor_explanations: {},
    date_reviewed: new Date().toISOString().slice(0, 10),
  }

  const { data, error } = await supabase.from('questions').insert(row).select('id').single()
  if (error) return { ok: false, error: error.message }
  revalidatePath('/admin/questions')
  return { ok: true, id: data.id as string }
}
