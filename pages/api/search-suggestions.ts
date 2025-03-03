// pages/api/search-suggestions.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase/supabaseClient';

type Suggestion = {
  id: string;
  text: string;
  type: 'title' | 'author' | 'series' | 'google_book';
  source: 'database' | 'google_books';
  thumbnail?: string | null; // URL de la couverture
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
  
  if (!query || typeof query !== 'string' || query.length < 2) {
    return res.status(200).json({ suggestions: [] });
  }

  try {
    const suggestions: Suggestion[] = [];

    // Récupérer les suggestions de la base de données
    // 1. Recherche de titres de livres
    const { data: titleData } = await supabase
      .from('books')
      .select('book_id, title, thumbnail')
      .ilike('title', `%${query}%`)
      .limit(5); // Augmenté de 3 à 5

    if (titleData) {
      titleData.forEach(book => {
        suggestions.push({
          id: book.book_id,
          text: book.title,
          type: 'title',
          source: 'database',
          thumbnail: book.thumbnail
        });
      });
    }

    // 2. Recherche d'auteurs
    const { data: authorData } = await supabase
      .from('authors')
      .select('author_id, author_name')
      .ilike('author_name', `%${query}%`)
      .limit(3); // Augmenté de 2 à 3

    if (authorData) {
      authorData.forEach(author => {
        suggestions.push({
          id: author.author_id,
          text: author.author_name,
          type: 'author',
          source: 'database'
        });
      });
    }

    // 3. Recherche de séries
    const { data: seriesData } = await supabase
      .from('series')
      .select('series_id, series_name')
      .ilike('series_name', `%${query}%`)
      .limit(2);

    if (seriesData) {
      seriesData.forEach(series => {
        suggestions.push({
          id: series.series_id,
          text: series.series_name,
          type: 'series',
          source: 'database'
        });
      });
    }

    // Récupérer les suggestions de Google Books API
    try {
      const googleBooksUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=5`; // Augmenté de 3 à 5
      const response = await fetch(googleBooksUrl);
      const data = await response.json();
      
      if (data.items && Array.isArray(data.items)) {
        data.items.forEach(item => {
          if (item.volumeInfo && item.volumeInfo.title) {
            const thumbnail = item.volumeInfo.imageLinks?.thumbnail || null;
            
            suggestions.push({
              id: item.id,
              text: item.volumeInfo.title,
              type: 'google_book',
              source: 'google_books',
              thumbnail: thumbnail
            });
          }
        });
      }
    } catch (googleError) {
      console.error('Error fetching Google Books suggestions:', googleError);
      // Ne pas échouer si Google Books API échoue
    }

    // Trier les suggestions pour mélanger les sources
    const sortedSuggestions = suggestions.sort((a, b) => {
      // Priorité aux titres exacts
      if (a.text.toLowerCase() === query.toLowerCase()) return -1;
      if (b.text.toLowerCase() === query.toLowerCase()) return 1;
      
      // Priorité à la base de données
      if (a.source === 'database' && b.source === 'google_books') return -1;
      if (a.source === 'google_books' && b.source === 'database') return 1;
      
      // Sinon, trier par type
      return 0;
    });

    // Limiter le nombre total de suggestions à 10
    const limitedSuggestions = sortedSuggestions.slice(0, 10);

    return res.status(200).json({ suggestions: limitedSuggestions });
  } catch (error) {
    console.error('Suggestion search error:', error);
    return res.status(500).json({ error: 'An error occurred while fetching suggestions' });
  }
}