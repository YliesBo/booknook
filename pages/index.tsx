import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase/supabaseClient';
import Link from 'next/link';
import { FiTrendingUp, FiClock, FiStar, FiHeart } from 'react-icons/fi';

// Types simplifiés
type Book = {
  book_id: string;
  title: string;
  thumbnail: string | null;
  authorNames: string[];
};

type Category = {
  id: string;
  name: string;
  books: Book[];
};

export default function Home() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('for-you');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHomeData();
  }, [user, activeTab]);

  const fetchHomeData = async () => {
    setLoading(true);
    try {
      const categoriesData: Category[] = [];
      
      // Récupérer les livres populaires
      const { data: popularBooksData } = await supabase
        .from('books')
        .select('book_id, title, thumbnail')
        .order('popularity', { ascending: false })
        .limit(10);
      
      // Transformer les données des livres populaires
      if (popularBooksData && popularBooksData.length > 0) {
        const popularBooks: Book[] = [];
        
        for (const book of popularBooksData) {
          // Récupérer les auteurs pour chaque livre
          const { data: authorsData } = await supabase
            .from('book_authors')
            .select('author_id')
            .eq('book_id', book.book_id);
          
          const authorNames: string[] = [];
          
          // Récupérer les noms des auteurs
          if (authorsData && authorsData.length > 0) {
            for (const authorEntry of authorsData) {
              const { data: authorData } = await supabase
                .from('authors')
                .select('author_name')
                .eq('author_id', authorEntry.author_id)
                .single();
              
              if (authorData && authorData.author_name) {
                authorNames.push(authorData.author_name);
              }
            }
          }
          
          popularBooks.push({
            book_id: book.book_id,
            title: book.title,
            thumbnail: book.thumbnail,
            authorNames
          });
        }
        
        categoriesData.push({
          id: 'popular',
          name: 'Livres populaires',
          books: popularBooks
        });
      }
      
      // Récupérer les nouvelles sorties (similaire à l'approche ci-dessus)
      const { data: newBooksData } = await supabase
        .from('books')
        .select('book_id, title, thumbnail')
        .order('published_date', { ascending: false })
        .limit(10);
      
      // Transformer les données des nouveaux livres
      if (newBooksData && newBooksData.length > 0) {
        const newBooks: Book[] = [];
        
        for (const book of newBooksData) {
          // Récupérer les auteurs pour chaque livre (même logique que ci-dessus)
          const { data: authorsData } = await supabase
            .from('book_authors')
            .select('author_id')
            .eq('book_id', book.book_id);
          
          const authorNames: string[] = [];
          
          if (authorsData && authorsData.length > 0) {
            for (const authorEntry of authorsData) {
              const { data: authorData } = await supabase
                .from('authors')
                .select('author_name')
                .eq('author_id', authorEntry.author_id)
                .single();
              
              if (authorData && authorData.author_name) {
                authorNames.push(authorData.author_name);
              }
            }
          }
          
          newBooks.push({
            book_id: book.book_id,
            title: book.title,
            thumbnail: book.thumbnail,
            authorNames
          });
        }
        
        categoriesData.push({
          id: 'new',
          name: 'Nouveautés',
          books: newBooks
        });
      }
      
      // Si l'utilisateur est connecté, ajouter des recommandations (exemple simplifié)
      if (user) {
        // Dans un cas réel, on utiliserait un algorithme de recommandation plus complexe
        const { data: recommendedBooksData } = await supabase
          .from('books')
          .select('book_id, title, thumbnail')
          .limit(10);
        
        if (recommendedBooksData && recommendedBooksData.length > 0) {
          const recommendedBooks: Book[] = [];
          
          for (const book of recommendedBooksData) {
            // Récupérer les auteurs (même logique que ci-dessus)
            const { data: authorsData } = await supabase
              .from('book_authors')
              .select('author_id')
              .eq('book_id', book.book_id);
            
            const authorNames: string[] = [];
            
            if (authorsData && authorsData.length > 0) {
              for (const authorEntry of authorsData) {
                const { data: authorData } = await supabase
                  .from('authors')
                  .select('author_name')
                  .eq('author_id', authorEntry.author_id)
                  .single();
                
                if (authorData && authorData.author_name) {
                  authorNames.push(authorData.author_name);
                }
              }
            }
            
            recommendedBooks.push({
              book_id: book.book_id,
              title: book.title,
              thumbnail: book.thumbnail,
              authorNames
            });
          }
          
          categoriesData.push({
            id: 'recommended',
            name: 'Recommandés pour vous',
            books: recommendedBooks
          });
        }
      }
      
      setCategories(categoriesData);
    } catch (error) {
      console.error('Erreur lors de la récupération des données :', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Onglets principaux (style Pinterest) */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex space-x-6 overflow-x-auto pb-2">
          <button
            className={`py-2 px-1 text-sm font-medium flex items-center ${
              activeTab === 'for-you'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('for-you')}
          >
            <FiHeart className="mr-1" /> Pour vous
          </button>
          <button
            className={`py-2 px-1 text-sm font-medium flex items-center ${
              activeTab === 'trending'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('trending')}
          >
            <FiTrendingUp className="mr-1" /> Tendances
          </button>
          <button
            className={`py-2 px-1 text-sm font-medium flex items-center ${
              activeTab === 'new-releases'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('new-releases')}
          >
            <FiClock className="mr-1" /> Nouveautés
          </button>
          <button
            className={`py-2 px-1 text-sm font-medium flex items-center ${
              activeTab === 'top-rated'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('top-rated')}
          >
            <FiStar className="mr-1" /> Mieux notés
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center my-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="space-y-8">
          {categories.map(category => (
            <div key={category.id}>
              <h2 className="text-xl font-bold mb-4">{category.name}</h2>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {category.books.map((book) => (
                  <div key={book.book_id} className="rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
                    <Link href={`/book/${book.book_id}`}>
                      <div className="aspect-[2/3] bg-gray-200 relative">
                        {book.thumbnail && (
                          <img 
                            src={book.thumbnail} 
                            alt={book.title}
                            className="object-cover w-full h-full"
                          />
                        )}
                      </div>
                      <div className="p-2">
                        <h3 className="font-medium text-sm line-clamp-1">{book.title}</h3>
                        <p className="text-xs text-gray-600 line-clamp-1">
                          {book.authorNames.length > 0 
                            ? book.authorNames.join(', ') 
                            : 'Auteur inconnu'}
                        </p>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          {categories.length === 0 && (
            <div className="text-center py-10">
              <p className="text-gray-500">
                Aucun livre disponible pour le moment.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}