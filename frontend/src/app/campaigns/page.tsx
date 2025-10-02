'use client';

import { useState, useEffect } from 'react';
import { PlusIcon, EyeIcon, PlayIcon, PauseIcon, TrashIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import Layout from '@/components/Layout';

interface Campaign {
  id: string;
  name: string;
  channel: 'whatsapp' | 'email' | 'both';
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled';
  message_template: string;
  ai_enabled: boolean;
  delay_hours: number;
  created_at: string;
  stats?: {
    total_guests: number;
    messages_sent: number;
    messages_delivered: number;
    messages_read: number;
    response_rate: number;
  };
}

interface CampaignList {
  campaigns: Campaign[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignList>({
    campaigns: [],
    total: 0,
    page: 1,
    per_page: 20,
    total_pages: 0
  });
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchCampaigns(currentPage);
  }, [currentPage]);

  const fetchCampaigns = async (page: number) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/campaigns?page=${page}&per_page=20`);
      if (response.ok) {
        const data = await response.json();
        setCampaigns(data);
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-purple-100 text-purple-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'whatsapp': return '📱';
      case 'email': return '📧';
      case 'both': return '📱📧';
      default: return '📄';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="bg-gradient-to-br from-white to-purple-50 rounded-2xl shadow-xl border border-purple-100 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-purple-200 to-purple-300 rounded-full opacity-20 transform translate-x-24 -translate-y-24"></div>
            <div className="absolute bottom-0 left-0 w-36 h-36 bg-gradient-to-tr from-purple-100 to-purple-200 rounded-full opacity-30 transform -translate-x-18 translate-y-18"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl mb-4 shadow-lg">
                    <DocumentTextIcon className="h-7 w-7 text-white" />
                  </div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-purple-800 bg-clip-text text-transparent mb-3">
                    Campaign Management
                  </h1>
                  <p className="text-lg text-gray-600 mb-4 max-w-2xl leading-relaxed">
                    Create and manage your review request campaigns with AI-powered personalization
                  </p>
                </div>
                <Link
                  href="/campaigns/create"
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  New Campaign
                </Link>
              </div>
            </div>
          </div>
        </div>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="bg-gradient-to-br from-white to-blue-50 overflow-hidden shadow-xl rounded-xl border border-blue-100 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
                    <DocumentTextIcon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Campaigns</p>
                  <p className="text-2xl font-bold text-gray-900">{campaigns.total}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-white to-green-50 overflow-hidden shadow-xl rounded-xl border border-green-100 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 shadow-lg">
                    <PlayIcon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-gray-600 mb-1">Active</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {campaigns.campaigns.filter(c => c.status === 'active').length}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-white to-yellow-50 overflow-hidden shadow-xl rounded-xl border border-yellow-100 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-br from-yellow-500 to-yellow-600 shadow-lg">
                    <PauseIcon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-gray-600 mb-1">Scheduled</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {campaigns.campaigns.filter(c => c.status === 'scheduled').length}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-white to-purple-50 overflow-hidden shadow-xl rounded-xl border border-purple-100 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
                    <DocumentTextIcon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-gray-600 mb-1">Drafts</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {campaigns.campaigns.filter(c => c.status === 'draft').length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Campaigns Table */}
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-purple-100 bg-gradient-to-r from-purple-50 to-white">
            <h2 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-purple-800 bg-clip-text text-transparent">Your Campaigns</h2>
            <p className="text-sm text-gray-600 mt-1">Manage and monitor your review request campaigns</p>
          </div>
          
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading campaigns...</p>
            </div>
          ) : campaigns.campaigns.length === 0 ? (
            <div className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-100 to-purple-200 rounded-2xl mb-4">
                <DocumentTextIcon className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-purple-800 bg-clip-text text-transparent mb-2">No campaigns yet</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">Get started by creating your first campaign to engage with your customers</p>
              <Link
                href="/campaigns/create"
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Create Campaign
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Campaign
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Channel
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stats
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {campaigns.campaigns.map((campaign) => (
                    <tr key={campaign.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {campaign.name}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center mt-1">
                            {campaign.ai_enabled && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 mr-2">
                                🤖 AI
                              </span>
                            )}
                            Delay: {campaign.delay_hours}h
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <span className="text-lg mr-2">{getChannelIcon(campaign.channel)}</span>
                          <span className="text-sm text-gray-900 capitalize">{campaign.channel}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
                          {campaign.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {campaign.stats ? (
                          <div className="text-sm text-gray-900">
                            <div>Guests: {campaign.stats.total_guests}</div>
                            <div>Sent: {campaign.stats.messages_sent}</div>
                            <div>Rate: {campaign.stats.response_rate.toFixed(1)}%</div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">No data</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatDate(campaign.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <Link
                            href={`/campaigns/${campaign.id}`}
                            className="text-purple-600 hover:text-purple-900 p-1 rounded transition-colors duration-200"
                            title="View Details"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </Link>
                          <Link
                            href={`/campaigns/${campaign.id}/preview`}
                            className="text-purple-600 hover:text-purple-900 p-1 rounded transition-colors duration-200"
                            title="Preview Messages"
                          >
                            <DocumentTextIcon className="h-4 w-4" />
                          </Link>
                          {campaign.status === 'draft' && (
                            <button
                              className="text-green-600 hover:text-green-900 p-1 rounded"
                              title="Start Campaign"
                            >
                              <PlayIcon className="h-4 w-4" />
                            </button>
                          )}
                          {campaign.status === 'active' && (
                            <button
                              className="text-yellow-600 hover:text-yellow-900 p-1 rounded"
                              title="Pause Campaign"
                            >
                              <PauseIcon className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            className="text-red-600 hover:text-red-900 p-1 rounded"
                            title="Delete Campaign"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {campaigns.total_pages > 1 && (
            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((currentPage - 1) * campaigns.per_page) + 1} to {Math.min(currentPage * campaigns.per_page, campaigns.total)} of {campaigns.total} campaigns
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-md shadow-sm">
                  {currentPage}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(campaigns.total_pages, currentPage + 1))}
                  disabled={currentPage === campaigns.total_pages}
                  className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}