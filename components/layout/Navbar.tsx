import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { FiUser, FiLogOut } from 'react-icons/fi';

export default function Navbar() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fermer le menu au clic en dehors
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    await signOut();
    router.push('/auth/login');
  };

  if (!user) {
    return (
      <Link 
        href="/auth/login"
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
      >
        Connexion
      </Link>
    );
  }

  return (
    <div className="relative">
      <button 
        onClick={() => setMenuOpen(!menuOpen)}
        className="flex items-center text-gray-600 hover:text-gray-900"
      >
        <FiUser size={20} />
      </button>
      
      {menuOpen && (
        <div 
          ref={menuRef} 
          className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-20"
        >
          <Link 
            href="/profile"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={() => setMenuOpen(false)}
          >
            Profil
          </Link>
          <Link 
            href="/shelves"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={() => setMenuOpen(false)}
          >
            Mes étagères
          </Link>
          <Link 
            href="/profile/stats"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={() => setMenuOpen(false)}
          >
            Statistiques
          </Link>
          <button 
            onClick={() => {
              setMenuOpen(false);
              handleLogout();
            }}
            className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
          >
            Déconnexion
          </button>
        </div>
      )}
    </div>
  );
}