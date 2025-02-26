import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase/supabaseClient';
import { FiStar } from 'react-icons/fi';

// Type qui représente la structure exacte retournée par Supabase
interface SupabaseReview {
  review_id: string;
  rating: number;
  comment: string;
  created_at: string;
  users: {
    username: string;
  };
}

// Type pour notre modèle simplifié après transformation
type Review = {
  review_id: string;
  rating: number;
  comment: string;
  created_at: string;
  username: string;
};

type ReviewListProps = {
  bookId: string;
  refreshTrigger: number;
};

export default function ReviewList({ bookId, refreshTrigger }: ReviewListProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [totalReviews, setTotalReviews] = useState(0);

  useEffect(() => {
    fetchReviews();
  }, [bookId, refreshTrigger]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      // Récupérer les avis avec jointure vers users
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          review_id,
          rating,
          comment,
          created_at,
          users(username)
        `)
        .eq('book_id', bookId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Pour déboguer la structure exacte retournée
      console.log('Structure Supabase retournée:', data?.[0]);
      
      // Transformation des données en notre modèle Review
      const transformedReviews: Review[] = (data || []).map(item => {
        // Utilisons une approche plus sûre pour accéder aux données
        return {
          review_id: item.review_id,
          rating: item.rating,
          comment: item.comment,
          created_at: item.created_at,
          username: item.users && typeof item.users === 'object' && 'username' in item.users 
            ? String(item.users.username) 
            : 'Utilisateur anonyme'
        };
      });
      
      setReviews(transformedReviews);
      setTotalReviews(transformedReviews.length);
      
      // Calculer la note moyenne
      if (transformedReviews.length > 0) {
        const sum = transformedReviews.reduce((acc, review) => acc + review.rating, 0);
        setAverageRating(parseFloat((sum / transformedReviews.length).toFixed(1)));
      } else {
        setAverageRating(null);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des avis :', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Résumé des avis */}
      {averageRating !== null && (
        <div className="bg-gray-50 p-4 rounded-lg mb-6 flex items-center">
          <div className="text-3xl font-bold text-gray-800 mr-3">{averageRating}</div>
          <div>
            <div className="flex text-yellow-400">
              {[1, 2, 3, 4, 5].map((star) => (
                <FiStar
                  key={star}
                  className={star <= Math.round(averageRating) ? 'fill-yellow-400' : ''}
                />
              ))}
            </div>
            <div className="text-gray-500 text-sm">
              {totalReviews} avis
            </div>
          </div>
        </div>
      )}

      {/* Liste des avis */}
      {reviews.length > 0 ? (
        <div className="space-y-6">
          {reviews.map((review) => (
            <div key={review.review_id} className="border-b pb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium">{review.username}</div>
                <div className="text-gray-500 text-sm">{formatDate(review.created_at)}</div>
              </div>
              
              <div className="flex text-yellow-400 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <FiStar
                    key={star}
                    className={star <= review.rating ? 'fill-yellow-400' : ''}
                  />
                ))}
              </div>
              
              {review.comment && (
                <p className="text-gray-700">{review.comment}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 italic py-8 text-center">
          Aucun avis pour ce livre. Soyez le premier à donner votre avis !
        </p>
      )}
    </div>
  );
}