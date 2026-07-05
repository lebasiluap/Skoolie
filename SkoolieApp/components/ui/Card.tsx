import { View, ViewStyle, StyleSheet } from 'react-native'
import { useTheme } from '@/hooks/useTheme'

interface CardProps {
  children: React.ReactNode
  style?: ViewStyle
  shadow?: boolean
}

export function Card({ children, style, shadow = true }: CardProps) {
  const C = useTheme()
  return (
    <View style={[
      s.card,
      { backgroundColor: C.surface, borderColor: C.border },
      shadow && C.shadow,
      style,
    ]}>
      {children}
    </View>
  )
}

const s = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
  },
})
