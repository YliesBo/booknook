import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';
import { FiSearch, FiHome, FiUser, FiLogOut, FiBook, FiMenu } from 'react-icons/fi';

export default function Navbar() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Gérer le focus de l'input de recherche lorsqu'on l'ouvre
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  // Fermer le menu mobile au clic en dehors
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    router.push('/auth/login');
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-white shadow-sm z-10">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo et navigation gauche */}
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-gray-900">
              LAPAGE
            </Link>
            
            <nav className="hidden md:flex ml-10 space-x-8">
              <Link 
                href="/" 
                className={`flex items-center text-gray-600 hover:text-gray-900 ${
                  router.pathname === '/' ? 'text-blue-600 font-medium' : ''
                }`}
              >
                <FiHome className="mr-1" /> Accueil
              </Link>
              <Link 
                href="/shelves" 
                className={`flex items-center text-gray-600 hover:text-gray-900 ${
                  router.pathname.startsWith('/shelves') ? 'text-blue-600 font-medium' : ''
                }`}
              >
                <FiBook className="mr-1" /> Étagères
              </Link>
            </nav>
          </div>

          {/* Barre de recherche */}
          <div className="flex-1 max-w-md mx-4 relative">
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Rechercher des livres, des auteurs..."
                className={`w-full py-2 pl-10 pr-4 text-sm text-gray-700 bg-gray-100 rounded-full focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all ${
                  searchOpen ? 'opacity-100' : 'md:opacity-100 opacity-0'
                }`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch className="text-gray-400" />
              </div>
            </form>
          </div>

          {/* Navigation droite */}
          <div className="flex items-center space-x-4">
            <button 
              className="md:hidden text-gray-600 hover:text-gray-900"
              onClick={() => setSearchOpen(!searchOpen)}
            >
              <FiSearch size={20} />
            </button>
            
            {user ? (
              <div className="relative">
                <button 
                  className="text-gray-600 hover:text-gray-900 flex items-center"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                  <FiUser size={20} className="md:mr-2" />
                  <span className="hidden md:block">Mon compte</span>
                </button>
                
                {mobileMenuOpen && (
                  <div 
                    ref={mobileMenuRef} 
                    className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-20"
                  >
                    <Link 
                      href="/profile"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Profil
                    </Link>
                    <Link 
                      href="/shelves"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Mes étagères
                    </Link>
                    <Link 
                      href="/profile/stats"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Statistiques
                    </Link>
                    <button 
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handleLogout();
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                    >
                      Déconnexion
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link 
                href="/auth/login"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Connexion
              </Link>
            )}
            
            <button 
              className="md:hidden text-gray-600 hover:text-gray-900"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <FiMenu size={20} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}