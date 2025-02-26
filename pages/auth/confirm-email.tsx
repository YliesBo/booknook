import Head from 'next/head';
import Link from 'next/link';

export default function ConfirmEmail() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <Head>
        <title>Confirmation d'email | LAPAGE</title>
        <meta name="description" content="Confirmez votre email pour accéder à LAPAGE" />
      </Head>
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-3xl font-extrabold text-center text-gray-900">LAPAGE</h1>
        <h2 className="mt-6 text-center text-xl font-extrabold text-gray-900">
          Vérifiez votre email
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md bg-white p-8 shadow rounded-lg">
        <div className="text-center mb-6">
          <svg className="mx-auto h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        
        <p className="text-center text-gray-700 mb-4">
          Un email de confirmation a été envoyé à votre adresse email. Veuillez cliquer sur le lien dans cet email pour confirmer votre compte.
        </p>
        
        <p className="text-center text-gray-700 mb-6">
          Si vous ne recevez pas d'email dans les prochaines minutes, vérifiez votre dossier de spam.
        </p>
        
        <div className="text-center">
          <Link href="/auth/login" className="font-medium text-blue-600 hover:text-blue-500">
            Retour à la page de connexion
          </Link>
        </div>
      </div>
    </div>
  );
}

// Ajouter cette ligne à la fin
ConfirmEmail.displayName = 'ConfirmEmailPage';