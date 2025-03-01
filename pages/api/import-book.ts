// pages/api/import-book.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase/supabaseClient';
import { getBookDetails } from '../../lib/api/googleBooksApi';
import { getBestCoverImage } from '../../lib/api/openLibraryApi';

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
      console.error('Error checking existing book:', existingError);
      return res.status(400).json({ error: `Database error: ${existingError.message}` });
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

    // Extraire les ISBN et autres identifiants
    let isbn10: string | null = null;
    let isbn13: string | null = null;
    
    if (bookDetails.volumeInfo.industryIdentifiers) {
      for (const identifier of bookDetails.volumeInfo.industryIdentifiers) {
        if (identifier.type === 'ISBN_10') {
          isbn10 = identifier.identifier;
        } else if (identifier.type === 'ISBN_13') {
          isbn13 = identifier.identifier;
        }
      }
    }

    // Traiter l'éditeur (publisher)
    let publisherId = null;
    if (bookDetails.volumeInfo.publisher) {
      // Vérifier si l'éditeur existe déjà
      const { data: existingPublisher, error: publisherError } = await supabase
        .from('publishers')
        .select('publisher_id')
        .ilike('publisher_name', bookDetails.volumeInfo.publisher)
        .maybeSingle();

      if (publisherError) {
        console.error('Error checking publisher:', publisherError);
      } else if (existingPublisher) {
        publisherId = existingPublisher.publisher_id;
      } else {
        // Créer un nouvel éditeur
        const { data: newPublisher, error: createPublisherError } = await supabase
          .from('publishers')
          .insert({ publisher_name: bookDetails.volumeInfo.publisher })
          .select()
          .single();

        if (createPublisherError) {
          console.error('Error creating publisher:', createPublisherError);
        } else if (newPublisher) {
          publisherId = newPublisher.publisher_id;
        }
      }
    }

    // Traiter la langue
    let languageId = null;
    if (bookDetails.volumeInfo.language) {
      console.log('Processing language:', bookDetails.volumeInfo.language);
      
      // Vérifier si la langue existe déjà
      const { data: existingLanguage, error: languageError } = await supabase
        .from('languages')
        .select('language_id')
        .eq('language_code', bookDetails.volumeInfo.language)
        .maybeSingle();

      if (languageError) {
        console.error('Error checking language:', languageError);
      } else if (existingLanguage) {
        console.log('Existing language found:', existingLanguage);
        languageId = existingLanguage.language_id;
      } else {
        // Créer une nouvelle langue
        const languageName = getLanguageName(bookDetails.volumeInfo.language);
        console.log('Creating new language:', bookDetails.volumeInfo.language, languageName);
        
        const { data: newLanguage, error: createLanguageError } = await supabase
          .from('languages')
          .insert({ 
            language_code: bookDetails.volumeInfo.language,
            language_name: languageName
          })
          .select()
          .single();

        if (createLanguageError) {
          console.error('Error creating language:', createLanguageError);
        } else if (newLanguage) {
          console.log('New language created:', newLanguage);
          languageId = newLanguage.language_id;
        } else {
          console.error('Language created but no data returned');
        }
      }
    }

    // Vérifier si le livre appartient à une série (information pas toujours disponible dans Google Books API)
    let seriesId = null;
    let seriesReleaseNumber = null;
    
    // Dans certains cas, le titre peut contenir des informations sur la série
    const seriesInfo = extractSeriesInfo(bookDetails.volumeInfo.title, bookDetails.volumeInfo.subtitle);
    if (seriesInfo.seriesName) {
      // Vérifier si la série existe déjà
      const { data: existingSeries, error: seriesError } = await supabase
        .from('series')
        .select('series_id')
        .ilike('series_name', seriesInfo.seriesName)
        .maybeSingle();

      if (seriesError) {
        console.error('Error checking series:', seriesError);
      } else if (existingSeries) {
        seriesId = existingSeries.series_id;
      } else {
        // Créer une nouvelle série
        const { data: newSeries, error: createSeriesError } = await supabase
          .from('series')
          .insert({ series_name: seriesInfo.seriesName })
          .select()
          .single();

        if (createSeriesError) {
          console.error('Error creating series:', createSeriesError);
        } else if (newSeries) {
          seriesId = newSeries.series_id;
        }
      }
      
      seriesReleaseNumber = seriesInfo.releaseNumber;
    }

    // Log pour debug
    console.log('Creating book with language_id:', languageId);

    // Créer le livre avec toutes les informations recueillies
    // Récupérer la meilleure couverture disponible
    const bestCover = await getBestCoverImage(
      bookDetails.volumeInfo.imageLinks?.thumbnail || null,
      isbn10,
      isbn13
    );
    
    const { data: newBook, error: bookError } = await supabase
      .from('books')
      .insert({
        title: bookDetails.volumeInfo.title || 'Titre inconnu',
        google_book_id: googleBookId,
        synopsis: bookDetails.volumeInfo.description || null,
        published_date: bookDetails.volumeInfo.publishedDate || null,
        page_count: bookDetails.volumeInfo.pageCount || null,
        thumbnail: bestCover,
        isbn_10: isbn10,
        isbn_13: isbn13,
        publisher_id: publisherId,
        language_id: languageId,
        series_id: seriesId,
        series_release_number: seriesReleaseNumber
      })
      .select()
      .single();

    if (bookError) {
      console.error('Error inserting book:', bookError);
      return res.status(500).json({ error: `Failed to insert book: ${bookError.message}` });
    }

    // Traitement des auteurs...
    if (bookDetails.volumeInfo.authors && bookDetails.volumeInfo.authors.length > 0) {
      for (const authorName of bookDetails.volumeInfo.authors) {
        try {
          // Vérifier si l'auteur existe déjà
          const { data: existingAuthors, error: authorSearchError } = await supabase
            .from('authors')
            .select('author_id')
            .ilike('author_name', authorName)
            .maybeSingle();

          if (authorSearchError) {
            console.warn('Error searching author:', authorSearchError);
            continue;
          }

          let authorId;
          
          if (existingAuthors) {
            // Utiliser l'auteur trouvé
            authorId = existingAuthors.author_id;
          } else {
            // Créer un nouvel auteur
            const { data: newAuthor, error: authorInsertError } = await supabase
              .from('authors')
              .insert({ author_name: authorName })
              .select()
              .single();

            if (authorInsertError) {
              console.error('Error creating author:', authorInsertError);
              continue;
            }
            
            if (!newAuthor) {
              console.error('Author created but no data returned');
              continue;
            }
            
            authorId = newAuthor.author_id;
          }

          // Associer l'auteur au livre
          if (authorId) {
            const { error: linkError } = await supabase
              .from('book_authors')
              .insert({
                book_id: newBook.book_id,
                author_id: authorId
              });

            if (linkError) {
              console.error('Error linking author to book:', linkError);
            }
          }
        } catch (authorError) {
          console.error(`Error processing author ${authorName}:`, authorError);
        }
      }
    }

    // Traitement des genres...
    if (bookDetails.volumeInfo.categories && bookDetails.volumeInfo.categories.length > 0) {
      for (const categoryName of bookDetails.volumeInfo.categories) {
        try {
          // Vérifier si le genre existe déjà
          const { data: existingGenres, error: genreSearchError } = await supabase
            .from('genres')
            .select('genre_id')
            .ilike('genre_name', categoryName)
            .maybeSingle();

          if (genreSearchError) {
            console.warn('Error searching genre:', genreSearchError);
            continue;
          }

          let genreId;
          
          if (existingGenres) {
            // Utiliser le genre trouvé
            genreId = existingGenres.genre_id;
          } else {
            // Créer un nouveau genre
            const { data: newGenre, error: genreInsertError } = await supabase
              .from('genres')
              .insert({ genre_name: categoryName })
              .select()
              .single();

            if (genreInsertError) {
              console.error('Error creating genre:', genreInsertError);
              continue;
            }
            
            if (!newGenre) {
              console.error('Genre created but no data returned');
              continue;
            }
            
            genreId = newGenre.genre_id;
          }

          // Associer le genre au livre
          if (genreId) {
            const { error: linkError } = await supabase
              .from('books_genres')
              .insert({
                book_id: newBook.book_id,
                genre_id: genreId
              });

            if (linkError) {
              console.error('Error linking genre to book:', linkError);
            }
          }
        } catch (genreError) {
          console.error(`Error processing genre ${categoryName}:`, genreError);
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

// Fonction d'aide pour obtenir le nom complet de la langue à partir du code
function getLanguageName(languageCode: string): string {
  const languageMap: Record<string, string> = {
    'en': 'English',
    'fr': 'Français',
    'es': 'Español',
    'de': 'Deutsch',
    'it': 'Italiano',
    'pt': 'Português',
    'ru': 'Русский',
    'ja': 'Japanese',
    'zh': 'Chinese',
    'ar': 'Arabic',
    'nl': 'Nederlands',
    'sv': 'Svenska',
    'fi': 'Suomi',
    'da': 'Dansk',
    'no': 'Norsk',
    'pl': 'Polski',
    'hu': 'Magyar',
    'cs': 'Čeština',
    'ro': 'Română',
    'tr': 'Türkçe',
    'ko': 'Korean',
    'he': 'Hebrew',
    'id': 'Indonesian',
    'vi': 'Vietnamese',
    'uk': 'Ukrainian',
    'th': 'Thai',
    'el': 'Greek',
    'ca': 'Catalan',
    'fa': 'Persian',
    'hi': 'Hindi'
  };

  return languageMap[languageCode] || `Language (${languageCode})`;
}

// Fonction pour extraire les informations de série du titre ou sous-titre
function extractSeriesInfo(title: string, subtitle?: string | null): { seriesName: string | null; releaseNumber: number | null } {
  const result = { seriesName: null as string | null, releaseNumber: null as number | null };
  
  // Motifs courants dans les titres de séries
  const seriesPatterns = [
    /\((.*?)#(\d+\.?\d*)\)/i,
    /\((.*?),?\s+(?:Book|Vol\.?|Volume|Tome|Part)\.?\s*(\d+\.?\d*)\)/i,
    /(.*?)(?:Series|Saga|Trilogy|Duology):\s+(?:Book|Vol\.?|Volume|Tome|Part)\.?\s*(\d+\.?\d*)/i,
    /^(.*?)\s+(\d+\.?\d*)$/i
  ];

  for (const pattern of seriesPatterns) {
    // Chercher dans le titre
    const titleMatch = title.match(pattern);
    if (titleMatch && titleMatch[1] && titleMatch[2]) {
      result.seriesName = titleMatch[1].trim();
      result.releaseNumber = parseFloat(titleMatch[2]);
      return result;
    }
    
    // Chercher dans le sous-titre s'il existe
    if (subtitle) {
      const subtitleMatch = subtitle.match(pattern);
      if (subtitleMatch && subtitleMatch[1] && subtitleMatch[2]) {
        result.seriesName = subtitleMatch[1].trim();
        result.releaseNumber = parseFloat(subtitleMatch[2]);
        return result;
      }
    }
  }

  return result;
}