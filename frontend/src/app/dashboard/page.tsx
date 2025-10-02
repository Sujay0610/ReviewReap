'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { PlusIcon, UserGroupIcon, ChatBubbleLeftRightIcon, ChartBarIcon } from '@heroicons/react/24/outline'
import Layout from '@/components/Layout'

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [stats] = useState({
    totalGuests: 0,
    activeCampaigns: 0,
    totalMessages: 0,
    responseRate: 0
  })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const handleSignOut = async () => {
    const AuthContext = await import('@/contexts/AuthContext')
    if (AuthContext.signOut) {
      await AuthContext.signOut()
    }
    // This will be handled by the AuthContext
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
                <ChartBarIcon className="h-7 w-7 text-white" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-purple-800 bg-clip-text text-transparent mb-3">
                Welcome to ReviewReap
              </h1>
              <p className="text-lg text-gray-600 mb-6 max-w-2xl mx-auto leading-relaxed">
                Automate your guest review requests with AI-powered personalization and boost your business reputation
              </p>
              
              {user.email && (
                <div className="inline-flex items-center bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg border border-purple-100">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium text-purple-700">{user.email}</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Organization Setup Notice */}
        {!user.org_id && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Complete your organization setup
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    You need to set up your organization before you can start creating campaigns.
                  </p>
                </div>
                <div className="mt-4">
                  <button
                    onClick={() => router.push('/onboarding')}
                    className="bg-yellow-100 text-yellow-800 px-3 py-2 rounded-md text-sm font-medium hover:bg-yellow-200"
                  >
                    Set up organization
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="bg-gradient-to-br from-white to-blue-50 overflow-hidden shadow-xl rounded-xl border border-blue-100 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                    <UserGroupIcon className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="ml-3 w-0 flex-1">
                  <dl>
                    <dt className="text-xs font-medium text-gray-600 truncate">
                      Total Guests
                    </dt>
                    <dd className="text-xl font-bold text-gray-900">
                      {stats.totalGuests.toLocaleString()}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-white to-green-50 overflow-hidden shadow-xl rounded-xl border border-green-100 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center shadow-lg">
                    <ChatBubbleLeftRightIcon className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="ml-3 w-0 flex-1">
                  <dl>
                    <dt className="text-xs font-medium text-gray-600 truncate">
                      Active Campaigns
                    </dt>
                    <dd className="text-xl font-bold text-gray-900">
                      {stats.activeCampaigns}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-white to-purple-50 overflow-hidden shadow-xl rounded-xl border border-purple-100 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                    <ChartBarIcon className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="ml-3 w-0 flex-1">
                  <dl>
                    <dt className="text-xs font-medium text-gray-600 truncate">
                      Messages Sent
                    </dt>
                    <dd className="text-xl font-bold text-gray-900">
                      {stats.totalMessages.toLocaleString()}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-white to-orange-50 overflow-hidden shadow-xl rounded-xl border border-orange-100 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center shadow-lg">
                    <ChartBarIcon className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="ml-3 w-0 flex-1">
                  <dl>
                    <dt className="text-xs font-medium text-gray-600 truncate">
                      Response Rate
                    </dt>
                    <dd className="text-xl font-bold text-gray-900">
                      {stats.responseRate}%
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-gradient-to-br from-white to-purple-50 shadow-xl rounded-2xl border border-purple-100">
          <div className="px-6 py-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                Recent Activity
              </h3>
              <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <div className="text-center py-8">
              <div className="mx-auto h-16 w-16 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center mb-4">
                <svg className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to Begin?</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto leading-relaxed text-sm">
                Start your journey by uploading your first guest list and watch your outreach campaigns come to life.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => router.push('/upload')}
                  disabled={!user.org_id}
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-purple-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PlusIcon className="-ml-1 mr-2 h-4 w-4" />
                  Get Started
                </button>
                <p className="text-xs text-gray-500">
                  Upload CSV • Map Columns • Launch Campaigns
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}