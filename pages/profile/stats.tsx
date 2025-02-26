import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useProtectedRoute } from '../../lib/hooks/useProtectedRoute';
import { supabase } from '../../lib/supabase/supabaseClient';
import Link from 'next/link';
import { FiArrowLeft, FiBarChart2, FiBookOpen, FiCalendar, FiClock } from 'react-icons/fi';

type ReadingStats = {
  totalBooks: number;
  totalPages: number;
  booksThisYear: number;
  pagesThisYear: number;
  averageRating: number;
  genreDistribution: { genre: string; count: number }[];
  monthlyReads: { month: string; count: number }[];
};

type BookBasic = {
  book_id: string;
  page_count: number | null;
  date_added: string;
};

export default function ReadingStats() {
  const { user } = useAuth();
  useProtectedRoute();
  
  const [stats, setStats] = useState<ReadingStats>({
    totalBooks: 0,
    totalPages: 0,
    booksThisYear: 0,
    pagesThisYear: 0,
    averageRating: 0,
    genreDistribution: [],
    monthlyReads: []
  });
  
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (user) {
      fetchReadingStats();
    }
  }, [user, year]);

  const fetchReadingStats = async () => {
    setLoading(true);
    try {
      // Récupérer l'ID de l'étagère "Read"
      const { data: readShelf } = await supabase
        .from('shelves')
        .select('shelf_id')
        .eq('user_id', user?.id)
        .eq('shelf_name', 'Read')
        .single();
        
      if (!readShelf) {
        setLoading(false);
        return;
      }
      
      // Récupérer tous les livres lus
      const { data: bookshelvesData } = await supabase
        .from('bookshelves')
        .select('book_id, date_added')
        .eq('user_id', user?.id)
        .eq('shelf_id', readShelf.shelf_id);
        
      if (!bookshelvesData || bookshelvesData.length === 0) {
        setLoading(false);
        return;
      }
      
      // Identifier les livres lus cette année
      const startOfYear = new Date(year, 0, 1).toISOString();
      const endOfYear = new Date(year, 11, 31, 23, 59, 59).toISOString();
      
      const bookIds = bookshelvesData.map(item => item.book_id);
      const booksWithDateAdded: BookBasic[] = bookshelvesData.map(item => ({
        book_id: item.book_id,
        page_count: null, // Sera rempli plus tard
        date_added: item.date_added
      }));
      
      // Récupérer les informations détaillées sur les livres
      let totalPages = 0;
      let pagesThisYear = 0;
      
      for (const bookEntry of booksWithDateAdded) {
        const { data: bookDetails } = await supabase
          .from('books')
          .select('page_count')
          .eq('book_id', bookEntry.book_id)
          .single();
          
        if (bookDetails && bookDetails.page_count) {
          bookEntry.page_count = bookDetails.page_count;
          totalPages += bookDetails.page_count;
          
          // Si le livre a été ajouté cette année, compter ses pages
          if (bookEntry.date_added >= startOfYear && bookEntry.date_added <= endOfYear) {
            pagesThisYear += bookDetails.page_count;
          }
        }
      }
      
      // Calculer les livres lus cette année
      const booksThisYear = booksWithDateAdded.filter(
        book => book.date_added >= startOfYear && book.date_added <= endOfYear
      ).length;
      
      // Récupérer les genres pour chaque livre
      const genreCounts: Record<string, number> = {};
      
      for (const bookId of bookIds) {
        const { data: genresData } = await supabase
          .from('books_genres')
          .select('genre_id')
          .eq('book_id', bookId);
          
        if (genresData && genresData.length > 0) {
          for (const genreEntry of genresData) {
            const { data: genreDetails } = await supabase
              .from('genres')
              .select('genre_name')
              .eq('genre_id', genreEntry.genre_id)
              .single();
              
            if (genreDetails && genreDetails.genre_name) {
              const genreName = genreDetails.genre_name;
              genreCounts[genreName] = (genreCounts[genreName] || 0) + 1;
            }
          }
        }
      }
      
      // Préparer la distribution des genres
      const genreDistribution = Object.entries(genreCounts)
        .map(([genre, count]) => ({ genre, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      
      // Récupérer les notes moyennes
      const { data: ratings } = await supabase
        .from('reviews')
        .select('rating')
        .eq('user_id', user?.id);
        
      const averageRating = ratings && ratings.length > 0
        ? ratings.reduce((sum, review) => sum + review.rating, 0) / ratings.length
        : 0;
      
      // Préparer les données mensuelles
      const monthNames = [
        'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
      ];
      
      const monthCounts: Record<string, number> = {};
      monthNames.forEach(month => {
        monthCounts[month] = 0;
      });
      
      // Compter les livres par mois pour l'année sélectionnée
      booksWithDateAdded
        .filter(book => book.date_added >= startOfYear && book.date_added <= endOfYear)
        .forEach(book => {
          const monthIndex = new Date(book.date_added).getMonth();
          const monthName = monthNames[monthIndex];
          monthCounts[monthName] = (monthCounts[monthName] || 0) + 1;
        });
      
      const monthlyReads = monthNames.map(month => ({
        month,
        count: monthCounts[month] || 0
      }));
      
      // Mettre à jour les statistiques
      setStats({
        totalBooks: booksWithDateAdded.length,
        totalPages,
        booksThisYear,
        pagesThisYear,
        averageRating,
        genreDistribution,
        monthlyReads
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques :', error);
    } finally {
      setLoading(false);
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
      <div className="flex items-center mb-6">
        <Link href="/profile" className="text-gray-600 hover:text-gray-900 mr-3">
          <FiArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold">Mes statistiques de lecture</h1>
      </div>
      
      <div className="flex items-center justify-between mb-6">
        <div className="flex space-x-2">
          <button 
            className={`px-3 py-1 rounded-md ${year === new Date().getFullYear() - 1 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-200 text-gray-700'}`}
            onClick={() => setYear(new Date().getFullYear() - 1)}
          >
            {new Date().getFullYear() - 1}
          </button>
          <button 
            className={`px-3 py-1 rounded-md ${year === new Date().getFullYear() 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-200 text-gray-700'}`}
            onClick={() => setYear(new Date().getFullYear())}
          >
            {new Date().getFullYear()}
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg shadow-md">
          <div className="flex items-center text-blue-500 mb-2">
            <FiBookOpen size={20} />
            <span className="ml-2 font-medium">Livres lus</span>
          </div>
          <div className="text-2xl font-bold">
            {stats.booksThisYear} <span className="text-sm text-gray-500 font-normal">cette année</span>
          </div>
          <div className="text-sm text-gray-500">
            {stats.totalBooks} au total
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-md">
          <div className="flex items-center text-green-500 mb-2">
            <FiClock size={20} />
            <span className="ml-2 font-medium">Pages lues</span>
          </div>
          <div className="text-2xl font-bold">
            {stats.pagesThisYear} <span className="text-sm text-gray-500 font-normal">cette année</span>
          </div>
          <div className="text-sm text-gray-500">
            {stats.totalPages} au total
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-md">
          <div className="flex items-center text-yellow-500 mb-2">
            <FiBarChart2 size={20} />
            <span className="ml-2 font-medium">Note moyenne</span>
          </div>
          <div className="text-2xl font-bold">
            {stats.averageRating.toFixed(1)} <span className="text-sm text-gray-500 font-normal">/ 5</span>
          </div>
          <div className="text-sm text-gray-500">
            Sur tous vos avis
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-md">
          <div className="flex items-center text-purple-500 mb-2">
            <FiCalendar size={20} />
            <span className="ml-2 font-medium">Moyenne mensuelle</span>
          </div>
          <div className="text-2xl font-bold">
            {(stats.booksThisYear / 12).toFixed(1)} <span className="text-sm text-gray-500 font-normal">livres</span>
          </div>
          <div className="text-sm text-gray-500">
            {(stats.pagesThisYear / 12).toFixed(0)} pages par mois
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-4">Genres préférés</h2>
          {stats.genreDistribution.length > 0 ? (
            <div className="space-y-3">
              {stats.genreDistribution.map((genre, index) => (
                <div key={index}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{genre.genre}</span>
                    <span>{genre.count} livres</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${(genre.count / stats.totalBooks) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center">Aucune donnée disponible</p>
          )}
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-4">Lecture par mois en {year}</h2>
          {stats.monthlyReads.some(month => month.count > 0) ? (
            <div className="h-64 flex items-end space-x-2">
              {stats.monthlyReads.map((month, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div 
                    className="bg-blue-500 w-full rounded-t"
                    style={{ 
                      height: `${(month.count / Math.max(...stats.monthlyReads.map(m => m.count))) * 100}%`,
                      minHeight: month.count > 0 ? '10%' : '0'
                    }}
                  ></div>
                  <span className="text-xs mt-1">{month.month.substr(0, 3)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center">Aucune donnée disponible pour {year}</p>
          )}
        </div>
      </div>
    </div>
  );
}