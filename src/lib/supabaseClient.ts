import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    'Supabase не настроен: заполните VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY в файле .env (см. .env.example)'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
