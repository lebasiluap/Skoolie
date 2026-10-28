export type RapidTurn = { index: number; answer: string | null }

/** Never expose an unanswered previous item between two React state updates. */
export function advanceRapidTurn(turn: RapidTurn): RapidTurn {
  return turn.answer === null ? turn : { index: turn.index + 1, answer: null }
}

/** The anti-cascade window starts once per item, not on each timer tick. */
export function rapidTapReady(now: number, readyAt: number, graceMs: number) {
  return readyAt > 0 && now - readyAt >= graceMs
}
