import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase/supabaseClient';
import Link from 'next/link';
import { FiSearch } from 'react-icons/fi';

// Types simplifiés
type Book = {
  book_id: string;
  title: string;
  thumbnail: string | null;
  authorNames: string[];
};

export default function Search() {
  const router = useRouter();
  const { q } = router.query;
  const [searchQuery, setSearchQuery] = useState(q as string || '');
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (q) {
      setSearchQuery(q as string);
      searchBooks(q as string);
    }
  }, [q]);

  const searchBooks = async (query: string) => {
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      // Rechercher les livres
      const { data: booksData, error } = await supabase
        .from('books')
        .select('book_id, title, thumbnail')
        .ilike('title', `%${query}%`)
        .limit(20);

      if (error) throw error;
      
      // Si aucun livre trouvé, retourner une liste vide
      if (!booksData || booksData.length === 0) {
        setBooks([]);
        setLoading(false);
        return;
      }
      
      // Récupérer les auteurs pour chaque livre
      const searchResults: Book[] = [];
      
      for (const book of booksData) {
        // Récupérer les auteurs liés à ce livre
        const { data: authorsData } = await supabase
          .from('book_authors')
          .select('author_id')
          .eq('book_id', book.book_id);
        
        const authorNames: string[] = [];
        
        // Récupérer les noms des auteurs
        if (authorsData && authorsData.length > 0) {
          for (const authorEntry of authorsData) {
            const { data: authorData } = await supabase
              .from('authors')
              .select('author_name')
              .eq('author_id', authorEntry.author_id)
              .single();
            
            if (authorData && authorData.author_name) {
              authorNames.push(authorData.author_name);
            }
          }
        }
        
        searchResults.push({
          book_id: book.book_id,
          title: book.title,
          thumbnail: book.thumbnail,
          authorNames
        });
      }
      
      setBooks(searchResults);
    } catch (error) {
      console.error('Erreur lors de la recherche :', error);
      setBooks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Recherche</h1>
      
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher des livres, des auteurs..."
            className="w-full p-3 pl-10 text-gray-700 bg-white border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiSearch className="text-gray-400" />
          </div>
          <button
            type="submit"
            className="absolute right-2 top-2 bg-blue-500 text-white px-4 py-1 rounded-full hover:bg-blue-600"
          >
            Rechercher
          </button>
        </div>
      </form>

      {/* Suggestions de recherche (genres, etc.) */}
      {!q && (
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-4 rounded-lg text-white">
            <h3 className="font-bold mb-2">Rechercher par genre</h3>
            <p className="text-sm">Explorez des livres par catégorie</p>
          </div>
          <div className="bg-gradient-to-r from-green-500 to-teal-500 p-4 rounded-lg text-white">
            <h3 className="font-bold mb-2">Rechercher par ambiance</h3>
            <p className="text-sm">Trouvez des livres selon votre humeur</p>
          </div>
        </div>
      )}

      {/* Résultats de recherche */}
      {q && (
        <div>
          <h2 className="text-xl font-semibold mb-4">
            Résultats pour "{q}"
          </h2>
          
          {loading ? (
            <div className="flex justify-center my-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {books.length > 0 ? (
                books.map((book) => (
                  <div key={book.book_id} className="rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
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
                  </div>
                ))
              ) : (
                <p className="col-span-full text-center text-gray-500 my-12">
                  Aucun livre trouvé pour "{q}".
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}