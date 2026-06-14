import Link from 'next/link'

export default function VerifiedPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-[#f0fdfb] flex items-center justify-center mb-6">
        <div className="w-12 h-12 rounded-full bg-[#0D9488] flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M5 12l5 5 9-9" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      <h1 className="text-2xl font-bold text-[#101010] mb-3">Email verified!</h1>
      <p className="text-gray-500 text-sm leading-relaxed max-w-xs mb-10">
        Your account is active. Let&apos;s get you set up.
      </p>

      <Link
        href="/onboarding"
        className="w-full max-w-xs py-3 rounded-full bg-[#0D9488] text-white font-semibold text-base hover:bg-[#0b7a6e] transition-colors text-center block"
      >
        Continue →
      </Link>
    </div>
  )
}
