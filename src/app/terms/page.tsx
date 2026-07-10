import type { Metadata } from 'next'
import LegalArticle from '@/components/LegalArticle'
import { TERMS } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Terms of Service — Skoolie',
  description: 'Terms of Service for the Skoolie mobile application.',
}

export default function TermsPage() {
  return <LegalArticle doc={TERMS} />
}
