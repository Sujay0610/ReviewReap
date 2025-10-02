'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import Link from 'next/link';

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
  checkin_date?: string;
  checkout_date?: string;
  booking_id?: string;
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

interface AutoResponseResult {
  response: string;
  should_send: boolean;
  escalate: boolean;
}

export default function ConversationDetailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const conversationId = params.id as string;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [autoResponse, setAutoResponse] = useState<AutoResponseResult | null>(null);
  const [showAutoResponse, setShowAutoResponse] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    fetchConversation();
  }, [user, conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversation = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/conversations/${conversationId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch conversation');
      }
      const data = await response.json();
      setConversation(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: 'agent',
          content: newMessage.trim(),
          message_type: 'text',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      setNewMessage('');
      await fetchConversation(); // Refresh conversation
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const generateAutoResponse = async (guestMessage: string) => {
    try {
      const response = await fetch('/api/conversations/auto-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          guest_message: guestMessage,
          sentiment: conversation?.sentiment || 'neutral',
          guest_data: {
            name: conversation?.guest.name,
            room_type: conversation?.guest.room_type,
          },
          conversation_id: conversationId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate auto response');
      }

      const result = await response.json();
      setAutoResponse(result);
      setShowAutoResponse(true);
    } catch (err) {
      console.error('Error generating auto response:', err);
    }
  };

  const useAutoResponse = () => {
    if (autoResponse) {
      setNewMessage(autoResponse.response);
      setShowAutoResponse(false);
    }
  };

  const updateConversationStatus = async (status: 'active' | 'resolved' | 'escalated') => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      await fetchConversation();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update status');
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
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading conversation...</p>
        </div>
      </div>
    );
  }

  if (error || !conversation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">Error</div>
          <p className="text-gray-600">{error || 'Conversation not found'}</p>
          <Link
            href="/conversations"
            className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Conversations
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center space-x-4 mb-4">
            <Link
              href="/conversations"
              className="text-blue-600 hover:text-blue-800 flex items-center"
            >
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Conversations
            </Link>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-lg font-medium text-blue-600">
                    {conversation.guest.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{conversation.guest.name}</h1>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(conversation.status)}`}>
                      {conversation.status}
                    </span>
                    {conversation.sentiment && (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSentimentColor(conversation.sentiment)}`}>
                        {conversation.sentiment}
                      </span>
                    )}
                    <span className="text-sm text-gray-500">
                      {conversation.channel}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <select
                  value={conversation.status}
                  onChange={(e) => updateConversationStatus(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="resolved">Resolved</option>
                  <option value="escalated">Escalated</option>
                </select>
              </div>
            </div>
            
            {/* Guest Details */}
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {conversation.guest.phone && (
                <div>
                  <span className="text-gray-500">Phone:</span>
                  <p className="font-medium">{conversation.guest.phone}</p>
                </div>
              )}
              {conversation.guest.email && (
                <div>
                  <span className="text-gray-500">Email:</span>
                  <p className="font-medium">{conversation.guest.email}</p>
                </div>
              )}
              {conversation.guest.room_type && (
                <div>
                  <span className="text-gray-500">Room:</span>
                  <p className="font-medium">{conversation.guest.room_type}</p>
                </div>
              )}
              {conversation.guest.booking_id && (
                <div>
                  <span className="text-gray-500">Booking:</span>
                  <p className="font-medium">{conversation.guest.booking_id}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="h-96 overflow-y-auto p-6 space-y-4">
            {conversation.messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'guest' ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.sender === 'guest'
                      ? 'bg-gray-100 text-gray-900'
                      : message.sender === 'system'
                      ? 'bg-yellow-100 text-yellow-900'
                      : 'bg-blue-600 text-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium">
                      {message.sender === 'guest' ? conversation.guest.name : 
                       message.sender === 'system' ? 'System' : 'You'}
                    </span>
                    {message.is_automated && (
                      <span className="text-xs opacity-75">Auto</span>
                    )}
                  </div>
                  <p className="text-sm">{message.content}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs opacity-75">
                      {formatTime(message.created_at)}
                    </span>
                    {message.sentiment && message.sender === 'guest' && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${getSentimentColor(message.sentiment)}`}>
                        {message.sentiment}
                      </span>
                    )}
                  </div>
                  {message.sender === 'guest' && (
                    <button
                      onClick={() => generateAutoResponse(message.content)}
                      className="text-xs text-blue-600 hover:text-blue-800 mt-1"
                    >
                      Generate Response
                    </button>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Auto Response Suggestion */}
        {showAutoResponse && autoResponse && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-yellow-800 mb-2">
                  AI Suggested Response
                  {autoResponse.escalate && (
                    <span className="ml-2 text-red-600">(Escalation Recommended)</span>
                  )}
                </h3>
                <p className="text-sm text-yellow-700 mb-3">{autoResponse.response}</p>
                <div className="flex space-x-2">
                  <button
                    onClick={useAutoResponse}
                    className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
                  >
                    Use This Response
                  </button>
                  <button
                    onClick={() => setShowAutoResponse(false)}
                    className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Message Input */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex space-x-4">
            <div className="flex-1">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />
            </div>
            <div className="flex flex-col space-y-2">
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim() || sending}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}