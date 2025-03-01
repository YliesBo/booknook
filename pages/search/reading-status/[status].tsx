// pages/reading-status/[status].tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../../context/AuthContext';
import { useProtectedRoute } from '../../../lib/hooks/useProtectedRoute';
import Link from 'next/link';
import { FiArrowLeft } from 'react-icons/fi';
import { readingStatusLabels, getBooksWithStatus, ReadingStatus } from '../../../lib/reading/readingStatusUtils';

type BookItem = {
  book_id: string;
  title: string;
  thumbnail: string | null;
  date_added: string;
  authorNames?: string[]; // Ajouté pour la cohérence avec l'existant
};

export default function ReadingStatusPage() {
  const router = useRouter();
  const { status } = router.query;
  const { user } = useAuth();
  useProtectedRoute();
  
  const [books, setBooks] = useState<BookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusLabel, setStatusLabel] = useState('');

  useEffect(() => {
    if (user && status && typeof status === 'string') {
      fetchBooks(status as ReadingStatus);
      setStatusLabel(readingStatusLabels[status as ReadingStatus] || status);
    }
  }, [user, status]);

  const fetchBooks = async (statusCode: ReadingStatus) => {
    setLoading(true);
    try {
      const { books, error } = await getBooksWithStatus(user?.id || '', statusCode);
      
      if (error) throw new Error(error);
      
      // Récupérer les auteurs pour chaque livre
      const enrichedBooks = await Promise.all(
        books.map(async (book) => {
          // Vous pouvez réutiliser votre code existant pour récupérer les auteurs
          // ou implémenter une fonction similaire
          // Exemple simplifié:
          return {
            ...book,
            authorNames: [] // À compléter avec votre logique de récupération d'auteurs
          };
        })
      );
      
      setBooks(enrichedBooks);
    } catch (error) {
      console.error(`Erreur lors de la récupération des livres avec statut ${statusCode}:`, error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      <div className="flex items-center mb-6">
        <Link href="/profile" className="text-gray-600 hover:text-gray-900 mr-3">
          <FiArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold">{statusLabel}</h1>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div>
          {books.length > 0 ? (
            <div className="book-grid">
  {books.map((book) => (
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
                      <h3 className="font-medium text-sm line-clamp-1 text-black">{book.title}</h3>
                      <p className="text-xs text-black line-clamp-1">
                        {book.authorNames && book.authorNames.length > 0 
                          ? book.authorNames.join(', ') 
                          : 'Auteur inconnu'}
                      </p>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 bg-white rounded-lg shadow-md">
              <p className="text-black">
                Vous n'avez pas de livres marqués comme "{statusLabel}". Parcourez des livres pour en ajouter.
              </p>
              <Link href="/" className="mt-4 inline-block text-blue-600 hover:underline">
                Parcourir des livres
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}