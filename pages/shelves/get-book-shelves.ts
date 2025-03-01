// pages/api/shelves/get-book-shelves.ts
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

  const { bookId } = req.query;
  
  if (!bookId || typeof bookId !== 'string') {
    return res.status(400).json({ error: 'ID du livre requis' });
  }

  try {
    // Récupérer la session utilisateur
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return res.status(401).json({ error: 'Non autorisé - utilisateur non connecté' });
    }
    
    // Récupérer les étagères du livre pour cet utilisateur
    const { data, error } = await supabase
      .from('bookshelves')
      .select('shelf_id')
      .eq('user_id', session.user.id)
      .eq('book_id', bookId);

    if (error) {
      console.error('Erreur lors de la récupération des étagères du livre :', error);
      return res.status(500).json({ error: 'Erreur lors de la récupération des étagères du livre' });
    }
    
    // Extraire les IDs des étagères
    const shelfIds = data.map(item => item.shelf_id);
    
    return res.status(200).json({ shelfIds });
  } catch (error) {
    console.error('Erreur non gérée :', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}