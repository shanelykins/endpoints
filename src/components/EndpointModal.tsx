import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Endpoint } from '../types/endpoint';

interface EndpointModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Endpoint, 'id' | 'createdAt' | 'status'>, status: Endpoint['status']) => void;
  endpoint?: Endpoint;
}

export default function EndpointModal({ isOpen, onClose, onSave, endpoint }: EndpointModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    apiType: 'openai' as const,
    targetUrl: 'https://api.openai.com/v1/chat/completions',
    allowedOrigins: ['*'],
    description: '',
    apiKey: '',
  });

  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [testStatus, setTestStatus] = useState<Endpoint['status']>('not_tested');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (endpoint) {
      setFormData({
        name: endpoint.name,
        apiType: endpoint.apiType,
        targetUrl: endpoint.targetUrl,
        allowedOrigins: endpoint.allowedOrigins,
        description: endpoint.description,
        apiKey: '',
      });
      setTestStatus(endpoint.status);
    } else {
      setFormData({
        name: '',
        apiType: 'openai',
        targetUrl: 'https://api.openai.com/v1/chat/completions',
        allowedOrigins: ['*'],
        description: '',
        apiKey: '',
      });
      setTestStatus('not_tested');
    }
    setTestInput('');
    setTestResult(null);
    setError(null);
  }, [endpoint, isOpen]);

  const testEndpoint = async () => {
    if (!formData.apiKey || !testInput) return;
    
    setIsLoading(true);
    setTestResult(null);
    setError(null);
    
    try {
      console.log('Testing endpoint with input:', testInput);
      
      const response = await fetch('/api/test-endpoint', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: formData.apiKey,
          prompt: testInput
        })
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to test endpoint');
      }

      setTestResult(data);
      setTestStatus('operational');
    } catch (error) {
      console.error('Error testing endpoint:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
      setTestStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { apiKey, ...rest } = formData;
    onSave(rest, testStatus);
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
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="w-full px-4 py-2 border rounded-lg"
            placeholder="Endpoint Name"
            required
          />

          <select
            value={formData.apiType}
            onChange={(e) => setFormData(prev => ({ ...prev, apiType: e.target.value as 'openai' }))}
            className="w-full px-4 py-2 border rounded-lg"
          >
            <option value="openai">OpenAI</option>
          </select>

          <input
            type="password"
            value={formData.apiKey}
            onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
            className="w-full px-4 py-2 border rounded-lg"
            placeholder="API Key"
            required={!endpoint}
          />

          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="w-full px-4 py-2 border rounded-lg resize-none"
            placeholder="Endpoint Description"
            rows={3}
          />

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
              className="w-full px-4 py-2 bg-black text-white rounded-lg disabled:opacity-50"
            >
              {isLoading ? 'Testing...' : 'Test Endpoint'}
            </button>

            {error && (
              <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-lg">
                {error}
              </div>
            )}

            {testResult && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <pre className="whitespace-pre-wrap text-sm">
                  {JSON.stringify(testResult, null, 2)}
                </pre>
              </div>
            )}
          </div>

          <div className="pt-4 border-t">
            <button
              type="submit"
              className="w-full px-4 py-2 bg-black text-white rounded-lg"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}