import Link from 'next/link'
import type { LegalDoc } from '@/lib/legal'

export default function LegalArticle({ doc }: { doc: LegalDoc }) {
  return (
    <main className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        <Link
          href="/"
          className="text-sm font-bold hover:underline"
          style={{ color: 'var(--teal)' }}
        >
          ← Back to Skoolie
        </Link>

        <h1 className="mt-6 text-3xl sm:text-4xl font-black" style={{ color: 'var(--text)' }}>
          {doc.title}
        </h1>
        <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--text-faint)' }}>
          Last updated {doc.updated}
        </p>
        <p className="mt-6 leading-relaxed" style={{ color: 'var(--text-soft)' }}>
          {doc.intro}
        </p>

        <div className="mt-10 space-y-8">
          {doc.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-lg font-extrabold" style={{ color: 'var(--text)' }}>
                {section.heading}
              </h2>
              <p className="mt-2 leading-relaxed" style={{ color: 'var(--text-soft)' }}>
                {section.body}
              </p>
            </section>
          ))}
        </div>

        <footer
          className="mt-14 border-t pt-6 text-sm font-semibold"
          style={{ borderColor: 'var(--border)', color: 'var(--text-faint)' }}
        >
          Questions? Email{' '}
          <a href="mailto:support@skoolieapp.com" className="hover:underline" style={{ color: 'var(--teal)' }}>
            support@skoolieapp.com
          </a>
        </footer>
      </div>
    </main>
  )
}
