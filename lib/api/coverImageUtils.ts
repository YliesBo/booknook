// lib/api/coverImageUtils.ts
/**
 * Utilitaires pour la gestion des images de couverture de livres
 */

/**
 * Améliore la qualité de l'URL de la couverture Google Books
 * @param googleBooksCover - URL de la couverture Google Books
 * @returns URL améliorée de la couverture Google Books
 */
export function getEnhancedGoogleBooksCover(googleBooksCover: string | null): string | null {
    if (!googleBooksCover) return null;
    
    // Améliorer la qualité en changeant le paramètre zoom et en utilisant HTTPS
    return googleBooksCover
      .replace(/&zoom=\d+/, '&zoom=3')
      .replace('http://', 'https://');
  }