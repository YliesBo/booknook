import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useProtectedRoute } from '../../lib/hooks/useProtectedRoute';
import { supabase } from '../../lib/supabase/supabaseClient';
import Link from 'next/link';
import { FiEdit2, FiBookOpen, FiBook, FiClock, FiPauseCircle, FiCheckCircle } from 'react-icons/fi';
import { updateUsername, updateBio, getUserProfile } from '../../lib/users/userUtils';


type UserStats = {
  totalBooks: number;
  toReadCount: number;
  readingCount: number;
  onHoldCount: number;
  readCount: number;
  reviewCount: number;
};

// Types simplifiés pour les activités récentes
type BookBasic = {
  book_id: string;
  title: string;
  thumbnail: string | null;
};

type RecentShelfActivity = {
  type: 'added_to_shelf';
  date: string;
  book: BookBasic;
  shelfName: string;
};

type RecentReviewActivity = {
  type: 'review';
  date: string;
  book: BookBasic;
  rating: number;
};

// Union des deux types d'activité
type RecentActivity = RecentShelfActivity | RecentReviewActivity;

export default function Profile() {
  const { user } = useAuth();
  useProtectedRoute();
  
  const [stats, setStats] = useState<UserStats>({
    totalBooks: 0,
    toReadCount: 0,
    readingCount: 0,
    onHoldCount: 0,
    readCount: 0,
    reviewCount: 0
  });
  
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');

  useEffect(() => {
    if (user) {
      fetchUserProfile();
      fetchUserStats();
      fetchRecentActivity();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await getUserProfile();
      
      if (error) throw error;
      
      if (data) {
        setUsername(data.username || '');
        setNewUsername(data.username || '');
        // Si tu as un état pour la bio, mets-le à jour ici aussi
        // setBio(data.bio || '');
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du profil :', error);
    }
  };

  const fetchUserStats = async () => {
    setLoading(true);
    try {
      // Récupérer les statistiques pour chaque étagère
      let toReadCount = 0;
      let readingCount = 0;
      let onHoldCount = 0;
      let readCount = 0;
      
      // Récupérer l'ID de l'étagère "To Read"
      const { data: toReadShelf } = await supabase
        .from('shelves')
        .select('shelf_id')
        .eq('user_id', user?.id)
        .eq('shelf_name', 'To Read')
        .single();
      
      if (toReadShelf) {
        const { count: toReadBooksCount } = await supabase
          .from('bookshelves')
          .select('*', { count: 'exact', head: true })
          .eq('shelf_id', toReadShelf.shelf_id)
          .eq('user_id', user?.id);
        
        toReadCount = toReadBooksCount || 0;
      }
      
      // Récupérer l'ID de l'étagère "Reading"
      const { data: readingShelf } = await supabase
        .from('shelves')
        .select('shelf_id')
        .eq('user_id', user?.id)
        .eq('shelf_name', 'Reading')
        .single();
      
      if (readingShelf) {
        const { count: readingBooksCount } = await supabase
          .from('bookshelves')
          .select('*', { count: 'exact', head: true })
          .eq('shelf_id', readingShelf.shelf_id)
          .eq('user_id', user?.id);
        
        readingCount = readingBooksCount || 0;
      }
      
      // Récupérer l'ID de l'étagère "On Hold"
      const { data: onHoldShelf } = await supabase
        .from('shelves')
        .select('shelf_id')
        .eq('user_id', user?.id)
        .eq('shelf_name', 'On Hold')
        .single();
      
      if (onHoldShelf) {
        const { count: onHoldBooksCount } = await supabase
          .from('bookshelves')
          .select('*', { count: 'exact', head: true })
          .eq('shelf_id', onHoldShelf.shelf_id)
          .eq('user_id', user?.id);
        
        onHoldCount = onHoldBooksCount || 0;
      }
      
      // Récupérer l'ID de l'étagère "Read"
      const { data: readShelf } = await supabase
        .from('shelves')
        .select('shelf_id')
        .eq('user_id', user?.id)
        .eq('shelf_name', 'Read')
        .single();
      
      if (readShelf) {
        const { count: readBooksCount } = await supabase
          .from('bookshelves')
          .select('*', { count: 'exact', head: true })
          .eq('shelf_id', readShelf.shelf_id)
          .eq('user_id', user?.id);
        
        readCount = readBooksCount || 0;
      }
      
      // Compter le nombre d'avis
      const { count: reviewCount } = await supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id);
      
      // Calculer le total
      const totalBooks = toReadCount + readingCount + onHoldCount + readCount;
      
      setStats({
        totalBooks,
        toReadCount,
        readingCount,
        onHoldCount,
        readCount,
        reviewCount: reviewCount || 0
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques :', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const activities: RecentActivity[] = [];
      
      // Récupérer les ajouts récents aux étagères
      const { data: recentShelfAdds } = await supabase
        .from('bookshelves')
        .select('date_added, shelf_id, book_id')
        .eq('user_id', user?.id)
        .order('date_added', { ascending: false })
        .limit(5);
      
      if (recentShelfAdds && recentShelfAdds.length > 0) {
        for (const item of recentShelfAdds) {
          // Récupérer les détails du livre
          const { data: bookData } = await supabase
            .from('books')
            .select('book_id, title, thumbnail')
            .eq('book_id', item.book_id)
            .single();
          
          // Récupérer le nom de l'étagère
          const { data: shelfData } = await supabase
            .from('shelves')
            .select('shelf_name')
            .eq('shelf_id', item.shelf_id)
            .single();
          
          if (bookData && shelfData) {
            activities.push({
              type: 'added_to_shelf',
              date: item.date_added,
              book: {
                book_id: bookData.book_id,
                title: bookData.title,
                thumbnail: bookData.thumbnail
              },
              shelfName: shelfData.shelf_name
            });
          }
        }
      }
      
      // Récupérer les avis récents
      const { data: recentReviews } = await supabase
        .from('reviews')
        .select('created_at, book_id, rating')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (recentReviews && recentReviews.length > 0) {
        for (const item of recentReviews) {
          // Récupérer les détails du livre
          const { data: bookData } = await supabase
            .from('books')
            .select('book_id, title, thumbnail')
            .eq('book_id', item.book_id)
            .single();
          
          if (bookData) {
            activities.push({
              type: 'review',
              date: item.created_at,
              book: {
                book_id: bookData.book_id,
                title: bookData.title,
                thumbnail: bookData.thumbnail
              },
              rating: item.rating
            });
          }
        }
      }
      
      // Trier par date et limiter à 10
      activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setRecentActivity(activities.slice(0, 10));
    } catch (error) {
      console.error('Erreur lors de la récupération des activités récentes :', error);
    }
  };

  const handleUpdateUsername = async () => {
    if (!newUsername.trim()) return;
    
    try {
      const { data, error } = await updateUsername(newUsername.trim());
  
      if (error) {
        // Utilise une vérification plus sûre pour le message d'erreur
        const errorMessage = error && typeof error === 'object' && 'message' in error 
          ? error.message 
          : 'Erreur lors de la mise à jour du nom d\'utilisateur';
        
        alert(errorMessage);
        return;
      }
      
      setUsername(newUsername.trim());
      setEditingUsername(false);
    } catch (error: any) { // Note le type 'any' ici aussi
      console.error('Erreur lors de la mise à jour du nom d\'utilisateur :', error);
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
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            {editingUsername ? (
              <div className="flex items-center">
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="p-2 border rounded-md mr-2"
                  placeholder="Votre nom d'utilisateur"
                />
                <button
  onClick={handleUpdateUsername} // Ne passe pas d'argument ici
  className="bg-blue-500 text-white px-3 py-1 rounded-md"
>
  Enregistrer
</button>
              </div>
            ) : (
              <div className="flex items-center">
                <h1 className="text-2xl font-bold">{username || user?.email}</h1>
                <button
                  onClick={() => setEditingUsername(true)}
                  className="ml-2 text-gray-500 hover:text-gray-700"
                >
                  <FiEdit2 size={16} />
                </button>
              </div>
            )}
            <p className="text-gray-600">{user?.email}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-blue-700">
              <FiBookOpen size={24} />
            </div>
            <div className="mt-2 text-2xl font-bold">{stats.totalBooks}</div>
            <div className="text-sm text-gray-600">Livres totaux</div>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-purple-700">
              <FiBook size={24} />
            </div>
            <div className="mt-2 text-2xl font-bold">{stats.toReadCount}</div>
            <div className="text-sm text-gray-600">À lire</div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-green-700">
              <FiClock size={24} />
            </div>
            <div className="mt-2 text-2xl font-bold">{stats.readingCount}</div>
            <div className="text-sm text-gray-600">En cours</div>
          </div>
          
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="text-yellow-700">
              <FiPauseCircle size={24} />
            </div>
            <div className="mt-2 text-2xl font-bold">{stats.onHoldCount}</div>
            <div className="text-sm text-gray-600">En pause</div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-bold mb-4">Mes étagères</h2>
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <Link href="/shelves">
              <div className="p-4 flex items-center justify-between border-b hover:bg-gray-50">
                <div className="flex items-center">
                  <FiBook className="text-blue-500 mr-3" />
                  <span>Toutes mes étagères</span>
                </div>
                <span className="bg-gray-100 px-2 py-1 rounded-full text-sm">
                  {stats.totalBooks}
                </span>
              </div>
            </Link>
            
            <Link href="/shelves">
              <div className="p-4 flex items-center justify-between border-b hover:bg-gray-50">
                <div className="flex items-center">
                  <FiCheckCircle className="text-purple-500 mr-3" />
                  <span>Terminés</span>
                </div>
                <span className="bg-gray-100 px-2 py-1 rounded-full text-sm">
                  {stats.readCount}
                </span>
              </div>
            </Link>
            
            <Link href="/shelves">
              <div className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center">
                  <FiClock className="text-green-500 mr-3" />
                  <span>En cours de lecture</span>
                </div>
                <span className="bg-gray-100 px-2 py-1 rounded-full text-sm">
                  {stats.readingCount}
                </span>
              </div>
            </Link>
          </div>
        </div>
        
        <div>
          <h2 className="text-xl font-bold mb-4">Activité récente</h2>
          <div className="bg-white rounded-lg shadow-md p-4">
            {recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start border-b pb-4 last:border-b-0 last:pb-0">
                    <div className="flex-shrink-0 w-10 h-14 bg-gray-200 rounded overflow-hidden mr-3">
                      {activity.book.thumbnail && (
                        <img 
                          src={activity.book.thumbnail} 
                          alt={activity.book.title}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1">
                      <Link href={`/book/${activity.book.book_id}`} className="font-medium hover:text-blue-600">
                        {activity.book.title}
                      </Link>
                      <p className="text-sm text-gray-600">
                        {activity.type === 'added_to_shelf' 
                          ? `Ajouté à l'étagère "${activity.shelfName}"` 
                          : `Noté ${activity.rating}/5`}
                      </p>
                      <p className="text-xs text-gray-500">{formatDate(activity.date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-4">
                Aucune activité récente à afficher.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}