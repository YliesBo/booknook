// lib/supabase/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Options du client Supabase
const options = {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // Vérifier que le stockage est disponible avant de l'utiliser
    storage: typeof window !== 'undefined' ? window.localStorage : undefined
  },
  global: {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  }
};

// Créer le client Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, options);

// Réduire la verbosité des logs en production
if (process.env.NODE_ENV === 'production') {
  console.debug = () => {};
}