import Link from 'next/link'

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-[#f0fdfb] flex items-center justify-center mb-6">
        <span className="text-4xl">📬</span>
      </div>

      <h1 className="text-2xl font-bold text-[#101010] mb-3">Check your inbox</h1>
      <p className="text-gray-500 text-sm leading-relaxed max-w-xs mb-2">
        We sent a verification link to your email address. Click it to activate your account.
      </p>
      <p className="text-gray-400 text-xs max-w-xs mb-10">
        Can&apos;t find it? Check your spam folder.
      </p>

      <div className="w-full max-w-xs space-y-3">
        <Link
          href="/login"
          className="block w-full py-3 rounded-full border border-gray-200 text-[#101010] font-semibold text-sm hover:bg-gray-50 transition-colors text-center"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  )
}
