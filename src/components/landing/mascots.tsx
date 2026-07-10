import type { CSSProperties } from 'react'

/**
 * Skoolie mascots as plain web SVGs — exact markup ported from the landing
 * design reference (originally recreated from
 * SkoolieApp/components/mascots/{CappyHead,NogginHead,BuddyHead}.tsx).
 * All are decorative; sized via the `size` prop (viewBox 0 0 130 130).
 */

type MascotProps = {
  size?: number
  style?: CSSProperties
}

/** Cappy — simple head (nav wordmark, phone mockup header). */
export function CappySimple({ size = 130, style }: MascotProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 130 130" style={style} aria-hidden="true">
      <rect x="40" y="24" width="50" height="92" rx="25" fill="#0E9E8E" />
      <path d="M40 80 H90 V94 a25 25 0 0 1 -50 0 Z" fill="#F2774E" />
      <rect x="40" y="78.5" width="50" height="3" fill="#fff" opacity="0.9" />
      <ellipse cx="58" cy="58" rx="9" ry="10" fill="#fff" />
      <ellipse cx="72" cy="58" rx="9" ry="10" fill="#fff" />
      <circle cx="59.5" cy="59.5" r="4.6" fill="#15302B" />
      <circle cx="73.5" cy="59.5" r="4.6" fill="#15302B" />
      <path d="M57 66 Q65 73 73 66" stroke="#15302B" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M65 10 L96 22 L65 34 L34 22 Z" fill="#16221F" />
      <circle cx="65" cy="22" r="3" fill="#27C2AE" />
      <path d="M96 22 v11" stroke="#F2774E" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <circle cx="96" cy="34" r="2.6" fill="#F2774E" />
    </svg>
  )
}

/** Cappy — idle, full detail (hero float: shine, cheeks, eye highlights). */
export function CappyIdle({ size = 130, style }: MascotProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 130 130" style={style} aria-hidden="true">
      <rect x="40" y="24" width="50" height="92" rx="25" fill="#0E9E8E" />
      <path d="M40 80 H90 V94 a25 25 0 0 1 -50 0 Z" fill="#F2774E" />
      <rect x="40" y="78.5" width="50" height="3" fill="#fff" opacity="0.9" />
      <ellipse cx="55" cy="58" rx="9" ry="18" fill="#fff" opacity="0.16" />
      <circle cx="49" cy="66" r="4" fill="#F2774E" opacity="0.45" />
      <circle cx="81" cy="66" r="4" fill="#F2774E" opacity="0.45" />
      <ellipse cx="58" cy="58" rx="9" ry="10" fill="#fff" />
      <ellipse cx="72" cy="58" rx="9" ry="10" fill="#fff" />
      <circle cx="59.5" cy="59.5" r="4.6" fill="#15302B" />
      <circle cx="73.5" cy="59.5" r="4.6" fill="#15302B" />
      <circle cx="56.4" cy="55.6" r="1.8" fill="#fff" />
      <circle cx="70.4" cy="55.6" r="1.8" fill="#fff" />
      <path d="M57 66 Q65 73 73 66" stroke="#15302B" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M65 10 L96 22 L65 34 L34 22 Z" fill="#16221F" />
      <circle cx="65" cy="22" r="3" fill="#27C2AE" />
      <path d="M96 22 v11" stroke="#F2774E" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <circle cx="96" cy="34" r="2.6" fill="#F2774E" />
    </svg>
  )
}

/** Cappy — thinking (insights "do this next" tip panel). */
export function CappyThinking({ size = 130, style }: MascotProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 130 130" style={style} aria-hidden="true">
      <rect x="40" y="24" width="50" height="92" rx="25" fill="#0E9E8E" />
      <path d="M40 80 H90 V94 a25 25 0 0 1 -50 0 Z" fill="#F2774E" />
      <ellipse cx="58" cy="58" rx="9" ry="10" fill="#fff" />
      <ellipse cx="72" cy="58" rx="9" ry="10" fill="#fff" />
      <circle cx="59.5" cy="57" r="4.6" fill="#15302B" />
      <circle cx="73.5" cy="57" r="4.6" fill="#15302B" />
      <path d="M59 68 Q65 71 71 68" stroke="#15302B" strokeWidth="2.8" fill="none" strokeLinecap="round" />
      <path d="M65 10 L96 22 L65 34 L34 22 Z" fill="#16221F" />
    </svg>
  )
}

/** Cappy — happy (CTA trio, center). */
export function CappyHappy({ size = 130, style }: MascotProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 130 130" style={style} aria-hidden="true">
      <rect x="40" y="24" width="50" height="92" rx="25" fill="#0E9E8E" />
      <path d="M40 80 H90 V94 a25 25 0 0 1 -50 0 Z" fill="#F2774E" />
      <rect x="40" y="78.5" width="50" height="3" fill="#fff" opacity="0.9" />
      <circle cx="49" cy="66" r="4" fill="#F2774E" opacity="0.45" />
      <circle cx="81" cy="66" r="4" fill="#F2774E" opacity="0.45" />
      <path d="M50 57 Q58 65 66 57" stroke="#15302B" strokeWidth="3.4" fill="none" strokeLinecap="round" />
      <path d="M64 57 Q72 65 80 57" stroke="#15302B" strokeWidth="3.4" fill="none" strokeLinecap="round" />
      <path d="M56 64 Q65 67 74 64 Q71 79 65 79 Q59 79 56 64 Z" fill="#15302B" />
      <path d="M61 74 Q65 78 69 74 Z" fill="#F2774E" />
      <path d="M65 10 L96 22 L65 34 L34 22 Z" fill="#16221F" />
      <circle cx="65" cy="22" r="3" fill="#27C2AE" />
      <path d="M96 22 v11" stroke="#F2774E" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <circle cx="96" cy="34" r="2.6" fill="#F2774E" />
    </svg>
  )
}

/** Noggin — idle (hero float). */
export function NogginIdle({ size = 130, style }: MascotProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 130 130" style={style} aria-hidden="true">
      <path d="M26 72 Q14 78 12 90" stroke="#3F9182" strokeWidth="9" fill="none" strokeLinecap="round" />
      <path d="M104 72 Q116 78 118 90" stroke="#3F9182" strokeWidth="9" fill="none" strokeLinecap="round" />
      <ellipse cx="51" cy="113" rx="11" ry="6.5" fill="#3F9182" />
      <ellipse cx="80" cy="113" rx="11" ry="6.5" fill="#3F9182" />
      <g fill="#57B49E">
        <circle cx="47" cy="42" r="24" />
        <circle cx="83" cy="42" r="24" />
        <circle cx="31" cy="66" r="18" />
        <circle cx="99" cy="66" r="18" />
        <circle cx="45" cy="86" r="18" />
        <circle cx="85" cy="86" r="18" />
        <circle cx="65" cy="88" r="19" />
        <circle cx="65" cy="62" r="32" />
      </g>
      <path d="M65 22 C62 34 68 44 64 56" stroke="#3F9182" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.85" />
      <g stroke="#3F9182" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.35">
        <path d="M38 34 Q34 42 39 48" />
        <path d="M92 34 Q96 42 91 48" />
      </g>
      <circle cx="39" cy="74" r="4.6" fill="#8F8276" opacity="0.6" />
      <circle cx="91" cy="74" r="4.6" fill="#8F8276" opacity="0.6" />
      <ellipse cx="53" cy="57" rx="12" ry="13" fill="#FFFFFF" />
      <ellipse cx="77" cy="57" rx="12" ry="13" fill="#FFFFFF" />
      <circle cx="56" cy="56" r="5.4" fill="#173F38" />
      <circle cx="80" cy="56" r="5.4" fill="#173F38" />
      <circle cx="54" cy="53" r="1.7" fill="#FFFFFF" />
      <circle cx="78" cy="53" r="1.7" fill="#FFFFFF" />
      <path d="M57 79 Q65 86 73 79" stroke="#173F38" strokeWidth="3.2" fill="none" strokeLinecap="round" />
    </svg>
  )
}

/** Noggin — happy (flashcard phone, CTA trio). */
export function NogginHappy({ size = 130, style }: MascotProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 130 130" style={style} aria-hidden="true">
      <path d="M26 72 Q14 78 12 90" stroke="#3F9182" strokeWidth="9" fill="none" strokeLinecap="round" />
      <path d="M104 72 Q116 78 118 90" stroke="#3F9182" strokeWidth="9" fill="none" strokeLinecap="round" />
      <ellipse cx="51" cy="113" rx="11" ry="6.5" fill="#3F9182" />
      <ellipse cx="80" cy="113" rx="11" ry="6.5" fill="#3F9182" />
      <g fill="#57B49E">
        <circle cx="47" cy="42" r="24" />
        <circle cx="83" cy="42" r="24" />
        <circle cx="31" cy="66" r="18" />
        <circle cx="99" cy="66" r="18" />
        <circle cx="45" cy="86" r="18" />
        <circle cx="85" cy="86" r="18" />
        <circle cx="65" cy="88" r="19" />
        <circle cx="65" cy="62" r="32" />
      </g>
      <path d="M65 22 C62 34 68 44 64 56" stroke="#3F9182" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.85" />
      <circle cx="39" cy="74" r="4.6" fill="#8F8276" opacity="0.6" />
      <circle cx="91" cy="74" r="4.6" fill="#8F8276" opacity="0.6" />
      <path d="M43 59 Q53 48 63 59" stroke="#173F38" strokeWidth="3.4" fill="none" strokeLinecap="round" />
      <path d="M67 59 Q77 48 87 59" stroke="#173F38" strokeWidth="3.4" fill="none" strokeLinecap="round" />
      <path d="M54 77 Q65 82 76 77 Q73 92 65 92 Q57 92 54 77 Z" fill="#173F38" />
      <path d="M60 87 Q65 91 70 87 Z" fill="#F2774E" />
    </svg>
  )
}

/** Buddy — idle (hero float: cheeks + eye highlights). */
export function BuddyIdle({ size = 130, style }: MascotProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 130 130" style={style} aria-hidden="true">
      <path d="M44 88 L36 106 L62 90 Z" fill="#F2774E" />
      <rect x="18" y="16" width="94" height="72" rx="24" fill="#F2774E" />
      <circle cx="48" cy="66" r="4" fill="#fff" opacity="0.35" />
      <circle cx="82" cy="66" r="4" fill="#fff" opacity="0.35" />
      <path d="M49 58 a9 10 0 0 1 18 0 a9 10 0 0 1 -18 0 Z" fill="#fff" opacity="0.85" />
      <path d="M63 58 a9 10 0 0 1 18 0 a9 10 0 0 1 -18 0 Z" fill="#fff" opacity="0.85" />
      <circle cx="59.5" cy="59.5" r="4.6" fill="#7A2E15" />
      <circle cx="73.5" cy="59.5" r="4.6" fill="#7A2E15" />
      <circle cx="56.4" cy="55.6" r="1.8" fill="#fff" />
      <circle cx="70.4" cy="55.6" r="1.8" fill="#fff" />
      <path d="M57 66 Q65 73 73 66" stroke="#7A2E15" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  )
}

/** Buddy — chat avatar (clinical-case phone). */
export function BuddyChat({ size = 130, style }: MascotProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 130 130" style={style} aria-hidden="true">
      <path d="M44 88 L36 106 L62 90 Z" fill="#F2774E" />
      <rect x="18" y="16" width="94" height="72" rx="24" fill="#F2774E" />
      <path d="M49 58 a9 10 0 0 1 18 0 a9 10 0 0 1 -18 0 Z" fill="#fff" opacity="0.85" />
      <path d="M63 58 a9 10 0 0 1 18 0 a9 10 0 0 1 -18 0 Z" fill="#fff" opacity="0.85" />
      <circle cx="59.5" cy="59.5" r="4.6" fill="#7A2E15" />
      <circle cx="73.5" cy="59.5" r="4.6" fill="#7A2E15" />
      <path d="M57 66 Q65 73 73 66" stroke="#7A2E15" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  )
}

/** Buddy — happy (CTA trio). */
export function BuddyHappy({ size = 130, style }: MascotProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 130 130" style={style} aria-hidden="true">
      <path d="M44 88 L36 106 L62 90 Z" fill="#F2774E" />
      <rect x="18" y="16" width="94" height="72" rx="24" fill="#F2774E" />
      <path d="M50 57 Q58 65 66 57" stroke="#7A2E15" strokeWidth="3.4" fill="none" strokeLinecap="round" />
      <path d="M64 57 Q72 65 80 57" stroke="#7A2E15" strokeWidth="3.4" fill="none" strokeLinecap="round" />
      <path d="M56 64 Q65 67 74 64 Q71 78 65 78 Q59 78 56 64 Z" fill="#7A2E15" />
      <path d="M61 73 Q65 77 69 73 Z" fill="#F2774E" />
    </svg>
  )
}
