'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MessageSquare } from 'lucide-react';
import Layout from '@/components/Layout';

interface ConversationMessage {
  id: string;
  sender: 'guest' | 'system' | 'agent';
  content: string;
  message_type: 'text' | 'image' | 'document';
  sentiment?: 'positive' | 'negative' | 'neutral';
  is_automated: boolean;
  created_at: string;
}

interface Guest {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  room_type?: string;
}

interface Conversation {
  id: string;
  guest_id: string;
  campaign_id?: string;
  channel: string;
  status: 'active' | 'resolved' | 'escalated';
  sentiment?: 'positive' | 'negative' | 'neutral';
  last_message_at?: string;
  created_at: string;
  guest: Guest;
  messages: ConversationMessage[];
}

interface ConversationList {
  conversations: Conversation[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

interface Analytics {
  total_conversations: number;
  active_conversations: number;
  resolved_conversations: number;
  escalated_conversations: number;
  sentiment_breakdown: {
    positive: number;
    negative: number;
    neutral: number;
  };
  resolution_rate: number;
  escalation_rate: number;
}

export default function ConversationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationList | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    fetchConversations();
    fetchAnalytics();
  }, [user, currentPage, statusFilter]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        per_page: '10',
      });
      
      if (statusFilter) {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/conversations?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }
      const data = await response.json();
      setConversations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/conversations/analytics/overview');
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }
      const data = await response.json();
      setAnalytics(data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    }
  };

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600 bg-green-100';
      case 'negative': return 'text-red-600 bg-red-100';
      case 'neutral': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-blue-600 bg-blue-100';
      case 'resolved': return 'text-green-600 bg-green-100';
      case 'escalated': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && !conversations) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading conversations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">Error</div>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-br from-white to-purple-50 rounded-2xl shadow-xl border-0 p-8 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-purple-800 bg-clip-text text-transparent">
                Guest Conversations
              </h1>
              <p className="mt-3 text-lg text-gray-600">
                Manage guest replies and automated responses with AI-powered insights
              </p>
            </div>
            <div className="p-4 bg-purple-100 rounded-2xl">
              <MessageSquare className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Analytics Cards */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-white to-purple-50 shadow-lg border-0 rounded-2xl p-6 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Conversations</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.total_conversations}</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-white to-green-50 shadow-lg border-0 rounded-2xl p-6 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Resolution Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.resolution_rate.toFixed(1)}%</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-white to-yellow-50 shadow-lg border-0 rounded-2xl p-6 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Conversations</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.active_conversations}</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-white to-red-50 shadow-lg border-0 rounded-2xl p-6 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Escalated</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.escalated_conversations}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg border-0 mb-6">
          <div className="px-6 py-5 border-b border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xl font-bold text-gray-900">Conversations</h2>
              <div className="mt-4 sm:mt-0">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="block w-full sm:w-auto px-4 py-2 border border-purple-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 bg-white hover:border-purple-300 transition-colors"
                >
                  <option value="" className="text-gray-900">All Status</option>
                  <option value="active" className="text-gray-900">Active</option>
                  <option value="resolved" className="text-gray-900">Resolved</option>
                  <option value="escalated" className="text-gray-900">Escalated</option>
                </select>
              </div>
            </div>
          </div>

          {/* Conversations List */}
          <div className="divide-y divide-gray-100">
            {conversations?.conversations.map((conversation) => (
              <Link
                key={conversation.id}
                href={`/conversations/${conversation.id}`}
                className="block hover:bg-gradient-to-r hover:from-purple-50 hover:to-gray-50 transition-all duration-300 hover:shadow-md"
              >
                <div className="px-6 py-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center shadow-sm">
                          <span className="text-base font-bold text-purple-700">
                            {conversation.guest.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {conversation.guest.name}
                          </p>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(conversation.status)}`}>
                            {conversation.status}
                          </span>
                          {conversation.sentiment && (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSentimentColor(conversation.sentiment)}`}>
                              {conversation.sentiment}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <p className="text-sm text-gray-500">
                            {conversation.channel} • {conversation.guest.room_type || 'No room type'}
                          </p>
                        </div>
                        {conversation.messages.length > 0 && (
                          <p className="text-sm text-gray-600 mt-1 truncate">
                            Last: {conversation.messages[conversation.messages.length - 1].content.substring(0, 100)}...
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <p className="text-sm text-gray-500">
                        {conversation.last_message_at ? formatDate(conversation.last_message_at) : formatDate(conversation.created_at)}
                      </p>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-400">
                          {conversation.messages.length} messages
                        </span>
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {conversations && conversations.total_pages > 1 && (
            <div className="px-6 py-5 border-t border-gray-100 bg-gradient-to-r from-gray-50 to-purple-50">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700 font-medium">
                  Showing {((conversations.page - 1) * conversations.per_page) + 1} to {Math.min(conversations.page * conversations.per_page, conversations.total)} of {conversations.total} conversations
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 text-sm border border-purple-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-50 hover:border-purple-300 transition-all duration-200 bg-white shadow-sm"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(conversations.total_pages, currentPage + 1))}
                    disabled={currentPage === conversations.total_pages}
                    className="px-4 py-2 text-sm border border-purple-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-50 hover:border-purple-300 transition-all duration-200 bg-white shadow-sm"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Empty State */}
        {conversations && conversations.conversations.length === 0 && (
          <div className="bg-gradient-to-br from-white to-purple-50 rounded-2xl shadow-lg border-0">
            <div className="px-6 py-16 text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">No conversations yet</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Guest conversations will appear here when they reply to your campaigns. Start engaging with your guests!
              </p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}