import Link from 'next/link'

export default function CasesPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-[#f0fdfb] flex items-center justify-center mb-6">
        <span className="text-4xl">🩺</span>
      </div>
      <h1 className="text-2xl font-bold text-[#101010] mb-2">Case Studies</h1>
      <p className="text-gray-400 text-sm mb-8 max-w-xs">
        Clinical case studies are coming soon. Practice your diagnostic reasoning with real-world patient scenarios.
      </p>
      <Link
        href="/dashboard"
        className="px-8 py-3 rounded-full bg-[#0D9488] text-white font-semibold text-sm hover:bg-[#0b7a6e] transition-colors"
      >
        Back to dashboard
      </Link>
    </div>
  )
}
