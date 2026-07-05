export type ShadowStyle = {
  shadowColor: string
  shadowOffset: { width: number; height: number }
  shadowOpacity: number
  shadowRadius: number
  elevation: number
}

export type ThemeColors = {
  bg: string; surface: string; surface2: string; surface3: string
  border: string; borderStrong: string
  text: string; textSoft: string; textFaint: string
  teal: string; tealDeep: string; tealTint: string; tealTint2: string; onTeal: string
  green: string; greenTint: string
  red: string; redTint: string
  amber: string; amberTint: string
  coral: string; coralDeep: string; coralTint: string
  gold: string
  /** Semantic layer (audit #15) — meaning, not hue. Use these for verdicts,
   *  warnings, and errors; keep green/amber/red/coral for mode accents so a
   *  future accent re-skin can't silently change what "wrong" looks like. */
  success: string; successTint: string
  warning: string; warningTint: string
  danger: string; dangerTint: string
  info: string; infoTint: string
  shadow: ShadowStyle
  shadowLg: ShadowStyle
}

const lightBase = {
    bg: '#EEF2F1',
    surface: '#FFFFFF',
    surface2: '#F1F5F4',
    surface3: '#E8EEEC',
    border: '#E2E9E6',
    borderStrong: '#D3DDD9',
    text: '#16221F',
    textSoft: '#56655F',
    textFaint: '#5E706A',   // AA: 4.65:1 on bg, 5.25:1 on white surfaces
    teal: '#0E9E8E',
    tealDeep: '#0A6E62',
    tealTint: '#E1F3EF',
    tealTint2: '#D2ECE7',
    onTeal: '#FFFFFF',
    coral: '#F2774E',
    coralDeep: '#C9542F',
    coralTint: '#FCE9E0',
    green: '#1F9E63',
    greenTint: '#E0F3E9',
    amber: '#DC8B33',
    amberTint: '#FAEEDB',
    red: '#DE5249',
    redTint: '#FAE5E3',
    gold: '#DBA431',
    shadow: {
      shadowColor: '#102824',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.10,
      shadowRadius: 16,
      elevation: 3,
    },
    shadowLg: {
      shadowColor: '#102824',
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.16,
      shadowRadius: 32,
      elevation: 8,
    },
}

const darkBase = {
    bg: '#0C1211',
    surface: '#141D1B',
    surface2: '#1A2422',
    surface3: '#22302C',
    border: '#26332F',
    borderStrong: '#33433E',
    text: '#E9F0EE',
    textSoft: '#9DB0AB',
    textFaint: '#7E938D',   // AA: 5.8:1 on bg, 5.3:1 on dark surfaces
    teal: '#24BBA8',
    tealDeep: '#0F8A79',
    tealTint: '#0F2E29',
    tealTint2: '#143A33',
    onTeal: '#04130F',
    coral: '#F58A62',
    coralDeep: '#F58A62',
    coralTint: '#36241C',
    green: '#34BE7C',
    greenTint: '#102C1D',
    amber: '#E6A551',
    amberTint: '#2F2412',
    red: '#EE6A62',
    redTint: '#341D1B',
    gold: '#E6B650',
    shadow: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.5,
      shadowRadius: 18,
      elevation: 6,
    },
    shadowLg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.7,
      shadowRadius: 34,
      elevation: 12,
  },
}

// Semantic aliases point at the same values today; they exist so intent and
// accent can diverge later without a hunt through every screen.
export const Colors = {
  light: {
    ...lightBase,
    success: lightBase.green, successTint: lightBase.greenTint,
    warning: lightBase.amber, warningTint: lightBase.amberTint,
    danger: lightBase.red, dangerTint: lightBase.redTint,
    info: lightBase.teal, infoTint: lightBase.tealTint,
  },
  dark: {
    ...darkBase,
    success: darkBase.green, successTint: darkBase.greenTint,
    warning: darkBase.amber, warningTint: darkBase.amberTint,
    danger: darkBase.red, dangerTint: darkBase.redTint,
    info: darkBase.teal, infoTint: darkBase.tealTint,
  },
} as const
