// context/AuthContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase/supabaseClient';
import { useRouter } from 'next/router';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  preferredLanguage: string; // Nouvelle propriété
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updatePreferredLanguage: (language: string) => Promise<{ error: any | null }>; // Nouvelle fonction
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [preferredLanguage, setPreferredLanguage] = useState<string>('fr'); // Valeur par défaut
  const router = useRouter();

  // Ce useEffect s'exécute une seule fois pour déterminer si nous sommes côté client
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fonction pour détecter la langue du navigateur
  const detectBrowserLanguage = (): string => {
    if (typeof window !== 'undefined') {
      const browserLanguages = navigator.languages || [navigator.language];
      // Extraire juste le code de langue (ex: "fr-FR" devient "fr")
      const primaryLanguage = (browserLanguages[0] || 'fr').split('-')[0];
      return primaryLanguage;
    }
    return 'fr'; // Valeur par défaut si côté serveur
  };

  // Cet useEffect ne s'exécute que côté client (pas pendant le SSR)
  useEffect(() => {
    if (!isClient) return;
  
    const getSession = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Erreur lors de la récupération de la session:', error);
          setUser(null);
          setSession(null);
          // Définir la langue du navigateur comme langue par défaut
          setPreferredLanguage(detectBrowserLanguage());
        } else if (data?.session) {
          setSession(data.session);
          setUser(data.session.user);
          // Récupérer la langue préférée de l'utilisateur depuis Supabase
          fetchUserLanguagePreference(data.session.user.id);
        } else {
          setUser(null);
          setSession(null);
          // Définir la langue du navigateur comme langue par défaut
          setPreferredLanguage(detectBrowserLanguage());
        }
      } catch (error) {
        console.error('Erreur non gérée lors de la récupération de la session:', error);
        setUser(null);
        setSession(null);
        setPreferredLanguage(detectBrowserLanguage());
      } finally {
        setIsLoading(false);
      }
    };
  
    getSession();
    
    // Simplifier le code de l'écouteur d'événements
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchUserLanguagePreference(session.user.id);
        } else {
          setPreferredLanguage(detectBrowserLanguage());
        }
        setIsLoading(false);
      }
    );
    
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [isClient]);

  // Ajouter cette fonction pour récupérer la préférence de langue de l'utilisateur
  const fetchUserLanguagePreference = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('preferred_language')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        console.error('Erreur lors de la récupération de la préférence de langue:', error);
        setPreferredLanguage(detectBrowserLanguage());
        return;
      }
      
      if (data && data.preferred_language) {
        setPreferredLanguage(data.preferred_language);
      } else {
        // Si l'utilisateur n'a pas encore défini de préférence, utiliser la langue du navigateur
        const browserLang = detectBrowserLanguage();
        setPreferredLanguage(browserLang);
        // Et enregistrer cette préférence automatiquement
        await updatePreferredLanguage(browserLang);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération de la préférence de langue:', error);
      setPreferredLanguage(detectBrowserLanguage());
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error };
    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
      return { error };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      return { error };
    } catch (error) {
      console.error('Erreur lors de l\'inscription:', error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  // Fonction pour mettre à jour la langue préférée
  const updatePreferredLanguage = async (language: string) => {
    if (!user) {
      return { error: 'Utilisateur non connecté' };
    }
    
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          preferred_language: language,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);
      
      if (error) {
        console.error('Erreur lors de la mise à jour de la langue préférée:', error);
        return { error };
      }
      
      setPreferredLanguage(language);
      return { error: null };
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la langue préférée:', error);
      return { error };
    }
  };

  const value = {
    user,
    session,
    isLoading,
    preferredLanguage,
    signIn,
    signUp,
    signOut,
    updatePreferredLanguage
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};