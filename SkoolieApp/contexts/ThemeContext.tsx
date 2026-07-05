import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import { useColorScheme, Animated, StyleSheet, View, Easing } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import { Colors } from '@/constants/Colors'

export type ThemeMode = 'system' | 'light' | 'dark'
const THEME_KEY = 'skoolie_theme_mode'

interface ThemeContextType {
  isDark: boolean
  themeMode: ThemeMode
  setThemeMode: (mode: ThemeMode) => Promise<void>
  toggleDark: () => Promise<void>   // kept for TopBar quick-toggle
}

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  themeMode: 'system',
  setThemeMode: async () => {},
  toggleDark: async () => {},
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme()
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system')

  useEffect(() => {
    SecureStore.getItemAsync(THEME_KEY).then(val => {
      if (val === 'light' || val === 'dark' || val === 'system') {
        setThemeModeState(val)
      } else if (val === 'true') {
        setThemeModeState('dark')    // migrate old boolean format
      } else if (val === 'false') {
        setThemeModeState('light')
      }
      // else no stored pref → stays 'system'
    }).catch(() => {})
  }, [])

  const isDark = themeMode === 'dark' || (themeMode === 'system' && systemScheme === 'dark')

  // Smooth cross-dissolve when the theme flips. The overlay (the background we're LEAVING)
  // is put up in the SAME commit as the theme flip, so it covers from frame one and only ever
  // dissolves outward — no flash of the new theme, then a flash of the overlay.
  const prevIsDark = useRef<boolean | null>(null)
  const overlayOpacity = useRef(new Animated.Value(0)).current
  const [overlayColor, setOverlayColor] = useState<string | null>(null)

  function beginDissolve(leavingDark: boolean) {
    setOverlayColor(leavingDark ? Colors.dark.bg : Colors.light.bg)
    overlayOpacity.setValue(1)
    Animated.timing(overlayOpacity, {
      toValue: 0,
      duration: 520,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start(() => setOverlayColor(null))
  }

  // System-driven flips (mode='system' and the OS toggles) — no user handler fires, so animate here.
  useEffect(() => {
    if (prevIsDark.current === null) { prevIsDark.current = isDark; return } // no animation on first mount
    if (prevIsDark.current === isDark) return
    beginDissolve(prevIsDark.current)
    prevIsDark.current = isDark
  }, [isDark]) // eslint-disable-line react-hooks/exhaustive-deps

  async function applyMode(mode: ThemeMode) {
    const willDark = mode === 'dark' || (mode === 'system' && systemScheme === 'dark')
    if (willDark !== isDark) {
      beginDissolve(isDark)      // cover with the current (leaving) bg in the same commit
      prevIsDark.current = willDark  // pre-set so the effect above doesn't double-animate
    }
    setThemeModeState(mode)
    await SecureStore.setItemAsync(THEME_KEY, mode)
  }

  async function setThemeMode(mode: ThemeMode) { await applyMode(mode) }
  async function toggleDark() { await applyMode(isDark ? 'light' : 'dark') }

  return (
    <ThemeContext.Provider value={{ isDark, themeMode, setThemeMode, toggleDark }}>
      <View style={{ flex: 1 }}>
        {children}
        {overlayColor && (
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFillObject, { backgroundColor: overlayColor, opacity: overlayOpacity }]}
          />
        )}
      </View>
    </ThemeContext.Provider>
  )
}

export function useThemeMode() {
  return useContext(ThemeContext)
}
