// pages/admin/covers.tsx
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useProtectedRoute } from '../../lib/hooks/useProtectedRoute';
import Link from 'next/link';
import { FiArrowLeft, FiRefreshCw } from 'react-icons/fi';

type UpdateResult = {
  book_id: string;
  title: string;
  status: 'updated' | 'skipped' | 'error';
  message?: string;
  old_cover?: string | null;
  new_cover?: string | null;
};

export default function UpdateCovers() {
  const { user } = useAuth();
  useProtectedRoute();
  
  const [limit, setLimit] = useState(10);
  const [startFrom, setStartFrom] = useState(0);
  const [results, setResults] = useState<UpdateResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [stats, setStats] = useState<{ updated: number; total: number } | null>(null);
  
  const handleUpdateCovers = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/update-covers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ limit, startFrom }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Une erreur est survenue');
      }
      
      setMessage(data.message);
      setResults(data.results || []);
      setStats({
        updated: data.updated,
        total: data.total
      });
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
          Cet outil permet de mettre à jour les couvertures des livres en utilisant Open Library pour obtenir des images de meilleure qualité.
        </p>
        
        <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre de livres à traiter
            </label>
            <input
              type="number"
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value))}
              className="w-full p-2 border rounded-md"
              min="1" 
              max="50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Commencer à partir de l'index
            </label>
            <input
              type="number"
              value={startFrom}
              onChange={(e) => setStartFrom(parseInt(e.target.value))}
              className="w-full p-2 border rounded-md"
              min="0"
            />
          </div>
        </div>
        
        <button
          onClick={handleUpdateCovers}
          disabled={loading}
          className="bg-blue-500 text-white py-2 px-4 rounded-md flex items-center"
        >
          {loading ? (
            <>
              <FiRefreshCw className="animate-spin mr-2" /> Mise à jour en cours...
            </>
          ) : (
            <>
              <FiRefreshCw className="mr-2" /> Mettre à jour les couvertures
            </>
          )}
        </button>
        
        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md">
            {error}
          </div>
        )}
        
        {message && (
          <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-md">
            {message}
          </div>
        )}
        
        {stats && (
          <div className="mt-4 p-3 bg-blue-50 text-blue-700 rounded-md">
            {stats.updated} couvertures mises à jour sur {stats.total} livres ({Math.round(stats.updated / stats.total * 100)}%)
          </div>
        )}
      </div>
      
      {results.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Résultats détaillés :</h2>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Livre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Détails</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {results.map((result) => (
                  <tr key={result.book_id}>
                    <td className="px-6 py-4">
                      <Link href={`/book/${result.book_id}`} className="text-blue-600 hover:underline">
                        {result.title}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        result.status === 'updated' ? 'bg-green-100 text-green-800' :
                        result.status === 'skipped' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {result.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {result.message && <p className="text-sm text-gray-500">{result.message}</p>}
                      
                      {result.status === 'updated' && (
                        <div className="flex items-center space-x-2 mt-2">
                          <div className="w-12 h-16 bg-gray-100">
                            {result.old_cover && (
                              <img src={result.old_cover} alt="Ancienne couverture" className="w-full h-full object-cover" />
                            )}
                          </div>
                          <span className="text-gray-500">→</span>
                          <div className="w-12 h-16 bg-gray-100">
                            {result.new_cover && (
                              <img src={result.new_cover} alt="Nouvelle couverture" className="w-full h-full object-cover" />
                            )}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {results.length >= limit && (
            <div className="mt-4 flex justify-between">
              <button
                onClick={() => {
                  if (startFrom >= limit) {
                    setStartFrom(startFrom - limit);
                  }
                }}
                disabled={startFrom < limit}
                className="bg-gray-200 text-gray-700 py-2 px-4 rounded-md disabled:opacity-50"
              >
                Précédent
              </button>
              
              <button
                onClick={() => {
                  setStartFrom(startFrom + limit);
                }}
                className="bg-blue-500 text-white py-2 px-4 rounded-md"
              >
                Suivant
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}