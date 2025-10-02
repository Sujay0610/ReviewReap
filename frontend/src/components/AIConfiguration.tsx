'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Brain, MessageSquare, Settings, Plus, Edit, Trash2 } from 'lucide-react';

interface AIConfig {
  ai_enabled: boolean;
  openai_api_key?: string;
  model: string;
  max_tokens: number;
  temperature: number;
  system_prompt: string;
}

interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  template: string;
  category: string;
  variables: string[];
  created_at: string;
  updated_at: string;
}

const AIConfiguration: React.FC = () => {
  const [config, setConfig] = useState<AIConfig>({
    ai_enabled: false,
    model: 'gpt-4o-mini',
    max_tokens: 150,
    temperature: 0.7,
    system_prompt: 'You are a helpful assistant for ReviewReap review automation.'
  });
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testMessage, setTestMessage] = useState('');
  const [testResult, setTestResult] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    template: '',
    category: 'personalization'
  });
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);
  const [showNewTemplate, setShowNewTemplate] = useState(false);

  useEffect(() => {
    fetchAIConfig();
    fetchPromptTemplates();
  }, []);

  const fetchAIConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/ai/config', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
      }
    } catch (error) {
      console.error('Error fetching AI config:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPromptTemplates = async () => {
    try {
      const response = await fetch('/api/ai/templates', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error('Error fetching prompt templates:', error);
    }
  };

  const saveAIConfig = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/ai/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(config)
      });
      if (response.ok) {
        alert('AI configuration saved successfully!');
      } else {
        alert('Failed to save AI configuration');
      }
    } catch (error) {
      console.error('Error saving AI config:', error);
      alert('Error saving AI configuration');
    } finally {
      setSaving(false);
    }
  };

  const testAI = async () => {
    if (!testMessage.trim()) return;
    
    try {
      setTestLoading(true);
      const response = await fetch('/api/ai/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ message: testMessage })
      });
      if (response.ok) {
        const data = await response.json();
        setTestResult(data.response);
      } else {
        setTestResult('Error: Failed to get AI response');
      }
    } catch (error) {
      console.error('Error testing AI:', error);
      setTestResult('Error: Failed to connect to AI service');
    } finally {
      setTestLoading(false);
    }
  };

  const createTemplate = async () => {
    try {
      const response = await fetch('/api/ai/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newTemplate)
      });
      if (response.ok) {
        setNewTemplate({ name: '', description: '', template: '', category: 'personalization' });
        setShowNewTemplate(false);
        fetchPromptTemplates();
      }
    } catch (error) {
      console.error('Error creating template:', error);
    }
  };

  const updateTemplate = async (template: PromptTemplate) => {
    try {
      const response = await fetch(`/api/ai/templates/${template.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(template)
      });
      if (response.ok) {
        setEditingTemplate(null);
        fetchPromptTemplates();
      }
    } catch (error) {
      console.error('Error updating template:', error);
    }
  };

  const deleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    
    try {
      const response = await fetch(`/api/ai/templates/${templateId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        fetchPromptTemplates();
      }
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="config" className="space-y-6">
        <div className="bg-gradient-to-br from-white to-purple-50 rounded-2xl shadow-xl border border-purple-100 p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-200 to-purple-300 rounded-full opacity-20 transform translate-x-16 -translate-y-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-purple-100 to-purple-200 rounded-full opacity-30 transform -translate-x-12 translate-y-12"></div>
          <div className="relative z-10">
            <TabsList className="bg-white/80 backdrop-blur-sm border border-purple-100 shadow-lg">
              <TabsTrigger value="config" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-purple-700 data-[state=active]:text-white">Configuration</TabsTrigger>
              <TabsTrigger value="templates" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-purple-700 data-[state=active]:text-white">Prompt Templates</TabsTrigger>
              <TabsTrigger value="test" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-purple-700 data-[state=active]:text-white">Test AI</TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="config">
          <div className="bg-gradient-to-br from-white to-purple-50 rounded-2xl shadow-xl border border-purple-100 p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-purple-200 to-purple-300 rounded-full opacity-20 transform translate-x-20 -translate-y-20"></div>
            <div className="absolute bottom-0 left-0 w-28 h-28 bg-gradient-to-tr from-purple-100 to-purple-200 rounded-full opacity-30 transform -translate-x-14 translate-y-14"></div>
            <div className="relative z-10">
              <div className="mb-8">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl mb-4 shadow-lg">
                  <Settings className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-purple-800 bg-clip-text text-transparent mb-2">
                  AI Settings
                </h2>
                <p className="text-gray-600">
                  Configure your AI assistant for personalized messaging and automated responses.
                </p>
              </div>
              <div className="space-y-6">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={config.ai_enabled}
                  onCheckedChange={(checked) => setConfig({ ...config, ai_enabled: checked })}
                  className="data-[state=unchecked]:bg-gray-200 data-[state=checked]:bg-purple-600 border-2 border-gray-300 data-[state=checked]:border-purple-600"
                />
                <Label className="text-gray-900 font-medium">Enable AI Features</Label>
              </div>

              {config.ai_enabled && (
                <>
                  <div className="space-y-2">
                      <Label htmlFor="openai-key" className="text-gray-700 font-medium">OpenAI API Key</Label>
                      <Input
                        id="openai-key"
                        type="password"
                        placeholder="sk-..."
                        value={config.openai_api_key || ''}
                        onChange={(e) => setConfig({ ...config, openai_api_key: e.target.value })}
                        className="border-purple-200 focus:border-purple-500 focus:ring-purple-500 bg-white/80 backdrop-blur-sm text-gray-900 placeholder-gray-500"
                      />
                    </div>

                  <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="model" className="text-gray-700 font-medium">Model</Label>
                        <select
                          id="model"
                          className="w-full p-3 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white/80 backdrop-blur-sm transition-all duration-200 text-gray-900"
                          value={config.model}
                          onChange={(e) => setConfig({ ...config, model: e.target.value })}
                        >
                          <option value="gpt-4o-mini">GPT-4o Mini</option>
                          <option value="gpt-4o">GPT-4o</option>
                          <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="max-tokens" className="text-gray-700 font-medium">Max Tokens</Label>
                        <Input
                          id="max-tokens"
                          type="number"
                          min="50"
                          max="500"
                          value={config.max_tokens}
                          onChange={(e) => setConfig({ ...config, max_tokens: parseInt(e.target.value) })}
                          className="border-purple-200 focus:border-purple-500 focus:ring-purple-500 bg-white/80 backdrop-blur-sm text-gray-900"
                        />
                      </div>
                    </div>

                  <div className="space-y-2">
                    <Label htmlFor="temperature" className="text-gray-700 font-medium">Temperature: {config.temperature}</Label>
                    <input
                      id="temperature"
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={config.temperature}
                      onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                      className="w-full h-2 bg-purple-100 rounded-lg appearance-none cursor-pointer slider-thumb:appearance-none slider-thumb:h-4 slider-thumb:w-4 slider-thumb:rounded-full slider-thumb:bg-gradient-to-r slider-thumb:from-purple-600 slider-thumb:to-purple-700 slider-thumb:cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, #a855f7 0%, #a855f7 ${config.temperature * 100}%, #e9d5ff ${config.temperature * 100}%, #e9d5ff 100%)`
                      }}
                    />
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Conservative</span>
                      <span>Creative</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="system-prompt" className="text-gray-700 font-medium">System Prompt</Label>
                    <Textarea
                      id="system-prompt"
                      rows={4}
                      placeholder="You are a helpful assistant..."
                      value={config.system_prompt}
                      onChange={(e) => setConfig({ ...config, system_prompt: e.target.value })}
                      className="border-purple-200 focus:border-purple-500 focus:ring-purple-500 bg-white/80 backdrop-blur-sm resize-none text-gray-900 placeholder-gray-500"
                    />
                  </div>
                </>
              )}

                <Button 
                  onClick={saveAIConfig} 
                  disabled={saving}
                  className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save Configuration
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="templates">
          <div className="bg-gradient-to-br from-white to-purple-50 rounded-2xl shadow-xl border border-purple-100 p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-purple-200 to-purple-300 rounded-full opacity-20 transform translate-x-20 -translate-y-20"></div>
            <div className="absolute bottom-0 left-0 w-28 h-28 bg-gradient-to-tr from-purple-100 to-purple-200 rounded-full opacity-30 transform -translate-x-14 translate-y-14"></div>
            <div className="relative z-10 space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl mb-4 shadow-lg">
                    <MessageSquare className="h-6 w-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-purple-800 bg-clip-text text-transparent mb-2">
                    Prompt Templates
                  </h2>
                  <p className="text-gray-600">
                    Manage AI prompt templates for different message types.
                  </p>
                </div>
                <Button 
                  onClick={() => setShowNewTemplate(true)}
                  className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Template
                </Button>
              </div>

              {showNewTemplate && (
                <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-purple-200 p-6">
                  <div className="mb-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Create New Template</h3>
                    <p className="text-gray-600">Create a new AI prompt template for your campaigns.</p>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-gray-700 font-medium">Name</Label>
                        <Input
                          value={newTemplate.name}
                          onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                          className="border-purple-200 focus:border-purple-500 focus:ring-purple-500 bg-white/80 backdrop-blur-sm text-gray-900 placeholder-gray-500"
                          placeholder="Enter template name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-gray-700 font-medium">Category</Label>
                        <select
                          className="w-full p-3 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white/80 backdrop-blur-sm transition-all duration-200 text-gray-900"
                          value={newTemplate.category}
                          onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
                        >
                          <option value="personalization">Personalization</option>
                          <option value="follow_up">Follow Up</option>
                          <option value="response">Auto Response</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-700 font-medium">Description</Label>
                      <Input
                          value={newTemplate.description}
                          onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                          className="border-purple-200 focus:border-purple-500 focus:ring-purple-500 bg-white/80 backdrop-blur-sm text-gray-900 placeholder-gray-500"
                          placeholder="Describe what this template does"
                        />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-700 font-medium">Template</Label>
                      <Textarea
                          rows={4}
                          value={newTemplate.template}
                          onChange={(e) => setNewTemplate({ ...newTemplate, template: e.target.value })}
                          className="border-purple-200 focus:border-purple-500 focus:ring-purple-500 bg-white/80 backdrop-blur-sm resize-none text-gray-900 placeholder-gray-500"
                          placeholder="Enter your AI prompt template here..."
                        />
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        onClick={createTemplate}
                        className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                      >
                        Create
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setShowNewTemplate(false)}
                        className="border-purple-200 text-purple-700 hover:bg-purple-50"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid gap-4">
                {templates.map((template) => (
                  <div key={template.id} className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-purple-200 p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="text-lg font-semibold text-gray-900">{template.name}</h4>
                          <Badge variant="secondary" className="bg-purple-100 text-purple-800">{template.category}</Badge>
                        </div>
                        <p className="text-gray-600">{template.description}</p>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingTemplate(template)}
                          className="border-purple-200 text-purple-700 hover:bg-purple-50"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteTemplate(template.id)}
                          className="border-red-200 text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                      <code className="text-sm text-gray-800">{template.template}</code>
                    </div>
                    {template.variables.length > 0 && (
                      <div className="mt-4">
                        <span className="text-sm font-medium text-gray-700">Variables: </span>
                        {template.variables.map((variable, index) => (
                          <Badge key={index} variant="outline" className="mr-1 border-purple-200 text-purple-700">
                            {variable}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="test">
          <div className="bg-gradient-to-br from-white to-purple-50 rounded-2xl shadow-xl border border-purple-100 p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-purple-200 to-purple-300 rounded-full opacity-20 transform translate-x-20 -translate-y-20"></div>
            <div className="absolute bottom-0 left-0 w-28 h-28 bg-gradient-to-tr from-purple-100 to-purple-200 rounded-full opacity-30 transform -translate-x-14 translate-y-14"></div>
            <div className="relative z-10">
              <div className="mb-8">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl mb-4 shadow-lg">
                  <MessageSquare className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-purple-800 bg-clip-text text-transparent mb-2">
                  Test AI Assistant
                </h2>
                <p className="text-gray-600">
                  Test your AI configuration with a sample message.
                </p>
              </div>
              <div className="space-y-4">
              {!config.ai_enabled && (
                <Alert>
                  <AlertDescription>
                    AI features are disabled. Enable them in the Configuration tab to test.
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="test-message" className="text-gray-700 font-medium">Test Message</Label>
                <Textarea
                  id="test-message"
                  rows={3}
                  placeholder="Enter a message to test AI response..."
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  disabled={!config.ai_enabled}
                  className="border-purple-200 focus:border-purple-500 focus:ring-purple-500 bg-white/80 backdrop-blur-sm resize-none text-gray-900 placeholder-gray-500"
                />
              </div>
              
                <Button 
                  onClick={testAI} 
                  disabled={!config.ai_enabled || !testMessage.trim() || testLoading}
                  className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {testLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Test AI Response
                </Button>
                
                {testResult && (
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium">AI Response</Label>
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                      <p className="text-sm text-gray-800">{testResult}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AIConfiguration;