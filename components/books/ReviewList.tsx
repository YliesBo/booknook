// components/books/ReviewList.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase/supabaseClient';
import { FiStar, FiUser } from 'react-icons/fi';

type Review = {
  review_id: string;
  rating: number;
  comment: string;
  created_at: string;
  updated_at: string | null;
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
      // Récupérer les avis
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          review_id,
          rating,
          comment,
          created_at,
          updated_at,
          user_id
        `)
        .eq('book_id', bookId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Si aucun avis, retourner
      if (!data || data.length === 0) {
        setReviews([]);
        setTotalReviews(0);
        setAverageRating(null);
        setLoading(false);
        return;
      }
      
      // Pour chaque avis, récupérer le nom d'utilisateur
      const reviewsWithUsernames = await Promise.all(
        data.map(async (review) => {
          // Récupérer les informations utilisateur
          const { data: userData } = await supabase
            .from('users')
            .select('username')
            .eq('user_id', review.user_id)
            .single();
            
          return {
            ...review,
            username: userData?.username || 'Utilisateur anonyme'
          };
        })
      );
      
      setReviews(reviewsWithUsernames);
      setTotalReviews(reviewsWithUsernames.length);
      
      // Calculer la note moyenne
      if (reviewsWithUsernames.length > 0) {
        const sum = reviewsWithUsernames.reduce((acc, review) => acc + review.rating, 0);
        setAverageRating(parseFloat((sum / reviewsWithUsernames.length).toFixed(1)));
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
            <div key={review.review_id} className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <div className="bg-gray-200 rounded-full p-2 mr-2">
                    <FiUser className="text-gray-500" />
                  </div>
                  <div className="font-medium">{review.username}</div>
                </div>
                <div className="text-gray-500 text-sm">
                  {formatDate(review.created_at)}
                  {review.updated_at && review.updated_at !== review.created_at && 
                    ' (modifié)'
                  }
                </div>
              </div>
              
              <div className="flex text-yellow-400 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <FiStar
                    key={star}
                    className={star <= review.rating ? 'fill-yellow-400' : ''}
                  />
                ))}
              </div>
              
              {review.comment ? (
                <p className="text-gray-700">{review.comment}</p>
              ) : (
                <p className="text-gray-500 italic">Aucun commentaire</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow-sm border text-center">
          <p className="text-gray-500 italic">
            Aucun avis pour ce livre. Soyez le premier à donner votre avis !
          </p>
        </div>
      )}
    </div>
  );
}