// lib/search/duplicateUtils.ts
import { SearchResult } from './searchUtils';

/**
 * Vérifie si un livre existe déjà dans Google Books IDs
 */
export function isGoogleBookIdDuplicate(googleBookId: string | null | undefined, existingIds: Set<string>): boolean {
    return googleBookId !== null && googleBookId !== undefined && existingIds.has(googleBookId);
  }
  
  export function filterGoogleBooksByIds(
    googleResults: SearchResult[],
    googleBookIds: Set<string>
  ): SearchResult[] {
    return googleResults.filter(result => {
      // Gestion plus sûre des valeurs null/undefined
      return !(result.googleBookId && googleBookIds.has(result.googleBookId));
    });
  }

/**
 * Marquage des résultats similaires pour permettre leur distinction dans l'UI
 * Ceci n'élimine pas les doublons mais les identifie pour permettre un traitement spécial
 */
export function markSimilarBooks(results: SearchResult[]): SearchResult[] {
    // Vérification que results est bien un tableau
    if (!Array.isArray(results)) {
      console.error('markSimilarBooks called with non-array:', results);
      return [];
    }
    
    const similarityGroups: Map<string, SearchResult[]> = new Map();
    
  
  // Regrouper les livres par titre et auteurs normalisés
  results.forEach(result => {
    // Créer une clé de normalisation pour regrouper les livres similaires
    const normalizedTitle = result.title.toLowerCase().trim();
    const normalizedAuthors = result.authors
      .map(author => author.toLowerCase().trim())
      .sort()
      .join('|');
    
    const similarityKey = `${normalizedTitle}|${normalizedAuthors}`;
    
    if (!similarityGroups.has(similarityKey)) {
      similarityGroups.set(similarityKey, []);
    }
    
    similarityGroups.get(similarityKey)!.push(result);
  });
  
// Gestion plus sûre des données potentiellement manquantes
  results.forEach(result => {
    if (!result.title || !Array.isArray(result.authors)) {
      console.warn('Skipping invalid result:', result);
      return;
    }

  // Traiter chaque groupe de livres similaires
  const processedResults: SearchResult[] = [];
  
  similarityGroups.forEach(group => {
    // Si un seul livre dans le groupe, pas de traitement spécial
    if (group.length === 1) {
      processedResults.push(group[0]);
      return;
    }
    
    // Si plusieurs livres similaires, les marquer comme tels
    // et trier pour mettre les livres de la base de données en premier
    const sortedGroup = group.sort((a, b) => {
      // Priorité 1: Source (database > google_books)
      if (a.source === 'database' && b.source === 'google_books') return -1;
      if (a.source === 'google_books' && b.source === 'database') return 1;
      
      // Priorité 2: Score de relevance
      return (b.relevanceScore || 0) - (a.relevanceScore || 0);
    });
    
    // Marquer les livres comme faisant partie d'un groupe de similaires
    sortedGroup.forEach((book, index) => {
      processedResults.push({
        ...book,
        similarityGroup: sortedGroup.length > 1 ? group[0].title : undefined,
        similarityIndex: index,
        totalSimilar: sortedGroup.length
      });
    });
  });
  
  // Retrier les résultats finaux par score de relevance
  return processedResults.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
}