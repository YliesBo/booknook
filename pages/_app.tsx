import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { AuthProvider } from '../context/AuthContext';
import Layout from '../components/layout/Layout';

function MyApp({ Component, pageProps }: AppProps) {
  // Check if the current page is an auth page
  const isAuthPage = Component.displayName === 'LoginPage' || 
                    Component.displayName === 'RegisterPage' || 
                    Component.displayName === 'ConfirmEmailPage';

  return (
    <AuthProvider>
      {isAuthPage ? (
        <Component {...pageProps} />
      ) : (
        <Layout>
          <Component {...pageProps} />
        </Layout>
      )}
    </AuthProvider>
  );
}

export default MyApp;