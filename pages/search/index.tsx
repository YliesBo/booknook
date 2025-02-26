import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { FiSearch, FiPlus, FiFilter, FiChevronDown } from 'react-icons/fi';
import BookCard from '../../components/books/BookCard';

type SearchResult = {
  source: 'database' | 'google_books';
  id: string;
  title: string;
  authors: string[];
  thumbnail: string | null;
  publishedDate?: string;
};

type SortOption = 'relevance' | 'title_asc' | 'title_desc' | 'date_asc' | 'date_desc';
type FilterOption = 'all' | 'database' | 'google_books';

export default function Search() {
  const router = useRouter();
  const { q } = router.query;
  const [searchQuery, setSearchQuery] = useState(q as string || '');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState<Record<string, boolean>>({});
  const [sortBy, setSortBy] = useState<SortOption>('relevance');
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
      
      // Au lieu de rediriger, retourner l'ID du livre pour permettre d'ouvrir le sélecteur d'étagère
      return data.book_id;
    } catch (error) {
      console.error('Error importing book:', error);
      alert('Une erreur s\'est produite lors de l\'importation du livre.');
      throw error;
    } finally {
      setImporting(prev => ({ ...prev, [googleBookId]: false }));
    }
  };

  // Fonction pour trier les résultats
  const sortResults = (results: SearchResult[]): SearchResult[] => {
    switch (sortBy) {
      case 'title_asc':
        return [...results].sort((a, b) => a.title.localeCompare(b.title));
      case 'title_desc':
        return [...results].sort((a, b) => b.title.localeCompare(a.title));
      case 'date_asc':
        return [...results].sort((a, b) => {
          if (!a.publishedDate) return 1;
          if (!b.publishedDate) return -1;
          return a.publishedDate.localeCompare(b.publishedDate);
        });
      case 'date_desc':
        return [...results].sort((a, b) => {
          if (!a.publishedDate) return 1;
          if (!b.publishedDate) return -1;
          return b.publishedDate.localeCompare(a.publishedDate);
        });
      default:
        return results; // Par défaut, l'ordre de pertinence
    }
  };

  // Fonction pour filtrer les résultats
  const filterResults = (results: SearchResult[]): SearchResult[] => {
    if (filterBy === 'all') return results;
    return results.filter(result => result.source === filterBy);
  };

  // Mettre à jour la logique d'affichage des résultats
  const displayResults = useCallback(() => {
    const filtered = filterResults(results);
    const sorted = sortResults(filtered);
    return sorted;
  }, [results, filterBy, sortBy]);

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
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
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              Résultats pour "{q}"
            </h2>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Trier par
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="relevance">Pertinence</option>
                    <option value="title_asc">Titre (A-Z)</option>
                    <option value="title_desc">Titre (Z-A)</option>
                    <option value="date_asc">Date (ancien → récent)</option>
                    <option value="date_desc">Date (récent → ancien)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Source
                  </label>
                  <select
                    value={filterBy}
                    onChange={(e) => setFilterBy(e.target.value as FilterOption)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="all">Toutes les sources</option>
                    <option value="database">Ma bibliothèque</option>
                    <option value="google_books">Google Books</option>
                  </select>
                </div>
              </div>
            </div>
          )}
          
          {loading ? (
            <div className="flex justify-center my-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {displayResults().length > 0 ? (
                displayResults().map((result) => (
                  <div key={`${result.source}-${result.id}`} className="rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 relative group">
                    {/* Afficher un badge pour les résultats Google Books */}
                    {result.source === 'google_books' && (
                      <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs px-2 py-1 m-1 rounded-md">
                        Google Books
                      </div>
                    )}
                

                    {/* Lien différent selon la source */}
                    {result.source === 'database' ? (
                      <Link href={`/book/${result.id}`}>
                        <div className="aspect-[2/3] bg-gray-200 relative">
                          {result.thumbnail && (
                            <img 
                              src={result.thumbnail} 
                              alt={result.title}
                              className="object-cover w-full h-full"
                            />
                          )}
                        </div>
                        <div className="p-2">
                          <h3 className="font-medium text-sm line-clamp-1">{result.title}</h3>
                          <p className="text-xs text-gray-600 line-clamp-1">
                            {result.authors.length > 0 
                              ? result.authors.join(', ') 
                              : 'Auteur inconnu'}
                          </p>
                        </div>
                      </Link>
                    ) : (
                      <div>
                        <div className="aspect-[2/3] bg-gray-200 relative">
                          {result.thumbnail && (
                            <img 
                              src={result.thumbnail} 
                              alt={result.title}
                              className="object-cover w-full h-full"
                            />
                          )}
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center transition-all duration-200">
                            <button
                              onClick={() => importBook(result.id)}
                              disabled={importing[result.id]}
                              className="bg-blue-500 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                            >
                              {importing[result.id] ? (
                                <div className="animate-spin h-5 w-5 border-t-2 border-b-2 border-white rounded-full"></div>
                              ) : (
                                <FiPlus size={20} />
                              )}
                            </button>
                          </div>
                        </div>
                        <div className="p-2">
                          <h3 className="font-medium text-sm line-clamp-1">{result.title}</h3>
                          <p className="text-xs text-gray-600 line-clamp-1">
                            {result.authors.length > 0 
                              ? result.authors.join(', ') 
                              : 'Auteur inconnu'}
                          </p>
                        </div>
                      </div>
                    )}
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