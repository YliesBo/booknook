// lib/users/userUtils.ts
import { supabase } from '../supabase/supabaseClient';

// Type pour un utilisateur
export type User = {
  user_id: string;
  username: string;
  bio: string | null;
  created_at: string;
  updated_at: string;
};

// Fonction pour récupérer le profil utilisateur
export async function getUserProfile() {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { data: null, error: new Error('Non connecté') };
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('user_id', authData.user.id)
    .single();
  
  return { data, error };
}

// Fonction pour mettre à jour le username de l'utilisateur connecté
export async function updateUsername(newUsername: string) {
    try {
      const { data, error } = await supabase
        .rpc('update_username', { new_username: newUsername });
      
      if (error) throw error;
      return { data, error: null };
    } catch (error: any) { // Note le type 'any' ici
      console.error('Erreur lors de la mise à jour du username:', error);
      return { data: null, error };
    }
  }

// Fonction pour mettre à jour la bio de l'utilisateur
export async function updateBio(bio: string) {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { data: null, error: new Error('Non connecté') };
  
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ bio, updated_at: new Date().toISOString() })
      .eq('user_id', authData.user.id)
      .select()
      .single();
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la bio:', error);
    return { data: null, error };
  }
}