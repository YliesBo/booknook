import Head from 'next/head';
import Link from 'next/link';
import RegisterForm from '../../components/auth/RegisterForm';

export default function Register() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <Head>
        <title>Inscription | LAPAGE</title>
        <meta name="description" content="Créez votre compte LAPAGE" />
      </Head>
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-3xl font-extrabold text-center text-gray-900">LAPAGE</h1>
        <h2 className="mt-6 text-center text-xl font-extrabold text-gray-900">
          Créez votre compte
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <RegisterForm />
        
        <div className="text-center mt-4">
          <p className="text-sm text-gray-600">
            Vous avez déjà un compte ?{' '}
            <Link href="/auth/login" className="font-medium text-blue-600 hover:text-blue-500">
              Connectez-vous
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// Ajouter cette ligne à la fin
Register.displayName = 'RegisterPage';