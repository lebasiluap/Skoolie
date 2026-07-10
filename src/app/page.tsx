import type { Metadata } from 'next'
import Landing from '@/components/landing/Landing'

export const metadata: Metadata = {
  title: 'Skoolie — Study smarter. Pass with confidence.',
  description:
    'MCQs, flashcards, and clinical cases for pharmacy, medicine, nursing, dentistry and midwifery students — with streaks, leagues, and a daily challenge. Exam prep that feels like a game.',
  alternates: { canonical: 'https://skoolieapp.com' },
  keywords: [
    'medical exam prep app', 'pharmacy past questions', 'nursing exam questions',
    'MCQ app for medical students', 'clinical case questions', 'health student study app',
    'pharmacy exam prep Ghana', 'nursing licensing exam practice', 'flashcards for medical students',
  ],
}

// Structured data: tells Google this is a mobile app by an organization — the
// richest result type available pre-reviews. Ratings can be added after launch.
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://skoolieapp.com/#org',
      name: 'Skoolie',
      url: 'https://skoolieapp.com',
      logo: 'https://skoolieapp.com/icon.png',
      email: 'support@skoolieapp.com',
    },
    {
      '@type': 'WebSite',
      '@id': 'https://skoolieapp.com/#site',
      url: 'https://skoolieapp.com',
      name: 'Skoolie',
      publisher: { '@id': 'https://skoolieapp.com/#org' },
    },
    {
      '@type': 'SoftwareApplication',
      name: 'Skoolie',
      operatingSystem: 'iOS, Android',
      applicationCategory: 'EducationalApplication',
      description:
        'MCQs, flashcards, and clinical cases for pharmacy, medicine, nursing, dentistry and midwifery students — with streaks, leagues, and a daily challenge.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      publisher: { '@id': 'https://skoolieapp.com/#org' },
    },
  ],
}

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Landing />
    </>
  )
}
