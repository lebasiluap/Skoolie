/**
 * CappyHead — the Skoolie teal capsule mascot (head-only variant).
 * Expressions: 'idle' | 'happy' | 'wrong' | 'thinking' | 'wave'
 */
import React from 'react'
import Svg, { Rect, Path, Circle, Ellipse, G } from 'react-native-svg'

export type MascotExpression = 'idle' | 'happy' | 'wrong' | 'thinking' | 'wave'

interface Props {
  expr?: MascotExpression
  size?: number
}

const DK = '#15302B'

function FaceElements({ expr }: { expr: MascotExpression }) {
  // Eyes open (neutral or thinking — pupil moves up when thinking)
  const eyesOpen = (up: boolean) => (
    <G key="eyes">
      <Ellipse cx={58} cy={58} rx={9} ry={10} fill="#fff" />
      <Ellipse cx={72} cy={58} rx={9} ry={10} fill="#fff" />
      <Circle cx={59.5} cy={59.5 + (up ? -2.5 : 0)} r={4.6} fill={DK} />
      <Circle cx={73.5} cy={59.5 + (up ? -2.5 : 0)} r={4.6} fill={DK} />
      <Circle cx={56.4} cy={55.6} r={1.8} fill="#fff" />
      <Circle cx={70.4} cy={55.6} r={1.8} fill="#fff" />
    </G>
  )

  // Happy squint eyes
  const eyesHappy = () => (
    <G key="eyes-happy">
      <Path d="M50 57 Q58 65 66 57" stroke={DK} strokeWidth={3.4} fill="none" strokeLinecap="round" />
      <Path d="M64 57 Q72 65 80 57" stroke={DK} strokeWidth={3.4} fill="none" strokeLinecap="round" />
    </G>
  )

  // Worried brows
  const brows = () => (
    <G key="brows">
      <Path d="M50 47 L63 51" stroke={DK} strokeWidth={2.6} fill="none" strokeLinecap="round" />
      <Path d="M80 47 L67 51" stroke={DK} strokeWidth={2.6} fill="none" strokeLinecap="round" />
    </G>
  )

  const mSmile = <Path key="m" d="M57 66 Q65 73 73 66" stroke={DK} strokeWidth={3} fill="none" strokeLinecap="round" />
  const mBig = (
    <G key="m">
      <Path d="M56 64 Q65 67 74 64 Q71 79 65 79 Q59 79 56 64 Z" fill={DK} />
      <Path d="M61 74 Q65 78 69 74 Z" fill="#F2774E" />
    </G>
  )
  const mFrown = <Path key="m" d="M58 72 Q65 64 72 72" stroke={DK} strokeWidth={3} fill="none" strokeLinecap="round" />
  const mFlat = <Path key="m" d="M59 68 Q65 71 71 68" stroke={DK} strokeWidth={2.8} fill="none" strokeLinecap="round" />

  switch (expr) {
    case 'happy': return <>{eyesHappy()}{mBig}</>
    case 'wrong': return <>{brows()}{eyesOpen(false)}{mFrown}</>
    case 'thinking': return <>{eyesOpen(true)}{mFlat}</>
    default: return <>{eyesOpen(false)}{mSmile}</>
  }
}

export function CappyHead({ expr = 'idle', size = 80 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 130 130">
      {/* Body capsule */}
      <Rect x={40} y={24} width={50} height={92} rx={25} fill="#0E9E8E" />
      {/* Coral belly section */}
      <Path d="M40 80 H90 V94 a25 25 0 0 1 -50 0 Z" fill="#F2774E" />
      {/* Seam line */}
      <Rect x={40} y={78.5} width={50} height={3} fill="#fff" opacity={0.9} />
      {/* Shine */}
      <Ellipse cx={55} cy={58} rx={9} ry={18} fill="#fff" opacity={0.16} />
      {/* Cheeks */}
      <Circle cx={49} cy={66} r={4} fill="#F2774E" opacity={0.45} />
      <Circle cx={81} cy={66} r={4} fill="#F2774E" opacity={0.45} />
      {/* Face */}
      <FaceElements expr={expr} />
      {/* Grad cap */}
      <Path d="M65 10 L96 22 L65 34 L34 22 Z" fill="#16221F" />
      <Circle cx={65} cy={22} r={3} fill="#27C2AE" />
      {/* Tassel */}
      <Path d="M96 22 v11" stroke="#F2774E" strokeWidth={2.4} fill="none" strokeLinecap="round" />
      <Circle cx={96} cy={34} r={2.6} fill="#F2774E" />
    </Svg>
  )
}
