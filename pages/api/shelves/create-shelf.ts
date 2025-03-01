// pages/api/shelves/create-shelf.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase/supabaseClient';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Vérifier si la méthode est POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { shelfName } = req.body;
  
  if (!shelfName || typeof shelfName !== 'string') {
    return res.status(400).json({ error: 'Nom d\'étagère requis' });
  }

  try {
    // Récupérer la session utilisateur
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return res.status(401).json({ error: 'Non autorisé - utilisateur non connecté' });
    }
    
    // Créer une nouvelle étagère
    const { data, error } = await supabase
      .from('shelves')
      .insert({
        user_id: session.user.id,
        shelf_name: shelfName,
        is_system: false,
        is_public: false,
        created_at: new Date().toISOString()
      })
      .select('shelf_id, shelf_name, is_system')
      .single();

    if (error) {
      console.error('Erreur lors de la création de l\'étagère :', error);
      return res.status(500).json({ error: 'Erreur lors de la création de l\'étagère' });
    }
    
    return res.status(201).json({ shelf: data });
  } catch (error) {
    console.error('Erreur non gérée :', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}