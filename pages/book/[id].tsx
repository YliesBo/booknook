// pages/book/[id].tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase/supabaseClient';
import { FiBookmark, FiStar, FiClock } from 'react-icons/fi';
import Link from 'next/link';
import ShelfSelector from '../../components/shelves/ShelfSelector';
import ReviewForm from '../../components/books/ReviewForm';
import ReviewList from '../../components/books/ReviewList';

// Types pour les données du livre
type BookDetail = {
  book_id: string;
  title: string;
  thumbnail: string | null;
  synopsis: string | null;
  published_date: string | null;
  page_count: number | null;
  authorNames: string[];
  genres: string[];
  publisher: string | null;
  isbn_10: string | null;
  isbn_13: string | null;
  language: string | null;
  series: string | null;
  series_release_number: number | null;
};

export default function BookDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [book, setBook] = useState<BookDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('about');
  const [showShelfSelector, setShowShelfSelector] = useState(false);
  const [refreshReviews, setRefreshReviews] = useState(0);

  useEffect(() => {
    if (id) {
      fetchBookDetails(id as string);
    }
  }, [id]);

  const fetchBookDetails = async (bookId: string) => {
    setLoading(true);
    try {
      // Récupérer les détails du livre
      const { data: bookData, error: bookError } = await supabase
        .from('books')
        .select(`
          book_id,
          title,
          thumbnail,
          synopsis,
          published_date,
          page_count,
          isbn_10,
          isbn_13,
          publisher_id,
          language_id,
          series_id,
          series_release_number
        `)
        .eq('book_id', bookId)
        .single();

      if (bookError) throw bookError;

      // Récupérer les auteurs
      const { data: authorsData, error: authorsError } = await supabase
        .from('book_authors')
        .select('author_id')
        .eq('book_id', bookId);

      if (authorsError) throw authorsError;

      // Récupérer les noms d'auteurs
      const authorNames: string[] = [];
      for (const authorEntry of authorsData || []) {
        if (authorEntry.author_id) {
          try {
            const { data: authorData, error: authorError } = await supabase
              .from('authors')
              .select('author_name')
              .eq('author_id', authorEntry.author_id)
              .single();
            
            if (authorError) {
              console.error('Erreur lors de la récupération de l\'auteur:', authorError);
              continue;
            }
            
            if (authorData && authorData.author_name) {
              authorNames.push(authorData.author_name);
            }
          } catch (error) {
            console.error('Erreur lors du traitement de l\'auteur:', error);
          }
        }
      }

      // Récupérer les genres
      const { data: genresData, error: genresError } = await supabase
        .from('books_genres')
        .select('genre_id')
        .eq('book_id', bookId);

      if (genresError) throw genresError;

      // Récupérer les noms de genres
      const genres: string[] = [];
      for (const genreEntry of genresData || []) {
        if (genreEntry.genre_id) {
          const { data: genreData } = await supabase
            .from('genres')
            .select('genre_name')
            .eq('genre_id', genreEntry.genre_id)
            .single();
          
          if (genreData && genreData.genre_name) {
            genres.push(genreData.genre_name);
          }
        }
      }

      // Récupérer l'éditeur
      let publisher: string | null = null;
      if (bookData.publisher_id) {
        const { data: publisherData } = await supabase
          .from('publishers')
          .select('publisher_name')
          .eq('publisher_id', bookData.publisher_id)
          .single();
        
        if (publisherData) {
          publisher = publisherData.publisher_name;
        }
      }
      
      // Récupérer la langue
      let language = null;
    if (bookData.language_id) {
      const { data: languageData, error: languageError } = await supabase
        .from('languages')
        .select('language_name')
        .eq('language_id', bookData.language_id)
        .single();
      
      if (!languageError && languageData) {
        language = languageData.language_name;
      }
    }
      
      // Récupérer la série
      let series: string | null = null;
      if (bookData.series_id) {
        const { data: seriesData } = await supabase
          .from('series')
          .select('series_name')
          .eq('series_id', bookData.series_id)
          .single();
        
        if (seriesData) {
          series = seriesData.series_name;
        }
      }
      
      // Créer l'objet livre complet
      const bookDetail: BookDetail = {
        book_id: bookData.book_id,
        title: bookData.title,
        thumbnail: bookData.thumbnail,
        synopsis: bookData.synopsis,
        published_date: bookData.published_date,
        page_count: bookData.page_count,
        authorNames,
        genres,
        publisher,
        isbn_10: bookData.isbn_10,
        isbn_13: bookData.isbn_13,
        language,
        series,
        series_release_number: bookData.series_release_number
      };
      
      setBook(bookDetail);
    } catch (error) {
      console.error('Erreur lors de la récupération du livre :', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSuccess = () => {
    setRefreshReviews(prev => prev + 1);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="max-w-4xl mx-auto py-10 px-4">
        <h1 className="text-2xl font-bold text-center">Livre non trouvé</h1>
        <p className="text-center mt-4">
          <Link href="/" className="text-blue-600 hover:underline">
            Retour à l'accueil
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Couverture du livre */}
        <div className="w-full md:w-1/3">
          <div className="rounded-lg overflow-hidden shadow-md bg-gray-200 aspect-[2/3] relative">
            {book.thumbnail && (
              <img 
                src={book.thumbnail} 
                alt={book.title}
                className="object-cover w-full h-full"
              />
            )}
          </div>
          
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="relative">
              <button 
                className="bg-blue-500 text-white py-2 px-4 rounded-lg flex items-center justify-center w-full"
                onClick={() => setShowShelfSelector(!showShelfSelector)}
              >
                <FiBookmark className="mr-2" /> Ajouter
              </button>
              
              {showShelfSelector && (
                <div className="absolute mt-2 z-10">
                  <ShelfSelector 
                    bookId={book.book_id} 
                    onClose={() => setShowShelfSelector(false)}
                  />
                </div>
              )}
            </div>
            
            <button 
              className="bg-gray-200 text-gray-800 py-2 px-4 rounded-lg flex items-center justify-center"
              onClick={() => setActiveTab('reviews')}
            >
              <FiStar className="mr-2" /> Noter
            </button>
          </div>
        </div>
        
        {/* Détails du livre */}
        <div className="w-full md:w-2/3">
          <h1 className="text-2xl font-bold">{book.title}</h1>
          
          <div className="flex flex-wrap items-center mt-2 text-gray-600">
            <span className="mr-4">
              Par {book.authorNames.length > 0 ? book.authorNames.join(', ') : 'Auteur inconnu'}
            </span>
            
            {book.published_date && (
              <span className="mr-4">• {new Date(book.published_date).getFullYear()}</span>
            )}
            
            {book.page_count && (
              <span className="mr-4">• {book.page_count} pages</span>
            )}
          </div>
          
          {/* Afficher la série si disponible */}
          {book.series && (
            <div className="mt-2 text-gray-700">
              <span className="font-medium">Série: </span>
              {book.series} 
              {book.series_release_number && ` (Tome ${book.series_release_number})`}
            </div>
          )}
          
          {book.genres.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {book.genres.map((genre, index) => (
                <span key={index} className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm">
                  {genre}
                </span>
              ))}
            </div>
          )}
          
          {/* Onglets d'information */}
          <div className="mt-8 border-b border-gray-200">
            <div className="flex space-x-4">
              <button 
                className={`pb-2 font-medium text-sm ${activeTab === 'about' 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('about')}
              >
                À propos
              </button>
              <button 
                className={`pb-2 font-medium text-sm ${activeTab === 'reviews' 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('reviews')}
              >
                Avis
              </button>
              <button 
                className={`pb-2 font-medium text-sm ${activeTab === 'similar' 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('similar')}
              >
                Similaires
              </button>
            </div>
          </div>
          
          {/* Contenu des onglets */}
          <div className="mt-6">
            {activeTab === 'about' && (
              <div>
                <h2 className="font-semibold mb-2">Synopsis</h2>
                <p className="text-gray-700">
                  {book.synopsis || "Pas de synopsis disponible pour ce livre."}
                </p>
                
                {/* Informations supplémentaires */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {book.publisher && (
                    <div>
                      <span className="font-medium text-gray-700">Éditeur:</span>{' '}
                      <span className="text-gray-600">{book.publisher}</span>
                    </div>
                  )}
                  
                  {book.language && (
                    <div>
                      <span className="font-medium text-gray-700">Langue:</span>{' '}
                      <span className="text-gray-600">{book.language}</span>
                    </div>
                  )}
                  
                  {book.isbn_13 && (
                    <div>
                      <span className="font-medium text-gray-700">ISBN-13:</span>{' '}
                      <span className="text-gray-600">{book.isbn_13}</span>
                    </div>
                  )}
                  
                  {book.isbn_10 && (
                    <div>
                      <span className="font-medium text-gray-700">ISBN-10:</span>{' '}
                      <span className="text-gray-600">{book.isbn_10}</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center mt-2 text-gray-600">
  <span className="mr-4">
    Par {book.authorNames.length > 0 ? book.authorNames.join(', ') : 'Auteur inconnu'}
  </span>
  
  {book.published_date && (
    <span className="mr-4">• {new Date(book.published_date).getFullYear()}</span>
  )}
  
  {book.page_count && (
    <span className="mr-4">• {book.page_count} pages</span>
  )}
  
  {book.language && (
    <span className="mr-4">• {book.language}</span>
  )}
</div>
              </div>
            )}
            
            {activeTab === 'reviews' && (
              <div>
                <h2 className="font-semibold mb-4">Avis des lecteurs</h2>
                <ReviewList bookId={book.book_id} refreshTrigger={refreshReviews} />
    
                <div className="mt-8">
                  <ReviewForm bookId={book.book_id} onSuccess={handleReviewSuccess} />
                </div>
              </div>
            )}
            
            {activeTab === 'similar' && (
              <div>
                <h2 className="font-semibold mb-4">Livres similaires</h2>
                <p className="text-gray-500 italic">Fonctionnalité en cours de développement.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}