/**
 * DuelsFeature — the single entry component for the duels lab.
 *
 * Internal state-machine navigation (home → runner → result) instead of
 * expo-router routes, so the WHOLE feature mounts behind exactly one route
 * during testing and stays dead code otherwise (see README for wiring).
 */
import { useState } from 'react'
import { router } from 'expo-router'
import { DuelsHome } from './DuelsHome'
import { DuelRunner } from './DuelRunner'
import { DuelResult } from './DuelResult'
import type { Duel } from './types'

type View =
  | { name: 'home' }
  | { name: 'run'; duelId: string }
  | { name: 'result'; duel: Duel }

export function DuelsFeature() {
  const [view, setView] = useState<View>({ name: 'home' })

  if (view.name === 'run') {
    return (
      <DuelRunner
        duelId={view.duelId}
        onDone={duel => setView({ name: 'result', duel })}
        onExit={() => setView({ name: 'home' })}
      />
    )
  }

  if (view.name === 'result') {
    return (
      <DuelResult
        duel={view.duel}
        onRematch={fresh => setView({ name: 'run', duelId: fresh.id })}
        onBack={() => setView({ name: 'home' })}
      />
    )
  }

  return (
    <DuelsHome
      onOpen={duel => {
        // Your run still pending → play; anything else → head-to-head result.
        if (!duel.you.done && duel.status !== 'complete' && duel.status !== 'expired') {
          setView({ name: 'run', duelId: duel.id })
        } else {
          setView({ name: 'result', duel })
        }
      }}
      onBack={() => router.back()}
    />
  )
}
