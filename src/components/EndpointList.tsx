import React from 'react';
import { Pencil, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import type { Endpoint } from '../types/endpoint';

interface EndpointListProps {
  endpoints: Endpoint[];
  onEdit: (endpoint: Endpoint) => void;
  onDelete: (id: string) => void;
}

export default function EndpointList({ 
  endpoints, 
  onEdit, 
  onDelete
}: EndpointListProps) {
  return (
    <div className="space-y-4">
      {endpoints.map((endpoint) => (
        <div key={endpoint.id} className="p-6 bg-white rounded-lg border border-gray-200">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h2 className="text-xl font-semibold">{endpoint.name}</h2>
              <p className="text-gray-600 font-mono text-sm">{endpoint.targetUrl}</p>
            </div>
            <div className="flex items-center gap-2">
              {endpoint.status === 'operational' && (
                <span className="flex items-center gap-1.5 text-sm text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  Operational
                </span>
              )}
              {endpoint.status === 'error' && (
                <span className="flex items-center gap-1.5 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  Error
                </span>
              )}
              {endpoint.status === 'not_tested' && (
                <span className="flex items-center gap-1.5 text-sm text-gray-500">
                  <AlertCircle className="w-4 h-4" />
                  Not tested
                </span>
              )}
            </div>
          </div>
          
          <p className="text-gray-500 text-sm mb-4">{endpoint.description}</p>
          
          <div className="flex justify-end gap-2">
            <button
              onClick={() => onEdit(endpoint)}
              className="inline-flex items-center px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50"
            >
              <Pencil className="w-4 h-4 mr-1.5" />
              Edit
            </button>
            <button
              onClick={() => onDelete(endpoint.id)}
              className="inline-flex items-center px-3 py-1.5 text-sm text-white bg-red-500 rounded-md hover:bg-red-600"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}