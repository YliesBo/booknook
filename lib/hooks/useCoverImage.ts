// lib/hooks/useCoverImage.ts
import { useState, useEffect } from 'react';
import { getEnhancedGoogleBooksCover } from '../api/coverImageUtils';

export function useCoverImage(
  thumbnail: string | null,
  isbn10?: string | null, // Gardons ces paramètres pour compatibilité
  isbn13?: string | null  // mais ne les utilisons plus
): string | null {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    // Plus de requêtes à OpenLibrary, juste améliorer l'URL Google Books
    const enhancedCover = getEnhancedGoogleBooksCover(thumbnail);
    setImageUrl(enhancedCover || thumbnail);
  }, [thumbnail]);

  return imageUrl;
}