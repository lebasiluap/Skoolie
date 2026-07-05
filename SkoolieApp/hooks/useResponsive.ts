/**
 * useResponsive — single source of truth for screen-size adaptation.
 *
 * Use this instead of Dimensions.get('window') (which is frozen at module load
 * and breaks on rotation / split-screen / tablets). Conventions:
 *
 *   const { isSmall, isTablet, contentWidth, rem } = useResponsive()
 *
 * - isSmall      → width < 360 (iPhone SE class): shrink hero numerals, tighten gaps
 * - isTablet     → width ≥ 768: content should be capped, not stretched
 * - contentWidth → min(width, MAX_CONTENT) — use with `maxWidth` + alignSelf 'center'
 * - rem(n)       → n scaled by screen width (clamped ±15%) for display-type sizes
 *
 * For scrolling pages, wrap content with `{ width: '100%', maxWidth: MAX_CONTENT,
 * alignSelf: 'center' }` so tablets get a centered column instead of stretched cards.
 */
import { useWindowDimensions } from 'react-native'

export const MAX_CONTENT = 720

export function useResponsive() {
  const { width, height } = useWindowDimensions()
  const isSmall = width < 360
  const isTablet = width >= 768
  const contentWidth = Math.min(width, MAX_CONTENT)
  const rem = (n: number) => Math.round(n * Math.min(Math.max(width / 390, 0.85), 1.15))
  return { width, height, isSmall, isTablet, contentWidth, rem }
}
