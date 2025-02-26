import React, { ReactNode } from 'react';
import Head from 'next/head';
import Navbar from './Navbar';
import MobileNavbar from './MobileNavbar';
import { useAuth } from '../../context/AuthContext';

type LayoutProps = {
  children: ReactNode;
  title?: string;
};

export default function Layout({ children, title = 'LAPAGE - Votre bibliothèque personnelle' }: LayoutProps) {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Head>
        <title>{title}</title>
        <meta charSet="utf-8" />
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
      </Head>

      <Navbar />
      
      <main className="flex-grow container mx-auto px-4 sm:px-6 pb-16 pt-20">
        {children}
      </main>

      <MobileNavbar />
    </div>
  );
}