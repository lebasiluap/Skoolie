type DeletionReply = { deleted: true; manual_apple_revocation?: boolean }
export interface AccountDeletionSteps {
  request: () => Promise<DeletionReply>
  checkUser: () => Promise<{ error: { code?: string; status?: number } | null }>
  cancelNotifications: () => Promise<void>
  clearLocalData: () => Promise<void>
  signOut: () => Promise<void>
}

/** A timeout is uncertain, not proof of failure. Only an authoritative
 * missing-user response confirms a deletion whose response was lost. */
export async function finishAccountDeletion(steps: AccountDeletionSteps) {
  let manualAppleRevocation = false
  let deleted = true
  try {
    const result = await steps.request()
    if (result?.deleted !== true) throw new Error('Deletion not confirmed')
    manualAppleRevocation = result.manual_apple_revocation === true
  } catch (error) {
    let check
    try { check = await steps.checkUser() } catch { throw error }
    if (check.error?.code !== 'user_not_found') {
      // Other authoritative authentication failures don't prove deletion, but
      // must not trap a user in a dead session. Clear it without claiming success.
      if (check.error?.status !== 401 && check.error?.status !== 403) throw error
      deleted = false
    }
    // A lost response may also have lost the Apple fallback flag. The caller
    // already knows whether it explicitly selected manual revocation.
  }
  let localCleanupFailed = false
  for (const cleanup of [steps.cancelNotifications, steps.clearLocalData, steps.signOut]) {
    try { await cleanup() } catch { localCleanupFailed = true }
  }
  return { deleted, manualAppleRevocation, localCleanupFailed }
}

export function accountLocalKeys(keys: readonly string[], uid: string): string[] {
  // Never clear the whole installation or another account's saved state.
  return keys.filter(key => key.split(':').includes(uid))
}
