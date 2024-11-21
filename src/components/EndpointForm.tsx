import React, { useState } from 'react';
import { PlusCircle } from 'lucide-react';
import type { CreateEndpointPayload } from '../types/endpoint';

interface EndpointFormProps {
  onSubmit: (data: CreateEndpointPayload) => Promise<void>;
}

export default function EndpointForm({ onSubmit }: EndpointFormProps) {
  const [formData, setFormData] = useState<CreateEndpointPayload>({
    apiType: 'openai',
    name: '',
    apiKey: '',
    targetUrl: '',
    allowedOrigins: ['*'],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-sm">
      <div>
        <label className="block text-sm font-medium text-gray-700">API Type</label>
        <select
          value={formData.apiType}
          onChange={(e) => setFormData(prev => ({ ...prev, apiType: e.target.value as CreateEndpointPayload['apiType'] }))}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="openai">OpenAI</option>
          <option value="anthropic">Anthropic</option>
          <option value="custom">Custom</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Endpoint Name</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="My API Endpoint"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">API Key</label>
        <input
          type="password"
          value={formData.apiKey}
          onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Target URL</label>
        <input
          type="url"
          value={formData.targetUrl}
          onChange={(e) => setFormData(prev => ({ ...prev, targetUrl: e.target.value }))}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="https://api.example.com/v1/chat"
          required
        />
      </div>

      <button
        type="submit"
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <PlusCircle className="w-4 h-4 mr-2" />
        Create Endpoint
      </button>
    </form>
  );
}