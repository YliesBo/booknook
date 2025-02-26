// components/books/BookCard.tsx
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { FiPlus } from 'react-icons/fi';
import ShelfSelector from '../shelves/ShelfSelector';

type BookCardProps = {
  book: {
    id: string;
    title: string;
    authors: string[];
    thumbnail: string | null;
    source?: 'database' | 'google_books';
  };
  onImport?: (id: string) => Promise<void>;
};

export default function BookCard({ book, onImport }: BookCardProps) {
  const [showShelfSelector, setShowShelfSelector] = useState(false);
  const [showAddButton, setShowAddButton] = useState(false);
  const [longPressTriggered, setLongPressTriggered] = useState(false);
  const [loading, setLoading] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Gestion du survol (desktop)
  const handleMouseEnter = () => {
    setShowAddButton(true);
  };

  const handleMouseLeave = () => {
    setShowAddButton(false);
  };

  // Gestion du long press (mobile)
  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => {
      setLongPressTriggered(true);
      setShowShelfSelector(true);
    }, 500); // 500ms pour déclencher un "long press"
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleTouchMove = () => {
    // Annuler le long press si l'utilisateur fait glisser son doigt
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // Annuler la navigation si un long press a été déclenché
  const handleLinkClick = (e: React.MouseEvent) => {
    if (longPressTriggered) {
      e.preventDefault();
      setLongPressTriggered(false);
    }
  };

  // S'assurer de nettoyer le timer si le composant est démonté
  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);

  // Fermer le sélecteur d'étagère quand on clique à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        setShowShelfSelector(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Gérer l'import des livres de Google Books
  const handleAddButtonClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (book.source === 'google_books' && onImport) {
      setLoading(true);
      try {
        await onImport(book.id);
      } finally {
        setLoading(false);
      }
    } else {
      setShowShelfSelector(true);
    }
  };

  return (
    <div 
      ref={cardRef}
      className="relative group rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Link 
        href={book.source === 'google_books' ? '#' : `/book/${book.id}`}
        onClick={handleLinkClick}
      >
        <div 
          className="aspect-[2/3] bg-gray-200 relative"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchMove}
        >
          {book.thumbnail && (
            <img 
              src={book.thumbnail} 
              alt={book.title}
              className="object-cover w-full h-full"
            />
          )}
          
          {/* Badge pour Google Books */}
          {book.source === 'google_books' && (
            <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs px-2 py-1 m-1 rounded-md">
              Google Books
            </div>
          )}
          
          {/* Overlay avec bouton d'ajout (visible au survol sur desktop) */}
          <div 
            className={`absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 flex items-center justify-center transition-all duration-200 ${
              showAddButton ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {!showShelfSelector && (
              <button
                onClick={handleAddButtonClick}
                className="bg-blue-500 text-white rounded-full p-2 transform transition-transform duration-200 hover:scale-110"
              >
                {loading ? (
                  <div className="animate-spin h-5 w-5 border-t-2 border-b-2 border-white rounded-full"></div>
                ) : (
                  <FiPlus size={20} />
                )}
              </button>
            )}
          </div>
        </div>
        <div className="p-2">
          <h3 className="font-medium text-sm line-clamp-1">{book.title}</h3>
          <p className="text-xs text-gray-600 line-clamp-1">
            {book.authors.length > 0 
              ? book.authors.join(', ') 
              : 'Auteur inconnu'}
          </p>
        </div>
      </Link>

      {/* Sélecteur d'étagères (s'affiche quand showShelfSelector est true) */}
      {showShelfSelector && (
        <div className="absolute z-10 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <ShelfSelector 
            bookId={book.id} 
            onClose={() => setShowShelfSelector(false)}
          />
        </div>
      )}
    </div>
  );
}