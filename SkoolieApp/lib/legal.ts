/**
 * Legal documents — rendered in-app (app/legal.tsx) so the signup links never
 * point at a dead page and the text is readable offline. Mirror any edits to
 * the website copies once skoolieapp.com hosts /terms and /privacy.
 *
 * NOT LEGAL ADVICE: standard-form documents; have a lawyer review before or
 * shortly after launch, especially if payments are introduced.
 */

export interface LegalSection {
  heading: string
  body: string
}

export interface LegalDoc {
  title: string
  updated: string
  intro: string
  sections: LegalSection[]
}

export const TERMS: LegalDoc = {
  title: 'Terms of Service',
  updated: 'July 5, 2026',
  intro:
    'Welcome to Skoolie. These Terms of Service ("Terms") govern your use of the Skoolie mobile application and related services (the "Service"), operated by Skoolie ("we", "us"). By creating an account or using the Service, you agree to these Terms. If you do not agree, please do not use the Service.',
  sections: [
    {
      heading: '1. Who can use Skoolie',
      body: 'You must be at least 13 years old to use the Service. If you are under the age of majority where you live, you confirm that a parent or guardian has reviewed and agreed to these Terms on your behalf. You are responsible for ensuring that your use of the Service is permitted in your country.',
    },
    {
      heading: '2. Your account',
      body: 'You need an account to use the Service. You agree to provide accurate information, keep your login credentials secure, and notify us promptly of any unauthorized use of your account. You are responsible for all activity that occurs under your account. You may sign in using email and password or a supported third-party provider (such as Google or Apple).',
    },
    {
      heading: '3. Educational use only — not medical advice',
      body: 'Skoolie provides practice questions, flashcards, case studies, and study tools intended to help healthcare students prepare for examinations. All content is provided for educational purposes only. It is not medical advice, is not a substitute for professional clinical judgment, formal education, or official examination materials, and must never be used to make decisions about the care of real patients. While we work hard on accuracy, we do not guarantee that any content is complete, current, or error-free, or that using the Service will lead to any particular exam result.',
    },
    {
      heading: '4. License and acceptable use',
      body: 'We grant you a personal, non-exclusive, non-transferable, revocable license to use the Service for your own study. You agree not to: copy, scrape, resell, or redistribute the question bank or other content; share your account; reverse-engineer the app; use automated tools to access the Service; attempt to manipulate scores, streaks, XP, leagues, or other gamification systems; or use the Service in any unlawful way.',
    },
    {
      heading: '5. Our content and your data',
      body: 'The Service, including all questions, explanations, characters, artwork, and software, is owned by us or our licensors and protected by intellectual property laws. Your study statistics and progress data are yours; we use them to operate the features described in our Privacy Policy.',
    },
    {
      heading: '6. Gamification',
      body: 'XP, levels, streaks, streak freezes, tiers, leagues, and similar features are part of the Service experience. They have no monetary value, cannot be sold or exchanged, and may be adjusted, rebalanced, or reset as we improve the Service (for example, to correct bugs or prevent abuse). To keep competitions active, leaderboards may include simulated participants ("pacers") operated by Skoolie and marked with a ✦ symbol; pacers never affect promotions, relegations, tournaments, or any outcome for real users, and are phased out as boards fill with real participants.',
    },
    {
      heading: '7. Fees',
      body: 'The Service is currently free. We may introduce paid features or subscriptions in the future; if we do, pricing and terms will be presented clearly before you are charged, and these Terms will be updated accordingly.',
    },
    {
      heading: '8. Termination',
      body: 'You may stop using the Service or request deletion of your account at any time by contacting us. We may suspend or terminate accounts that violate these Terms, abuse the Service, or harm other users, with or without notice depending on severity.',
    },
    {
      heading: '9. Disclaimers and limitation of liability',
      body: 'The Service is provided "as is" and "as available" without warranties of any kind, express or implied. To the maximum extent permitted by law, we are not liable for any indirect, incidental, special, or consequential damages, or for loss of data, opportunities, or exam outcomes, arising from your use of the Service. Nothing in these Terms excludes liability that cannot be excluded by law.',
    },
    {
      heading: '10. Changes to these Terms',
      body: 'We may update these Terms from time to time. If we make material changes, we will notify you in the app or by email before the changes take effect. Continuing to use the Service after changes take effect means you accept the updated Terms.',
    },
    {
      heading: '11. Governing law',
      body: 'These Terms are governed by the laws of the Republic of Ghana, without regard to conflict-of-law principles. Disputes will be subject to the jurisdiction of the courts of Ghana, unless mandatory law in your country of residence provides otherwise.',
    },
    {
      heading: '12. Contact',
      body: 'Questions about these Terms? Contact us at support@skoolieapp.com.',
    },
  ],
}

export const PRIVACY: LegalDoc = {
  title: 'Privacy Policy',
  updated: 'July 5, 2026',
  intro:
    'This Privacy Policy explains what information Skoolie ("we", "us") collects when you use the Skoolie mobile application (the "Service"), how we use it, and the choices you have. We keep it simple: we collect what the Service needs to work, we do not sell your data, and we do not show ads.',
  sections: [
    {
      heading: '1. Information we collect',
      body: 'Account information: your name, email address, password (stored as a secure hash — we never see it), and, if you sign in with Google or Apple, the name and email those providers share. Profile information: profession, study year, country, and topics of interest that you choose during onboarding. Study activity: questions answered, scores, streaks, XP, tiers, league standings, bookmarks, and session history — this powers your progress tracking, analytics, and leaderboards. Device information: a push notification token if you enable reminders, and basic technical data needed to run the app.',
    },
    {
      heading: '2. How we use your information',
      body: 'We use your information to operate the Service: personalizing your question feed by country and interests, tracking your progress and exam readiness, running leaderboards and weekly leagues, sending the notifications you have enabled (such as streak reminders), sending essential account emails (such as password reset codes), and keeping the Service secure and free of abuse.',
    },
    {
      heading: '3. Leaderboards and visibility',
      body: 'Your display name, avatar, tier badge, profession, and XP totals are visible to other users on leaderboards and public profiles. Your email address, country, and detailed study history are never shown to other users.',
    },
    {
      heading: '4. Service providers',
      body: 'We use a small number of providers to run the Service: Supabase (database, authentication, and hosting), Google and Apple (optional sign-in), and Resend (transactional email such as reset codes). These providers process data only to provide their services to us. We do not sell your personal information to anyone, and we do not share it with advertisers.',
    },
    {
      heading: '5. Data retention and deletion',
      body: 'We keep your data while your account is active so your progress is preserved. You can request deletion of your account and associated personal data at any time by contacting support@skoolieapp.com; we will complete verified requests within 30 days, except for minimal records we are legally required to keep.',
    },
    {
      heading: '6. Security',
      body: 'We protect your data with industry-standard measures, including encryption in transit, hashed passwords, and row-level access controls that ensure users can only access their own records. No system is perfectly secure, so please use a strong, unique password.',
    },
    {
      heading: '7. Children',
      body: 'The Service is intended for users aged 13 and over and is designed for tertiary-level healthcare students. We do not knowingly collect personal information from children under 13. If you believe a child under 13 has created an account, contact us and we will delete it.',
    },
    {
      heading: '8. Your rights',
      body: 'Depending on where you live, you may have rights to access, correct, export, or delete your personal information, and to object to certain processing. You can exercise these rights by contacting us. Where our processing is based on consent (such as optional notifications), you can withdraw consent at any time in the app settings.',
    },
    {
      heading: '9. Changes to this policy',
      body: 'We may update this Privacy Policy from time to time. If we make material changes, we will notify you in the app or by email before they take effect. The "last updated" date above always reflects the current version.',
    },
    {
      heading: '10. Contact',
      body: 'Privacy questions or requests: support@skoolieapp.com.',
    },
  ],
}
