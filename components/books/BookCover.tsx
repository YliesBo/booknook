// components/books/BookCover.tsx
import { useState, useEffect } from 'react';
import { getEnhancedGoogleBooksCover } from '../../lib/api/coverImageUtils';

type BookCoverProps = {
  thumbnail: string | null;
  isbn10?: string | null; 
  isbn13?: string | null;
  title: string;
  className?: string;
  children?: React.ReactNode;
};

export default function BookCover({ 
  thumbnail, 
  title, 
  className = '', 
  children,
  isbn10, 
  isbn13 
}: BookCoverProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  
  useEffect(() => {
    const enhancedCover = getEnhancedGoogleBooksCover(thumbnail);
    setImageUrl(enhancedCover || thumbnail);
  }, [thumbnail]);
  
  return (
    <div className={`bg-gray-100 relative rounded-2xl overflow-hidden h-full flex items-center justify-center ${className}`}>
      {imageUrl && !imageError ? (
        <img 
          src={imageUrl} 
          alt={title}
          className="w-full h-auto object-contain"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="w-full h-full min-h-[200px] flex items-center justify-center text-gray-400 p-4">
          <span className="text-xs text-center">{title}</span>
        </div>
      )}
      {children}
    </div>
  );
}