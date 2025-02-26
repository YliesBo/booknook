// pages/shelves/[id].tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useProtectedRoute } from '../../lib/hooks/useProtectedRoute';
import Link from 'next/link';
import { FiArrowLeft, FiTrash2 } from 'react-icons/fi';

type ShelfBook = {
  book_id: string;
  title: string;
  thumbnail: string | null;
  authorNames: string[];
  date_added: string;
};

type ShelfDetails = {
  shelf_id: string;
  shelf_name: string;
  is_system: boolean;
};

export default function ShelfDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();
  useProtectedRoute();
  
  const [shelf, setShelf] = useState<ShelfDetails | null>(null);
  const [books, setBooks] = useState<ShelfBook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && id) {
      fetchShelfDetails(id as string);
      fetchShelfBooks(id as string);
    }
  }, [user, id]);

  const fetchShelfDetails = async (shelfId: string) => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('shelves')
        .select('shelf_id, shelf_name, is_system')
        .eq('user_id', user.id)
        .eq('shelf_id', shelfId)
        .single();

      if (error) throw error;
      setShelf(data);
    } catch (error) {
      console.error('Erreur lors de la récupération des détails de l\'étagère :', error);
      router.push('/shelves');
    }
  };

  const fetchShelfBooks = async (shelfId: string) => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data: bookshelvesData, error } = await supabase
        .from('bookshelves')
        .select('book_id, date_added')
        .eq('user_id', user.id)
        .eq('shelf_id', shelfId);

      if (error) throw error;
      
      // Pour chaque référence, récupérer les détails du livre
      const booksDetails: ShelfBook[] = [];
      
      for (const item of bookshelvesData || []) {
        // Récupérer les infos du livre
        const { data: bookData } = await supabase
          .from('books')
          .select('book_id, title, thumbnail')
          .eq('book_id', item.book_id)
          .single();
        
        if (bookData) {
          // Récupérer les auteurs du livre
          const { data: authorsData } = await supabase
            .from('book_authors')
            .select('author_id')
            .eq('book_id', item.book_id);
          
          const authorNames: string[] = [];
          for (const authorEntry of authorsData || []) {
            const { data: authorData } = await supabase
              .from('authors')
              .select('author_name')
              .eq('author_id', authorEntry.author_id)
              .single();
            
            if (authorData?.author_name) {
              authorNames.push(authorData.author_name);
            }
          }
          
          booksDetails.push({
            book_id: bookData.book_id,
            title: bookData.title,
            thumbnail: bookData.thumbnail,
            authorNames,
            date_added: item.date_added
          });
        }
      }
      
      setBooks(booksDetails);
    } catch (error) {
      console.error('Erreur lors de la récupération des livres :', error);
    } finally {
      setLoading(false);
    }
  };

  const removeBookFromShelf = async (bookId: string) => {
    if (!user || !id) return;
    
    try {
      const { error } = await supabase
        .from('bookshelves')
        .delete()
        .eq('user_id', user.id)
        .eq('shelf_id', id)
        .eq('book_id', bookId);

      if (error) throw error;
      
      // Mettre à jour la liste des livres
      setBooks(books.filter(book => book.book_id !== bookId));
    } catch (error) {
      console.error('Erreur lors de la suppression du livre :', error);
    }
  };

  if (loading && !shelf) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!shelf) {
    return (
      <div className="max-w-4xl mx-auto py-10 px-4">
        <h1 className="text-2xl font-bold text-center">Étagère non trouvée</h1>
        <p className="text-center mt-4">
          <Link href="/shelves" className="text-blue-600 hover:underline">
            Retour à mes étagères
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Link href="/shelves" className="text-gray-600 hover:text-gray-900 mr-3">
            <FiArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold">{shelf.shelf_name}</h1>
          <span className="ml-2 text-gray-500">
            {books.length} livre{books.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center my-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div>
          {books.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {books.map((book) => (
                <div key={book.book_id} className="relative group rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
                  <Link href={`/book/${book.book_id}`}>
                    <div className="aspect-[2/3] bg-gray-200 relative">
                      {book.thumbnail && (
                        <img 
                          src={book.thumbnail} 
                          alt={book.title}
                          className="object-cover w-full h-full"
                        />
                      )}
                    </div>
                    <div className="p-2">
                      <h3 className="font-medium text-sm line-clamp-1">{book.title}</h3>
                      <p className="text-xs text-gray-600 line-clamp-1">
                        {book.authorNames.length > 0 
                          ? book.authorNames.join(', ') 
                          : 'Auteur inconnu'}
                      </p>
                    </div>
                  </Link>
                  
                  {/* Bouton de suppression au survol */}
                  <button
                    className="absolute top-0 right-0 p-1 m-2 bg-black bg-opacity-50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeBookFromShelf(book.book_id)}
                    title="Retirer de l'étagère"
                  >
                    <FiTrash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 bg-white rounded-lg shadow-md">
              <p className="text-gray-500">
                Cette étagère est vide. Ajoutez des livres pour commencer !
              </p>
              <Link href="/" className="mt-4 inline-block text-blue-600 hover:underline">
                Parcourir des livres
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}