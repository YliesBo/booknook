// pages/api/search-suggestions.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase/supabaseClient';

type Suggestion = {
  id: string;
  text: string;
  type: 'title' | 'author' | 'series' | 'google_book';
  source: 'database' | 'google_books';
  thumbnail?: string | null; // URL de la couverture
  languageCode?: string; // Ajout du code de langue
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Seulement accepter les requêtes GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Récupérer la requête et la langue préférée
  const { q: query, lang: preferredLanguage = 'fr' } = req.query;
  
  if (!query || typeof query !== 'string' || query.length < 2) {
    return res.status(200).json({ suggestions: [] });
  }

  try {
    const suggestions: Suggestion[] = [];
    const existingGoogleBookIds = new Set<string>();
    const existingTitles = new Set<string>();

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
    
    // Trouver l'ID de langue correspondant à la langue préférée
    let preferredLanguageId = null;
    if (languages) {
      for (const lang of languages) {
        if (lang.language_code === preferredLanguage) {
          preferredLanguageId = lang.language_id;
          break;
        }
      }
    }

    // Récupérer d'abord les suggestions dans la langue préférée
    if (preferredLanguageId) {
      const { data: titleDataPreferredLang } = await supabase
        .from('books')
        .select('book_id, title, thumbnail, google_book_id, language_id')
        .ilike('title', `%${query}%`)
        .eq('language_id', preferredLanguageId)
        .limit(5);

      if (titleDataPreferredLang && titleDataPreferredLang.length > 0) {
        titleDataPreferredLang.forEach(book => {
          const languageCode = book.language_id ? languageMap.get(book.language_id) : null;
          
          suggestions.push({
            id: book.book_id,
            text: book.title,
            type: 'title',
            source: 'database',
            thumbnail: book.thumbnail,
            languageCode
          });
          
          existingTitles.add(book.title.toLowerCase());
          if (book.google_book_id) {
            existingGoogleBookIds.add(book.google_book_id);
          }
        });
      }
    }

    // Si nous avons moins de 5 suggestions, compléter avec des suggestions dans d'autres langues
    if (suggestions.length < 5) {
      const { data: titleDataOtherLangs } = await supabase
        .from('books')
        .select('book_id, title, thumbnail, google_book_id, language_id')
        .ilike('title', `%${query}%`)
        .not('language_id', 'eq', preferredLanguageId) // Exclure les livres déjà récupérés
        .limit(5 - suggestions.length);

      if (titleDataOtherLangs) {
        titleDataOtherLangs.forEach(book => {
          // Éviter les doublons de titres
          if (!existingTitles.has(book.title.toLowerCase())) {
            const languageCode = book.language_id ? languageMap.get(book.language_id) : null;
            
            suggestions.push({
              id: book.book_id,
              text: book.title,
              type: 'title',
              source: 'database',
              thumbnail: book.thumbnail,
              languageCode
            });
            
            existingTitles.add(book.title.toLowerCase());
            if (book.google_book_id) {
              existingGoogleBookIds.add(book.google_book_id);
            }
          }
        });
      }
    }

    // 2. Recherche d'auteurs (peut rester inchangée)
    const { data: authorData } = await supabase
      .from('authors')
      .select('author_id, author_name')
      .ilike('author_name', `%${query}%`)
      .limit(3);

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

    // 3. Recherche de séries (peut rester inchangée)
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

    // Récupérer les suggestions de Google Books API avec filtrage par langue
    try {
      // D'abord rechercher dans la langue préférée
      const googleBooksUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=5&langRestrict=${preferredLanguage}`;
      const response = await fetch(googleBooksUrl);
      const data = await response.json();
      
      if (data.items && Array.isArray(data.items)) {
        data.items.forEach((item: any) => {
          // Vérifier si ce livre de Google Books existe déjà dans notre DB
          if (existingGoogleBookIds.has(item.id)) {
            return; // Ignorer ce livre
          }
          
          if (item.volumeInfo && item.volumeInfo.title) {
            // Vérification supplémentaire par titre
            const title = item.volumeInfo.title.toLowerCase();
            if (existingTitles.has(title)) {
              return; // Ignorer les livres avec des titres qui existent déjà
            }
            
            const thumbnail = item.volumeInfo.imageLinks?.thumbnail || null;
            
            suggestions.push({
              id: item.id,
              text: item.volumeInfo.title,
              type: 'google_book',
              source: 'google_books',
              thumbnail: thumbnail,
              languageCode: item.volumeInfo.language
            });
            
            // Ajouter ce titre à l'ensemble des titres existants
            existingTitles.add(title);
          }
        });
      }
      
      // Si nous avons peu de suggestions de Google Books, faire une recherche sans restriction de langue
      if ((data.items?.length || 0) < 3 && suggestions.length < 10) {
        const generalGoogleBooksUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=5`;
        const generalResponse = await fetch(generalGoogleBooksUrl);
        const generalData = await generalResponse.json();
        
        if (generalData.items && Array.isArray(generalData.items)) {
          generalData.items.forEach((item: any) => {
            // Ignorer les livres déjà inclus ou dans la base de données
            if (existingGoogleBookIds.has(item.id)) {
              return;
            }
            
            if (item.volumeInfo && item.volumeInfo.title) {
              // Vérification supplémentaire par titre
              const title = item.volumeInfo.title.toLowerCase();
              if (existingTitles.has(title)) {
                return;
              }
              
              const thumbnail = item.volumeInfo.imageLinks?.thumbnail || null;
              
              suggestions.push({
                id: item.id,
                text: item.volumeInfo.title,
                type: 'google_book',
                source: 'google_books',
                thumbnail: thumbnail,
                languageCode: item.volumeInfo.language
              });
              
              existingTitles.add(title);
            }
          });
        }
      }
    } catch (googleError) {
      console.error('Error fetching Google Books suggestions:', googleError);
      // Ne pas échouer si Google Books API échoue
    }

    // Trier les suggestions pour prioriser les résultats dans la langue préférée
    const sortedSuggestions = suggestions.sort((a, b) => {
      // Priorité aux correspondances exactes
      if (a.text.toLowerCase() === query.toLowerCase()) return -1;
      if (b.text.toLowerCase() === query.toLowerCase()) return 1;
      
      // Priorité à la langue préférée
      if (a.languageCode === preferredLanguage && b.languageCode !== preferredLanguage) return -1;
      if (a.languageCode !== preferredLanguage && b.languageCode === preferredLanguage) return 1;
      
      // Ensuite priorité à la base de données
      if (a.source === 'database' && b.source === 'google_books') return -1;
      if (a.source === 'google_books' && b.source === 'database') return 1;
      
      return 0;
    });

    // Limiter le nombre total de suggestions
    const limitedSuggestions = sortedSuggestions.slice(0, 10);

    return res.status(200).json({ suggestions: limitedSuggestions });
  } catch (error) {
    console.error('Suggestion search error:', error);
    return res.status(500).json({ error: 'An error occurred while fetching suggestions' });
  }
}