// lib/supabase/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Vérification de base pour les erreurs potentielles
if (!supabaseUrl || !supabaseAnonKey) {
  if (typeof window !== 'undefined') { // Vérifier si on est côté client
    console.error('⚠️ Variables d\'environnement Supabase manquantes. Vérifiez votre configuration.');
  }
}

// Options du client Supabase avec du débogage supplémentaire
const options = {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined
  },
  global: {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  },
  // Si nous sommes en développement, activer le débogage
  debug: process.env.NODE_ENV === 'development'
};

// Créer le client avec gestion des erreurs
export const supabase = createClient(supabaseUrl, supabaseAnonKey, options);

// Ajouter des listeners pour identifier les problèmes potentiels
if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth event:', event);
    if (event === 'SIGNED_OUT') {
      console.log('Utilisateur déconnecté');
    } else if (event === 'SIGNED_IN') {
      console.log('Utilisateur connecté');
    } else if (event === 'TOKEN_REFRESHED') {
      console.log('Token refreshed');
    }
  });
}