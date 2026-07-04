import { createClient } from '@supabase/supabase-js';

// Utilise des placeholders quand Supabase n'est pas encore configuré.
// Les appels DB échoueront proprement (network error) plutôt que de crasher
// au chargement du module.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://localhost:54321';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const isSupabaseConfigured =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL !== 'http://localhost:54321';
