// components/books/ReadingStatusSelector.tsx
import { useState, useEffect } from 'react';
import { FiCheck, FiClock, FiBook, FiX } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { 
  ReadingStatus, 
  readingStatusLabels, 
  getReadingStatus, 
  setReadingStatus 
} from '../../lib/reading/readingStatusUtils';

type ReadingStatusSelectorProps = {
  bookId: string;
  onClose?: () => void;
  onStatusChange?: (status: ReadingStatus | null) => void;
};

export default function ReadingStatusSelector({ 
  bookId, 
  onClose, 
  onStatusChange 
}: ReadingStatusSelectorProps) {
  const { user } = useAuth();
  const [currentStatus, setCurrentStatus] = useState<ReadingStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && bookId) {
      fetchCurrentStatus();
    } else {
      setLoading(false);
    }
  }, [user, bookId]);

  const fetchCurrentStatus = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const status = await getReadingStatus(user.id, bookId);
      setCurrentStatus(status);
    } catch (error) {
      console.error('Erreur lors de la récupération du statut de lecture:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusSelect = async (status: ReadingStatus | null) => {
    if (!user) return;
    
    try {
      // Si on sélectionne le statut actuel, on le supprime (toggle)
      const newStatus = status === currentStatus ? null : status;
      
      const { error } = await setReadingStatus(user.id, bookId, newStatus);
      if (error) throw new Error(error);
      
      setCurrentStatus(newStatus);
      if (onStatusChange) onStatusChange(newStatus);
      if (onClose) onClose();
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut de lecture:', error);
    }
  };

  if (!user) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-4 w-64">
        <p className="text-center text-black">
          Connectez-vous pour définir un statut de lecture.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 w-64">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-medium">Statut de lecture</h3>
        {onClose && (
          <button 
            onClick={onClose}
            className="text-gray-600 hover:text-gray-900"
          >
            <FiX size={18} />
          </button>
        )}
      </div>
      
      {loading ? (
        <div className="flex justify-center py-4">
          <div className="animate-spin h-5 w-5 border-t-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="space-y-2">
          <button
            className={`flex items-center justify-between w-full p-2 rounded-md ${
              currentStatus === 'to_read' 
                ? 'bg-blue-50 text-blue-600' 
                : 'hover:bg-gray-100 text-black'
            }`}
            onClick={() => handleStatusSelect('to_read')}
          >
            <div className="flex items-center">
              <FiBook className="mr-2" /> {readingStatusLabels.to_read}
            </div>
            {currentStatus === 'to_read' && <FiCheck className="text-blue-600" />}
          </button>
          
          <button
            className={`flex items-center justify-between w-full p-2 rounded-md ${
              currentStatus === 'reading' 
                ? 'bg-green-50 text-green-600' 
                : 'hover:bg-gray-100 text-black'
            }`}
            onClick={() => handleStatusSelect('reading')}
          >
            <div className="flex items-center">
              <FiClock className="mr-2" /> {readingStatusLabels.reading}
            </div>
            {currentStatus === 'reading' && <FiCheck className="text-green-600" />}
          </button>
          
          <button
            className={`flex items-center justify-between w-full p-2 rounded-md ${
              currentStatus === 'read' 
                ? 'bg-purple-50 text-purple-600' 
                : 'hover:bg-gray-100 text-black'
            }`}
            onClick={() => handleStatusSelect('read')}
          >
            <div className="flex items-center">
              <FiCheck className="mr-2" /> {readingStatusLabels.read}
            </div>
            {currentStatus === 'read' && <FiCheck className="text-purple-600" />}
          </button>
          
          <button
            className={`flex items-center justify-between w-full p-2 rounded-md ${
              currentStatus === 'abandoned' 
                ? 'bg-red-50 text-red-600' 
                : 'hover:bg-gray-100 text-black'
            }`}
            onClick={() => handleStatusSelect('abandoned')}
          >
            <div className="flex items-center">
              <FiX className="mr-2" /> {readingStatusLabels.abandoned}
            </div>
            {currentStatus === 'abandoned' && <FiCheck className="text-red-600" />}
          </button>
          
          {currentStatus && (
            <button
              className="flex items-center justify-center w-full p-2 mt-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md"
              onClick={() => handleStatusSelect(null)}
            >
              Supprimer le statut
            </button>
          )}
        </div>
      )}
    </div>
  );
}