import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://fzbilsoldimahitgcolv.supabase.co'
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6Ymlsc29sZGltYWhpdGdjb2x2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQzNjA0NzksImV4cCI6MjEwOTkzNjQ3OX0.nKDrG1S2N7p0OcJWWIflTQwuGTrF0QCpTrinvMN4dog'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})
