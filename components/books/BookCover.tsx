// components/books/BookCover.tsx
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
  const [imageUrl, setImageUrl] = useState<string | null>(thumbnail);
  const [imageError, setImageError] = useState(false);
  
  useEffect(() => {
    // Si l'image d'origine n'est pas disponible ou a généré une erreur, essayer Open Library
    if ((!thumbnail || imageError) && (isbn10 || isbn13)) {
      const tryOpenLibrary = async () => {
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
  }, [thumbnail, imageError, isbn10, isbn13]);
  
  const handleImageError = () => {
    setImageError(true);
  };
  
  return (
    <div className={`bg-gray-200 ${aspectRatio} relative ${className}`}>
      {imageUrl ? (
        <img 
          src={imageUrl} 
          alt={title}
          className="object-cover w-full h-full"
          onError={handleImageError}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-400">
          <span className="text-xs text-center px-2">{title}</span>
        </div>
      )}
    </div>
  );
}