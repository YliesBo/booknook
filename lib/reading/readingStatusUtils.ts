// lib/reading/readingStatusUtils.ts
import { supabase } from '../supabase/supabaseClient';

export interface BookWithStatus {
    book_id: string;
    title: string;
    thumbnail: string | null;
    date_added: string;
  }  

export type ReadingStatus = 'to_read' | 'reading' | 'read' | 'abandoned';

export const readingStatusLabels: Record<ReadingStatus, string> = {
  to_read: 'À lire',
  reading: 'En cours',
  read: 'Lu',
  abandoned: 'Abandonné'
};

// Récupérer le statut de lecture d'un livre pour l'utilisateur courant
export async function getReadingStatus(userId: string, bookId: string) {
  if (!userId || !bookId) return null;
  
  const { data, error } = await supabase
    .from('reading_status')
    .select('status')
    .eq('user_id', userId)
    .eq('book_id', bookId)
    .single();
    
  if (error && error.code !== 'PGRST116') { // PGRST116 = not found
    console.error('Erreur lors de la récupération du statut de lecture:', error);
    return null;
  }
  
  return data?.status as ReadingStatus | null;
}

// Définir le statut de lecture d'un livre
export async function setReadingStatus(userId: string, bookId: string, status: ReadingStatus | null) {
  if (!userId || !bookId) return { error: 'User ID et Book ID sont requis' };
  
  try {
    // Si on veut supprimer le statut
    if (status === null) {
      const { error } = await supabase
        .from('reading_status')
        .delete()
        .eq('user_id', userId)
        .eq('book_id', bookId);
        
      if (error) throw error;
      return { success: true };
    }
    
    // Vérifier si un statut existe déjà
    const { data: existingStatus } = await supabase
      .from('reading_status')
      .select('status_id')
      .eq('user_id', userId)
      .eq('book_id', bookId)
      .single();
    
    if (existingStatus) {
      // Mettre à jour le statut existant
      const { error } = await supabase
        .from('reading_status')
        .update({ 
          status,
          date_added: new Date().toISOString() 
        })
        .eq('status_id', existingStatus.status_id);
        
      if (error) throw error;
    } else {
      // Créer un nouveau statut
      const { error } = await supabase
        .from('reading_status')
        .insert({
          user_id: userId,
          book_id: bookId,
          status,
          date_added: new Date().toISOString()
        });
        
      if (error) throw error;
    }
    
    return { success: true };
  } catch (error: any) {
    console.error('Erreur lors de la mise à jour du statut de lecture:', error);
    return { error: error.message || 'Une erreur est survenue' };
  }
}

interface ReadingStatusData {
    book_id: string;
    date_added: string;
    books: {
      book_id: string;
      title: string;
      thumbnail: string | null;
    } | null;
  }

// Récupérer les livres ayant un statut spécifique
export async function getBooksWithStatus(userId: string, status: ReadingStatus) {
    if (!userId) return { books: [] as BookWithStatus[], error: 'User ID est requis' };
    
    try {
      const { data, error } = await supabase
        .from('reading_status')
        .select(`
          book_id,
          date_added,
          books (
            book_id,
            title,
            thumbnail
          )
        `)
        .eq('user_id', userId)
        .eq('status', status);
        
      if (error) throw error;
      
      // Définir un type explicite pour data
      interface ReadingStatusData {
        book_id: string;
        date_added: string;
        books: {
          book_id: string;
          title: string;
          thumbnail: string | null;
        } | null;
      }
      
      // Utiliser une assertion de type pour indiquer à TypeScript la structure des données
      const typedData = data as ReadingStatusData[] || [];
      
      // Transformer les données avec gestion des valeurs null/undefined
      const books = typedData.map(item => ({
        book_id: item.book_id,
        title: item.books?.title || 'Titre inconnu',
        thumbnail: item.books?.thumbnail || null,
        date_added: item.date_added
      }));
      
      return { books, error: null };
    } catch (error: any) {
      console.error(`Erreur lors de la récupération des livres avec statut ${status}:`, error);
      return { books: [] as BookWithStatus[], error: error.message || 'Une erreur est survenue' };
    }
  }