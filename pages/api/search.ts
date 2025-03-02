// pages/api/search.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase/supabaseClient';
import { searchGoogleBooks, GoogleBookItem } from '../../lib/api/googleBooksApi';

type SearchResult = {
  source: 'database' | 'google_books';
  id: string;
  title: string;
  authors: string[];
  thumbnail: string | null;
  publishedDate?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Seulement accepter les requêtes GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { q: query } = req.query;
  
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Query parameter is required' });
  }

  try {
    // Recherche dans la base de données
    const { data: dbBooks, error } = await supabase
      .from('books')
      .select(`
        book_id,
        title,
        thumbnail,
        published_date
      `)
      .ilike('title', `%${query}%`)
      .limit(10);

    if (error) throw error;

    // Pour chaque livre de la base de données, récupérer ses auteurs
    const dbResults: SearchResult[] = [];
    for (const book of dbBooks || []) {
      const { data: authorsData } = await supabase
        .from('book_authors')
        .select('author_id')
        .eq('book_id', book.book_id);

      const authorNames: string[] = [];
      for (const authorEntry of authorsData || []) {
        const { data: authorData } = await supabase
          .from('authors')
          .select('author_name')
          .eq('author_id', authorEntry.author_id)
          .single();

        if (authorData?.author_name) {
          authorNames.push(authorData.author_name);
        }
      }

      dbResults.push({
        source: 'database',
        id: book.book_id,
        title: book.title,
        authors: authorNames,
        thumbnail: book.thumbnail,
        publishedDate: book.published_date
      });
    }

    // Recherche via Google Books API
    const googleBooks = await searchGoogleBooks(query);
    
    // Transformer les résultats de Google Books au même format
    const googleResults: SearchResult[] = googleBooks.map(book => ({
      source: 'google_books',
      id: book.id,
      title: book.volumeInfo.title,
      authors: book.volumeInfo.authors || [],
      thumbnail: book.volumeInfo.imageLinks?.thumbnail || null,
      publishedDate: book.volumeInfo.publishedDate
    }));

    // Combiner les résultats
    const results = [...dbResults, ...googleResults];

    return res.status(200).json({ results });
  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({ error: 'An error occurred while searching' });
  }
}