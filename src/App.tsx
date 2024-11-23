import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import type { Endpoint } from './types/endpoint';
import EndpointList from './components/EndpointList';
import EndpointModal from './components/EndpointModal';
import toast from 'react-hot-toast';

export default function App() {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEndpoint, setEditingEndpoint] = useState<Endpoint | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchEndpoints();
  }, []);

  const fetchEndpoints = async () => {
    try {
      const response = await fetch('/api/endpoints');
      if (!response.ok) throw new Error('Failed to fetch endpoints');
      const data = await response.json();
      setEndpoints(data);
    } catch (error) {
      console.error('Error fetching endpoints:', error);
      toast.error('Failed to load endpoints');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (endpoint: Endpoint) => {
    setEditingEndpoint(endpoint);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/endpoints/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete endpoint');
      
      setEndpoints(prev => prev.filter(endpoint => endpoint.id !== id));
      toast.success('Endpoint deleted successfully');
    } catch (error) {
      console.error('Error deleting endpoint:', error);
      toast.error('Failed to delete endpoint');
    }
  };

  const handleSave = async (data: Omit<Endpoint, 'id' | 'createdAt' | 'status'>, status: Endpoint['status'], proxyUrl?: string) => {
    try {
      if (editingEndpoint) {
        const response = await fetch(`/api/endpoints/${editingEndpoint.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...data, status, proxyUrl }),
        });

        if (!response.ok) throw new Error('Failed to update endpoint');
        
        const updatedEndpoint = await response.json();
        setEndpoints(prev => prev.map(ep => 
          ep.id === editingEndpoint.id ? updatedEndpoint : ep
        ));
        toast.success('Endpoint updated successfully');
      } else {
        const response = await fetch('/api/endpoints', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...data, status, proxyUrl }),
        });

        if (!response.ok) throw new Error('Failed to create endpoint');
        
        const newEndpoint = await response.json();
        setEndpoints(prev => [...prev, newEndpoint]);
        toast.success('Endpoint created successfully');
      }
      
      setIsModalOpen(false);
      setEditingEndpoint(undefined);
    } catch (error) {
      console.error('Error saving endpoint:', error);
      toast.error(editingEndpoint ? 'Failed to update endpoint' : 'Failed to create endpoint');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

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