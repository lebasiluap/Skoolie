import type { Metadata } from 'next'
import LegalArticle from '@/components/LegalArticle'
import type { LegalDoc } from '@/lib/legal'

export const metadata: Metadata = {
  alternates: { canonical: 'https://skoolieapp.com/delete-account' },
  title: 'Delete your account — Skoolie',
  description: 'How to delete your Skoolie account and all associated data.',
}

const DELETE_ACCOUNT: LegalDoc = {
  title: 'Delete your Skoolie account',
  updated: 'July 12, 2026',
  intro:
    'You can permanently delete your Skoolie account and its data at any time. Deletion is immediate and cannot be undone.',
  sections: [
    {
      heading: 'Delete from inside the app (fastest)',
      body:
        'Open Skoolie → go to the Profile tab → scroll to the bottom → tap "Delete account". You will be asked to confirm twice. Once confirmed, your account is deleted immediately.',
    },
    {
      heading: 'Or request deletion by email',
      body:
        'If you can no longer access the app, email support@skoolieapp.com from the email address linked to your account with the subject "Delete my account". We will process the request within 7 days and confirm by reply.',
    },
    {
      heading: 'What is deleted',
      body:
        'Everything tied to your account: your profile (name, email, avatar), sign-in identity, practice history and quiz sessions, XP, streaks, league placements, trophies, bookmarks, and settings. This applies whether you signed up with email, Google, or Apple.',
    },
    {
      heading: 'What may be retained',
      body:
        'We keep no personal data after deletion. Anonymous, aggregated statistics (for example, how many users answered a question correctly) cannot be traced back to you and are retained. Records we are legally required to keep, if any, are retained only for the legally mandated period.',
    },
  ],
}

export default function DeleteAccountPage() {
  return <LegalArticle doc={DELETE_ACCOUNT} />
}
