import type { ShuffledMcq } from './answers'

/** Render the server's immutable accepted answer, not the latest retry tap. */
export function timedVerdict(shuffled: ShuffledMcq, canonical: string | null) {
 if (canonical === null) return { display: '', correct: false, timedOut: true }
 const display=Object.keys(shuffled.displayToOriginalLetter).find(k=>shuffled.displayToOriginalLetter[k]===canonical)
 if (!display) throw new Error('Accepted answer is outside the issued option binding')
 return { display, correct: display===shuffled.correctLetter, timedOut: false }
}
