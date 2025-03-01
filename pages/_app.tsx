// pages/_app.tsx
import '../styles/globals.css';
import { onest } from '../lib/fonts';
import type { AppProps } from 'next/app';
import { AuthProvider } from '../context/AuthContext';
import Layout from '../components/layout/Layout';

function MyApp({ Component, pageProps }: AppProps) {
  // Check if the current page is an auth page
  const isAuthPage = Component.displayName === 'LoginPage' || 
                    Component.displayName === 'RegisterPage' || 
                    Component.displayName === 'ConfirmEmailPage';

  return (
    <div className={onest.variable}>
      <AuthProvider>
        {isAuthPage ? (
          <Component {...pageProps} />
        ) : (
          <Layout>
            <Component {...pageProps} />
          </Layout>
        )}
      </AuthProvider>
    </div>
  );
}

export default MyApp;