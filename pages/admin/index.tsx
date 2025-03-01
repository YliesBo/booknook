// pages/admin/index.tsx
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useProtectedRoute } from '../../lib/hooks/useProtectedRoute';
import { supabase } from '../../lib/supabase/supabaseClient';
import Link from 'next/link';
import { FiBook, FiImage, FiUsers, FiDatabase } from 'react-icons/fi';

export default function AdminIndex() {
  const { user } = useAuth();
  useProtectedRoute();
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    books: 0,
    users: 0,
    booksWithoutCovers: 0
  });
  
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) return;
      
      try {
        // Vérifier si l'utilisateur est admin
        const { data, error } = await supabase
          .from('users')
          .select('is_admin')
          .eq('user_id', user.id)
          .single();
          
        if (error) throw error;
        
        setIsAdmin(data?.is_admin || false);
        
        if (data?.is_admin) {
          // Récupérer les statistiques
          fetchStats();
        }
      } catch (error) {
        console.error('Erreur lors de la vérification des droits admin:', error);
      } finally {
        setLoading(false);
      }
    };
    
    checkAdmin();
  }, [user]);
  
  const fetchStats = async () => {
    try {
      // Nombre total de livres
      const { count: booksCount } = await supabase
        .from('books')
        .select('*', { count: 'exact', head: true });
      
      // Nombre total d'utilisateurs
      const { count: usersCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });
        
      // Nombre de livres sans couverture
      const { count: booksWithoutCoversCount } = await supabase
        .from('books')
        .select('*', { count: 'exact', head: true })
        .is('thumbnail', null);
      
      setStats({
        books: booksCount || 0,
        users: usersCount || 0,
        booksWithoutCovers: booksWithoutCoversCount || 0
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto py-10 px-4">
        <h1 className="text-2xl font-bold text-center">Accès refusé</h1>
        <p className="text-center mt-4">
          Vous n'avez pas les droits d'administration nécessaires pour accéder à cette page.
        </p>
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
      <h1 className="text-2xl font-bold mb-6">Tableau de bord d'administration</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg shadow-md flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium">Livres</h2>
            <p className="text-2xl font-bold mt-1">{stats.books}</p>
          </div>
          <FiBook className="text-blue-500" size={24} />
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-md flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium">Utilisateurs</h2>
            <p className="text-2xl font-bold mt-1">{stats.users}</p>
          </div>
          <FiUsers className="text-green-500" size={24} />
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-md flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium">Sans couverture</h2>
            <p className="text-2xl font-bold mt-1">{stats.booksWithoutCovers}</p>
          </div>
          <FiImage className="text-red-500" size={24} />
        </div>
      </div>
      
      <h2 className="text-xl font-bold mb-4">Outils d'administration</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/admin/covers" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">Mise à jour des couvertures</h3>
            <FiImage className="text-blue-500" size={24} />
          </div>
          <p className="text-gray-600">
            Mettre à jour les couvertures de livres en utilisant Open Library pour obtenir des images de meilleure qualité.
          </p>
        </Link>
        
        <div className="bg-white p-6 rounded-lg shadow-md opacity-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">Gestion des données</h3>
            <FiDatabase className="text-gray-500" size={24} />
          </div>
          <p className="text-gray-600">
            Outils de maintenance de la base de données (à venir).
          </p>
        </div>
      </div>
    </div>
  );
}