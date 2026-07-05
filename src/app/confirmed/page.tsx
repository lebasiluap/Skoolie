/**
 * Landing page for MOBILE signup confirmations (emailRedirectTo target).
 * The app polls sign-in while its "Confirm your email" card is up, so by the
 * time the user sees this page, the app has already flipped to "confirmed"
 * and moved into onboarding — this page just needs to say "done, go back".
 */
export default function ConfirmedPage() {
  return (
    <div className="min-h-screen bg-[#EEF2F1] flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-[#E1F3EF] flex items-center justify-center mb-6">
        <div className="w-12 h-12 rounded-full bg-[#0E9E8E] flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M5 12l5 5 9-9" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      <h1 className="text-2xl font-extrabold text-[#16221F] mb-3">Email confirmed! 🎉</h1>
      <p className="text-[#56655F] text-sm leading-relaxed max-w-xs">
        You&apos;re all set. Head back to the <span className="font-bold text-[#16221F]">Skoolie app</span> —
        it signs you in automatically.
      </p>

      <p className="text-[#5E706A] text-xs mt-10">You can close this page.</p>
    </div>
  )
}
