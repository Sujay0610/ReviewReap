'use client';

import { useState, useEffect } from 'react';
import { PlayIcon, PauseIcon, StopIcon, ArrowPathIcon, Cog6ToothIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon, XCircleIcon, ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';

interface Message {
  id: string;
  guest_id: string;
  content: string;
  channel: 'whatsapp' | 'email' | 'both';
  status: 'pending' | 'queued' | 'sent' | 'delivered' | 'read' | 'failed' | 'cancelled';
  scheduled_at: string;
  sent_at?: string;
  delivered_at?: string;
  read_at?: string;
  failed_at?: string;
  error_message?: string;
  retry_count: number;
  created_at: string;
}

interface CampaignExecutionProps {
  campaignId: string;
  campaignName: string;
  campaignStatus: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled';
  onStatusChange?: (newStatus: string) => void;
}

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  scheduled: 'bg-blue-100 text-blue-800',
  active: 'bg-green-100 text-green-800',
  paused: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-purple-100 text-purple-800',
  cancelled: 'bg-red-100 text-red-800'
};

const messageStatusColors = {
  pending: 'bg-gray-100 text-gray-800',
  queued: 'bg-blue-100 text-blue-800',
  sent: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-green-100 text-green-800',
  read: 'bg-emerald-100 text-emerald-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800'
};

const messageStatusIcons = {
  pending: ClockIcon,
  queued: ClockIcon,
  sent: CheckCircleIcon,
  delivered: CheckCircleIcon,
  read: CheckCircleIcon,
  failed: XCircleIcon,
  cancelled: XCircleIcon
};

export default function CampaignExecution({ 
  campaignId, 
  campaignName, 
  campaignStatus, 
  onStatusChange 
}: CampaignExecutionProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWhatsAppConfig, setShowWhatsAppConfig] = useState(false);
  const [showEmailConfig, setShowEmailConfig] = useState(false);
  const [whatsappConfig, setWhatsappConfig] = useState({
    access_token: '',
    phone_number_id: ''
  });
  const [emailConfig, setEmailConfig] = useState({
    api_key: ''
  });
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    queued: 0,
    sent: 0,
    delivered: 0,
    read: 0,
    failed: 0
  });

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [campaignId]);

  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/messages`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
        
        // Calculate stats
        const newStats = {
          total: data.length,
          pending: data.filter((m: Message) => m.status === 'pending').length,
          queued: data.filter((m: Message) => m.status === 'queued').length,
          sent: data.filter((m: Message) => m.status === 'sent').length,
          delivered: data.filter((m: Message) => m.status === 'delivered').length,
          read: data.filter((m: Message) => m.status === 'read').length,
          failed: data.filter((m: Message) => m.status === 'failed').length
        };
        setStats(newStats);
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  };

  const handleCampaignAction = async (action: 'start' | 'stop' | 'pause' | 'resume') => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        onStatusChange?.(data.status);
        await fetchMessages();
      } else {
        const errorData = await response.json();
        setError(errorData.detail || `Failed to ${action} campaign`);
      }
    } catch (err) {
      setError(`Failed to ${action} campaign`);
    } finally {
      setLoading(false);
    }
  };

  const configureWhatsApp = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/campaigns/configure-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(whatsappConfig)
      });
      
      if (response.ok) {
        setShowWhatsAppConfig(false);
        setWhatsappConfig({ access_token: '', phone_number_id: '' });
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Failed to configure WhatsApp');
      }
    } catch (err) {
      setError('Failed to configure WhatsApp');
    } finally {
      setLoading(false);
    }
  };

  const configureEmail = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/campaigns/configure-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailConfig)
      });
      
      if (response.ok) {
        setShowEmailConfig(false);
        setEmailConfig({ api_key: '' });
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Failed to configure email');
      }
    } catch (err) {
      setError('Failed to configure email');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const canStart = campaignStatus === 'draft' || campaignStatus === 'scheduled';
  const canPause = campaignStatus === 'active';
  const canResume = campaignStatus === 'paused';
  const canStop = campaignStatus === 'active' || campaignStatus === 'paused';

  return (
    <div className="space-y-6">
      {/* Campaign Status and Controls */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{campaignName}</h2>
            <div className="flex items-center mt-2">
              <span className="text-sm text-gray-500 mr-3">Status:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[campaignStatus]}`}>
                {campaignStatus.charAt(0).toUpperCase() + campaignStatus.slice(1)}
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowWhatsAppConfig(true)}
              className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Cog6ToothIcon className="w-4 h-4 mr-2" />
              Configure WhatsApp
            </button>
            
            <button
              onClick={() => setShowEmailConfig(true)}
              className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <EnvelopeIcon className="w-4 h-4 mr-2" />
              Configure Email
            </button>
            
            {canStart && (
              <button
                onClick={() => handleCampaignAction('start')}
                disabled={loading}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                <PlayIcon className="w-4 h-4 mr-2" />
                Start Campaign
              </button>
            )}
            
            {canPause && (
              <button
                onClick={() => handleCampaignAction('pause')}
                disabled={loading}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-lg hover:bg-yellow-700 disabled:opacity-50 transition-colors"
              >
                <PauseIcon className="w-4 h-4 mr-2" />
                Pause
              </button>
            )}
            
            {canResume && (
              <button
                onClick={() => handleCampaignAction('resume')}
                disabled={loading}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <ArrowPathIcon className="w-4 h-4 mr-2" />
                Resume
              </button>
            )}
            
            {canStop && (
              <button
                onClick={() => handleCampaignAction('stop')}
                disabled={loading}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                <StopIcon className="w-4 h-4 mr-2" />
                Stop
              </button>
            )}
          </div>
        </div>
        
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-400 mr-2" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          </div>
        )}
        
        {/* Message Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-500">Total</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.queued}</div>
            <div className="text-sm text-blue-500">Queued</div>
          </div>
          <div className="bg-indigo-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-indigo-600">{stats.sent}</div>
            <div className="text-sm text-indigo-500">Sent</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.delivered}</div>
            <div className="text-sm text-green-500">Delivered</div>
          </div>
          <div className="bg-emerald-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-emerald-600">{stats.read}</div>
            <div className="text-sm text-emerald-500">Read</div>
          </div>
          <div className="bg-red-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            <div className="text-sm text-red-500">Failed</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-gray-600">{stats.pending}</div>
            <div className="text-sm text-gray-500">Pending</div>
          </div>
        </div>
      </div>
      
      {/* Messages List */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Messages</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Channel</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Content Preview</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scheduled</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Retries</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {messages.map((message) => {
                const StatusIcon = messageStatusIcons[message.status];
                return (
                  <tr key={message.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <StatusIcon className="w-4 h-4 mr-2 text-gray-400" />
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${messageStatusColors[message.status]}`}>
                          {message.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 capitalize">{message.channel}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {message.content}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(message.scheduled_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {message.sent_at ? formatDate(message.sent_at) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{message.retry_count}</span>
                      {message.error_message && (
                        <div className="text-xs text-red-500 mt-1 max-w-xs truncate" title={message.error_message}>
                          {message.error_message}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500">No messages found for this campaign.</div>
            </div>
          )}
        </div>
      </div>
      
      {/* WhatsApp Configuration Modal */}
      {showWhatsAppConfig && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Configure WhatsApp API</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Access Token
                </label>
                <input
                  type="password"
                  value={whatsappConfig.access_token}
                  onChange={(e) => setWhatsappConfig(prev => ({ ...prev, access_token: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Enter WhatsApp Business API access token"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number ID
                </label>
                <input
                  type="text"
                  value={whatsappConfig.phone_number_id}
                  onChange={(e) => setWhatsappConfig(prev => ({ ...prev, phone_number_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Enter phone number ID"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowWhatsAppConfig(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={configureWhatsApp}
                disabled={loading || !whatsappConfig.access_token || !whatsappConfig.phone_number_id}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Configuring...' : 'Configure'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Configuration Modal */}
      {showEmailConfig && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Configure Email API (Resend)</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Resend API Key
                </label>
                <input
                  type="password"
                  value={emailConfig.api_key}
                  onChange={(e) => setEmailConfig(prev => ({ ...prev, api_key: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Enter your Resend API key"
                />
              </div>
              
              <div className="text-sm text-gray-600">
                <p>Get your API key from <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-700 underline">Resend Dashboard</a></p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowEmailConfig(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={configureEmail}
                disabled={loading || !emailConfig.api_key}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Configuring...' : 'Configure'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}