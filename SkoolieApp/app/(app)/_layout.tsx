import { Tabs } from 'expo-router'
import { TabBar } from '@/components/TabBar'
import { FiltersProvider } from '@/contexts/FiltersContext'

export default function AppLayout() {
  return (
    <FiltersProvider>
    <Tabs
      tabBar={props => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="dashboard" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="practice"  options={{ title: 'Practice' }} />
      <Tabs.Screen name="bookmarks" options={{ title: 'Bookmarks' }} />
      <Tabs.Screen name="progress"  options={{ title: 'Progress' }} />
      <Tabs.Screen name="profile"   options={{ title: 'Profile' }} />
      {/* search & history are navigated to programmatically — hidden from tab bar
          (search lives behind the Practice hub row; history behind Time Capsule) */}
      <Tabs.Screen name="search" options={{ href: null }} />
      <Tabs.Screen name="history" options={{ href: null }} />
    </Tabs>
    </FiltersProvider>
  )
}
