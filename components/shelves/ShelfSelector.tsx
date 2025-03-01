// components/shelves/ShelfSelector.tsx
import { useState, useEffect, useRef } from 'react';
import { FiBookmark, FiCheck, FiPlus, FiX } from 'react-icons/fi';
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
  const [error, setError] = useState<string | null>(null);
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
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('../../pages/api/shelves/get-user-shelves', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      const result = await response.json();
      setShelves(result.shelves || []);
    } catch (error) {
      console.error('Erreur lors de la récupération des étagères :', error);
      setError('Impossible de charger vos étagères. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentShelves = async () => {
    if (!user || !bookId) return;
    
    try {
      const response = await fetch(`../../pages/api/shelves/get-book-shelves?bookId=${bookId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      const result = await response.json();
      setSelectedShelves(result.shelfIds || []);
    } catch (error) {
      console.error('Erreur lors de la vérification des étagères :', error);
      // Ne pas afficher cette erreur à l'utilisateur, juste pour le logging
    }
  };

  const toggleShelf = async (shelfId: string) => {
    if (!user || !bookId) return;
    
    setAddingToShelf(true);
    setError(null);
    
    try {
      const isSelected = selectedShelves.includes(shelfId);
      
      const response = await fetch('../../pages/api/shelves/toggle-book-shelf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          bookId,
          shelfId,
          action: isSelected ? 'remove' : 'add'
        })
      });
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      // Mettre à jour l'état local
      if (isSelected) {
        setSelectedShelves(selectedShelves.filter(id => id !== shelfId));
      } else {
        setSelectedShelves([...selectedShelves, shelfId]);
      }
    } catch (error) {
      console.error('Erreur lors de la modification de l\'étagère :', error);
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setAddingToShelf(false);
    }
  };

  const createShelf = async () => {
    if (!user || !newShelfName.trim()) return;
    
    setAddingToShelf(true);
    setError(null);
    
    try {
      const response = await fetch('../../pages/api/shelves/create-shelf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          shelfName: newShelfName.trim()
        })
      });
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Ajouter la nouvelle étagère à la liste
      setShelves([...shelves, result.shelf]);
      setNewShelfName('');
      setShowNewShelfInput(false);
    } catch (error) {
      console.error('Erreur lors de la création de l\'étagère :', error);
      setError('Impossible de créer l\'étagère. Veuillez réessayer.');
    } finally {
      setAddingToShelf(false);
    }
  };

  if (!user) {
    return (
      <div ref={dropdownRef} className="bg-white rounded-lg shadow-lg p-4 w-64">
        <p className="text-center text-black">
          Connectez-vous pour ajouter des livres à vos étagères.
        </p>
      </div>
    );
  }

  return (
    <div ref={dropdownRef} className="bg-white rounded-lg shadow-lg p-4 w-64">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-medium text-black">Ajouter à une étagère</h3>
        {onClose && (
          <button 
            onClick={onClose}
            className="text-gray-600 hover:text-gray-900"
          >
            <FiX size={18} />
          </button>
        )}
      </div>
      
      {error && (
        <div className="mb-3 text-sm text-red-600 bg-red-50 p-2 rounded-md">
          {error}
        </div>
      )}
      
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
                  disabled={!newShelfName.trim() || addingToShelf}
                >
                  <FiCheck size={18} />
                </button>
              </div>
            </div>
          ) : (
            <button
              className="flex items-center p-2 text-blue-600 w-full"
              onClick={() => setShowNewShelfInput(true)}
              disabled={addingToShelf}
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