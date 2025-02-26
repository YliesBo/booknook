import Link from 'next/link';
import { useRouter } from 'next/router';
import { FiHome, FiSearch, FiUser, FiBook, FiBarChart2 } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';

export default function MobileNavbar() {
  const router = useRouter();
  const { user } = useAuth();

  // Ne pas afficher la barre de navigation mobile sur les pages d'authentification
  if (
    router.pathname === '/auth/login' || 
    router.pathname === '/auth/register' || 
    router.pathname === '/auth/confirm-email'
  ) {
    return null;
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-10">
      <div className="flex justify-around">
        <Link href="/" className={`flex flex-col items-center py-2 text-xs ${
          router.pathname === '/' ? 'text-blue-600' : 'text-gray-600'
        }`}>
          <FiHome size={20} />
          <span>Accueil</span>
        </Link>
        
        <Link href="/search" className={`flex flex-col items-center py-2 text-xs ${
          router.pathname.startsWith('/search') ? 'text-blue-600' : 'text-gray-600'
        }`}>
          <FiSearch size={20} />
          <span>Rechercher</span>
        </Link>
        
        <Link href="/shelves" className={`flex flex-col items-center py-2 text-xs ${
          router.pathname.startsWith('/shelves') ? 'text-blue-600' : 'text-gray-600'
        }`}>
          <FiBook size={20} />
          <span>Étagères</span>
        </Link>
        
        {user ? (
          <>
            <Link href="/profile" className={`flex flex-col items-center py-2 text-xs ${
              router.pathname === '/profile' ? 'text-blue-600' : 'text-gray-600'
            }`}>
              <FiUser size={20} />
              <span>Profil</span>
            </Link>
            
            <Link href="/profile/stats" className={`flex flex-col items-center py-2 text-xs ${
              router.pathname === '/profile/stats' ? 'text-blue-600' : 'text-gray-600'
            }`}>
              <FiBarChart2 size={20} />
              <span>Stats</span>
            </Link>
          </>
        ) : (
          <Link href="/auth/login" className={`flex flex-col items-center py-2 text-xs ${
            router.pathname.startsWith('/auth') ? 'text-blue-600' : 'text-gray-600'
          }`}>
            <FiUser size={20} />
            <span>Connexion</span>
          </Link>
        )}
      </div>
    </nav>
  );
}