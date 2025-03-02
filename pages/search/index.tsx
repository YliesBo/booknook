// pages/search/index.tsx
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { FiSearch, FiFilter, FiChevronDown } from 'react-icons/fi';
import BookCard from '../../components/books/BookCard';

type SearchResult = {
  source: 'database' | 'google_books';
  id: string;
  title: string;
  authors: string[];
  thumbnail: string | null;
  publishedDate?: string;
  seriesInfo?: {
    series: string;
    volume: number | null;
  } | null;
  relevanceScore?: number;
};

type FilterOption = 'all' | 'database' | 'google_books' | 'with_cover';

export default function Search() {
  const router = useRouter();
  const { q } = router.query;
  const [searchQuery, setSearchQuery] = useState(q as string || '');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState<Record<string, boolean>>({});
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (q) {
      setSearchQuery(q as string);
      performSearch(q as string);
    }
  }, [q]);

  const performSearch = async (query: string) => {
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error(`Search API responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      setResults(data.results || []);
    } catch (error) {
      console.error('Error searching:', error);
      setResults([]);
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

  const importBook = async (googleBookId: string) => {
    setImporting(prev => ({ ...prev, [googleBookId]: true }));
    try {
      const response = await fetch('/api/import-book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ googleBookId }),
      });
      
      if (!response.ok) {
        throw new Error(`Import API responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      return data.book_id;
    } catch (error) {
      console.error('Error importing book:', error);
      alert('Une erreur s\'est produite lors de l\'importation du livre.');
      throw error;
    } finally {
      setImporting(prev => ({ ...prev, [googleBookId]: false }));
    }
  };

  // Filtrer les résultats selon les critères sélectionnés
  const filterResults = useCallback((results: SearchResult[]): SearchResult[] => {
    if (filterBy === 'all') {
      return results;
    }
    
    if (filterBy === 'with_cover') {
      return results.filter(result => result.thumbnail !== null);
    }
    
    return results.filter(result => result.source === filterBy);
  }, [filterBy]);

  // Afficher les résultats filtrés
  const displayResults = useCallback(() => {
    return filterResults(results);
  }, [results, filterResults]);

  return (
    <div className="w-full">
      {/* Formulaire de recherche */}
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex items-center">
          <div className="relative flex-grow">
            <input
              type="text"
              placeholder="Rechercher des livres, des auteurs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full py-2 pl-10 pr-4 text-gray-700 bg-gray-100 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="text-gray-400" />
            </div>
          </div>
          <button
            type="submit"
            className="ml-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Rechercher
          </button>
        </div>
      </form>

      {/* Si aucune recherche n'a été faite, nous affichons les suggestions */}
      {!q && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-6 rounded-lg text-white">
            <h3 className="font-bold text-xl mb-3">Rechercher par genre</h3>
            <p className="text-sm mb-4">Explorez des livres par catégorie</p>
            <div className="flex flex-wrap gap-2">
              {['Fantasy', 'Science Fiction', 'Mystery', 'Romance', 'Biography'].map(genre => (
                <Link 
                  key={genre}
                  href={`/search?q=${encodeURIComponent(genre)}`}
                  className="bg-white bg-opacity-20 px-3 py-1 rounded-full text-sm hover:bg-opacity-30 transition-colors"
                >
                  {genre}
                </Link>
              ))}
            </div>
          </div>
          <div className="bg-gradient-to-r from-green-500 to-teal-500 p-6 rounded-lg text-white">
            <h3 className="font-bold text-xl mb-3">Auteurs populaires</h3>
            <p className="text-sm mb-4">Découvrez des livres d'auteurs renommés</p>
            <div className="flex flex-wrap gap-2">
              {['J.K. Rowling', 'Stephen King', 'George R.R. Martin', 'Agatha Christie', 'Haruki Murakami'].map(author => (
                <Link 
                  key={author}
                  href={`/search?q=${encodeURIComponent(author)}`}
                  className="bg-white bg-opacity-20 px-3 py-1 rounded-full text-sm hover:bg-opacity-30 transition-colors"
                >
                  {author}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Résultats de recherche */}
      {q && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div className="text-gray-600">
              {displayResults().length > 0 ? (
                <span>
                  {displayResults().length} résultats pour <span className="font-semibold">"{q}"</span>
                </span>
              ) : (
                <span>Recherche: <span className="font-semibold">"{q}"</span></span>
              )}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center text-sm text-gray-600 hover:text-gray-900"
            >
              <FiFilter className="mr-1" />
              Filtrer
              <FiChevronDown className={`ml-1 transform transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>
          
          {showFilters && (
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Afficher
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setFilterBy('all')}
                    className={`px-3 py-1 rounded-md text-sm ${
                      filterBy === 'all' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                    }`}
                  >
                    Tous les résultats
                  </button>
                  <button
                    onClick={() => setFilterBy('database')}
                    className={`px-3 py-1 rounded-md text-sm ${
                      filterBy === 'database' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                    }`}
                  >
                    Ma bibliothèque
                  </button>
                  <button
                    onClick={() => setFilterBy('google_books')}
                    className={`px-3 py-1 rounded-md text-sm ${
                      filterBy === 'google_books' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                    }`}
                  >
                    Google Books
                  </button>
                  <button
                    onClick={() => setFilterBy('with_cover')}
                    className={`px-3 py-1 rounded-md text-sm ${
                      filterBy === 'with_cover' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                    }`}
                  >
                    Avec couverture
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {loading ? (
            <div className="flex justify-center my-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="book-grid">
              {displayResults().length > 0 ? (
                displayResults().map((result) => (
                  <BookCard
                    key={`${result.source}-${result.id}`}
                    book={{
                      id: result.id,
                      title: result.title,
                      authors: result.authors,
                      thumbnail: result.thumbnail,
                      source: result.source
                    }}
                    onImport={importBook}
                  />
                ))
              ) : (
                <div className="col-span-full text-center text-gray-500 my-12 bg-white p-8 rounded-lg shadow-sm">
                  <p className="mb-4">Aucun livre trouvé pour "{q}".</p>
                  <p>Essayez de rechercher avec des termes différents ou moins spécifiques.</p>
                </div>
              )}
            </div>
          )}
          
          {/* Suggestions liées à la recherche actuelle */}
          {!loading && displayResults().length > 0 && (
            <div className="mt-12 bg-gray-50 p-6 rounded-lg">
              <h2 className="text-lg font-semibold mb-4">Vous pourriez aussi aimer</h2>
              <div className="flex flex-wrap gap-2">
                {['Fantasy', 'Science Fiction', 'Manga', 'Comics', 'Novel'].map(genre => (
                  <Link 
                    key={genre}
                    href={`/search?q=${encodeURIComponent(`${q} ${genre}`)}`}
                    className="bg-white px-3 py-1 rounded-full text-sm border border-gray-200 hover:bg-gray-100 transition-colors"
                  >
                    {q} + {genre}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}