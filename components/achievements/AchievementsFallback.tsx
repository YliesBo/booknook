// components/achievements/AchievementsFallback.tsx
import React from 'react';
import Link from 'next/link';
import { FiAlertTriangle, FiDatabase, FiTool } from 'react-icons/fi';

interface AchievementsFallbackProps {
  error?: string;
  children?: React.ReactNode;
}

export default function AchievementsFallback({ error, children }: AchievementsFallbackProps) {
  const isAdmin = false; // You can replace with your own admin check logic

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center mb-4">
        <div className="bg-yellow-100 p-2 rounded-full mr-3">
          <FiAlertTriangle className="text-yellow-500 text-xl" />
        </div>
        <h2 className="text-lg font-semibold">Achievements Not Available</h2>
      </div>
      
      <p className="text-gray-700 mb-4">
        {error || "The achievements system isn't available right now. This might be because the database isn't set up yet."}
      </p>
      
      {isAdmin && (
        <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
          <div className="flex items-center mb-2">
            <FiDatabase className="text-blue-500 mr-2" />
            <h3 className="font-medium">Admin Options</h3>
          </div>
          
          <p className="text-sm mb-3">
            You need to set up the achievements database tables. You can do this by visiting:
          </p>
          
          <Link 
            href="/api/admin/seed-achievements" 
            target="_blank"
            className="inline-flex items-center bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-md text-sm"
          >
            <FiTool className="mr-1" /> 
            Setup Achievements Database
          </Link>
        </div>
      )}
      
      {children}
      
      <div className="mt-4 text-sm text-gray-500">
        <p>
          Achievements track your reading progress and reward you for completing reading goals. 
          They'll be available soon!
        </p>
      </div>
    </div>
  );
}