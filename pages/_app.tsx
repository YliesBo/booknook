// pages/_app.tsx
import '../styles/globals.css';
import { onest } from '../lib/fonts';
import type { AppProps } from 'next/app';
import { AuthProvider, useAuth } from '../context/AuthContext';
import Layout from '../components/layout/Layout';
import { useEffect, useState } from 'react';
import { processAchievementEvents } from '../lib/achievements/achievementProcessor';
import { loadAchievementUUIDs } from '../lib/achievements/achievementMapping';
import { useRouter } from 'next/router';

// Component to handle achievement initialization separately
function AchievementInitializer({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [achievementsLoaded, setAchievementsLoaded] = useState(false);
  
  useEffect(() => {
    const initAchievements = async () => {
      try {
        // Load the achievement UUIDs first
        const loaded = await loadAchievementUUIDs();
        console.log(`Achievement UUIDs loaded: ${loaded}`);
        
        // If user is logged in, process any pending achievement events
        if (user) {
          await processAchievementEvents();
        }
        
        setAchievementsLoaded(true);
      } catch (error) {
        console.error("Error initializing achievements:", error);
        // Set loaded to true anyway so the app doesn't get stuck
        setAchievementsLoaded(true);
      }
    };
    
    // Don't wait for this to finish, let it run in background
    initAchievements();
  }, [user]);
  
  return children;
}

function AppContent({ Component, pageProps }: AppProps) {
  const { user } = useAuth();
  const router = useRouter();
  
  // Check if the current page is an auth page
  const isAuthPage = Component.displayName === 'LoginPage' || 
                    Component.displayName === 'RegisterPage' || 
                    Component.displayName === 'ConfirmEmailPage';

  return (
    <AchievementInitializer>
      {isAuthPage ? (
        <Component {...pageProps} />
      ) : (
        <Layout>
          <Component {...pageProps} />
        </Layout>
      )}
    </AchievementInitializer>
  );
}

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <div className={onest.variable}>
      <AuthProvider>
        <AppContent Component={Component} pageProps={pageProps} />
      </AuthProvider>
    </div>
  );
}

export default MyApp;