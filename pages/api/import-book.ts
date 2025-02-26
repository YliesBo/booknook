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
    const { data: existingBook } = await supabase
      .from('books')
      .select('book_id')
      .eq('google_book_id', googleBookId)
      .single();

    if (existingBook) {
      return res.status(200).json({ 
        book_id: existingBook.book_id, 
        message: 'Book already exists in the database' 
      });
    }

    // Récupérer les détails du livre depuis Google Books API
    const bookDetails = await getBookDetails(googleBookId);
    
    if (!bookDetails) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Ajouter le livre à la base de données
    const { data: newBook, error: bookError } = await supabase
      .from('books')
      .insert({
        title: bookDetails.volumeInfo.title,
        google_book_id: googleBookId,
        synopsis: bookDetails.volumeInfo.description,
        published_date: bookDetails.volumeInfo.publishedDate,
        page_count: bookDetails.volumeInfo.pageCount,
        thumbnail: bookDetails.volumeInfo.imageLinks?.thumbnail
      })
      .select()
      .single();

    if (bookError) throw bookError;

    // Ajouter les auteurs
    if (bookDetails.volumeInfo.authors && bookDetails.volumeInfo.authors.length > 0) {
      for (const authorName of bookDetails.volumeInfo.authors) {
        // Vérifier si l'auteur existe déjà
        let { data: existingAuthor } = await supabase
          .from('authors')
          .select('author_id')
          .ilike('author_name', authorName)
          .single();

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

          if (authorError) throw authorError;
          authorId = newAuthor.author_id;
        }

        // Associer l'auteur au livre
        await supabase
          .from('book_authors')
          .insert({
            book_id: newBook.book_id,
            author_id: authorId
          });
      }
    }

    // Ajouter les genres/catégories
    if (bookDetails.volumeInfo.categories && bookDetails.volumeInfo.categories.length > 0) {
      for (const categoryName of bookDetails.volumeInfo.categories) {
        // Vérifier si le genre existe déjà
        let { data: existingGenre } = await supabase
          .from('genres')
          .select('genre_id')
          .ilike('genre_name', categoryName)
          .single();

        let genreId;
        
        if (existingGenre) {
          genreId = existingGenre.genre_id;
        } else {
          // Créer un nouveau genre
          const { data: newGenre, error: genreError } = await supabase
            .from('genres')
            .insert({ genre_name: categoryName })
            .select()
            .single();

          if (genreError) throw genreError;
          genreId = newGenre.genre_id;
        }

        // Associer le genre au livre
        await supabase
          .from('books_genres')
          .insert({
            book_id: newBook.book_id,
            genre_id: genreId
          });
      }
    }

    return res.status(201).json({ 
      book_id: newBook.book_id, 
      message: 'Book successfully imported' 
    });
  } catch (error) {
    console.error('Import error:', error);
    return res.status(500).json({ error: 'An error occurred while importing the book' });
  }
}