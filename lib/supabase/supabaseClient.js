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
    // Use secure cookies if in production
    cookieOptions: {
      name: 'supabase-auth-token',
      lifetime: 60 * 60 * 24 * 7, // 7 days
      domain: process.env.NODE_ENV === 'production' ? 'your-domain.com' : 'localhost',
      sameSite: 'lax', // Important for authentication across subdomains
      secure: process.env.NODE_ENV === 'production'
    }
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