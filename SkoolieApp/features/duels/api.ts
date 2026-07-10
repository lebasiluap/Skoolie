/**
 * Thin typed wrappers around the staged duel_* RPCs. Every call returns
 * `{ data, error }` in the app's usual supabase style; RPC payloads are
 * untyped jsonb so they're cast here, once, at the boundary.
 */
import { supabase } from '@/lib/supabase'
import type { Duel, OpponentHit } from './types'

export async function duelList(): Promise<{ duels: Duel[]; error: string | null }> {
  const { data, error } = await supabase.rpc('duel_list')
  if (error) return { duels: [], error: error.message }
  return { duels: (data ?? []) as Duel[], error: null }
}

export async function duelGet(id: string): Promise<{ duel: Duel | null; error: string | null }> {
  const { data, error } = await supabase.rpc('duel_get', { p_id: id })
  if (error || !data) return { duel: null, error: error?.message ?? 'not found' }
  return { duel: data as Duel, error: null }
}

export async function duelCreate(opponentId: string, rematchOf?: string): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc('duel_create', {
    p_opponent: opponentId,
    p_rematch_of: rematchOf ?? null,
  })
  if (error) return { id: null, error: error.message }
  return { id: (data as string) ?? null, error: null }
}

export async function duelRandom(): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc('duel_random')
  if (error) return { id: null, error: error.message }
  return { id: (data as string | null) ?? null, error: null }
}

export async function duelSubmit(id: string, score: number, ms: number): Promise<{ duel: Duel | null; error: string | null }> {
  const { data, error } = await supabase.rpc('duel_submit', { p_id: id, p_score: score, p_ms: ms })
  if (error || !data) return { duel: null, error: error?.message ?? 'submit failed' }
  return { duel: data as Duel, error: null }
}

export async function duelSearchOpponents(query: string): Promise<{ hits: OpponentHit[]; error: string | null }> {
  const { data, error } = await supabase.rpc('duel_search_opponents', { p_query: query })
  if (error) return { hits: [], error: error.message }
  return { hits: (data ?? []) as OpponentHit[], error: null }
}

/** "3h 12m left" / "expired" — for list rows and the runner header. */
export function timeLeft(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now()
  if (ms <= 0) return 'expired'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`
}

/** 83250 → "1:23.2" (m:ss.t) — duel times are compared to the tenth. */
export function fmtMs(ms: number | null | undefined): string {
  if (ms == null) return '—'
  const totalSec = ms / 1000
  const m = Math.floor(totalSec / 60)
  const s = totalSec - m * 60
  return `${m}:${s < 10 ? '0' : ''}${s.toFixed(1)}`
}
