import React, { useState } from 'react';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import type { Endpoint } from '../types/endpoint';

interface EndpointTesterProps {
  endpoint: Endpoint;
  onStatusChange: (status: Endpoint['status']) => void;
}

export default function EndpointTester({ endpoint, onStatusChange }: EndpointTesterProps) {
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const getTestPrompt = () => {
    switch (endpoint.apiType) {
      case 'openai':
        return {
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: input || 'Hello, this is a test message.' }]
        };
      case 'anthropic':
        return {
          model: 'claude-2',
          prompt: input || 'Hello, this is a test message.',
          max_tokens_to_sample: 300
        };
      default:
        return { message: input || 'Hello, this is a test message.' };
    }
  };

  const testEndpoint = async () => {
    setIsLoading(true);
    setResult('');
    
    try {
      const response = await fetch('/api/proxy/' + endpoint.id, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(getTestPrompt())
      });

      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || 'Failed to test endpoint');
      
      setResult(JSON.stringify(data, null, 2));
      onStatusChange('operational');
    } catch (error) {
      setResult(error instanceof Error ? error.message : 'An error occurred');
      onStatusChange('error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 border rounded-lg p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Test Endpoint</h3>
        <div className="flex items-center gap-2">
          {endpoint.status === 'not_tested' && (
            <AlertCircle className="text-gray-400" size={20} />
          )}
          {isLoading && (
            <Loader2 className="text-blue-500 animate-spin" size={20} />
          )}
          {endpoint.status === 'operational' && (
            <CheckCircle className="text-green-500" size={20} />
          )}
          {endpoint.status === 'error' && (
            <AlertCircle className="text-red-500" size={20} />
          )}
          <span className="text-sm text-gray-500">
            {endpoint.lastTested 
              ? `Last tested: ${new Date(endpoint.lastTested).toLocaleString()}`
              : 'Not tested yet'}
          </span>
        </div>
      </div>

      <Textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Enter test message..."
        className="min-h-[100px]"
      />

      <Button
        onClick={testEndpoint}
        disabled={isLoading}
        className="bg-gray-900 text-white hover:bg-gray-800"
      >
        {isLoading ? 'Testing...' : 'Test Endpoint'}
      </Button>

      {result && (
        <div className="mt-4">
          <h4 className="font-semibold mb-2">Response:</h4>
          <pre className="bg-gray-50 p-4 rounded-md overflow-auto max-h-[200px] text-sm">
            {result}
          </pre>
        </div>
      )}
    </div>
  );
}