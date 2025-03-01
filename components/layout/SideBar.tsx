// components/layout/SideBar.tsx
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FiHome, FiBook } from 'react-icons/fi';

export default function Sidebar() {
  const router = useRouter();

  return (
    <aside className="fixed top-0 left-0 h-screen w-[72px] bg-white shadow-md z-30 p-3 flex flex-col items-center">
      <Link href="/" className="text-xl font-bold text-gray-900 mb-10 block">
        <span className="sr-only">LAPAGE</span>
        {/* Logo/Initiale du site */}
        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white">
          L
        </div>
      </Link>
      
      <nav className="space-y-6 flex flex-col items-center w-full">
        <Link 
          href="/" 
          className={`flex flex-col items-center justify-center p-3 rounded-lg w-12 h-12 ${
            router.pathname === '/' 
              ? 'bg-blue-50 text-blue-600' 
              : 'text-gray-600 hover:bg-gray-100'
          }`}
          title="Accueil"
        >
          <FiHome className="text-xl" />
          <span className="sr-only">Accueil</span>
        </Link>
        
        <Link 
          href="/shelves" 
          className={`flex flex-col items-center justify-center p-3 rounded-lg w-12 h-12 ${
            router.pathname.startsWith('/shelves') 
              ? 'bg-blue-50 text-blue-600' 
              : 'text-gray-600 hover:bg-gray-100'
          }`}
          title="Étagères"
        >
          <FiBook className="text-xl" />
          <span className="sr-only">Étagères</span>
        </Link>
      </nav>
    </aside>
  );
}