import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Add auth state listener that clears storage on token refresh failure
supabase.auth.onAuthStateChange((event, session) => {
  // Clear corrupted session on refresh failure
  if (event === 'TOKEN_REFRESHED' && !session) {
    console.warn('Token refresh failed, clearing corrupted session...')
    localStorage.removeItem('sb-fssjmqgolghfwmikydhy-auth-token')
    window.location.href = '/'
  }

  if (event === 'SIGNED_OUT') {
    console.log('User signed out, clearing auth token...')
    localStorage.removeItem('sb-fssjmqgolghfwmikydhy-auth-token')
  }
})