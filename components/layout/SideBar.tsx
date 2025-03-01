import Link from 'next/link';
import { useRouter } from 'next/router';
import { FiHome, FiBook } from 'react-icons/fi';

export default function Sidebar() {
  const router = useRouter();

  return (
    <aside className="fixed top-0 left-0 h-screen w-64 bg-white shadow-md z-30 p-6">
      <Link href="/" className="text-2xl font-bold text-gray-900 mb-10 block">
        LAPAGE
      </Link>
      
      <nav className="space-y-4">
        <Link 
          href="/" 
          className={`flex items-center text-lg p-3 rounded-lg ${
            router.pathname === '/' 
              ? 'bg-blue-50 text-blue-600' 
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <FiHome className="mr-3" /> Accueil
        </Link>
        
        <Link 
          href="/shelves" 
          className={`flex items-center text-lg p-3 rounded-lg ${
            router.pathname.startsWith('/shelves') 
              ? 'bg-blue-50 text-blue-600' 
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <FiBook className="mr-3" /> Étagères
        </Link>
      </nav>
    </aside>
  );
}