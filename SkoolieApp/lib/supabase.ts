import { createClient } from '@supabase/supabase-js'
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
