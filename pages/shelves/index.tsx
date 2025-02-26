import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useProtectedRoute } from '../../lib/hooks/useProtectedRoute';
import Link from 'next/link';
import { FiPlus, FiBook, FiClock, FiCheckCircle, FiPauseCircle } from 'react-icons/fi';

type Shelf = {
  shelf_id: string;
  shelf_name: string;
  is_system: boolean;
  book_count: number;
};

export default function Shelves() {
  const { user } = useAuth();
  useProtectedRoute();
  
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [loading, setLoading] = useState(true);
  const [newShelfName, setNewShelfName] = useState('');
  const [showNewShelfInput, setShowNewShelfInput] = useState(false);

  useEffect(() => {
    if (user) {
      fetchShelves();
    }
  }, [user]);

  const fetchShelves = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Récupérer les étagères avec le nombre de livres pour chacune
      const { data, error } = await supabase
        .from('shelves')
        .select(`
          shelf_id,
          shelf_name,
          is_system,
          books:bookshelves(count)
        `)
        .eq('user_id', user.id)
        .order('is_system', { ascending: false })
        .order('shelf_name');

      if (error) throw error;
      
      // Transformer les données pour inclure le nombre de livres
      const formattedShelves = data.map(shelf => ({
        shelf_id: shelf.shelf_id,
        shelf_name: shelf.shelf_name,
        is_system: shelf.is_system,
        book_count: shelf.books?.[0]?.count || 0
      }));
      
      setShelves(formattedShelves);
    } catch (error) {
      console.error('Erreur lors de la récupération des étagères :', error);
    } finally {
      setLoading(false);
    }
  };

  const createShelf = async () => {
    if (!user || !newShelfName.trim()) return;
    
    try {
      const { data, error } = await supabase
        .from('shelves')
        .insert({
          user_id: user.id,
          shelf_name: newShelfName.trim(),
          is_system: false,
          is_public: false,
          created_at: new Date().toISOString()
        })
        .select('shelf_id, shelf_name, is_system')
        .single();

      if (error) throw error;
      
      setShelves([...shelves, { ...data, book_count: 0 }]);
      setNewShelfName('');
      setShowNewShelfInput(false);
    } catch (error) {
      console.error('Erreur lors de la création de l\'étagère :', error);
    }
  };

  // Icônes pour les étagères système
  const getShelfIcon = (shelfName: string) => {
    switch (shelfName) {
      case 'To Read':
        return <FiBook size={20} className="text-blue-500" />;
      case 'Reading':
        return <FiClock size={20} className="text-green-500" />;
      case 'Read':
        return <FiCheckCircle size={20} className="text-purple-500" />;
      case 'On Hold':
        return <FiPauseCircle size={20} className="text-yellow-500" />;
      default:
        return <FiBook size={20} className="text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Mes étagères</h1>
        
        <button
          className="bg-blue-500 text-white py-2 px-4 rounded-lg flex items-center"
          onClick={() => setShowNewShelfInput(true)}
        >
          <FiPlus className="mr-2" /> Nouvelle étagère
        </button>
      </div>
      
      {showNewShelfInput && (
        <div className="bg-white p-4 rounded-lg shadow-md mb-6">
          <h2 className="font-medium mb-2">Créer une nouvelle étagère</h2>
          <div className="flex">
            <input
              type="text"
              value={newShelfName}
              onChange={e => setNewShelfName(e.target.value)}
              placeholder="Nom de l'étagère"
              className="flex-1 p-2 border rounded-lg mr-2"
              autoFocus
            />
            <button
              onClick={createShelf}
              className="bg-blue-500 text-white py-2 px-4 rounded-lg"
              disabled={!newShelfName.trim()}
            >
              Créer
            </button>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {shelves.map(shelf => (
          <Link key={shelf.shelf_id} href={`/shelves/${shelf.shelf_id}`}>
            <div className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200">
              <div className="flex items-center">
                {getShelfIcon(shelf.shelf_name)}
                <div className="ml-3">
                  <h2 className="font-medium">{shelf.shelf_name}</h2>
                  <p className="text-sm text-gray-600">
                    {shelf.book_count} livre{shelf.book_count !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
      
      {shelves.length === 0 && (
        <div className="text-center py-10">
          <p className="text-gray-500">
            Vous n'avez pas encore d'étagères. Créez-en une pour commencer à organiser vos livres !
          </p>
        </div>
      )}
    </div>
  );
}