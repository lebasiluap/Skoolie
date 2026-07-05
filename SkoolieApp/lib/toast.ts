// Tiny module-level toast bus — callable from anywhere (screens, libs, save
// chains) without threading React context through non-component code.
// ToastHost (mounted once in the root layout) subscribes and renders.

export type ToastKind = 'error' | 'success' | 'info'
export interface ToastMsg { id: number; kind: ToastKind; text: string }

type Listener = (t: ToastMsg) => void
let listener: Listener | null = null
let nextId = 1

export function showToast(text: string, kind: ToastKind = 'info'): void {
  listener?.({ id: nextId++, kind, text })
}

/** Internal — ToastHost only. */
export function _subscribe(fn: Listener): () => void {
  listener = fn
  return () => { if (listener === fn) listener = null }
}
