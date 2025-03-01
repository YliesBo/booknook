// pages/api/fix-covers.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase/supabaseClient';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Seulement accepter les requêtes POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Paramètres
  const { limit = 10, startFrom = 0 } = req.body;

  try {
    // Récupérer les livres qui ont besoin d'une mise à jour de couverture
    const { data: books, error: fetchError } = await supabase
      .from('books')
      .select('book_id, title, thumbnail, isbn_10, isbn_13')
      .range(startFrom, startFrom + limit - 1);

    if (fetchError) {
      throw fetchError;
    }

    if (!books || books.length === 0) {
      return res.status(200).json({ message: 'No books to update', updated: 0 });
    }

    const results = [];
    let updateCount = 0;

    // Traiter chaque livre
    for (const book of books) {
      try {
        console.log(`Processing book: ${book.title} (${book.book_id})`);
        
        // Obtenir la meilleure couverture disponible
        const bestCover = await getBestCoverImage(
          book.thumbnail,
          book.isbn_10,
          book.isbn_13
        );

        // Si nous avons trouvé une meilleure couverture ou si la couverture actuelle est nulle
        if (bestCover && bestCover !== book.thumbnail) {
          // Mettre à jour la couverture dans la base de données
          const { error: updateError } = await supabase
            .from('books')
            .update({ thumbnail: bestCover })
            .eq('book_id', book.book_id);

          if (updateError) {
            results.push({
              book_id: book.book_id,
              title: book.title,
              status: 'error',
              message: updateError.message
            });
          } else {
            results.push({
              book_id: book.book_id,
              title: book.title,
              status: 'updated',
              old_cover: book.thumbnail,
              new_cover: bestCover
            });
            updateCount++;
          }
        } else {
          results.push({
            book_id: book.book_id,
            title: book.title,
            status: 'skipped',
            message: bestCover ? 'No better cover found' : 'No valid cover found'
          });
        }
      } catch (error) {
        console.error(`Error processing book ${book.book_id}:`, error);
        results.push({
          book_id: book.book_id,
          title: book.title,
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return res.status(200).json({
      message: `Updated ${updateCount} out of ${books.length} books`,
      updated: updateCount,
      total: books.length,
      results
    });

  } catch (error) {
    console.error('Error updating covers:', error);
    return res.status(500).json({
      error: 'Failed to update covers',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}