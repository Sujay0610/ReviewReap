'use client';

import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import AIConfiguration from '@/components/AIConfiguration';

export default function AIPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="bg-gradient-to-br from-white to-purple-50 rounded-2xl shadow-xl border border-purple-100 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-purple-200 to-purple-300 rounded-full opacity-20 transform translate-x-24 -translate-y-24"></div>
            <div className="absolute bottom-0 left-0 w-36 h-36 bg-gradient-to-tr from-purple-100 to-purple-200 rounded-full opacity-30 transform -translate-x-18 translate-y-18"></div>
            <div className="relative z-10 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl mb-4 shadow-lg">
                <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-purple-800 bg-clip-text text-transparent mb-3">
                AI Configuration
              </h1>
              <p className="text-lg text-gray-600 mb-6 max-w-2xl mx-auto leading-relaxed">
                Configure your AI assistant for personalized messaging and automated responses
              </p>
            </div>
          </div>
        </div>
        
        <AIConfiguration />
      </div>
    </Layout>
  );
}