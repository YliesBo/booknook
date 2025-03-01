// pages/api/update-book-covers.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase/supabaseClient';
import { getBestCoverImage } from '../../lib/api/openLibraryApi';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Vérifier si la méthode est POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Récupérer la session utilisateur
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return res.status(401).json({ error: 'Non autorisé - utilisateur non connecté' });
    }
    
    // Vérifier si l'utilisateur est administrateur (vous devrez adapter cette partie selon votre modèle de données)
    const { data: userData } = await supabase
      .from('users')
      .select('is_admin')
      .eq('user_id', session.user.id)
      .single();
      
    if (!userData?.is_admin) {
      return res.status(403).json({ error: 'Accès refusé - seuls les administrateurs peuvent exécuter cette action' });
    }
    
    // Récupérer les livres sans couverture ou avec une couverture à améliorer
    const { bookId } = req.body;
    
    let booksQuery = supabase
      .from('books')
      .select('book_id, google_book_id, thumbnail, isbn_10, isbn_13');
      
    if (bookId) {
      booksQuery = booksQuery.eq('book_id', bookId);
    } else {
      // Si aucun ID spécifique n'est fourni, limiter pour éviter de surcharger l'API
      booksQuery = booksQuery.limit(10);
    }
    
    const { data: books, error } = await booksQuery;
    
    if (error) {
      return res.status(500).json({ error: `Erreur lors de la récupération des livres: ${error.message}` });
    }
    
    if (!books || books.length === 0) {
      return res.status(404).json({ message: 'Aucun livre à mettre à jour' });
    }
    
    // Mettre à jour les couvertures
    const results = [];
    for (const book of books) {
      const bestCover = await getBestCoverImage(
        book.thumbnail,
        book.isbn_10,
        book.isbn_13
      );
      
      if (bestCover && bestCover !== book.thumbnail) {
        // Mettre à jour la couverture
        const { data, error: updateError } = await supabase
          .from('books')
          .update({ thumbnail: bestCover })
          .eq('book_id', book.book_id)
          .select('book_id, title');
          
        if (updateError) {
          results.push({ 
            book_id: book.book_id, 
            status: 'error', 
            message: updateError.message 
          });
        } else {
          results.push({ 
            book_id: book.book_id, 
            status: 'updated', 
            title: data?.[0]?.title 
          });
        }
      } else {
        results.push({ 
          book_id: book.book_id, 
          status: 'skipped', 
          message: 'No better cover found' 
        });
      }
    }
    
    return res.status(200).json({ 
      message: `Mise à jour des couvertures terminée pour ${results.filter(r => r.status === 'updated').length} livres`,
      results 
    });
  } catch (error: any) {
    console.error('Erreur non gérée :', error);
    return res.status(500).json({ 
      error: 'Erreur serveur', 
      details: error.message || 'Unknown error' 
    });
  }
}