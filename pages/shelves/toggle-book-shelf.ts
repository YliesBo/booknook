// pages/api/shelves/toggle-book-shelf.ts
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

  const { bookId, shelfId, action } = req.body;
  
  if (!bookId || !shelfId || !action) {
    return res.status(400).json({ error: 'Données incomplètes' });
  }

  if (action !== 'add' && action !== 'remove') {
    return res.status(400).json({ error: 'Action non valide' });
  }

  try {
    // Récupérer la session utilisateur
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return res.status(401).json({ error: 'Non autorisé - utilisateur non connecté' });
    }
    
    if (action === 'add') {
      // Ajouter le livre à l'étagère
      const { error } = await supabase
        .from('bookshelves')
        .insert({
          user_id: session.user.id,
          book_id: bookId,
          shelf_id: shelfId,
          date_added: new Date().toISOString()
        });

      if (error) {
        console.error('Erreur lors de l\'ajout du livre à l\'étagère :', error);
        return res.status(500).json({ error: 'Erreur lors de l\'ajout du livre à l\'étagère' });
      }
    } else {
      // Retirer le livre de l'étagère
      const { error } = await supabase
        .from('bookshelves')
        .delete()
        .eq('user_id', session.user.id)
        .eq('book_id', bookId)
        .eq('shelf_id', shelfId);

      if (error) {
        console.error('Erreur lors du retrait du livre de l\'étagère :', error);
        return res.status(500).json({ error: 'Erreur lors du retrait du livre de l\'étagère' });
      }
    }
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Erreur non gérée :', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}