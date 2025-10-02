'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeftIcon, PencilIcon, TrashIcon, PlayIcon, PauseIcon, StopIcon, EyeIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon, ClockIcon, ExclamationTriangleIcon, XCircleIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';
import CampaignExecution from '@/components/CampaignExecution';

interface Campaign {
  id: string;
  name: string;
  channel: 'whatsapp' | 'email' | 'both';
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled';
  message_template: string;
  ai_enabled: boolean;
  delay_hours: number;
  created_at: string;
  scheduled_at?: string;
  stats: {
    total_recipients: number;
    messages_sent: number;
    messages_delivered: number;
    messages_read: number;
    responses_received: number;
    reviews_generated: number;
  };
}

interface Message {
  id: string;
  guest_name: string;
  guest_email?: string;
  guest_phone?: string;
  channel: 'whatsapp' | 'email';
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'responded' | 'failed';
  content: string;
  sent_at?: string;
  delivered_at?: string;
  read_at?: string;
  responded_at?: string;
  error_message?: string;
}

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;
  
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'messages' | 'analytics'>('overview');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchCampaign();
    fetchMessages();
  }, [campaignId, currentPage]);

  const fetchCampaign = async () => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}`);
      if (response.ok) {
        const data = await response.json();
        setCampaign(data);
      } else {
        router.push('/campaigns');
      }
    } catch (error) {
      console.error('Error fetching campaign:', error);
      router.push('/campaigns');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/messages?page=${currentPage}&per_page=20`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages);
        setTotalPages(Math.ceil(data.total / 20));
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleCampaignAction = async (action: 'start' | 'pause' | 'resume' | 'stop' | 'delete') => {
    try {
      setActionLoading(true);
      let response;
      
      switch (action) {
        case 'start':
          response = await fetch(`/api/campaigns/${campaignId}/start`, { method: 'POST' });
          break;
        case 'pause':
          response = await fetch(`/api/campaigns/${campaignId}/pause`, { method: 'POST' });
          break;
        case 'resume':
          response = await fetch(`/api/campaigns/${campaignId}/resume`, { method: 'POST' });
          break;
        case 'stop':
          response = await fetch(`/api/campaigns/${campaignId}/stop`, { method: 'POST' });
          break;
        case 'delete':
          if (confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) {
            response = await fetch(`/api/campaigns/${campaignId}`, { method: 'DELETE' });
            if (response.ok) {
              router.push('/campaigns');
              return;
            }
          } else {
            return;
          }
          break;
      }
      
      if (response?.ok) {
        fetchCampaign();
        fetchMessages();
      } else {
        const error = await response?.json();
        alert(`Error: ${error?.detail || 'Action failed'}`);
      }
    } catch (error) {
      console.error(`Error performing ${action}:`, error);
      alert(`Failed to ${action} campaign`);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-indigo-100 text-indigo-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getMessageStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
      case 'delivered':
      case 'read':
      case 'responded':
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <ClockIcon className="h-4 w-4 text-yellow-500" />;
      case 'failed':
        return <XCircleIcon className="h-4 w-4 text-red-500" />;
      default:
        return <ClockIcon className="h-4 w-4 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Campaign not found</h2>
          <Link href="/campaigns" className="text-indigo-600 hover:text-indigo-800">
            Return to campaigns
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 shadow-xl">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link
                href="/campaigns"
                className="mr-4 p-2 text-white hover:bg-white/20 rounded-lg transition-colors duration-200"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-white mb-1">
                  {campaign.name}
                </h1>
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
                    {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                  </span>
                  <span className="text-indigo-100 text-sm">
                    {campaign.channel.charAt(0).toUpperCase() + campaign.channel.slice(1)}
                  </span>
                  {campaign.ai_enabled && (
                    <span className="text-indigo-100 text-sm">• AI Enabled</span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {campaign.status === 'draft' && (
                <button
                  onClick={() => handleCampaignAction('start')}
                  disabled={actionLoading}
                  className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center text-sm"
                >
                  <PlayIcon className="h-4 w-4 mr-1" />
                  Start
                </button>
              )}
              
              {campaign.status === 'active' && (
                <>
                  <button
                    onClick={() => handleCampaignAction('pause')}
                    disabled={actionLoading}
                    className="px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 flex items-center text-sm"
                  >
                    <PauseIcon className="h-4 w-4 mr-1" />
                    Pause
                  </button>
                  <button
                    onClick={() => handleCampaignAction('stop')}
                    disabled={actionLoading}
                    className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center text-sm"
                  >
                    <StopIcon className="h-4 w-4 mr-1" />
                    Stop
                  </button>
                </>
              )}
              
              {campaign.status === 'paused' && (
                <button
                  onClick={() => handleCampaignAction('resume')}
                  disabled={actionLoading}
                  className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center text-sm"
                >
                  <PlayIcon className="h-4 w-4 mr-1" />
                  Resume
                </button>
              )}
              
              {['draft', 'completed', 'cancelled'].includes(campaign.status) && (
                <button
                  onClick={() => handleCampaignAction('delete')}
                  disabled={actionLoading}
                  className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center text-sm"
                >
                  <TrashIcon className="h-4 w-4 mr-1" />
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-6">
        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', name: 'Overview', icon: EyeIcon },
                { id: 'execution', name: 'Execution', icon: PlayIcon },
                { id: 'messages', name: 'Messages', icon: null },
                { id: 'analytics', name: 'Analytics', icon: ChartBarIcon }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                    activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.icon && <tab.icon className="h-4 w-4 mr-2" />}
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-white p-4 rounded-lg shadow-md border border-gray-100">
                <div className="text-2xl font-bold text-gray-900">{campaign.stats.total_recipients}</div>
                <div className="text-sm text-gray-600">Recipients</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-md border border-gray-100">
                <div className="text-2xl font-bold text-blue-600">{campaign.stats.messages_sent}</div>
                <div className="text-sm text-gray-600">Sent</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-md border border-gray-100">
                <div className="text-2xl font-bold text-green-600">{campaign.stats.messages_delivered}</div>
                <div className="text-sm text-gray-600">Delivered</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-md border border-gray-100">
                <div className="text-2xl font-bold text-indigo-600">{campaign.stats.messages_read}</div>
                <div className="text-sm text-gray-600">Read</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-md border border-gray-100">
                <div className="text-2xl font-bold text-purple-600">{campaign.stats.responses_received}</div>
                <div className="text-sm text-gray-600">Responses</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-md border border-gray-100">
                <div className="text-2xl font-bold text-yellow-600">{campaign.stats.reviews_generated}</div>
                <div className="text-sm text-gray-600">Reviews</div>
              </div>
            </div>

            {/* Campaign Details */}
            <div className="bg-white rounded-lg shadow-md border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Campaign Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Channel</label>
                    <p className="text-sm text-gray-900">{campaign.channel}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Delay After Checkout</label>
                    <p className="text-sm text-gray-900">{campaign.delay_hours} hours</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">AI Personalization</label>
                    <p className="text-sm text-gray-900">{campaign.ai_enabled ? 'Enabled' : 'Disabled'}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Created</label>
                    <p className="text-sm text-gray-900">{new Date(campaign.created_at).toLocaleDateString()}</p>
                  </div>
                  {campaign.scheduled_at && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Scheduled</label>
                      <p className="text-sm text-gray-900">{new Date(campaign.scheduled_at).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Message Template */}
            <div className="bg-white rounded-lg shadow-md border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Message Template</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap">{campaign.message_template}</pre>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'execution' && (
          <CampaignExecution
            campaignId={campaignId}
            campaignName={campaign.name}
            campaignStatus={campaign.status}
            onStatusChange={(newStatus) => {
              setCampaign(prev => prev ? { ...prev, status: newStatus as Campaign['status'] } : null);
            }}
          />
        )}

        {activeTab === 'messages' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md border border-gray-100">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Messages</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Recipient
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Channel
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sent At
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {messages.map((message) => (
                      <tr key={message.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{message.guest_name}</div>
                            <div className="text-sm text-gray-500">
                              {message.guest_email || message.guest_phone}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900 capitalize">{message.channel}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {getMessageStatusIcon(message.status)}
                            <span className="ml-2 text-sm text-gray-900 capitalize">{message.status}</span>
                          </div>
                          {message.error_message && (
                            <div className="text-xs text-red-600 mt-1">{message.error_message}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {message.sent_at ? new Date(message.sent_at).toLocaleString() : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button className="text-indigo-600 hover:text-indigo-900">
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Campaign Analytics</h3>
              <div className="text-center py-12">
                <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Detailed analytics will be available in Phase 4</p>
                <p className="text-sm text-gray-400 mt-2">
                  This will include delivery rates, response rates, and review conversion metrics
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}