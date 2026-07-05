/**
 * TierBadge — specialty-rank chip shown beside names (leaderboard, dashboard,
 * public profiles). Tinted with the tier's accent so it reads in both themes.
 */
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { tierMeta } from '@/lib/tiers'

interface Props {
  tier: number
  size?: 'sm' | 'md'
  /** sm defaults to icon-only + name hidden on very tight rows; pass showName to force */
  showName?: boolean
}

export function TierBadge({ tier, size = 'sm', showName = true }: Props) {
  const m = tierMeta(tier)
  const sm = size === 'sm'
  return (
    <View style={[s.chip, { backgroundColor: m.color + '22', paddingVertical: sm ? 2 : 5, paddingHorizontal: sm ? 6 : 10 }]}>
      <Ionicons name={m.icon as any} size={sm ? 10 : 13} color={m.color} />
      {showName && (
        <Text style={[s.text, { color: m.color, fontSize: sm ? 10 : 12 }]} numberOfLines={1}>
          {m.name}
        </Text>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, flexShrink: 1 },
  text: { fontFamily: 'Nunito_800ExtraBold' },
})
