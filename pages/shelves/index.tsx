// pages/shelves/index.tsx
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useProtectedRoute } from '../../lib/hooks/useProtectedRoute';
import { supabase } from '../../lib/supabase/supabaseClient';
import Link from 'next/link';
import { FiPlus, FiBook, FiClock, FiCheckCircle, FiPauseCircle, FiEdit2, FiTrash2 } from 'react-icons/fi';

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
  const [editingShelf, setEditingShelf] = useState<string | null>(null);
  const [editShelfName, setEditShelfName] = useState('');

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
        .select('shelf_id, shelf_name, is_system')
        .eq('user_id', user.id)
        .order('is_system', { ascending: false })
        .order('shelf_name');

      if (error) throw error;
      
      // Récupérer le nombre de livres dans chaque étagère
      const shelvesWithCount = await Promise.all(
        data.map(async (shelf) => {
          const { count } = await supabase
            .from('bookshelves')
            .select('*', { count: 'exact', head: true })
            .eq('shelf_id', shelf.shelf_id)
            .eq('user_id', user.id);
          
          return {
            ...shelf,
            book_count: count || 0
          };
        })
      );
      
      setShelves(shelvesWithCount);
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

  const updateShelfName = async (shelfId: string) => {
    if (!user || !editShelfName.trim()) return;
    
    try {
      const { error } = await supabase
        .from('shelves')
        .update({ 
          shelf_name: editShelfName.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('shelf_id', shelfId)
        .eq('user_id', user.id);

      if (error) throw error;
      
      setShelves(
        shelves.map(shelf => 
          shelf.shelf_id === shelfId 
            ? { ...shelf, shelf_name: editShelfName.trim() }
            : shelf
        )
      );
      
      setEditingShelf(null);
      setEditShelfName('');
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'étagère :', error);
    }
  };

  const deleteShelf = async (shelfId: string) => {
    if (!user || !confirm('Êtes-vous sûr de vouloir supprimer cette étagère ?')) return;
    
    try {
      // Supprimer d'abord les références dans bookshelves
      await supabase
        .from('bookshelves')
        .delete()
        .eq('shelf_id', shelfId)
        .eq('user_id', user.id);
      
      // Ensuite supprimer l'étagère
      const { error } = await supabase
        .from('shelves')
        .delete()
        .eq('shelf_id', shelfId)
        .eq('user_id', user.id);

      if (error) throw error;
      
      setShelves(shelves.filter(shelf => shelf.shelf_id !== shelfId));
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'étagère :', error);
    }
  };

  // Icônes pour les étagères système
  const getShelfIcon = (shelfName: string, isSystem: boolean) => {
    if (!isSystem) return <FiBook size={20} className="text-gray-500" />;
    
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
      
      <div className="grid grid-cols-1 gap-4">
        {shelves.map(shelf => (
          <div key={shelf.shelf_id} className="bg-white p-4 rounded-lg shadow-md flex items-center justify-between">
            <div className="flex items-center">
              {getShelfIcon(shelf.shelf_name, shelf.is_system)}
              <div className="ml-3">
                {editingShelf === shelf.shelf_id ? (
                  <div className="flex items-center">
                    <input
                      type="text"
                      value={editShelfName}
                      onChange={e => setEditShelfName(e.target.value)}
                      className="p-1 border rounded mr-2"
                      autoFocus
                    />
                    <button
                      onClick={() => updateShelfName(shelf.shelf_id)}
                      className="text-blue-500 hover:text-blue-700 mr-2"
                    >
                      <FiCheckCircle size={18} />
                    </button>
                    <button
                      onClick={() => {
                        setEditingShelf(null);
                        setEditShelfName('');
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <FiTrash2 size={18} />
                    </button>
                  </div>
                ) : (
                  <h2 className="font-medium">{shelf.shelf_name}</h2>
                )}
                <p className="text-sm text-gray-600">
                  {shelf.book_count} livre{shelf.book_count !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            
            <div className="flex items-center">
              <Link href={`/shelves/${shelf.shelf_id}`} className="bg-gray-100 hover:bg-gray-200 py-2 px-4 rounded-lg mr-2">
                Voir
              </Link>
              
              {!shelf.is_system && (
                <div className="flex">
                  <button
                    onClick={() => {
                      setEditingShelf(shelf.shelf_id);
                      setEditShelfName(shelf.shelf_name);
                    }}
                    className="text-gray-500 hover:text-gray-700 mr-2"
                  >
                    <FiEdit2 size={18} />
                  </button>
                  <button
                    onClick={() => deleteShelf(shelf.shelf_id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <FiTrash2 size={18} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {shelves.length === 0 && (
        <div className="text-center py-10 bg-white rounded-lg shadow-md">
          <p className="text-gray-500">
            Vous n'avez pas encore d'étagères. Créez-en une pour commencer à organiser vos livres !
          </p>
        </div>
      )}
    </div>
  );
}