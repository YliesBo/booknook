import { useState, useEffect } from 'react';
import { getOpenLibraryCoverByISBN } from '../api/openLibraryApi';

export function useCoverImage(
  thumbnail: string | null,
  isbn10?: string | null,
  isbn13?: string | null
): string | null {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchBestCover = async () => {
      // Chercher d'abord sur Open Library
      if (isbn13) {
        const openLibraryCover = getOpenLibraryCoverByISBN(isbn13, 'L');
        if (openLibraryCover) {
          setImageUrl(openLibraryCover);
          return;
        }
      }

      if (isbn10) {
        const openLibraryCover = getOpenLibraryCoverByISBN(isbn10, 'L');
        if (openLibraryCover) {
          setImageUrl(openLibraryCover);
          return;
        }
      }

      // Fallback sur la miniature Google Books
      setImageUrl(thumbnail);
    };

    fetchBestCover();
  }, [thumbnail, isbn10, isbn13]);

  return imageUrl;
}