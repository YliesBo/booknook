// components/books/ReviewForm.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { FiStar } from 'react-icons/fi';

type ReviewFormProps = {
  bookId: string;
  onSuccess: () => void;
};

export default function ReviewForm({ bookId, onSuccess }: ReviewFormProps) {
  const { user } = useAuth();
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingReview, setExistingReview] = useState<any>(null);

  useEffect(() => {
    if (user) {
      checkExistingReview();
    }
  }, [user, bookId]);

  const checkExistingReview = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('user_id', user.id)
        .eq('book_id', bookId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      if (data) {
        setExistingReview(data);
        setRating(data.rating);
        setComment(data.comment || '');
      }
    } catch (error) {
      console.error('Erreur lors de la vérification des avis existants :', error);
    }
  };

  const importBookIfNeeded = async (googleBookId: string) => {
    try {
      const response = await fetch('/api/import-book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ googleBookId }),
      });
      
      if (!response.ok) {
        throw new Error(`Import API responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.book_id;
    } catch (error) {
      console.error('Error importing book:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('Vous devez être connecté pour laisser un avis');
      return;
    }
    
    if (rating === 0) {
      setError('Veuillez attribuer une note');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      if (existingReview) {
        // Mise à jour d'un avis existant
        const { error: updateError } = await supabase
          .from('reviews')
          .update({
            rating,
            comment,
            updated_at: new Date().toISOString()
          })
          .eq('review_id', existingReview.review_id);
        
        if (updateError) throw updateError;
      } else {
        // Création d'un nouvel avis
        const { error: insertError } = await supabase
          .from('reviews')
          .insert({
            user_id: user.id,
            book_id: bookId,
            rating,
            comment,
            created_at: new Date().toISOString()
          });
        
        if (insertError) throw insertError;
      }
      
      onSuccess();
      
      if (!existingReview) {
        // Réinitialiser le formulaire seulement pour un nouvel avis
        setRating(0);
        setComment('');
      }
    } catch (error: any) {
      console.error('Erreur lors de l\'enregistrement de l\'avis :', error);
      setError(error.message || 'Une erreur est survenue lors de l\'enregistrement de votre avis');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-lg text-center">
        <p className="text-yellow-800">
          Connectez-vous pour laisser un avis sur ce livre.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-4 border">
      <h3 className="font-semibold mb-4">
        {existingReview ? 'Modifier votre avis' : 'Laisser un avis'}
      </h3>
      
      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4">
          {error}
        </div>
      )}
      
      <div className="mb-4">
        <label className="block text-gray-700 mb-2">Votre note</label>
        <div className="flex">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              className="text-2xl focus:outline-none"
              onClick={() => setRating(value)}
              onMouseEnter={() => setHoveredRating(value)}
              onMouseLeave={() => setHoveredRating(null)}
            >
              <FiStar
                className={`${
                  (hoveredRating !== null
                    ? value <= hoveredRating
                    : value <= rating)
                    ? 'text-yellow-400 fill-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            </button>
          ))}
          <span className="ml-2 text-gray-600">{rating > 0 ? `${rating}/5` : ''}</span>
        </div>
      </div>
      
      <div className="mb-4">
        <label htmlFor="comment" className="block text-gray-700 mb-2">
          Votre commentaire (optionnel)
        </label>
        <textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full p-2 border rounded-md"
          rows={4}
          placeholder="Partagez votre avis sur ce livre..."
        ></textarea>
      </div>
      
      <button
        type="submit"
        className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition"
        disabled={loading}
      >
        {loading ? 'Envoi en cours...' : existingReview ? 'Mettre à jour' : 'Publier'}
      </button>
    </form>
  );
}