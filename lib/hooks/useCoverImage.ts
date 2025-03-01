// lib/hooks/useCoverImage.ts
import { useState, useEffect } from 'react';
import { getOpenLibraryCoverByISBN } from '../api/openLibraryApi';

export function useCoverImage(
  thumbnail: string | null,
  isbn10?: string | null,
  isbn13?: string | null
): string | null {
  const [imageUrl, setImageUrl] = useState<string | null>(thumbnail);
  const [fallbackAttempted, setFallbackAttempted] = useState(false);
  
  // Tenter d'utiliser Open Library si l'image d'origine est null
  useEffect(() => {
    if (!thumbnail && !fallbackAttempted && (isbn10 || isbn13)) {
      const tryOpenLibrary = async () => {
        setFallbackAttempted(true);
        
        // Essayer d'abord avec ISBN-13
        if (isbn13) {
          const url = getOpenLibraryCoverByISBN(isbn13, 'L');
          if (url) {
            setImageUrl(url);
            return;
          }
        }
        
        // Puis avec ISBN-10
        if (isbn10) {
          const url = getOpenLibraryCoverByISBN(isbn10, 'L');
          if (url) {
            setImageUrl(url);
            return;
          }
        }
      };
      
      tryOpenLibrary();
    }
  }, [thumbnail, fallbackAttempted, isbn10, isbn13]);
  
  return imageUrl;
}