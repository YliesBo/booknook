import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { FiSearch, FiPlus, FiFilter, FiChevronDown } from 'react-icons/fi';
import BookCard from '../../components/books/BookCard';
import { 
  SearchResult, 
  calculateRelevanceScore, 
  groupSeriesBooks 
} from '../../lib/search/searchUtils';

type SortOption = 'relevance' | 'title_asc' | 'title_desc' | 'date_asc' | 'date_desc';
type FilterOption = 'all' | 'database' | 'google_books' | 'series';

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
      case 'relevance':
        // Utiliser le score de pertinence précalculé
        return [...results].sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
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
        return results;
    }
  };

  // Fonction pour filtrer les résultats
  const filterResults = (results: SearchResult[]): SearchResult[] => {
    switch (filterBy) {
      case 'all':
        return results;
      case 'database':
        return results.filter(result => result.source === 'database');
      case 'google_books':
        return results.filter(result => result.source === 'google_books');
      case 'series':
        return groupSeriesBooks(results);
      default:
        return results;
    }
  };

  // Mettre à jour la logique d'affichage des résultats
  const displayResults = useCallback(() => {
    const filtered = filterResults(results);
    const sorted = sortResults(filtered);
    return sorted;
  }, [results, filterBy, sortBy]);

  return (
    <div className="w-full">
      {/* Si aucune recherche n'a été faite, nous affichons les suggestions */}
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
            <div className="text-gray-600">
              Résultats pour <span className="font-semibold">"{q}"</span>
              {results.length > 0 && (
                <span className="ml-2 text-sm text-gray-500">
                  {results.length} résultat{results.length !== 1 ? 's' : ''}
                </span>
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
                    <option value="series">Séries de livres</option>
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