'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, SparklesIcon, ClockIcon, ChatBubbleLeftRightIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import Layout from '@/components/Layout';

interface TemplateVariable {
  variable: string;
  description: string;
}

interface Guest {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  room_type?: string;
  checkin_date?: string;
  checkout_date?: string;
  booking_id?: string;
}

export default function CreateCampaignPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [templateVariables, setTemplateVariables] = useState<TemplateVariable[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    channel: 'whatsapp' as 'whatsapp' | 'email' | 'both',
    message_template: '',
    ai_enabled: false,
    delay_hours: 24,
    guest_ids: [] as string[]
  });

  useEffect(() => {
    fetchTemplateVariables();
    fetchGuests();
  }, []);

  const fetchTemplateVariables = async () => {
    try {
      const response = await fetch('/api/campaigns/template/variables');
      if (response.ok) {
        const data = await response.json();
        setTemplateVariables(data.variables);
      }
    } catch (error) {
      console.error('Error fetching template variables:', error);
    }
  };

  const fetchGuests = async () => {
    try {
      const response = await fetch('/api/guests?per_page=100');
      if (response.ok) {
        const data = await response.json();
        setGuests(data.guests);
      }
    } catch (error) {
      console.error('Error fetching guests:', error);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const insertVariable = (variable: string) => {
    const textarea = document.getElementById('message_template') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const newText = text.substring(0, start) + variable + text.substring(end);
      handleInputChange('message_template', newText);
      
      // Set cursor position after inserted variable
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length, start + variable.length);
      }, 0);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const campaign = await response.json();
        router.push(`/campaigns/${campaign.id}`);
      } else {
        const error = await response.json();
        alert(`Error: ${error.detail}`);
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
      alert('Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { id: 1, name: 'Basic Info', description: 'Campaign details' },
    { id: 2, name: 'Message Template', description: 'Design your message' },
    { id: 3, name: 'Select Guests', description: 'Choose recipients' },
    { id: 4, name: 'Review & Create', description: 'Final review' }
  ];

  const isStepValid = (step: number) => {
    switch (step) {
      case 1:
        return formData.name.trim() !== '' && formData.channel !== '';
      case 2:
        return formData.message_template.trim() !== '';
      case 3:
        return formData.guest_ids.length > 0;
      case 4:
        return true;
      default:
        return false;
    }
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
              <div className="flex items-center mb-4">
                <Link
                  href="/campaigns"
                  className="mr-4 p-2 text-purple-600 hover:bg-purple-100 rounded-xl transition-colors duration-200"
                >
                  <ArrowLeftIcon className="h-5 w-5" />
                </Link>
                <div>
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl mb-4 shadow-lg">
                    <SparklesIcon className="h-7 w-7 text-white" />
                  </div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-purple-800 bg-clip-text text-transparent mb-3">
                    Create New Campaign
                  </h1>
                  <p className="text-lg text-gray-600 mb-4 max-w-2xl leading-relaxed">
                    Set up your review request campaign with AI-powered personalization
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className="flex items-center">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shadow-lg ${
                        currentStep >= step.id
                          ? 'bg-gradient-to-br from-purple-600 to-purple-700 text-white'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {step.id}
                    </div>
                    <div className="ml-4">
                      <p className={`text-sm font-semibold ${
                        currentStep >= step.id ? 'text-purple-700' : 'text-gray-500'
                      }`}>
                        {step.name}
                      </p>
                      <p className="text-xs text-gray-500">{step.description}</p>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-1 mx-6 rounded-full ${
                      currentStep > step.id ? 'bg-gradient-to-r from-purple-600 to-purple-700' : 'bg-gray-200'
                    }`} />
                  )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="mt-8 bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="p-8">
            {/* Step 1: Basic Info */}
            {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Campaign Details</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Campaign Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                      placeholder="e.g., Post-Stay Review Request - January 2024"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Communication Channel *
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => handleInputChange('channel', 'whatsapp')}
                        className={`p-4 border-2 rounded-xl text-center transition-all duration-200 ${
                          formData.channel === 'whatsapp'
                            ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-lg'
                            : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                        }`}
                      >
                        <ChatBubbleLeftRightIcon className="h-6 w-6 mx-auto mb-2" />
                        <div className="text-sm font-medium">WhatsApp</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInputChange('channel', 'email')}
                        className={`p-4 border-2 rounded-xl text-center transition-all duration-200 ${
                          formData.channel === 'email'
                            ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-lg'
                            : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                        }`}
                      >
                        <EnvelopeIcon className="h-6 w-6 mx-auto mb-2" />
                        <div className="text-sm font-medium">Email</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInputChange('channel', 'both')}
                        className={`p-4 border-2 rounded-xl text-center transition-all duration-200 ${
                          formData.channel === 'both'
                            ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-lg'
                            : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                        }`}
                      >
                        <div className="flex justify-center mb-2">
                          <ChatBubbleLeftRightIcon className="h-5 w-5" />
                          <EnvelopeIcon className="h-5 w-5 ml-1" />
                        </div>
                        <div className="text-sm font-medium">Both</div>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Delay After Checkout (hours)
                    </label>
                    <div className="flex items-center space-x-3">
                      <ClockIcon className="h-5 w-5 text-gray-400" />
                      <input
                        type="number"
                        value={formData.delay_hours}
                        onChange={(e) => handleInputChange('delay_hours', parseInt(e.target.value))}
                        className="w-24 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                        min="1"
                        max="168"
                      />
                      <span className="text-sm text-gray-600">hours after checkout</span>
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.ai_enabled}
                        onChange={(e) => handleInputChange('ai_enabled', e.target.checked)}
                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 flex items-center">
                        <SparklesIcon className="h-4 w-4 mr-1 text-purple-500" />
                        Enable AI personalization
                      </span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1 ml-6">
                      AI will personalize messages based on guest data and generate intelligent responses
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Message Template */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Message Template</h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Message Content *
                    </label>
                    <textarea
                      id="message_template"
                      value={formData.message_template}
                      onChange={(e) => handleInputChange('message_template', e.target.value)}
                      rows={8}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Hi {{name}}, thank you for staying with us! We hope you enjoyed your {{room_type}} room. Would you mind leaving us a review? {{review_link}}"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Use template variables to personalize your message
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Template Variables
                    </label>
                    <div className="space-y-2">
                      {templateVariables.map((variable) => (
                        <button
                          key={variable.variable}
                          type="button"
                          onClick={() => insertVariable(variable.variable)}
                          className="w-full text-left p-2 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors duration-200"
                        >
                          <div className="text-sm font-mono text-indigo-600">
                            {variable.variable}
                          </div>
                          <div className="text-xs text-gray-500">
                            {variable.description}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Select Guests */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Recipients</h2>
                
                <div className="mb-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      {formData.guest_ids.length} of {guests.length} guests selected
                    </p>
                    <div className="space-x-2">
                      <button
                        type="button"
                        onClick={() => handleInputChange('guest_ids', guests.map(g => g.id))}
                        className="text-sm text-indigo-600 hover:text-indigo-800"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInputChange('guest_ids', [])}
                        className="text-sm text-gray-600 hover:text-gray-800"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>
                </div>

                <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                  {guests.map((guest) => (
                    <label
                      key={guest.id}
                      className="flex items-center p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.guest_ids.includes(guest.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            handleInputChange('guest_ids', [...formData.guest_ids, guest.id]);
                          } else {
                            handleInputChange('guest_ids', formData.guest_ids.filter(id => id !== guest.id));
                          }
                        }}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="ml-3 flex-1">
                        <div className="text-sm font-medium text-gray-900">{guest.name}</div>
                        <div className="text-xs text-gray-500">
                          {guest.email && <span>{guest.email}</span>}
                          {guest.phone && <span className="ml-2">{guest.phone}</span>}
                          {guest.room_type && <span className="ml-2">• {guest.room_type}</span>}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review & Create */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Review Campaign</h2>
                
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-2">Campaign Details</h3>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>Name:</strong> {formData.name}</p>
                      <p><strong>Channel:</strong> {formData.channel}</p>
                      <p><strong>Delay:</strong> {formData.delay_hours} hours after checkout</p>
                      <p><strong>AI Enabled:</strong> {formData.ai_enabled ? 'Yes' : 'No'}</p>
                      <p><strong>Recipients:</strong> {formData.guest_ids.length} guests</p>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-2">Message Template</h3>
                    <div className="text-sm text-gray-600 whitespace-pre-wrap bg-white p-3 rounded border">
                      {formData.message_template}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          </div>
        </div>

        {/* Navigation Buttons */}
          <div className="flex justify-between pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            <div className="flex space-x-3">
              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep(currentStep + 1)}
                  disabled={!isStepValid(currentStep)}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading || !isStepValid(currentStep)}
                  className="px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    'Create Campaign'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}