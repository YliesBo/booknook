// pages/api/shelves/get-user-shelves.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase/supabaseClient';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Vérifier si la méthode est GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Récupérer la session utilisateur 
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return res.status(401).json({ error: 'Non autorisé - utilisateur non connecté' });
    }
    
    // Récupérer les étagères de l'utilisateur
    const { data, error } = await supabase
      .from('shelves')
      .select('shelf_id, shelf_name, is_system')
      .eq('user_id', session.user.id)
      .order('shelf_name');

    if (error) {
      console.error('Erreur lors de la récupération des étagères :', error);
      return res.status(500).json({ error: 'Erreur lors de la récupération des étagères' });
    }
    
    return res.status(200).json({ shelves: data || [] });
  } catch (error) {
    console.error('Erreur non gérée :', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}