// components/layout/SearchBar.tsx
import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { useRouter } from 'next/router';
import { FiSearch, FiBook, FiUser, FiBookOpen, FiGlobe, FiClock, FiX } from 'react-icons/fi';
import debounce from 'lodash/debounce';

type Suggestion = {
  id: string;
  text: string;
  type: 'title' | 'author' | 'series' | 'google_book' | 'history';
  source: 'database' | 'google_books' | 'history';
  thumbnail?: string | null;
};

// Nombre maximal de recherches récentes à stocker
const MAX_RECENT_SEARCHES = 5;

export default function SearchBar() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionRef = useRef<HTMLDivElement>(null);

  // Charger les recherches récentes depuis localStorage au chargement du composant
  useEffect(() => {
    const storedSearches = localStorage.getItem('recentSearches');
    if (storedSearches) {
      try {
        const parsedSearches = JSON.parse(storedSearches);
        if (Array.isArray(parsedSearches)) {
          setRecentSearches(parsedSearches);
        }
      } catch (error) {
        console.error('Error parsing recent searches:', error);
      }
    }
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      submitSearch(searchQuery);
    }
  };

  // Fonction pour soumettre une recherche et l'ajouter à l'historique
  const submitSearch = (query: string) => {
    if (!query.trim()) return;
    
    // Ajouter à l'historique
    addToRecentSearches(query);
    
    // Fermer les suggestions
    setShowSuggestions(false);
    
    // Rediriger vers la page de recherche
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  // Ajouter une recherche à l'historique
  const addToRecentSearches = (query: string) => {
    // Assurer que la recherche n'est pas vide
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;
    
    // Créer un nouvel array en ajoutant la recherche au début
    const updatedSearches = [
      trimmedQuery,
      ...recentSearches.filter(search => search !== trimmedQuery)
    ].slice(0, MAX_RECENT_SEARCHES);
    
    // Mettre à jour l'état
    setRecentSearches(updatedSearches);
    
    // Sauvegarder dans localStorage
    localStorage.setItem('recentSearches', JSON.stringify(updatedSearches));
  };

  // Supprimer une recherche de l'historique
  const removeFromRecentSearches = (query: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Empêcher la propagation du clic

    const updatedSearches = recentSearches.filter(search => search !== query);
    setRecentSearches(updatedSearches);
    localStorage.setItem('recentSearches', JSON.stringify(updatedSearches));
  };

  // Fonction pour charger les suggestions
  const fetchSuggestions = async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/search-suggestions?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions);
        setActiveIndex(-1); // Réinitialiser l'index actif
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Utiliser debounce pour ne pas envoyer trop de requêtes
  const debouncedFetchSuggestions = useRef(
    debounce(fetchSuggestions, 300)
  ).current;

  useEffect(() => {
    if (searchQuery) {
      debouncedFetchSuggestions(searchQuery);
    } else {
      setSuggestions([]);
    }
  }, [searchQuery, debouncedFetchSuggestions]);

  // Gérer le clic en dehors pour fermer les suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionRef.current && 
        !suggestionRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Gérer la navigation clavier dans les suggestions
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const totalItems = suggestions.length + (searchQuery ? 1 : 0) + // Le bouton "voir tous les résultats" si une recherche est en cours
                       (recentSearches.length > 0 && !searchQuery ? recentSearches.length : 0);

    // Ne rien faire s'il n'y a pas de suggestions ou d'historique
    if (totalItems === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(prev => (prev < totalItems - 1) ? prev + 1 : 0);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(prev => (prev > 0) ? prev - 1 : totalItems - 1);
        break;
      case 'Enter':
        e.preventDefault();
        
        // Si un élément est sélectionné
        if (activeIndex >= 0) {
          // Si c'est dans les suggestions
          if (activeIndex < suggestions.length) {
            handleSuggestionClick(suggestions[activeIndex]);
          } 
          // Si c'est le bouton "voir tous les résultats"
          else if (searchQuery && activeIndex === suggestions.length) {
            submitSearch(searchQuery);
          }
          // Si c'est dans l'historique
          else if (!searchQuery && recentSearches.length > 0) {
            const historyIndex = activeIndex;
            if (historyIndex < recentSearches.length) {
              setSearchQuery(recentSearches[historyIndex]);
              submitSearch(recentSearches[historyIndex]);
            }
          }
        } else {
          // Sinon, faire une recherche normale
          handleSearchSubmit(e as unknown as React.FormEvent);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
    }
  };

  // Rendre le bon icône en fonction du type de suggestion
  const renderSuggestionIcon = (suggestion: Suggestion) => {
    if (suggestion.source === 'history') {
      return <FiClock className="text-gray-500" />;
    } else if (suggestion.source === 'google_books') {
      return <FiGlobe className="text-red-500" />;
    }
    
    switch (suggestion.type) {
      case 'title':
        return <FiBook className="text-blue-500" />;
      case 'author':
        return <FiUser className="text-green-500" />;
      case 'series':
        return <FiBookOpen className="text-purple-500" />;
      default:
        return <FiSearch className="text-gray-400" />;
    }
  };

  // Traiter le clic sur une suggestion
  const handleSuggestionClick = (suggestion: Suggestion) => {
    setSearchQuery(suggestion.text);
    
    // Si c'est une suggestion de l'historique, juste mettre le texte dans l'input
    if (suggestion.source === 'history') {
      setShowSuggestions(true);
      return;
    }
    
    setShowSuggestions(false);
    
    // Ajouter à l'historique
    addToRecentSearches(suggestion.text);
    
    if (suggestion.source === 'google_books') {
      // Pour Google Books, aller à la page de recherche avec le titre comme requête
      router.push(`/search?q=${encodeURIComponent(suggestion.text)}`);
    } else {
      // Pour la base de données
      if (suggestion.type === 'title') {
        router.push(`/book/${suggestion.id}`);
      } else if (suggestion.type === 'author') {
        router.push(`/search?q=${encodeURIComponent(suggestion.text)}`);
      } else if (suggestion.type === 'series') {
        router.push(`/search?q=${encodeURIComponent(suggestion.text)}`);
      }
    }
  };

  // Fonction pour mettre en surbrillance le texte correspondant à la recherche
  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, i) => 
      regex.test(part) ? 
        <span key={i} className="bg-yellow-100 font-medium">{part}</span> : 
        part
    );
  };

  // Rendu de la couverture miniature
  const renderThumbnail = (suggestion: Suggestion) => {
    if (suggestion.source === 'history') {
      return (
        <div className="flex-shrink-0 h-10 w-8 mr-3 flex items-center justify-center">
          <FiClock className="text-gray-500" />
        </div>
      );
    } else if (suggestion.thumbnail) {
      return (
        <div className="flex-shrink-0 h-10 w-8 mr-3 bg-gray-100 rounded overflow-hidden">
          <img 
            src={suggestion.thumbnail}
            alt={suggestion.text}
            className="h-full w-full object-cover"
            onError={(e) => {
              // Fallback en cas d'erreur de chargement
              (e.target as HTMLImageElement).src = '/images/book-placeholder.jpg';
            }}
          />
        </div>
      );
    } else if (suggestion.type === 'title' || suggestion.type === 'google_book') {
      // Placeholder pour les livres sans couverture
      return (
        <div className="flex-shrink-0 h-10 w-8 mr-3 bg-gray-200 rounded flex items-center justify-center">
          <FiBook className="text-gray-400" />
        </div>
      );
    } else {
      // Icône pour les non-livres
      return (
        <div className="flex-shrink-0 h-10 w-8 mr-3 flex items-center justify-center">
          {renderSuggestionIcon(suggestion)}
        </div>
      );
    }
  };

  return (
    <form onSubmit={handleSearchSubmit} className="flex-1 max-w-full relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          placeholder="Rechercher des livres, des auteurs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          className="w-full py-2 pl-10 pr-4 text-sm text-gray-700 bg-gray-100 rounded-full focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
        />
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <FiSearch className="text-gray-400" />
        </div>
        {searchQuery && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              inputRef.current?.focus();
            }}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
          >
            <FiX size={16} />
          </button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && (
        <div 
          ref={suggestionRef}
          className="absolute mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden"
        >
          {loading ? (
            <div className="p-3 text-center text-gray-500">
              <div className="animate-spin inline-block h-4 w-4 border-t-2 border-b-2 border-blue-500 rounded-full mr-2"></div>
              Chargement...
            </div>
          ) : searchQuery.length >= 2 && suggestions.length > 0 ? (
            // Résultats de recherche
            <ul className="max-h-80 overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <li 
                  key={`${suggestion.source}-${suggestion.type}-${suggestion.id}`}
                  onClick={() => handleSuggestionClick(suggestion)}
                  onMouseOver={() => setActiveIndex(index)}
                  className={`px-4 py-2 cursor-pointer flex items-center ${
                    activeIndex === index ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  {/* Miniature de couverture ou icône */}
                  {renderThumbnail(suggestion)}
                  
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {highlightMatch(suggestion.text, searchQuery)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {suggestion.source === 'google_books' ? 'Google Books' : 
                       suggestion.type === 'title' ? 'Livre' : 
                       suggestion.type === 'author' ? 'Auteur' : 'Série'}
                    </div>
                  </div>
                </li>
              ))}
              
              {/* Lien vers la recherche complète */}
              <li 
                onClick={() => submitSearch(searchQuery)}
                onMouseOver={() => setActiveIndex(suggestions.length)}
                className={`px-4 py-2 cursor-pointer text-center text-blue-600 ${
                  activeIndex === suggestions.length ? 'bg-blue-50' : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                Voir tous les résultats pour "{searchQuery}"
              </li>
            </ul>
          ) : recentSearches.length > 0 && !searchQuery ? (
            // Historique des recherches récentes
            <div>
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 bg-gray-50">
                RECHERCHES RÉCENTES
              </div>
              <ul className="max-h-80 overflow-y-auto">
                {recentSearches.map((search, index) => (
                  <li 
                    key={`history-${index}`}
                    onClick={() => {
                      setSearchQuery(search);
                      submitSearch(search);
                    }}
                    onMouseOver={() => setActiveIndex(index)}
                    className={`px-4 py-2 cursor-pointer flex items-center justify-between ${
                      activeIndex === index ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center">
                      <FiClock className="text-gray-500 mr-3" />
                      <span className="text-sm">{search}</span>
                    </div>
                    <button 
                      className="text-gray-400 hover:text-gray-600"
                      onClick={(e) => removeFromRecentSearches(search, e)}
                    >
                      <FiX size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : searchQuery.length >= 2 ? (
            // Aucun résultat pour la recherche
            <div className="p-3 text-center text-gray-500">
              Aucune suggestion trouvée
            </div>
          ) : (
            // Champ vide et pas d'historique
            <div className="p-3 text-center text-gray-500">
              Commencez à taper pour rechercher
            </div>
          )}
        </div>
      )}
    </form>
  );
}