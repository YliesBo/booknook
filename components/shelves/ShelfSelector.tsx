// components/shelves/ShelfSelector.tsx
import { useState, useEffect, useRef } from 'react';
import { FiBookmark, FiCheck, FiPlus } from 'react-icons/fi';
import { supabase } from '../../lib/supabase/supabaseClient';
import { useAuth } from '../../context/AuthContext';

type Shelf = {
  shelf_id: string;
  shelf_name: string;
  is_system: boolean;
};

type ShelfSelectorProps = {
  bookId: string;
  onClose?: () => void;
};

export default function ShelfSelector({ bookId, onClose }: ShelfSelectorProps) {
    const { user } = useAuth();
    const [shelves, setShelves] = useState<Shelf[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedShelves, setSelectedShelves] = useState<string[]>([]);
    const [newShelfName, setNewShelfName] = useState('');
    const [showNewShelfInput, setShowNewShelfInput] = useState(false);
    const [addingToShelf, setAddingToShelf] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
  
    useEffect(() => {
      if (user) {
        fetchShelves();
        fetchCurrentShelves();
      }
    }, [user, bookId]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose?.();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const fetchShelves = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('shelves')
        .select('shelf_id, shelf_name, is_system')
        .eq('user_id', user.id)
        .eq('is_system', false) // Ne récupérer que les étagères personnalisées
        .order('shelf_name');

      if (error) throw error;
      setShelves(data || []);
    } catch (error) {
      console.error('Erreur lors de la récupération des étagères :', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentShelves = async () => {
    if (!user || !bookId) return;
    
    try {
      const { data, error } = await supabase
        .from('bookshelves')
        .select('shelf_id')
        .eq('user_id', user.id)
        .eq('book_id', bookId);

      if (error) throw error;
      
      // Extraire les IDs des étagères
      const shelfIds = data.map(item => item.shelf_id);
      setSelectedShelves(shelfIds);
    } catch (error) {
      console.error('Erreur lors de la vérification des étagères :', error);
    }
  };

  const toggleShelf = async (shelfId: string) => {
    if (!user || !bookId) return;
    
    setAddingToShelf(true);
    try {
      const isSelected = selectedShelves.includes(shelfId);
      
      if (isSelected) {
        // Retirer le livre de l'étagère
        const { error } = await supabase
          .from('bookshelves')
          .delete()
          .eq('user_id', user.id)
          .eq('book_id', bookId)
          .eq('shelf_id', shelfId);

        if (error) throw error;
        
        setSelectedShelves(selectedShelves.filter(id => id !== shelfId));
      } else {
        // Ajouter le livre à l'étagère
        const { error } = await supabase
          .from('bookshelves')
          .insert({
            user_id: user.id,
            book_id: bookId,
            shelf_id: shelfId,
            date_added: new Date().toISOString()
          });

        if (error) throw error;
        
        setSelectedShelves([...selectedShelves, shelfId]);
      }
    } catch (error) {
      console.error('Erreur lors de la modification de l\'étagère :', error);
    } finally {
      setAddingToShelf(false);
    }
  };

  const addToShelf = async (shelfId: string) => {
    if (!user || !bookId) return;
    
    setAddingToShelf(true);
    try {
      // Vérifions si le livre est déjà sur cette étagère
      const isAlreadyOnShelf = selectedShelves.includes(shelfId);
      
      if (isAlreadyOnShelf) {
        // Si le livre est déjà sur cette étagère, on le retire
        await supabase
          .from('bookshelves')
          .delete()
          .eq('user_id', user.id)
          .eq('book_id', bookId)
          .eq('shelf_id', shelfId);
          
        setSelectedShelves(selectedShelves.filter(id => id !== shelfId));
      } else {
        // Sinon, on ajoute le livre à l'étagère
        const { error } = await supabase
          .from('bookshelves')
          .insert({
            user_id: user.id,
            book_id: bookId,
            shelf_id: shelfId,
            date_added: new Date().toISOString()
          });
  
        if (error) throw error;
        setSelectedShelves([...selectedShelves, shelfId]);
      }
      
      onClose?.();
    } catch (error) {
      console.error('Erreur lors de l\'ajout à l\'étagère :', error);
    } finally {
      setAddingToShelf(false);
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
      
      setShelves([...shelves, data]);
      setNewShelfName('');
      setShowNewShelfInput(false);
    } catch (error) {
      console.error('Erreur lors de la création de l\'étagère :', error);
    }
  };

  if (!user) {
    return (
      <div ref={dropdownRef} className="bg-white rounded-lg shadow-lg p-4 w-64">
        <p className="text-center text-gray-600">
          Connectez-vous pour ajouter des livres à vos étagères.
        </p>
      </div>
    );
  }

  return (
    <div ref={dropdownRef} className="bg-white rounded-lg shadow-lg p-4 w-64">
      <h3 className="font-medium mb-3">Ajouter à une étagère</h3>
      
      {loading ? (
        <div className="flex justify-center py-4">
          <div className="animate-spin h-5 w-5 border-t-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {shelves.length > 0 ? (
            shelves.map(shelf => (
              <button
                key={shelf.shelf_id}
                className={`flex items-center justify-between w-full p-2 rounded-md ${
                  selectedShelves.includes(shelf.shelf_id) 
                    ? 'bg-blue-50 text-blue-600' 
                    : 'hover:bg-gray-100 text-black'
                }`}
                onClick={() => toggleShelf(shelf.shelf_id)}
                disabled={addingToShelf}
              >
                <span>{shelf.shelf_name}</span>
                {selectedShelves.includes(shelf.shelf_id) && <FiCheck className="text-blue-600" />}
              </button>
            ))
          ) : (
            <p className="text-center text-gray-500">
              Vous n'avez pas encore d'étagères personnalisées.
            </p>
          )}
          
          {showNewShelfInput ? (
            <div className="p-2 border-t">
              <div className="flex items-center">
                <input
                  type="text"
                  value={newShelfName}
                  onChange={e => setNewShelfName(e.target.value)}
                  placeholder="Nom de l'étagère"
                  className="flex-1 p-1 border rounded-md text-black"
                  autoFocus
                />
                <button
                  onClick={createShelf}
                  className="ml-2 bg-blue-500 text-white p-1 rounded-md"
                  disabled={!newShelfName.trim()}
                >
                  <FiCheck size={18} />
                </button>
              </div>
            </div>
          ) : (
            <button
              className="flex items-center p-2 text-blue-600 w-full"
              onClick={() => setShowNewShelfInput(true)}
            >
              <FiPlus className="mr-2" />
              Créer une nouvelle étagère
            </button>
          )}
        </div>
      )}
    </div>
  );
}