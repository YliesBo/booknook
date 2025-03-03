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

  // Récupérer les paramètres de recherche et de langue
  const { q: query, lang: preferredLanguage = 'fr' } = req.query;
  
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Query parameter is required' });
  }

  try {
    // Récupérer les langues pour le filtrage
    const { data: languages } = await supabase
      .from('languages')
      .select('language_id, language_code');
    
    // Créer un mapping des IDs de langue vers les codes de langue
    const languageMap = new Map();
    if (languages) {
      languages.forEach(lang => {
        languageMap.set(lang.language_id, lang.language_code);
      });
    }
    
    // Trouver l'ID de langue correspondant à la langue préférée pour la recherche Supabase
    let preferredLanguageId = null;
    if (languages) {
      for (const lang of languages) {
        if (lang.language_code === preferredLanguage) {
          preferredLanguageId = lang.language_id;
          break;
        }
      }
    }
    
    // Recherche adaptée dans la base de données pour prioriser la langue
    let dbBooksQuery = supabase
      .from('books')
      .select(`
        book_id,
        title,
        thumbnail,
        published_date,
        google_book_id,
        language_id
      `)
      .ilike('title', `%${query}%`)
      .limit(30); // Augmenter la limite pour plus de diversité
    
    // Si nous avons un ID pour la langue préférée, commencer par rechercher dans cette langue
    let dbBooksMatchingLanguage = [];
    if (preferredLanguageId) {
      const { data: langMatches } = await dbBooksQuery.eq('language_id', preferredLanguageId);
      
      if (langMatches && langMatches.length > 0) {
        dbBooksMatchingLanguage = langMatches;
      }
    }
    
    // Ensuite, rechercher les autres langues
    const { data: otherLangMatches, error } = await dbBooksQuery;
    
    if (error) throw error;
    
    // Filtrer pour éviter les doublons et combiner les résultats en priorisant la langue préférée
    const existingIds = new Set(dbBooksMatchingLanguage.map(book => book.book_id));
    
    const dbBooksOtherLangs = otherLangMatches?.filter(book => !existingIds.has(book.book_id)) || [];
    
    // Combiner avec priorité aux livres de la langue préférée
    const dbBooks = [...dbBooksMatchingLanguage, ...dbBooksOtherLangs];

    // Pour chaque livre de la base de données, récupérer ses auteurs
    const dbResults: SearchResult[] = [];
    const existingGoogleBookIds = new Set<string>(); // Ensemble pour suivre les IDs Google Books déjà dans la DB
    
    if (dbBooks && dbBooks.length > 0) {
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

        // Déterminer le code de langue du livre
        const languageCode = book.language_id ? languageMap.get(book.language_id) : null;

        const result: SearchResult = {
          source: 'database',
          id: book.book_id,
          title: book.title || 'Sans titre',
          authors: authorNames,
          thumbnail: book.thumbnail,
          publishedDate: book.published_date,
          languageCode
        };

        // Calculer le score de pertinence avec la préférence de langue
        result.relevanceScore = calculateRelevanceScore(result, query, preferredLanguage as string);
        
        dbResults.push(result);
        
        if (book.google_book_id) {
          existingGoogleBookIds.add(book.google_book_id);
        }
      }
    }

    // Recherche optimisée via Google Books API
    // D'abord chercher dans la langue préférée
    const googleBooksPreferredLang = await searchGoogleBooks(query, preferredLanguage as string);
    
    // Si pas assez de résultats, chercher aussi sans restriction de langue
    let googleBooksAllLang: GoogleBookItem[] = [];
    if (googleBooksPreferredLang.length < 5) {
      googleBooksAllLang = await searchGoogleBooks(query);
    }
    
    // Combiner les résultats, en évitant les doublons
    const seenGoogleIds = new Set();
    const allGoogleBooks: GoogleBookItem[] = [];
    
    // D'abord ajouter ceux de la langue préférée
    for (const book of googleBooksPreferredLang) {
      if (book.id && !seenGoogleIds.has(book.id) && !existingGoogleBookIds.has(book.id)) {
        seenGoogleIds.add(book.id);
        allGoogleBooks.push(book);
      }
    }
    
    // Ensuite ajouter les autres si nécessaire
    for (const book of googleBooksAllLang) {
      if (book.id && !seenGoogleIds.has(book.id) && !existingGoogleBookIds.has(book.id)) {
        seenGoogleIds.add(book.id);
        allGoogleBooks.push(book);
      }
    }
    
    // Transformer les résultats de Google Books
    const googleResults: SearchResult[] = [];
    
    if (allGoogleBooks.length > 0) {
      allGoogleBooks.forEach(book => {
        if (!book || !book.volumeInfo || !book.volumeInfo.title) {
          return; // Ignorer les livres sans titre
        }
        
        const result: SearchResult = {
          source: 'google_books',
          id: book.id || `google-book-${Date.now()}-${Math.random()}`,
          title: book.volumeInfo.title,
          authors: book.volumeInfo.authors || [],
          thumbnail: book.volumeInfo.imageLinks?.thumbnail || null,
          publishedDate: book.volumeInfo.publishedDate,
          languageCode: book.volumeInfo.language
        };

        // Calculer le score de pertinence avec la préférence de langue
        result.relevanceScore = calculateRelevanceScore(result, query, preferredLanguage as string);
        
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