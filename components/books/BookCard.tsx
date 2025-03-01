// components/books/BookCard.tsx
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FiPlus, FiCheck, FiBookmark, FiClock, FiX } from 'react-icons/fi';
import ShelfSelector from '../shelves/ShelfSelector';
import { useAuth } from '../../context/AuthContext';
import { getReadingStatus, setReadingStatus, readingStatusLabels, ReadingStatus } from '../../lib/reading/readingStatusUtils';
import { supabase } from '../../lib/supabase/supabaseClient';
import BookCover from './BookCover';



type BookCardProps = {
  book: {
    id: string;
    title: string;
    authors: string[];
    thumbnail: string | null;
    source?: 'database' | 'google_books';
  };
  onImport?: (id: string) => Promise<string>;
};

export default function BookCard({ book, onImport }: BookCardProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [showShelfSelector, setShowShelfSelector] = useState(false);
  const [showButtons, setShowButtons] = useState(false);
  const [longPressTriggered, setLongPressTriggered] = useState(false);
  const [loading, setLoading] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [readingStatus, setReadingStatusState] = useState<ReadingStatus | null>(null);
  
  // Gestion du survol (desktop)
  const handleMouseEnter = () => {
    setShowButtons(true);
  };

  const handleMouseLeave = () => {
    setShowButtons(false);
  };

  // Gestion du long press (mobile)
  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => {
      setLongPressTriggered(true);
      setShowShelfSelector(true);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleTouchMove = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleLinkClick = async (e: React.MouseEvent) => {
    if (longPressTriggered) {
      e.preventDefault();
      setLongPressTriggered(false);
      return;
    }

    // Si c'est un livre Google Books, importer en arrière-plan
    if (book.source === 'google_books') {
      e.preventDefault();
      setLoading(true);
      
      try {
        // Tentative d'importation du livre
        const response = await fetch('/api/import-book', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ googleBookId: book.id }),
        });
        
        // Traitement de la réponse
        const data = await response.json();
        
        if (!response.ok) {
          console.error('Import error:', data.error || 'Unknown error');
          alert(`Erreur: ${data.error || 'Une erreur inconnue est survenue'}`);
          setLoading(false);
          return;
        }
        
        // Navigation vers la page de détail si l'importation est réussie
        if (data.book_id) {
          router.push(`/book/${data.book_id}`);
        } else {
          console.error('No book_id returned:', data);
          alert('Erreur: Impossible de récupérer l\'ID du livre importé');
          setLoading(false);
        }
      } catch (error) {
        console.error('Error during import process:', error);
        alert('Une erreur est survenue lors de la communication avec le serveur');
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (user && book.id) {
      fetchReadingStatus();
    }
  }, [user, book.id]);

  const fetchReadingStatus = async () => {
    if (!user) return;
    
    try {
      const status = await getReadingStatus(user.id, book.id);
      setReadingStatusState(status);
    } catch (error) {
      console.error('Erreur lors de la récupération du statut de lecture:', error);
    }
  };

  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);

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

  // Fonctions pour gérer les statuts de lecture
  const handleReadingStatus = async (status: ReadingStatus) => {
    if (!user) {
      alert('Veuillez vous connecter pour définir un statut de lecture');
      return;
    }
    
    setLoading(true);
    try {
      // Si c'est un livre Google Books, il faut d'abord l'importer
      let bookId = book.id;
      if (book.source === 'google_books' && onImport) {
        try {
          bookId = await onImport(book.id);
        } catch (importError) {
          console.error('Erreur lors de l\'importation du livre:', importError);
          alert('Impossible d\'ajouter le statut de lecture. Erreur d\'importation.');
          return;
        }
      }
      
      // Utiliser directement la méthode Supabase
      const { error } = await supabase
        .from('reading_status')
        .upsert({
          user_id: user.id,
          book_id: bookId,
          status: status,
          date_added: new Date().toISOString()
        }, {
          onConflict: 'user_id,book_id' // Clé unique : combination de user_id et book_id
        });
  
      if (error) {
        console.error('Erreur lors de la mise à jour du statut :', error);
        alert('Impossible de mettre à jour le statut de lecture');
        return;
      }
      
      // Mettre à jour l'état local
      setReadingStatusState(status);
      
    } catch (error) {
      console.error(`Erreur lors de la définition du statut ${status}:`, error);
      alert(`Une erreur est survenue lors de la définition du statut`);
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddToShelf = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      alert('Veuillez vous connecter pour ajouter des livres à vos étagères');
      return;
    }
    
    setShowShelfSelector(true);
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
  className="relative"
  onTouchStart={handleTouchStart}
  onTouchEnd={handleTouchEnd}
  onTouchMove={handleTouchMove}
>
  <BookCover
    thumbnail={book.thumbnail}
    title={book.title}
  />

{readingStatus && (
            <div className={`absolute top-2 right-2 rounded-full px-2 py-1 text-xs font-medium ${
              readingStatus === 'to_read' ? 'bg-blue-500 text-white' :
              readingStatus === 'reading' ? 'bg-green-500 text-white' :
              readingStatus === 'read' ? 'bg-purple-500 text-white' :
              'bg-red-500 text-white'
            }`}>
              {readingStatusLabels[readingStatus]}
            </div>
          )}
          
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
            </div>
          )}
          
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
            </div>
          )}
          
          {/* Overlay et boutons d'action */}
          {showButtons && !showShelfSelector && (
            <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
              <div className="flex space-x-2 p-1">
                {/* Bouton "À lire" */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleReadingStatus('to_read');
                  }}
                  className="bg-blue-500 text-white rounded-full p-2 transform transition-transform duration-200 hover:scale-110"
                  title="Marquer comme à lire"
                >
                  <FiPlus size={18} />
                </button>
                
                {/* Bouton "En cours" */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleReadingStatus('reading');
                  }}
                  className="bg-green-500 text-white rounded-full p-2 transform transition-transform duration-200 hover:scale-110"
                  title="Marquer comme en cours"
                >
                  <FiClock size={18} />
                </button>
                
                {/* Bouton "Lu" */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleReadingStatus('read');
                  }}
                  className="bg-purple-500 text-white rounded-full p-2 transform transition-transform duration-200 hover:scale-110"
                  title="Marquer comme lu"
                >
                  <FiCheck size={18} />
                </button>
                
                {/* Bouton "Ajouter à une étagère" */}
                <button
                  onClick={handleAddToShelf}
                  className="bg-yellow-500 text-white rounded-full p-2 transform transition-transform duration-200 hover:scale-110"
                  title="Ajouter à une étagère"
                >
                  <FiBookmark size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="p-2">
  <h3 className="font-medium text-sm line-clamp-1 text-gray-800">{book.title}</h3>
  <p className="text-xs text-gray-600 line-clamp-1">
    {book.authors.length > 0 
      ? book.authors.join(', ') 
      : 'Auteur inconnu'}
  </p>
</div>
      </Link>

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