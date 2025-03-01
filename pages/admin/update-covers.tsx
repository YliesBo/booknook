// pages/admin/update-covers.tsx
import Link from 'next/link';
import { FiArrowLeft } from 'react-icons/fi';

export default function UpdateCovers() {
  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      <div className="flex items-center mb-6">
        <Link href="/admin" className="text-gray-600 hover:text-gray-900 mr-3">
          <FiArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold">Mise à jour des couvertures de livres</h1>
      </div>
      
      <div className="bg-yellow-50 p-6 rounded-lg shadow-md border border-yellow-200">
        <h2 className="text-xl font-semibold mb-4 text-yellow-800">Fonctionnalité désactivée</h2>
        <p className="text-yellow-700 mb-4">
          Cette fonctionnalité est temporairement désactivée car nous n'utilisons plus l'API OpenLibrary pour les couvertures de livres.
        </p>
        <p className="text-yellow-700">
          Nous utilisons maintenant directement les couvertures fournies par Google Books.
        </p>
      </div>
    </div>
  );
}