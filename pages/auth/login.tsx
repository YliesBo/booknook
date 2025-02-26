import Head from 'next/head';
import Link from 'next/link';
import LoginForm from '../../components/auth/LoginForm';

export default function Login() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <Head>
        <title>Connexion | LAPAGE</title>
        <meta name="description" content="Connexion à votre compte LAPAGE" />
      </Head>
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-3xl font-extrabold text-center text-gray-900">LAPAGE</h1>
        <h2 className="mt-6 text-center text-xl font-extrabold text-gray-900">
          Connectez-vous à votre compte
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <LoginForm />
        
        <div className="text-center mt-4">
          <p className="text-sm text-gray-600">
            Vous n'avez pas de compte ?{' '}
            <Link href="/auth/register" className="font-medium text-blue-600 hover:text-blue-500">
              Inscrivez-vous
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
// Ajoutez ce code à la fin de votre fichier login.tsx, juste avant export default Login
Login.displayName = 'LoginPage';