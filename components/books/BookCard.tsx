import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase/supabaseClient';

type BookCardProps = {
  book: {
    book_id: string;
    title: string;
    thumbnail: string | null;
    authors: { author_name: string }[];
  };
};

export default function BookCard({ book }: BookCardProps) {
  const { user } = useAuth();
  const [showOptions, setShowOptions] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Extraire les noms des auteurs
  const authorNames = book.authors?.map(author => author.author_name).join(', ') || 'Auteur inconnu';
  
  // Fallback pour les livres sans thumbnail
  const thumbnailUrl = book.thumbnail || '/images/book-placeholder.png';

  const handleAddToShelf = async (shelfName: string) => {
    if (!user) return;
    
    setLoading(true);
    try {
      // D'abord, on récupère l'ID de l'étagère
      const { data: shelves, error: shelfError } = await supabase
        .from('shelves')
        .select('shelf_id')
        .eq('user_id', user.id)
        .eq('shelf_name', shelfName)
        .single();

      if (shelfError || !shelves) {
        console.error('Erreur lors de la récupération de l\'étagère :', shelfError);
        return;
      }

      // Ensuite, on ajoute le livre à l'étagère
      const { error } = await supabase
        .from('bookshelves')
        .upsert({
          shelf_id: shelves.shelf_id,
          book_id: book.book_id,
          user_id: user.id,
        });

      if (error) {
        console.error('Erreur lors de l\'ajout du livre à l\'étagère :', error);
      }
    } catch (error) {
      console.error('Erreur :', error);
    } finally {
      setLoading(false);
      setShowOptions(false);
    }
  };

  return (
    <div 
      className="relative group rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200"
      onMouseEnter={() => setShowOptions(true)}
      onMouseLeave={() => setShowOptions(false)}
    >
      <Link href={`/book/${book.book_id}`}>
        <div className="aspect-[2/3] relative">
          <Image 
            src={thumbnailUrl}
            alt={book.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 20vw"
            className="object-cover"
            onError={(e) => {
              // Fallback en cas d'erreur de chargement d'image
              const target = e.target as HTMLImageElement;
              target.src = '/images/book-placeholder.png';
            }}
          />
        </div>
        <div className="p-2">
          <h3 className="font-medium text-sm line-clamp-1">{book.title}</h3>
          <p className="text-xs text-gray-600 line-clamp-1">{authorNames}</p>
        </div>
      </Link>

      {/* Options au survol (pour desktop) */}
      {user && showOptions && (
        <div className="absolute bottom-0 left-0 right-0 bg-white bg-opacity-90 p-2 transform transition-transform duration-200 shadow-lg">
          {loading ? (
            <div className="flex justify-center py-2">
              <div className="animate-spin h-5 w-5 border-t-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1 text-xs">
              <button 
                onClick={() => handleAddToShelf('To Read')}
                className="bg-blue-500 text-white py-1 px-2 rounded hover:bg-blue-600"
              >
                À lire
              </button>
              <button 
                onClick={() => handleAddToShelf('Reading')}
                className="bg-green-500 text-white py-1 px-2 rounded hover:bg-green-600"
              >
                En cours
              </button>
              <button 
                onClick={() => handleAddToShelf('On Hold')}
                className="bg-yellow-500 text-white py-1 px-2 rounded hover:bg-yellow-600"
              >
                En pause
              </button>
              <button 
                onClick={() => handleAddToShelf('Read')}
                className="bg-purple-500 text-white py-1 px-2 rounded hover:bg-purple-600"
              >
                Lu
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}