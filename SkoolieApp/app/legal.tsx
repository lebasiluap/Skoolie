/**
 * In-app legal viewer — /legal?doc=terms | /legal?doc=privacy
 *
 * Lives OUTSIDE the (auth)/(app) groups so it's reachable both from the signup
 * screen (logged out) and from settings (logged in). RootNavigator explicitly
 * leaves this route alone.
 */
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { MAX_CONTENT } from '@/hooks/useResponsive'
import { useTheme } from '@/hooks/useTheme'
import { TERMS, PRIVACY } from '@/lib/legal'

export default function LegalScreen() {
  const C = useTheme()
  const insets = useSafeAreaInsets()
  const { doc } = useLocalSearchParams<{ doc?: string }>()
  const d = doc === 'privacy' ? PRIVACY : TERMS

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={[s.header, { paddingTop: insets.top + 12, backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(auth)/login'))}
          style={[s.backBtn, { backgroundColor: C.surface2, borderColor: C.border }]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={20} color={C.textSoft} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: C.text }]} numberOfLines={1}>{d.title}</Text>
      </View>

      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40, width: '100%', maxWidth: MAX_CONTENT, alignSelf: 'center' }]} showsVerticalScrollIndicator={false}>
        <Text style={[s.updated, { color: C.textFaint }]}>Last updated: {d.updated}</Text>
        <Text style={[s.body, { color: C.textSoft }]}>{d.intro}</Text>
        {d.sections.map(sec => (
          <View key={sec.heading} style={{ marginTop: 22 }}>
            <Text style={[s.sectionHeading, { color: C.text }]}>{sec.heading}</Text>
            <Text style={[s.body, { color: C.textSoft }]}>{sec.body}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  backBtn: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: 'Nunito_800ExtraBold' },
  scroll: { paddingHorizontal: 22, paddingTop: 20 },
  updated: { fontSize: 12.5, fontFamily: 'Nunito_600SemiBold', marginBottom: 14 },
  sectionHeading: { fontSize: 15.5, fontFamily: 'Nunito_800ExtraBold', marginBottom: 6 },
  body: { fontSize: 14, fontFamily: 'Nunito_600SemiBold', lineHeight: 22 },
})
