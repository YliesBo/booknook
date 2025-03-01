// components/layout/Layout.tsx
import React, { ReactNode } from 'react';
import Head from 'next/head';
import Navbar from './Navbar';
import Sidebar from './SideBar';
import SearchBar from './SearchBar';
import MobileNavbar from './MobileNavbar';
import { useAuth } from '../../context/AuthContext';

type LayoutProps = {
  children: ReactNode;
  title?: string;
};

export default function Layout({ children, title = 'LAPAGE - Votre bibliothèque personnelle' }: LayoutProps) {
  const { isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Head>
        <title>{title}</title>
        <meta charSet="utf-8" />
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
      </Head>

      {/* Sidebar */}
      <Sidebar />

      {/* Main content area with top navbar */}
      <div className="flex-1 ml-[72px]">
        {/* Top navbar with search and account */}
        <header className="fixed top-0 left-[72px] right-0 bg-white shadow-sm z-20 h-16 flex items-center px-6">
          <SearchBar />
          
          <Navbar />
        </header>
        
        {/* Main content area with padding for navbar */}
        <main className="pt-20 px-6">
          {children}
        </main>

        <MobileNavbar />
      </div>
    </div>
  );
}