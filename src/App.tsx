import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import type { Endpoint } from './types/endpoint';
import EndpointList from './components/EndpointList';
import EndpointModal from './components/EndpointModal';

export default function App() {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEndpoint, setEditingEndpoint] = useState<Endpoint | undefined>();

  const handleEdit = (endpoint: Endpoint) => {
    setEditingEndpoint(endpoint);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setEndpoints(prev => prev.filter(endpoint => endpoint.id !== id));
  };

  const handleSave = (data: Omit<Endpoint, 'id' | 'createdAt' | 'status'>, status: Endpoint['status'], proxyUrl?: string) => {
    if (editingEndpoint) {
      setEndpoints(prev => prev.map(ep => 
        ep.id === editingEndpoint.id 
          ? { 
              ...ep, 
              ...data,
              status,
              lastTested: new Date().toISOString(),
              proxyUrl: proxyUrl || ep.proxyUrl
            }
          : ep
      ));
    } else {
      setEndpoints(prev => [...prev, {
        ...data,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        status,
        lastTested: new Date().toISOString(),
        proxyUrl
      }]);
    }
    setIsModalOpen(false);
    setEditingEndpoint(undefined);
  };

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Your Endpoints</h1>
        <button
          onClick={() => {
            setEditingEndpoint(undefined);
            setIsModalOpen(true);
          }}
          className="bg-black text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-black/90"
        >
          <Plus className="h-4 w-4" />
          Create New Endpoint
        </button>
      </div>

      <EndpointList 
        endpoints={endpoints}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
      
      <EndpointModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingEndpoint(undefined);
        }}
        onSave={handleSave}
        endpoint={editingEndpoint}
      />
    </div>
  );
}