'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  questionId: string
  userId: string
  initialBookmarked: boolean
}

export default function BookmarkButton({ questionId, userId, initialBookmarked }: Props) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    if (loading) return
    setLoading(true)
    const supabase = createClient()

    if (bookmarked) {
      await supabase
        .from('bookmarks')
        .delete()
        .eq('user_id', userId)
        .eq('question_id', questionId)
      setBookmarked(false)
    } else {
      await supabase
        .from('bookmarks')
        .insert({ user_id: userId, question_id: questionId })
      setBookmarked(true)
    }
    setLoading(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark this question'}
      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 ${
        bookmarked
          ? 'bg-[#0D9488] text-white shadow-sm'
          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
      } ${loading ? 'opacity-50' : ''}`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill={bookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
      </svg>
    </button>
  )
}
