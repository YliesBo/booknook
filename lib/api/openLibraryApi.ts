// lib/api/openLibraryApi.ts
/**
 * Utilitaire pour récupérer les couvertures de livres depuis Open Library
 */

// Format de l'URL pour les couvertures Open Library
// https://covers.openlibrary.org/b/$key/$value-$size.jpg
// où $key peut être: ISBN, OCLC, LCCN, OLID, ID
// et $size peut être: S (small), M (medium), L (large)

/**
 * Retourne l'URL de la couverture de livre depuis Open Library basée sur l'ISBN
 * @param isbn - ISBN-10 ou ISBN-13 du livre
 * @param size - Taille de l'image (S, M, ou L)
 * @returns URL de la couverture
 */
export function getOpenLibraryCoverByISBN(isbn: string | null, size: 'S' | 'M' | 'L' = 'L'): string | null {
  if (!isbn) return null;
  
  // Nettoyer l'ISBN (enlever les tirets ou espaces)
  const cleanISBN = isbn.replace(/[-\s]/g, '');
  
  return `https://covers.openlibrary.org/b/isbn/${cleanISBN}-${size}.jpg`;
}

/**
 * Vérifie si une URL d'image est valide (renvoie une vraie image et non une image par défaut)
 * @param url - URL à vérifier
 * @returns Promise qui se résout à true si l'image est valide, false sinon
 */
export async function isValidCoverImage(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    
    if (!response.ok) return false;
    
    // Vérifier la taille de l'image (Open Library renvoie une image vide très petite quand l'ISBN n'est pas trouvé)
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) < 1000) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Erreur lors de la vérification de l\'image :', error);
    return false;
  }
}

/**
 * Récupère la meilleure couverture disponible entre Google Books et Open Library
 * @param googleBooksCover - URL de la couverture Google Books
 * @param isbn10 - ISBN-10 du livre
 * @param isbn13 - ISBN-13 du livre
 * @returns La meilleure URL de couverture disponible
 */
export async function getBestCoverImage(
  googleBooksCover: string | null, 
  isbn10: string | null, 
  isbn13: string | null
): Promise<string | null> {
  // Essayer d'abord Open Library avec ISBN-13 et ISBN-10
  if (isbn13) {
    const openLibraryCover = getOpenLibraryCoverByISBN(isbn13, 'L');
    if (openLibraryCover && await isValidCoverImage(openLibraryCover)) {
      return openLibraryCover;
    }
  }

  if (isbn10) {
    const openLibraryCover = getOpenLibraryCoverByISBN(isbn10, 'L');
    if (openLibraryCover && await isValidCoverImage(openLibraryCover)) {
      return openLibraryCover;
    }
  }

  // Si Open Library n'a pas de couverture, utiliser Google Books
  if (googleBooksCover) {
    const betterGoogleCover = googleBooksCover
      .replace(/&zoom=\d+/, '&zoom=1')
      .replace('http://', 'https://');
    
    return betterGoogleCover;
  }

  return null;
}