// pages/api/search.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase/supabaseClient';
import { searchGoogleBooks, GoogleBookItem } from '../../lib/api/googleBooksApi';
import { 
  SearchResult, 
  calculateRelevanceScore 
} from '../../lib/search/searchUtils';

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
        published_date,
        google_book_id
      `)
      .ilike('title', `%${query}%`)
      .limit(10);

    if (error) throw error;

    // Pour chaque livre de la base de données, récupérer ses auteurs
    const dbResults: SearchResult[] = [];
    const existingGoogleBookIds = new Set<string>(); // Ensemble pour suivre les IDs Google Books déjà dans la DB
    
    if (dbBooks && Array.isArray(dbBooks)) {
      for (const book of dbBooks) {
        const { data: authorsData } = await supabase
          .from('book_authors')
          .select('author_id')
          .eq('book_id', book.book_id);

        const authorNames: string[] = [];
        if (authorsData && Array.isArray(authorsData)) {
          for (const authorEntry of authorsData) {
            const { data: authorData } = await supabase
              .from('authors')
              .select('author_name')
              .eq('author_id', authorEntry.author_id)
              .single();

            if (authorData?.author_name) {
              authorNames.push(authorData.author_name);
            }
          }
        }

        const result: SearchResult = {
          source: 'database',
          id: book.book_id,
          title: book.title || 'Sans titre', // Valeur par défaut si title est null
          authors: authorNames,
          thumbnail: book.thumbnail,
          publishedDate: book.published_date
        };

        // Calculer le score de pertinence
        result.relevanceScore = calculateRelevanceScore(result, query);
        dbResults.push(result);
        
        // Si le livre a un ID Google Books, l'ajouter à notre ensemble
        if (book.google_book_id) {
          existingGoogleBookIds.add(book.google_book_id);
        }
      }
    }

    // Recherche via Google Books API
    const googleBooks = await searchGoogleBooks(query);
    
    // Transformer les résultats de Google Books en filtrant ceux déjà dans la base de données
    const googleResults: SearchResult[] = [];
    
    if (googleBooks && Array.isArray(googleBooks)) {
      googleBooks
        .filter(book => !book.id || !existingGoogleBookIds.has(book.id))
        .forEach(book => {
          if (!book || !book.volumeInfo || !book.volumeInfo.title) {
            return; // Ignorer les livres sans titre
          }
          
          const result: SearchResult = {
            source: 'google_books',
            id: book.id || `google-book-${Date.now()}-${Math.random()}`,
            title: book.volumeInfo.title,
            authors: book.volumeInfo.authors || [],
            thumbnail: book.volumeInfo.imageLinks?.thumbnail || null,
            publishedDate: book.volumeInfo.publishedDate
          };

          // Calculer le score de pertinence
          result.relevanceScore = calculateRelevanceScore(result, query);
          googleResults.push(result);
        });
    }

    // Combiner et trier les résultats par score de pertinence
    const combinedResults = [...dbResults, ...googleResults];
    const results = combinedResults
      .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

    return res.status(200).json({ results });
  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({ error: 'An error occurred while searching' });
  }
}