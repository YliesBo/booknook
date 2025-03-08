// pages/_app.tsx
import '../styles/globals.css';
import { onest } from '../lib/fonts';
import type { AppProps } from 'next/app';
import { AuthProvider, useAuth } from '../context/AuthContext';
import Layout from '../components/layout/Layout';
import { useEffect } from 'react';
import { processAchievementEvents } from '../lib/achievements/achievementProcessor';
import { useRouter } from 'next/router'; // Add this import

// You can either merge AppContent back into MyApp or add router
function AppContent({ Component, pageProps }: AppProps) {
  const { user } = useAuth();
  const router = useRouter(); // Add this line to get router access
  
  // Process achievement events once when app loads
  useEffect(() => {
    if (user) {
      // Process achievement events in the background
      const processEvents = async () => {
        try {
          await processAchievementEvents();
        } catch (error) {
          console.error('Error processing achievement events:', error);
        }
      };
      
      processEvents();
    }
  }, [user]);

  // Check if the current page is an auth page
  const isAuthPage = Component.displayName === 'LoginPage' || 
                    Component.displayName === 'RegisterPage' || 
                    Component.displayName === 'ConfirmEmailPage';

  return (
    <>
      {isAuthPage ? (
        <Component {...pageProps} />
      ) : (
        <Layout>
          <Component {...pageProps} />
        </Layout>
      )}
    </>
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