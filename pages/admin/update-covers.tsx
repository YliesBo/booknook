// pages/admin/update-covers.tsx
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useProtectedRoute } from '../../lib/hooks/useProtectedRoute';
import Link from 'next/link';
import { FiArrowLeft, FiRefreshCw } from 'react-icons/fi';

type UpdateResult = {
  book_id: string;
  status: 'updated' | 'skipped' | 'error';
  title?: string;
  message?: string;
};

export default function UpdateCovers() {
  const { user } = useAuth();
  useProtectedRoute();
  
  const [bookId, setBookId] = useState('');
  const [results, setResults] = useState<UpdateResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  const handleUpdateCovers = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      const response = await fetch('/api/update-book-covers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bookId: bookId.trim() || undefined }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Une erreur est survenue');
      }
      
      setMessage(data.message);
      setResults(data.results || []);
    } catch (error: any) {
      setError(error.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      <div className="flex items-center mb-6">
        <Link href="/admin" className="text-gray-600 hover:text-gray-900 mr-3">
          <FiArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold">Mise à jour des couvertures de livres</h1>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <p className="mb-4">
          Cet outil permet de mettre à jour les couvertures des livres en utilisant l'API Open Library pour obtenir des images de meilleure qualité.
        </p>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ID du livre (optionnel)
          </label>
          <div className="flex">
            <input
              type="text"
              value={bookId}
              onChange={(e) => setBookId(e.target.value)}
              placeholder="Laissez vide pour mettre à jour plusieurs livres"
              className="flex-1 p-2 border rounded-md mr-2"
            />
            <button
              onClick={handleUpdateCovers}
              disabled={loading}
              className="bg-blue-500 text-white py-2 px-4 rounded-md flex items-center"
            >
              {loading ? (
                <>
                  <FiRefreshCw className="animate-spin mr-2" /> En cours...
                </>
              ) : (
                <>
                  <FiRefreshCw className="mr-2" /> Mettre à jour
                </>
              )}
            </button>
          </div>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
            {error}
          </div>
        )}
        
        {message && (
          <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md">
            {message}
          </div>
        )}
        
        {results.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-2">Résultats :</h2>
            <div className="border rounded-md overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Livre</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Message</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {results.map((result) => (
                    <tr key={result.book_id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link href={`/book/${result.book_id}`} className="text-blue-600 hover:underline">
                          {result.title || result.book_id}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          result.status === 'updated' ? 'bg-green-100 text-green-800' :
                          result.status === 'skipped' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {result.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {result.message || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}