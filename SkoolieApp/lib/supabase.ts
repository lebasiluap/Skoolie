import { createClient } from '@supabase/supabase-js'
import { AppState } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

const SUPABASE_URL = 'https://bqhiwlpmrejvjdljxspy.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxaGl3bHBtcmVqdmpkbGp4c3B5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzODEzMjIsImV4cCI6MjA5Njk1NzMyMn0.DvuXJ3yGAvGqBA9ZzZLuZktKkTPFpBYrTgOMhlEUBuA'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// Supabase's recommended RN pattern: run the token-refresh timer only while
// the app is foregrounded. Sessions still persist across restarts either way
// (an expired access token is refreshed on next launch); this just prevents a
// momentarily-stale token right after a long background stint.
AppState.addEventListener('change', state => {
  if (state === 'active') supabase.auth.startAutoRefresh()
  else supabase.auth.stopAutoRefresh()
})
