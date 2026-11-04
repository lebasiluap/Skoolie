export const FREEZE_CAPACITY = 2

/** Display only; the database enforces this limit for all reward sources. */
export function freezeBalance(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(FREEZE_CAPACITY, Math.max(0, Math.floor(value))) : null
}

// Scheduled notifications can be delivered after another device changes the
// balance. Never claim that a freeze is available, exhausted or newly earned.
export const FREEZE_REMINDER = 'A stored freeze can cover a missed day, but adds no study day. Without one, a missed day breaks the streak.'
export const BARRAGE_FREEZE_REMINDER = 'Every fifth completed barrage can refill a freeze if there is space (maximum 2 stored).'
