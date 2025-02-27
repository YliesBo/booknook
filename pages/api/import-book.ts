// pages/api/import-book.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase/supabaseClient';
import { getBookDetails } from '../../lib/api/googleBooksApi';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Seulement accepter les requêtes POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { googleBookId } = req.body;
  
  if (!googleBookId) {
    return res.status(400).json({ error: 'Google Book ID is required' });
  }

  try {
    // Vérifier si le livre existe déjà dans la base de données
    const { data: existingBook, error: existingError } = await supabase
      .from('books')
      .select('book_id')
      .eq('google_book_id', googleBookId)
      .single();

    if (existingError && existingError.code !== 'PGRST116') {
      throw existingError;
    }

    if (existingBook) {
      return res.status(200).json({ 
        book_id: existingBook.book_id, 
        message: 'Book already exists in the database' 
      });
    }

    // Récupérer les détails du livre depuis Google Books API
    const bookDetails = await getBookDetails(googleBookId);
    
    if (!bookDetails) {
      return res.status(404).json({ error: 'Book not found in Google Books API' });
    }

    // Ajouter le livre à la base de données
    const { data: newBook, error: bookError } = await supabase
      .from('books')
      .insert({
        title: bookDetails.volumeInfo.title || 'Titre inconnu',
        google_book_id: googleBookId,
        synopsis: bookDetails.volumeInfo.description || null,
        published_date: bookDetails.volumeInfo.publishedDate || null,
        page_count: bookDetails.volumeInfo.pageCount || null,
        thumbnail: bookDetails.volumeInfo.imageLinks?.thumbnail || null
      })
      .select()
      .single();

    if (bookError) {
      throw bookError;
    }

    // Traitement des auteurs avec gestion d'erreur optimisée
if (bookDetails.volumeInfo.authors && bookDetails.volumeInfo.authors.length > 0) {
  for (const authorName of bookDetails.volumeInfo.authors) {
    try {
      // Vérifier si l'auteur existe déjà
      let { data: existingAuthor, error: existingAuthorError } = await supabase
        .from('authors')
        .select('author_id')
        .ilike('author_name', authorName)
        .single();

      if (existingAuthorError && existingAuthorError.code !== 'PGRST116') { // PGRST116 = not found
        console.warn('Erreur lors de la recherche de l\'auteur:', existingAuthorError);
      }

      let authorId;
      
      if (existingAuthor) {
        authorId = existingAuthor.author_id;
      } else {
        // Créer un nouvel auteur
        const { data: newAuthor, error: authorError } = await supabase
          .from('authors')
          .insert({ author_name: authorName })
          .select()
          .single();

        if (authorError) {
          console.error('Erreur lors de la création de l\'auteur:', authorError);
          // On continue sans associer cet auteur
          continue;
        }
        authorId = newAuthor.author_id;
      }

      // Associer l'auteur au livre
      const { error: linkError } = await supabase
        .from('book_authors')
        .insert({
          book_id: newBook.book_id,
          author_id: authorId
        });

      if (linkError) {
        console.error('Erreur lors de l\'association de l\'auteur au livre:', linkError);
      }
    } catch (error) {
      console.error('Erreur lors du traitement de l\'auteur', authorName, ':', error);
    }
  }
}

    // Traitement des genres/catégories avec gestion d'erreur optimisée
    if (bookDetails.volumeInfo.categories && bookDetails.volumeInfo.categories.length > 0) {
      for (const categoryName of bookDetails.volumeInfo.categories) {
        try {
          // Vérifier si le genre existe déjà
          let { data: existingGenre, error: genreError } = await supabase
            .from('genres')
            .select('genre_id')
            .ilike('genre_name', categoryName)
            .single();

          if (genreError && genreError.code !== 'PGRST116') {
            throw genreError;
          }

          let genreId;
          
          if (existingGenre) {
            genreId = existingGenre.genre_id;
          } else {
            // Créer un nouveau genre
            const { data: newGenre, error: createGenreError } = await supabase
              .from('genres')
              .insert({ genre_name: categoryName })
              .select()
              .single();

            if (createGenreError) {
              throw createGenreError;
            }
            
            genreId = newGenre.genre_id;
          }

          // Associer le genre au livre
          const { error: linkGenreError } = await supabase
            .from('books_genres')
            .insert({
              book_id: newBook.book_id,
              genre_id: genreId
            });

          if (linkGenreError) {
            throw linkGenreError;
          }
        } catch (genreError) {
          console.error(`Erreur lors du traitement du genre ${categoryName}:`, genreError);
          // Continuer avec les autres genres même si une erreur se produit
        }
      }
    }

    return res.status(201).json({ 
      book_id: newBook.book_id, 
      message: 'Book successfully imported' 
    });
  } catch (error) {
    console.error('Import error:', error);
    return res.status(500).json({ 
      error: 'An error occurred while importing the book',
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}