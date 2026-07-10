import type { Metadata } from 'next'
import Landing from '@/components/landing/Landing'

export const metadata: Metadata = {
  title: 'Skoolie — Study smarter. Pass with confidence.',
  description:
    'MCQs, flashcards, and clinical cases with streaks, leagues, and a daily challenge — exam prep that feels like a game you actually want to win.',
}

export default function Home() {
  return <Landing />
}
