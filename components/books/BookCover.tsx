import { useState, useEffect } from 'react';
import { getOpenLibraryCoverByISBN } from '../../lib/api/openLibraryApi';

type BookCoverProps = {
  thumbnail: string | null;
  isbn10?: string | null;
  isbn13?: string | null;
  title: string;
  className?: string;
  aspectRatio?: string;
};

export default function BookCover({ 
  thumbnail, 
  isbn10, 
  isbn13, 
  title, 
  className = '', 
  aspectRatio = 'aspect-[2/3]' 
}: BookCoverProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  
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
  
  return (
    <div className={`bg-gray-200 ${aspectRatio} relative ${className}`}>
      {imageUrl ? (
        <img 
          src={imageUrl} 
          alt={title}
          className="object-cover w-full h-full"
          onError={() => setImageUrl(thumbnail)}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-400">
          <span className="text-xs text-center px-2">{title}</span>
        </div>
      )}
    </div>
  );
}