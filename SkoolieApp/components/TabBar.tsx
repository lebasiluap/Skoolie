import { View, TouchableOpacity, Text, StyleSheet } from 'react-native'
import { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path, Circle, Rect } from 'react-native-svg'
import { useTheme } from '@/hooks/useTheme'

// ── SVG icons — exact paths from skoolie.vercel.app BottomNav ────────────────

function DashIcon({ color }: { color: string }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 10.5 12 3l9 7.5"/>
      <Path d="M5 9.7V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.7"/>
      <Path d="M9.5 21v-6h5v6"/>
    </Svg>
  )
}

function PracticeIcon({ color }: { color: string }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="5" y="4" width="14" height="17" rx="2.5"/>
      <Path d="M9 4.5V3.6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v.9"/>
      <Path d="M9 13.2l2 2 4-4.5"/>
    </Svg>
  )
}

function SearchIcon({ color }: { color: string }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={11} cy={11} r={8}/>
      <Path d="M21 21l-4.35-4.35"/>
    </Svg>
  )
}

function BookmarkIcon({ color }: { color: string }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6.5 3.5h11a1 1 0 0 1 1 1V21l-6.5-4-6.5 4V4.5a1 1 0 0 1 1-1z"/>
    </Svg>
  )
}

function ProgressIcon({ color }: { color: string }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 20.5V12"/>
      <Path d="M12 20.5V4"/>
      <Path d="M19 20.5v-6"/>
    </Svg>
  )
}

function ProfileIcon({ color }: { color: string }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={8} r={4}/>
      <Path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>
    </Svg>
  )
}

const ICONS: Record<string, (color: string) => React.ReactNode> = {
  dashboard: (c) => <DashIcon color={c} />,
  practice:  (c) => <PracticeIcon color={c} />,
  search:    (c) => <SearchIcon color={c} />,
  bookmarks: (c) => <BookmarkIcon color={c} />,
  progress:  (c) => <ProgressIcon color={c} />,
  profile:   (c) => <ProfileIcon color={c} />,
}

// ─────────────────────────────────────────────────────────────────────────────

const VISIBLE = ['dashboard', 'practice', 'bookmarks', 'progress', 'profile']

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const C = useTheme()
  const insets = useSafeAreaInsets()

  // Hidden sub-screens still belong to a tab — keep that tab highlighted.
  const REPRESENT: Record<string, string> = { search: 'practice' }
  const focusedName = state.routes[state.index]?.name
  const activeName = REPRESENT[focusedName] ?? focusedName

  return (
    <View style={[
      s.bar,
      {
        backgroundColor: C.surface,
        borderTopColor: C.border,
        paddingBottom: insets.bottom + 6,
        ...C.shadowLg,
      }
    ]}>
      {state.routes.map((route, index) => {
        if (!VISIBLE.includes(route.name)) return null

        const { options } = descriptors[route.key]
        const label = options.tabBarLabel as string ?? options.title ?? route.name
        const isFocused = route.name === activeName
        const iconColor = isFocused ? C.teal : C.textFaint

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })
          if (!event.defaultPrevented) {
            // Practice + Progress own sub-stacks: second tap resets to their root,
            // switching to them preserves whatever sub-screen was open (MCQ, Analytics…).
            if (route.name === 'practice' || route.name === 'progress') {
              if (isFocused) {
                router.navigate(`/(app)/${route.name}` as any)
              } else {
                navigation.navigate(route.name)
              }
            } else if (!isFocused) {
              navigation.navigate(route.name)
            }
          }
        }

        return (
          <TouchableOpacity key={route.key} onPress={onPress} style={s.tab} activeOpacity={0.7}>
            <View style={s.iconWrap}>
              {ICONS[route.name]?.(iconColor)}
            </View>
            <Text
              style={[
                s.label,
                { color: iconColor },
                isFocused && { fontFamily: 'Nunito_800ExtraBold' },
              ]}
              numberOfLines={1}
              // Five labels share the bar — at the global 1.4x cap "Bookmarks"
              // overflows its cell on small phones, so tab labels cap lower.
              maxFontSizeMultiplier={1.1}
            >
              {label}
            </Text>
            {isFocused && <View style={[s.dot, { backgroundColor: C.teal }]} />}
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 8,
    paddingHorizontal: 12,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  iconWrap: {
    width: 36,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 13,
    fontFamily: 'Nunito_700Bold',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
})
