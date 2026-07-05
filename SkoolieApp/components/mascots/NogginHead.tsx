/**
 * NogginHead — the Skoolie brain-buddy mascot (full-body redesign).
 * A soft teal brain with a centre fold, big round eyes, little arms and feet.
 * Used on flashcard quiz screens.
 * Expressions: 'idle' | 'happy' | 'wrong' | 'thinking' | 'wave'
 */
import React from 'react'
import Svg, { Path, Circle, Ellipse, G } from 'react-native-svg'
import type { MascotExpression } from './CappyHead'

interface Props {
  expr?: MascotExpression
  size?: number
}

const BODY  = '#57B49E'   // main teal
const DARK  = '#3F9182'   // arms, feet, fold line
const LINE  = '#173F38'   // facial features
const WHITE = '#FFFFFF'
const BLUSH = '#8F8276'   // muted cheek dots

function FaceElements({ expr }: { expr: MascotExpression }) {
  const eyeL = { cx: 53, cy: 57 }
  const eyeR = { cx: 77, cy: 57 }

  // Big round white eyes, pupils glancing slightly to the side
  const openEyes = (lookUp = false) => (
    <G key="eyes">
      <Ellipse cx={eyeL.cx} cy={eyeL.cy} rx={12} ry={13} fill={WHITE} />
      <Ellipse cx={eyeR.cx} cy={eyeR.cy} rx={12} ry={13} fill={WHITE} />
      <Circle cx={eyeL.cx + 3} cy={eyeL.cy + (lookUp ? -4 : -1)} r={5.4} fill={LINE} />
      <Circle cx={eyeR.cx + 3} cy={eyeR.cy + (lookUp ? -4 : -1)} r={5.4} fill={LINE} />
      <Circle cx={eyeL.cx + 1} cy={eyeL.cy - 4 + (lookUp ? -3 : 0)} r={1.7} fill={WHITE} />
      <Circle cx={eyeR.cx + 1} cy={eyeR.cy - 4 + (lookUp ? -3 : 0)} r={1.7} fill={WHITE} />
    </G>
  )

  const happyEyes = () => (
    <G key="eyes-happy">
      <Path d="M43 59 Q53 48 63 59" stroke={LINE} strokeWidth={3.4} fill="none" strokeLinecap="round" />
      <Path d="M67 59 Q77 48 87 59" stroke={LINE} strokeWidth={3.4} fill="none" strokeLinecap="round" />
    </G>
  )

  const sadEyes = () => (
    <G key="eyes-sad">
      <Ellipse cx={eyeL.cx} cy={eyeL.cy} rx={12} ry={13} fill={WHITE} />
      <Ellipse cx={eyeR.cx} cy={eyeR.cy} rx={12} ry={13} fill={WHITE} />
      <Circle cx={eyeL.cx + 1} cy={eyeL.cy + 2} r={5.4} fill={LINE} />
      <Circle cx={eyeR.cx + 1} cy={eyeR.cy + 2} r={5.4} fill={LINE} />
      {/* worried brows */}
      <Path d="M43 42 Q52 47 61 44" stroke={LINE} strokeWidth={2.8} fill="none" strokeLinecap="round" />
      <Path d="M69 44 Q78 47 87 42" stroke={LINE} strokeWidth={2.8} fill="none" strokeLinecap="round" />
    </G>
  )

  // Mouths
  const smile = <Path key="m" d="M57 79 Q65 86 73 79" stroke={LINE} strokeWidth={3.2} fill="none" strokeLinecap="round" />
  const bigSmile = (
    <G key="m">
      <Path d="M54 77 Q65 82 76 77 Q73 92 65 92 Q57 92 54 77 Z" fill={LINE} />
      <Path d="M60 87 Q65 91 70 87 Z" fill="#F2774E" />
    </G>
  )
  const frown = <Path key="m" d="M56 85 Q65 77 74 85" stroke={LINE} strokeWidth={3.2} fill="none" strokeLinecap="round" />
  const flat  = <Path key="m" d="M58 81 Q65 83 72 81" stroke={LINE} strokeWidth={3} fill="none" strokeLinecap="round" />

  switch (expr) {
    case 'happy':    return <>{happyEyes()}{bigSmile}</>
    case 'wrong':    return <>{sadEyes()}{frown}</>
    case 'thinking': return <>{openEyes(true)}{flat}</>
    case 'wave':     return <>{happyEyes()}{bigSmile}</>
    default:         return <>{openEyes(false)}{smile}</>
  }
}

export function NogginHead({ expr = 'idle', size = 80 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 130 130">
      {/* Arms — little rounded stubs curving out and down */}
      <Path d="M26 72 Q14 78 12 90" stroke={DARK} strokeWidth={9} fill="none" strokeLinecap="round" />
      <Path d="M104 72 Q116 78 118 90" stroke={DARK} strokeWidth={9} fill="none" strokeLinecap="round" />

      {/* Feet — two small ovals peeking out under the body */}
      <Ellipse cx={51} cy={113} rx={11} ry={6.5} fill={DARK} />
      <Ellipse cx={80} cy={113} rx={11} ry={6.5} fill={DARK} />

      {/* Body — scalloped brain silhouette built from overlapping lobes */}
      <G fill={BODY}>
        <Circle cx={47} cy={42} r={24} />
        <Circle cx={83} cy={42} r={24} />
        <Circle cx={31} cy={66} r={18} />
        <Circle cx={99} cy={66} r={18} />
        <Circle cx={45} cy={86} r={18} />
        <Circle cx={85} cy={86} r={18} />
        <Circle cx={65} cy={88} r={19} />
        <Circle cx={65} cy={62} r={32} />
      </G>

      {/* Centre fold — from the top notch down between the eyes */}
      <Path d="M65 22 C62 34 68 44 64 56" stroke={DARK} strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.85} />
      {/* Subtle side folds */}
      <G stroke={DARK} strokeWidth={2} fill="none" strokeLinecap="round" opacity={0.35}>
        <Path d="M38 34 Q34 42 39 48" />
        <Path d="M92 34 Q96 42 91 48" />
      </G>

      {/* Cheeks — muted blush dots */}
      <Circle cx={39} cy={74} r={4.6} fill={BLUSH} opacity={0.6} />
      <Circle cx={91} cy={74} r={4.6} fill={BLUSH} opacity={0.6} />

      {/* Face */}
      <FaceElements expr={expr} />
    </Svg>
  )
}
