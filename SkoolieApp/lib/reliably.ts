// Retry-once wrapper for critical writes (sessions, XP, streaks, history).
// Fire-and-forget writes previously failed SILENTLY — on a flaky connection a
// finished session could earn nothing with no indication. Policy per audit:
// retry once after a short pause, and if it still fails, surface a friendly
// toast so the user always knows whether their progress saved.

type SupaResult = { error: { message?: string } | null }

/** Run a Supabase write; retry once on failure. Returns whether it succeeded. */
export async function trySave(op: () => PromiseLike<SupaResult>): Promise<boolean> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { error } = await op()
      if (!error) return true
    } catch {
      // network-level throw — fall through to retry
    }
    if (attempt === 0) await new Promise(r => setTimeout(r, 900))
  }
  return false
}
