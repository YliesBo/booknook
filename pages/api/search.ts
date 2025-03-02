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
  seriesInfo?: {
    series: string;
    volume: number | null;
  } | null;
  relevanceScore: number; // Score de pertinence pour le tri
  googleBookId?: string; // ID Google Books pour identifier les doublons
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
        published_date,
        series_id,
        series_release_number,
        google_book_id,
        popularity
      `)
      .or(`title.ilike.%${query}%, synopsis.ilike.%${query}%`)
      .limit(20);

    if (error) throw error;

    // Pour chaque livre de la base de données, récupérer ses auteurs et sa série
    const dbResults: SearchResult[] = [];
    
    for (const book of dbBooks || []) {
      // Récupérer les auteurs
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
      
      // Stocker le google_book_id pour l'identification des doublons
      const googleBookId = book.google_book_id;

      // Récupérer les informations de série si disponibles
      let seriesInfo = null;
      if (book.series_id) {
        const { data: seriesData } = await supabase
          .from('series')
          .select('series_name')
          .eq('series_id', book.series_id)
          .single();
          
        if (seriesData) {
          seriesInfo = {
            series: seriesData.series_name,
            volume: book.series_release_number
          };
        }
      }

      // Calculer le score de pertinence
      const relevanceScore = calculateDbRelevanceScore(book, authorNames, query, seriesInfo, book.popularity || 0);

      dbResults.push({
        source: 'database',
        id: book.book_id,
        title: book.title,
        authors: authorNames,
        thumbnail: book.thumbnail,
        publishedDate: book.published_date,
        seriesInfo,
        relevanceScore,
        googleBookId // Ajouter googleBookId aux résultats DB pour l'identification des doublons
      });
    }

    // Recherche via Google Books API avec des paramètres améliorés
    const googleBooks = await searchGoogleBooks(query, 30); // Récupérer plus de résultats pour les filtrer
    
    // Filtrer et transformer les résultats de Google Books
    const googleResults: SearchResult[] = [];
    
    for (const book of googleBooks) {
      // Filtrer les magazines et autres contenus non pertinents
      if (shouldIncludeGoogleBook(book)) {
        // Extraire les informations de série potentielles
        const seriesInfo = extractSeriesInfo(book.volumeInfo.title, book.volumeInfo.subtitle);
        
        // Calculer le score de pertinence
        const relevanceScore = calculateGoogleRelevanceScore(book, query, seriesInfo);
        
        googleResults.push({
          source: 'google_books',
          id: book.id,
          title: book.volumeInfo.title,
          authors: book.volumeInfo.authors || [],
          thumbnail: book.volumeInfo.imageLinks?.thumbnail || null,
          publishedDate: book.volumeInfo.publishedDate,
          seriesInfo,
          relevanceScore
        });
      }
    }

    // Éliminer les doublons entre DB et Google Books
    // Créer un ensemble des IDs Google Books déjà présents dans notre DB
    const dbGoogleBookIds = new Set(
      dbResults
        .filter(result => result.googleBookId)
        .map(result => result.googleBookId)
    );
    
    // Filtrer les résultats Google Books pour éliminer les doublons
    const filteredGoogleResults = googleResults.filter(
      result => !dbGoogleBookIds.has(result.id)
    );
    
    console.log(`Éliminé ${googleResults.length - filteredGoogleResults.length} doublons de Google Books`);
    
    // Combiner et trier les résultats par score de pertinence
    const allResults = [...dbResults, ...filteredGoogleResults];
    
    // Organiser les résultats
    const organizedResults = organizeSearchResults(allResults, query);

    return res.status(200).json({ results: organizedResults });
  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({ error: 'An error occurred while searching' });
  }
}

// Fonction pour déterminer si un livre Google doit être inclus dans les résultats
function shouldIncludeGoogleBook(book: GoogleBookItem): boolean {
  // Vérifier si c'est bien un livre (exclure magazines, journaux, etc.)
  if (book.volumeInfo.printType !== 'BOOK') {
    return false;
  }
  
  // Vérifier si les informations minimales sont disponibles
  if (!book.volumeInfo.title) {
    return false;
  }
  
  // Autres critères d'exclusion peuvent être ajoutés ici
  
  return true;
}

// Extraire les informations de série à partir du titre et sous-titre
function extractSeriesInfo(title: string, subtitle?: string | null): { series: string; volume: number | null } | null {
  if (!title) return null;
  
  // Motifs courants pour détecter les séries et leurs volumes
  const patterns = [
    // "Title, Volume X" or "Title: Volume X"
    /^(.*?)(?:,|:)?\s+(?:Volume|Vol\.?|Tome|Book|Part|#)\s*(\d+\.?\d*)(?:$|\s|:)/i,
    // "Title (#X)" or "Title (Volume X)"
    /^(.*?)\s+\((?:Volume|Vol\.?|Tome|Book|Part|#)?\s*(\d+\.?\d*)\)(?:$|\s|:)/i,
    // Series name followed by volume number as the whole title
    /^(.*?)\s+(\d+)$/i,
    // Motif pour formats comme "Dragon Ball Super, Vol. 3" ou "One Piece, Chapter 123"
    /^(.*?)(?:,|:)?\s+(?:Vol\.?|Volume|Tome|Chapter|Part)\s*\.?\s*(\d+\.?\d*)(?:$|\s|:)/i
  ];
  
  // Essayer chaque pattern sur le titre
  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match && match[1] && match[2]) {
      const series = match[1].trim();
      const volume = parseFloat(match[2]);
      return { series, volume };
    }
  }
  
  // Essayer les patterns sur le sous-titre si disponible
  if (subtitle) {
    for (const pattern of patterns) {
      const match = subtitle.match(pattern);
      if (match && match[1] && match[2]) {
        const series = match[1].trim();
        const volume = parseFloat(match[2]);
        return { series, volume };
      }
    }
    
    // Vérifier si le sous-titre contient seulement un numéro de volume
    const volumePattern = /^(?:Volume|Vol\.?|Tome|Book|Part|#)?\s*(\d+\.?\d*)$/i;
    const volumeMatch = subtitle.match(volumePattern);
    if (volumeMatch && volumeMatch[1]) {
      // Dans ce cas, le titre principal est probablement le nom de la série
      return {
        series: title.trim(),
        volume: parseFloat(volumeMatch[1])
      };
    }
  }
  
  return null;
}

// Calculer le score de pertinence pour un livre de la base de données
function calculateDbRelevanceScore(
  book: any, 
  authorNames: string[], 
  query: string,
  seriesInfo: { series: string; volume: number | null } | null,
  popularity: number = 0
): number {
  let score = 50; // Score de base légèrement supérieur pour les livres de notre DB
  const queryTerms = query.toLowerCase().split(/\s+/);
  
  // Ajouter des points pour la popularité (0-20 points supplémentaires)
  // Supposons que la popularité est un nombre entre 0 et 100
  if (popularity > 0) {
    score += Math.min(20, popularity / 5); // Maximum 20 points pour les livres très populaires
  }
  
  // Points pour correspondance exacte du titre
  if (book.title.toLowerCase() === query.toLowerCase()) {
    score += 100;
  }
  
  // Points pour correspondance partielle du titre
  const titleWords = book.title.toLowerCase().split(/\s+/);
  for (const term of queryTerms) {
    if (titleWords.includes(term)) {
      score += 20;
    }
    if (book.title.toLowerCase().includes(term)) {
      score += 10;
    }
  }
  
  // Points pour correspondance avec les auteurs
  for (const author of authorNames) {
    if (author.toLowerCase().includes(query.toLowerCase())) {
      score += 30;
    }
    for (const term of queryTerms) {
      if (author.toLowerCase().includes(term)) {
        score += 10;
      }
    }
  }
  
  // Points pour la présence d'une image de couverture
  if (book.thumbnail) {
    score += 15;
  }
  
  // Points pour les informations de série
  if (seriesInfo) {
    score += 5;
    // Si la requête contient le nom de la série
    if (seriesInfo.series.toLowerCase().includes(query.toLowerCase())) {
      score += 25;
    }
    // Si la requête inclut le numéro du volume
    const volumePattern = new RegExp(`\\b${seriesInfo.volume}\\b`);
    if (seriesInfo.volume && volumePattern.test(query)) {
      score += 30;
    }
  }
  
  return score;
}

// Calculer le score de pertinence pour un livre Google
function calculateGoogleRelevanceScore(
  book: GoogleBookItem,
  query: string,
  seriesInfo: { series: string; volume: number | null } | null
): number {
  let score = 40; // Score de base
  const queryTerms = query.toLowerCase().split(/\s+/);
  
  // Points pour correspondance exacte du titre
  if (book.volumeInfo.title.toLowerCase() === query.toLowerCase()) {
    score += 100;
  }
  
  // Points pour correspondance partielle du titre
  const titleWords = book.volumeInfo.title.toLowerCase().split(/\s+/);
  for (const term of queryTerms) {
    if (titleWords.includes(term)) {
      score += 20;
    }
    if (book.volumeInfo.title.toLowerCase().includes(term)) {
      score += 10;
    }
  }
  
  // Points pour correspondance avec les auteurs
  if (book.volumeInfo.authors) {
    for (const author of book.volumeInfo.authors) {
      if (author.toLowerCase().includes(query.toLowerCase())) {
        score += 30;
      }
      for (const term of queryTerms) {
        if (author.toLowerCase().includes(term)) {
          score += 10;
        }
      }
    }
  }
  
  // Points pour la présence d'une image de couverture
  if (book.volumeInfo.imageLinks?.thumbnail) {
    score += 15;
  }
  
  // Points pour les informations de série
  if (seriesInfo) {
    score += 5;
    // Si la requête contient le nom de la série
    if (seriesInfo.series.toLowerCase().includes(query.toLowerCase())) {
      score += 25;
    }
    // Si la requête inclut le numéro du volume
    const volumePattern = new RegExp(`\\b${seriesInfo.volume}\\b`);
    if (seriesInfo.volume && volumePattern.test(query)) {
      score += 30;
    }
  }
  
  return score;
}

// Organiser les résultats de recherche pour une présentation optimale
function organizeSearchResults(results: SearchResult[], query: string): SearchResult[] {
  // Supprimer la propriété googleBookId avant de renvoyer les résultats
  // Elle n'est utilisée qu'en interne pour la déduplication
  const cleanedResults = results.map(result => {
    const { googleBookId, ...rest } = result;
    return rest;
  });
  
  // 1. Identifier les séries potentielles
  const seriesMap: Map<string, SearchResult[]> = new Map();
  const nonSeriesResults: SearchResult[] = [];
  
  for (const result of cleanedResults) {
    if (result.seriesInfo && result.seriesInfo.series) {
      // Stocker les résultats par série
      const seriesName = result.seriesInfo.series.toLowerCase();
      if (!seriesMap.has(seriesName)) {
        seriesMap.set(seriesName, []);
      }
      seriesMap.get(seriesName)!.push(result);
    } else {
      // Stocker les résultats qui ne sont pas dans une série
      nonSeriesResults.push(result);
    }
  }
  
  // 2. Trier les livres à l'intérieur de chaque série par numéro de volume
  for (const [seriesName, seriesBooks] of seriesMap.entries()) {
    seriesMap.set(
      seriesName,
      seriesBooks.sort((a, b) => {
        // Si les deux ont un numéro de volume, trier par numéro
        if (a.seriesInfo?.volume !== null && b.seriesInfo?.volume !== null) {
          return (a.seriesInfo?.volume || 0) - (b.seriesInfo?.volume || 0);
        }
        // Sinon, conserver l'ordre par pertinence
        return b.relevanceScore - a.relevanceScore;
      })
    );
  }
  
  // 3. Identifier les séries les plus pertinentes
  // Calculer un score global pour chaque série
  const seriesScores: Map<string, number> = new Map();
  
  for (const [seriesName, seriesBooks] of seriesMap.entries()) {
    // Score basé sur le meilleur livre de la série et le nombre de livres
    const bestBookScore = Math.max(...seriesBooks.map(book => book.relevanceScore));
    const volumeCount = seriesBooks.length;
    
    // Le score de série est une combinaison du meilleur livre et du nombre de volumes
    const seriesScore = bestBookScore * (1 + Math.min(volumeCount / 10, 0.5)); // Bonus max de 50% pour les grandes séries
    seriesScores.set(seriesName, seriesScore);
  }
  
  // 4. Fusionner et trier les résultats finaux
  let organizedResults: SearchResult[] = [];
  
  // 4.1 D'abord les meilleurs résultats hors-série avec une correspondance exacte ou forte
  const bestNonSeriesResults = nonSeriesResults
    .filter(result => result.relevanceScore >= 100) // Correspondance exacte ou très forte
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
  
  // 4.2 Ensuite, intercaler les séries et les résultats individuels restants
  const seriesNamesSorted = Array.from(seriesScores.keys())
    .sort((a, b) => (seriesScores.get(b) || 0) - (seriesScores.get(a) || 0));
  
  // Ajouter d'abord les meilleurs résultats non-série
  organizedResults = [...bestNonSeriesResults];
  
  // Ajouter ensuite les séries, intercalées avec des résultats individuels restants
  const remainingNonSeriesResults = nonSeriesResults
    .filter(result => result.relevanceScore < 100)
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
  
  let nonSeriesIndex = 0;
  
  for (const seriesName of seriesNamesSorted) {
    const seriesBooks = seriesMap.get(seriesName) || [];
    
    // Ajouter les livres de cette série
    organizedResults = [...organizedResults, ...seriesBooks];
    
    // Intercaler avec quelques résultats individuels si disponibles
    const nonSeriesSlice = remainingNonSeriesResults.slice(
      nonSeriesIndex,
      nonSeriesIndex + Math.min(2, Math.ceil(seriesBooks.length / 5))
    );
    nonSeriesIndex += nonSeriesSlice.length;
    organizedResults = [...organizedResults, ...nonSeriesSlice];
  }
  
  // Ajouter les résultats individuels restants
  if (nonSeriesIndex < remainingNonSeriesResults.length) {
    organizedResults = [
      ...organizedResults,
      ...remainingNonSeriesResults.slice(nonSeriesIndex)
    ];
  }
  
  return organizedResults;
}