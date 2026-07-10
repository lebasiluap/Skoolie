import type { Metadata } from 'next'
import LegalArticle from '@/components/LegalArticle'
import { PRIVACY } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Privacy Policy — Skoolie',
  description: 'Privacy Policy for the Skoolie mobile application.',
}

export default function PrivacyPage() {
  return <LegalArticle doc={PRIVACY} />
}
