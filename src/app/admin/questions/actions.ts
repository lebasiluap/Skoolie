'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== 'lebasiluap@gmail.com') {
    throw new Error('Unauthorized')
  }
  return supabase
}

export async function deleteQuestion(id: string) {
  const supabase = await assertAdmin()
  await supabase.from('questions').delete().eq('id', id)
  revalidatePath('/admin/questions')
}

export async function updateQuestionField(id: string, field: string, value: string) {
  const supabase = await assertAdmin()

  const ALLOWED_FIELDS = [
    'topic', 'category', 'subtopic', 'question_type', 'difficulty',
    'question_text', 'correct_answer', 'explanation', 'region',
    'access_key', 'high_yield', 'source_reference',
  ]
  if (!ALLOWED_FIELDS.includes(field)) throw new Error('Field not allowed')

  const parsed = field === 'high_yield' ? value === 'true' : (value === '' ? null : value)
  await supabase.from('questions').update({ [field]: parsed }).eq('id', id)
  revalidatePath('/admin/questions')
}
