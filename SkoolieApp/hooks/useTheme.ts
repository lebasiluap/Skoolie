import { Colors, ThemeColors } from '@/constants/Colors'
import { useThemeMode } from '@/contexts/ThemeContext'

export function useTheme(): ThemeColors {
  const { isDark } = useThemeMode()
  return (isDark ? Colors.dark : Colors.light) as ThemeColors
}
