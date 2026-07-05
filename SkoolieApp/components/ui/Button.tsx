import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native'
import { useTheme } from '@/hooks/useTheme'

interface ButtonProps {
  label: string
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  loading?: boolean
  disabled?: boolean
  style?: ViewStyle
  fullWidth?: boolean
}

export function Button({ label, onPress, variant = 'primary', loading, disabled, style, fullWidth }: ButtonProps) {
  const C = useTheme()

  const styles = {
    primary:   { bg: C.teal,       text: C.onTeal,  border: C.teal       },
    secondary: { bg: C.surface3,   text: C.text,    border: C.border     },
    danger:    { bg: 'transparent', text: C.red,    border: C.red        },
    ghost:     { bg: 'transparent', text: C.teal,   border: 'transparent' },
  }[variant]

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        s.btn,
        { backgroundColor: styles.bg, borderColor: styles.border },
        fullWidth && { width: '100%' },
        (disabled || loading) && { opacity: 0.6 },
        style,
      ]}
      activeOpacity={0.75}
    >
      {loading
        ? <ActivityIndicator color={styles.text} size="small" />
        : <Text style={[s.label, { color: styles.text }]}>{label}</Text>
      }
    </TouchableOpacity>
  )
}

const s = StyleSheet.create({
  btn: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 15,
    fontFamily: 'Nunito_800ExtraBold',
    letterSpacing: 0.1,
  },
})
