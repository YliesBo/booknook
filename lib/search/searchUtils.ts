// lib/search/searchUtils.ts
import { GoogleBookItem } from '../api/googleBooksApi';

export type SearchResult = {
  source: 'database' | 'google_books';
  id: string;
  title: string;
  authors: string[];
  thumbnail: string | null;
  publishedDate?: string;
  relevanceScore?: number; // Score de pertinence pour le tri
};

/**
 * Calcule un score de pertinence pour un résultat de recherche
 * Plus le score est élevé, plus le résultat est pertinent
 */
export function calculateRelevanceScore(
  result: SearchResult, 
  searchQuery: string
): number {
  let score = 0;
  const query = searchQuery.toLowerCase().trim();
  const title = result.title.toLowerCase();
  const authorString = result.authors.join(' ').toLowerCase();
  
  // Correspondance exacte du titre (priorité la plus élevée)
  if (title === query) {
    score += 100;
  } 
  // Titre commence par la requête
  else if (title.startsWith(query)) {
    score += 80;
  }
  // Titre contient la requête
  else if (title.includes(query)) {
    score += 60;
  }
  
  // Vérifier les correspondances de mots individuels
  const queryWords = query.split(/\s+/).filter(word => word.length > 1);
  const titleWords = title.split(/\s+/).filter(word => word.length > 1);
  
  // Nombre de mots de la requête trouvés dans le titre
  const matchingWords = queryWords.filter(word => 
    titleWords.some(titleWord => titleWord.includes(word))
  );
  
  if (matchingWords.length > 0) {
    // Bonus proportionnel au pourcentage de mots correspondants
    score += 30 * (matchingWords.length / queryWords.length);
  }
  
  // Bonus pour les correspondances d'auteurs
  if (authorString.includes(query)) {
    score += 40;
  } else {
    // Vérifier les mots individuels dans les noms d'auteurs
    const authorMatches = queryWords.filter(word => 
      authorString.includes(word)
    );
    
    if (authorMatches.length > 0) {
      score += 20 * (authorMatches.length / queryWords.length);
    }
  }
  
  // Bonus pour les livres avec couverture
  if (result.thumbnail) {
    score += 15;
  }
  
  // Bonus pour les livres avec date de publication
  if (result.publishedDate) {
    score += 5;
  }
  
  return score;
}

/**
 * Identifie les livres appartenant potentiellement à une même série
 * et les regroupe ensemble dans les résultats
 */
export function groupSeriesBooks(results: SearchResult[]): SearchResult[] {
  // Vérification initiale
  if (!results || results.length === 0) return results;

  // Identifier les groupes de livres potentiellement de la même série
  const seriesGroups: { [key: string]: SearchResult[] } = {};
  
  results.forEach(result => {
    // Sécuriser l'extraction du nom de série
    const seriesMatch = result.title.match(/^(.*?)\s*(?:[\(\[]?(#|tome|vol\.?|volume|part|livre)\.?\s*\d+|[:]\s+.*$)/i);
    
    if (seriesMatch && seriesMatch[1]) {
      const seriesName = seriesMatch[1].trim().toLowerCase();
      
      // Filtrage plus strict des noms de série
      if (seriesName.length > 3 && 
          !['le', 'la', 'les', 'un', 'une', 'des'].includes(seriesName)) {
        if (!seriesGroups[seriesName]) {
          seriesGroups[seriesName] = [];
        }
        seriesGroups[seriesName].push(result);
      }
    }
  });
  
  // Extraire les numéros de tome des titres avec plus de précision
  const getVolumeNumber = (title: string): number => {
    // Expression régulière plus robuste pour extraire le numéro
    const volumeMatch = title.match(/(?:^|\W)(?:#|tome|vol\.?|volume|part|livre)\.?\s*(\d+)/i);
    if (volumeMatch && volumeMatch[1]) {
      return parseInt(volumeMatch[1], 10);
    }
    return 999; // Valeur par défaut élevée pour les titres sans numéro identifiable
  };
  
  // Trier les livres dans chaque groupe de série
  Object.keys(seriesGroups).forEach(seriesName => {
    if (seriesGroups[seriesName].length > 1) {
      // Trier par numéro de volume
      seriesGroups[seriesName].sort((a, b) => {
        const volumeA = getVolumeNumber(a.title);
        const volumeB = getVolumeNumber(b.title);
        return volumeA - volumeB;
      });
    }
  });
  
  // Créer une liste plate de résultats en gardant les séries regroupées
  const groupedResults: SearchResult[] = [];
  const processedIds = new Set<string>();
  
  // D'abord ajouter tous les résultats qui ne font pas partie d'une série
  results.forEach(result => {
    const bookId = `${result.source}-${result.id}`;
    
    // Vérifier si ce résultat fait partie d'une série identifiée
    const isPartOfSeries = Object.values(seriesGroups).some(seriesGroup => 
      seriesGroup.some(book => book.id === result.id && book.source === result.source)
    );
    
    if (!isPartOfSeries) {
      groupedResults.push(result);
      processedIds.add(bookId);
    }
  });
  
  // Ensuite ajouter les groupes de séries
  for (const seriesName in seriesGroups) {
    // Ne traiter que les groupes avec plusieurs livres
    if (seriesGroups[seriesName].length > 1) {
      seriesGroups[seriesName].forEach(book => {
        const bookId = `${book.source}-${book.id}`;
        if (!processedIds.has(bookId)) {
          groupedResults.push(book);
          processedIds.add(bookId);
        }
      });
    } else if (seriesGroups[seriesName].length === 1) {
      // S'il n'y a qu'un seul livre dans la "série", l'ajouter s'il n'a pas déjà été traité
      const book = seriesGroups[seriesName][0];
      const bookId = `${book.source}-${book.id}`;
      if (!processedIds.has(bookId)) {
        groupedResults.push(book);
        processedIds.add(bookId);
      }
    }
  }
  
  return groupedResults;
}