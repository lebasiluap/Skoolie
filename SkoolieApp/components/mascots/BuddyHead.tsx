/**
 * BuddyHead — coral speech-bubble buddy mascot.
 * Used for Case Studies tutor explanations.
 */
import React from 'react'
import Svg, { Rect, Path, Circle, G } from 'react-native-svg'
import type { MascotExpression } from './CappyHead'

interface Props {
  expr?: MascotExpression
  size?: number
}

const DK = '#7A2E15'

function FaceElements({ expr }: { expr: MascotExpression }) {
  const eyesOpen = (up: boolean) => (
    <G key="eyes">
      <Path d="M49 58 a9 10 0 0 1 18 0 a9 10 0 0 1 -18 0 Z" fill="#fff" opacity={0.85} />
      <Path d="M63 58 a9 10 0 0 1 18 0 a9 10 0 0 1 -18 0 Z" fill="#fff" opacity={0.85} />
      <Circle cx={59.5} cy={59.5 + (up ? -2.5 : 0)} r={4.6} fill={DK} />
      <Circle cx={73.5} cy={59.5 + (up ? -2.5 : 0)} r={4.6} fill={DK} />
      <Circle cx={56.4} cy={55.6} r={1.8} fill="#fff" />
      <Circle cx={70.4} cy={55.6} r={1.8} fill="#fff" />
    </G>
  )
  const eyesHappy = () => (
    <G key="eyes-happy">
      <Path d="M50 57 Q58 65 66 57" stroke={DK} strokeWidth={3.4} fill="none" strokeLinecap="round" />
      <Path d="M64 57 Q72 65 80 57" stroke={DK} strokeWidth={3.4} fill="none" strokeLinecap="round" />
    </G>
  )
  const brows = () => (
    <G key="brows">
      <Path d="M50 47 L63 51" stroke={DK} strokeWidth={2.6} fill="none" strokeLinecap="round" />
      <Path d="M80 47 L67 51" stroke={DK} strokeWidth={2.6} fill="none" strokeLinecap="round" />
    </G>
  )
  const mSmile = <Path key="m" d="M57 66 Q65 73 73 66" stroke={DK} strokeWidth={3} fill="none" strokeLinecap="round" />
  const mBig = (
    <G key="m">
      <Path d="M56 64 Q65 67 74 64 Q71 78 65 78 Q59 78 56 64 Z" fill={DK} />
      <Path d="M61 73 Q65 77 69 73 Z" fill="#F2774E" />
    </G>
  )
  const mFrown = <Path key="m" d="M58 71 Q65 63 72 71" stroke={DK} strokeWidth={3} fill="none" strokeLinecap="round" />
  const mFlat = <Path key="m" d="M59 68 Q65 70 71 68" stroke={DK} strokeWidth={2.8} fill="none" strokeLinecap="round" />

  switch (expr) {
    case 'happy': return <>{eyesHappy()}{mBig}</>
    case 'wrong': return <>{brows()}{eyesOpen(false)}{mFrown}</>
    case 'thinking': return <>{eyesOpen(true)}{mFlat}</>
    default: return <>{eyesOpen(false)}{mSmile}</>
  }
}

export function BuddyHead({ expr = 'idle', size = 80 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 130 130">
      {/* Speech-bubble tail */}
      <Path d="M44 88 L36 106 L62 90 Z" fill="#F2774E" />
      {/* Body bubble */}
      <Rect x={18} y={16} width={94} height={72} rx={24} fill="#F2774E" />
      {/* Cheek glows */}
      <Circle cx={48} cy={66} r={4} fill="#fff" opacity={0.35} />
      <Circle cx={82} cy={66} r={4} fill="#fff" opacity={0.35} />
      {/* Face */}
      <FaceElements expr={expr} />
    </Svg>
  )
}
