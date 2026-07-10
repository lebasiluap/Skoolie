/**
 * Legal documents for skoolieapp.com (/terms and /privacy).
 * Source of truth is SkoolieApp/lib/legal.ts — mirror any edits both ways.
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
      body: 'Subject to your continued compliance with these Terms, we grant you a limited, personal, non-exclusive, non-transferable, non-sublicensable, revocable license to access and use the Service for your own individual study purposes. Except as expressly permitted herein, you shall not, and shall not permit or assist any third party to: (a) copy, extract, scrape, harvest, download in bulk, resell, sublicense, publish, or otherwise redistribute the question bank, explanations, case studies, or any other content comprising the Service; (b) share, lend, lease, or otherwise make your account credentials available to any other person; (c) decompile, disassemble, reverse-engineer, or otherwise attempt to derive the source code, underlying algorithms, or data structures of the Service; (d) deploy any robot, spider, crawler, or other automated means to access the Service or extract data therefrom; (e) manipulate, or attempt to manipulate, any score, streak, experience point, league standing, tier, tournament, or other gamification mechanism, whether by technical exploitation, collusion, or otherwise; (f) circumvent or attempt to circumvent any technical, security, or access-control measure; or (g) use the Service in violation of any applicable law, regulation, or third-party right.',
    },
    {
      heading: '5. Intellectual property; our content and your data',
      body: 'The Service — including without limitation all questions, answers, explanations, distractor rationales, case vignettes, characters, mascots, illustrations, artwork, animations, sounds, trademarks, trade dress, software, and the selection, arrangement, and compilation thereof — is owned by us or our licensors and is protected by copyright, trademark, and other intellectual property laws of Ghana and other jurisdictions. No right, title, or interest in or to the Service or any content therein is transferred to you by virtue of these Terms or your use of the Service, other than the limited license expressly granted in Section 4. Your individual study statistics and progress data remain yours; you grant us a worldwide, royalty-free license to process such data as necessary to operate, maintain, improve, and secure the features of the Service, as further described in our Privacy Policy.',
    },
    {
      heading: '6. Gamification systems; virtual items',
      body: 'Experience points ("XP"), levels, streaks, streak freezes, specialty tiers, leagues, tournaments, badges, and similar features and virtual items (collectively, "Gamification Elements") form part of the Service experience. Gamification Elements: (a) are licensed, not sold; (b) have no cash, monetary, or real-world value; (c) are not redeemable, refundable, transferable, or exchangeable for currency, goods, or services of any kind; and (d) may be modified, rebalanced, capped, suspended, reset, or discontinued at our sole discretion at any time, including without limitation to correct errors, address abuse, maintain competitive integrity, or otherwise improve the Service. You acknowledge that any expectation of continuity in respect of Gamification Elements is expressly disclaimed.',
    },
    {
      heading: '7. Competitive features; service liveness and simulated participants',
      body: 'Leaderboards, leagues, tournaments, and other competitive features (collectively, "Competitive Features") rank participants according to XP earned within defined periods, subject to the promotion, relegation, and qualification rules displayed in the Service from time to time, which rules we may amend in accordance with Section 6. Tie rankings are resolved in favour of the participant who attained the relevant score earliest. In order to ensure the continuity, liveness, quality assurance, load-representativeness, and engagement of Competitive Features — in particular during periods of limited concurrent participation, service testing, or the introduction of new cohorts, professions, or geographies — the Service may include automated, system-operated, or otherwise simulated participant accounts (howsoever designated, including as "pacers"), whose scores, statistics, profiles, avatars, streaks, and other displayed attributes are generated programmatically. Such simulated participants: (i) are operated solely by or on behalf of Skoolie; (ii) do not correspond to natural persons; (iii) are excluded from the computation of all promotion, relegation, tournament-qualification, tournament-advancement, and prize or reward outcomes affecting users, such that no user outcome is ever determined, diminished, or displaced by a simulated participant; and (iv) may be introduced, adjusted, reduced, or retired by us at any time, including automatically as genuine participation increases. Your continued use of Competitive Features constitutes acknowledgement and acceptance of the foregoing.',
    },
    {
      heading: '8. Fees',
      body: 'The Service is currently provided free of charge. We reserve the right to introduce fees, subscriptions, or paid features in the future. In such event, applicable pricing and payment terms will be presented clearly before you incur any charge, and these Terms will be updated accordingly. Continued use of free portions of the Service will not require payment.',
    },
    {
      heading: '9. Third-party services',
      body: 'The Service may interoperate with third-party services, including authentication providers (such as Google and Apple), push-notification infrastructure, and hosting providers. Your use of such third-party services may be subject to separate terms and privacy policies of the relevant providers, and we are not responsible for the acts or omissions of such providers.',
    },
    {
      heading: '10. Suspension and termination',
      body: 'You may discontinue use of the Service, or request deletion of your account and associated data, at any time by contacting us at the address in Section 16. We may suspend, restrict, or terminate your access to all or part of the Service, with or without notice depending on the severity of the circumstances, where we reasonably believe that you have violated these Terms, abused or attempted to abuse the Service or its Gamification Elements or Competitive Features, harmed or threatened other users, or exposed us to legal liability. Sections 5, 6, 7, 11, 12, 13, 14, and 15 survive any termination.',
    },
    {
      heading: '11. Disclaimers',
      body: 'THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE", WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE, INCLUDING WITHOUT LIMITATION ANY IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, NON-INFRINGEMENT, ACCURACY, OR AVAILABILITY. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, TIMELY, SECURE, OR ERROR-FREE, THAT DEFECTS WILL BE CORRECTED, OR THAT USE OF THE SERVICE WILL PRODUCE ANY PARTICULAR ACADEMIC OR EXAMINATION OUTCOME.',
    },
    {
      heading: '12. Limitation of liability',
      body: 'TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL WE, OUR OFFICERS, EMPLOYEES, CONTRACTORS, OR LICENSORS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR FOR ANY LOSS OF DATA, GOODWILL, OPPORTUNITY, OR EXAMINATION OR CAREER OUTCOME, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF OR INABILITY TO USE THE SERVICE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. OUR AGGREGATE LIABILITY FOR ALL CLAIMS RELATING TO THE SERVICE SHALL NOT EXCEED THE GREATER OF THE AMOUNTS PAID BY YOU TO US IN THE TWELVE MONTHS PRECEDING THE CLAIM AND ONE HUNDRED GHANA CEDIS (GHS 100). NOTHING IN THESE TERMS EXCLUDES OR LIMITS LIABILITY THAT CANNOT BE EXCLUDED OR LIMITED UNDER APPLICABLE LAW.',
    },
    {
      heading: '13. Indemnity',
      body: 'You agree to indemnify and hold harmless Skoolie and its officers, employees, and contractors from and against any claims, damages, liabilities, costs, and expenses (including reasonable legal fees) arising out of or related to your violation of these Terms, your misuse of the Service, or your violation of any law or third-party right.',
    },
    {
      heading: '14. Changes to these Terms',
      body: 'We may amend these Terms from time to time. Where a change is material, we will provide notice in the app or by email before the change takes effect. Your continued use of the Service after the effective date of any amendment constitutes acceptance of the amended Terms. If you do not agree to an amendment, your sole remedy is to discontinue use of the Service.',
    },
    {
      heading: '15. Governing law; severability; entire agreement',
      body: 'These Terms are governed by the laws of the Republic of Ghana, without regard to conflict-of-law principles, and disputes shall be subject to the exclusive jurisdiction of the courts of Ghana, save where mandatory law of your country of residence provides otherwise. If any provision of these Terms is held invalid or unenforceable, the remaining provisions shall continue in full force and effect, and the invalid provision shall be reformed to the minimum extent necessary. These Terms, together with the Privacy Policy, constitute the entire agreement between you and us regarding the Service and supersede all prior understandings. Our failure to enforce any provision is not a waiver of our right to do so later.',
    },
    {
      heading: '16. Contact',
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
