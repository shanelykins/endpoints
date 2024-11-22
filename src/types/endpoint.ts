export type ApiType = 'openai' | 'anthropic' | 'custom';

export interface Endpoint {
  id: string;
  apiType: ApiType;
  name: string;
  targetUrl: string;
  allowedOrigins: string[];
  description: string;
  createdAt: string;
  status: 'operational' | 'error' | 'not_tested';
  lastTested?: string;
  proxyUrl?: string;
}

export interface CreateEndpointPayload {
  apiType: ApiType;
  name: string;
  apiKey: string;
  targetUrl: string;
  allowedOrigins: string[];
  description: string;
}