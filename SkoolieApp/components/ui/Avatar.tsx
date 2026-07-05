import { View, Text, Image, StyleSheet } from 'react-native'
import { useTheme } from '@/hooks/useTheme'

interface AvatarProps {
  name: string
  avatarUrl?: string | null
  size?: number
}

export function Avatar({ name, avatarUrl, size = 48 }: AvatarProps) {
  const C = useTheme()
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const fontSize = size * 0.38

  if (avatarUrl) {
    return <Image source={{ uri: avatarUrl }} style={{ width: size, height: size, borderRadius: size / 2 }} />
  }

  return (
    <View style={[s.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: C.teal }]}>
      <Text style={[s.initials, { fontSize, color: C.onTeal }]}>{initials}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
  initials: { fontFamily: 'Nunito_800ExtraBold', lineHeight: undefined },
})
