import React, { useState, useEffect } from 'react';
import { X, Copy, CheckCircle } from 'lucide-react';
import type { Endpoint, ApiType } from '../types/endpoint';
import toast from 'react-hot-toast';

interface EndpointModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Endpoint, 'id' | 'createdAt' | 'status'>, status: Endpoint['status'], proxyUrl?: string) => void;
  endpoint?: Endpoint;
}

const API_TYPES: { value: ApiType; label: string; url: string }[] = [
  { value: 'openai', label: 'OpenAI', url: 'https://api.openai.com/v1/chat/completions' },
  { value: 'anthropic', label: 'Anthropic', url: 'https://api.anthropic.com/v1/complete' },
  { value: 'cohere', label: 'Cohere', url: 'https://api.cohere.ai/v1/generate' },
  { value: 'google-ai', label: 'Google AI', url: 'https://generativelanguage.googleapis.com/v1/models' },
  { value: 'azure-openai', label: 'Azure OpenAI', url: 'https://YOUR_RESOURCE_NAME.openai.azure.com/openai/deployments/YOUR_DEPLOYMENT_NAME' },
  { value: 'huggingface', label: 'Hugging Face', url: 'https://api-inference.huggingface.co/models' },
  { value: 'custom', label: 'Custom API', url: '' }
];

export default function EndpointModal({ isOpen, onClose, onSave, endpoint }: EndpointModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    apiType: 'openai' as ApiType,
    targetUrl: API_TYPES[0].url,
    allowedOrigins: ['*'],
    description: '',
    apiKey: '',
  });

  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [testStatus, setTestStatus] = useState<Endpoint['status']>('not_tested');
  const [error, setError] = useState<string | null>(null);
  const [proxyUrl, setProxyUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (endpoint) {
      setFormData({
        name: endpoint.name,
        apiType: endpoint.apiType,
        targetUrl: endpoint.targetUrl,
        allowedOrigins: endpoint.allowedOrigins,
        description: endpoint.description || '',
        apiKey: '',
      });
      setTestStatus(endpoint.status);
      setProxyUrl(endpoint.proxyUrl || null);
    } else {
      setFormData({
        name: '',
        apiType: 'openai',
        targetUrl: API_TYPES[0].url,
        allowedOrigins: ['*'],
        description: '',
        apiKey: '',
      });
      setTestStatus('not_tested');
      setProxyUrl(null);
    }
    setTestInput('');
    setTestResult(null);
    setError(null);
    setCopied(false);
  }, [endpoint, isOpen]);

  const handleApiTypeChange = (type: ApiType) => {
    const selectedApi = API_TYPES.find(api => api.value === type);
    setFormData(prev => ({
      ...prev,
      apiType: type,
      targetUrl: selectedApi?.url || ''
    }));
  };

  const copyProxyUrl = async () => {
    if (proxyUrl) {
      await navigator.clipboard.writeText(proxyUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const testEndpoint = async () => {
    if (!formData.apiKey || !testInput) {
      toast.error('API key and test input are required');
      return;
    }
    
    setIsLoading(true);
    setTestResult(null);
    setError(null);
    
    try {
      const response = await fetch('/api/test-endpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: formData.apiKey,
          prompt: testInput
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to test endpoint');
      }

      setTestResult(data);
      setTestStatus('operational');
      toast.success('Endpoint test successful');
    } catch (error) {
      console.error('Error testing endpoint:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
      setTestStatus('error');
      toast.error('Failed to test endpoint');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { apiKey, ...rest } = formData;
      await onSave(rest, testStatus, proxyUrl || undefined);
      toast.success('Endpoint saved successfully');
      onClose();
    } catch (error) {
      console.error('Error saving endpoint:', error);
      toast.error('Failed to save endpoint');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 pb-4">
          <h2 className="text-xl font-semibold">
            {endpoint ? 'Edit Endpoint' : 'Create New Endpoint'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 pt-2 space-y-4">
          <div className="space-y-4">
            <select
              value={formData.apiType}
              onChange={(e) => handleApiTypeChange(e.target.value as ApiType)}
              className="w-full px-4 py-2 border rounded-lg bg-white"
            >
              {API_TYPES.map(api => (
                <option key={api.value} value={api.value}>
                  {api.label}
                </option>
              ))}
            </select>

            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="Endpoint Name"
              required
            />

            <input
              type="password"
              value={formData.apiKey}
              onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="API Key"
              required={!endpoint}
            />

            <input
              type="url"
              value={formData.targetUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, targetUrl: e.target.value }))}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="Target URL"
              required
            />

            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-4 py-2 border rounded-lg resize-none"
              placeholder="Endpoint Description"
              rows={3}
            />
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Test Endpoint</h3>
              <span className="text-sm text-gray-500">
                {testStatus === 'not_tested' && 'Not tested yet'}
                {isLoading && 'Testing...'}
                {testStatus === 'operational' && 'Operational'}
                {testStatus === 'error' && 'Error'}
              </span>
            </div>

            <textarea
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg resize-none mb-4"
              placeholder="Enter text to test..."
              rows={3}
            />

            <button
              type="button"
              onClick={testEndpoint}
              disabled={isLoading || !formData.apiKey || !testInput}
              className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg disabled:opacity-50 hover:bg-gray-800"
            >
              {isLoading ? 'Testing...' : 'Test Endpoint'}
            </button>

            {error && (
              <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-lg">
                {error}
              </div>
            )}

            {testResult && (
              <div className="mt-4">
                <h4 className="font-semibold mb-2">Response:</h4>
                <pre className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-[200px] text-sm">
                  {JSON.stringify(testResult, null, 2)}
                </pre>
              </div>
            )}
          </div>

          <div className="pt-4 border-t">
            <button
              type="submit"
              className="w-full px-4 py-2 bg-black text-white rounded-lg hover:bg-black/90"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}