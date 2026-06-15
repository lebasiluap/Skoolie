import Link from 'next/link'

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-[#0D9488]/15 border border-[#0D9488]/30 flex items-center justify-center mb-6">
        <span className="text-4xl">📬</span>
      </div>

      <h1 className="text-2xl font-bold text-white mb-3">Check your inbox</h1>
      <p className="text-[#888888] text-sm leading-relaxed max-w-xs mb-2">
        We sent a verification link to your email address. Click it to activate your account.
      </p>
      <p className="text-[#555555] text-xs max-w-xs mb-10">
        Can&apos;t find it? Check your spam folder.
      </p>

      <div className="w-full max-w-xs">
        <Link
          href="/login"
          className="block w-full py-3 rounded-full border border-[#2A2A2A] text-white font-semibold text-sm hover:bg-[#141414] transition-colors text-center"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  )
}
