import Database from 'better-sqlite3';
import { nanoid } from 'nanoid';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Endpoint } from '../types/endpoint';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use the mounted disk in production, local directory in development
const dbPath = process.env.NODE_ENV === 'production' 
  ? '/data/endpoints.db'
  : path.join(__dirname, '../../endpoints.db');

const db = new Database(dbPath);

// Initialize database with endpoints table
db.exec(`
  CREATE TABLE IF NOT EXISTS endpoints (
    id TEXT PRIMARY KEY,
    apiType TEXT NOT NULL,
    name TEXT NOT NULL,
    targetUrl TEXT NOT NULL,
    allowedOrigins TEXT NOT NULL,
    description TEXT,
    createdAt TEXT NOT NULL,
    status TEXT NOT NULL,
    lastTested TEXT,
    proxyUrl TEXT
  )
`);

interface DbEndpoint extends Omit<Endpoint, 'allowedOrigins'> {
  allowedOrigins: string;
}

export const getAllEndpoints = (): Endpoint[] => {
  const stmt = db.prepare('SELECT * FROM endpoints ORDER BY createdAt DESC');
  const endpoints = stmt.all() as DbEndpoint[];
  return endpoints.map(endpoint => ({
    ...endpoint,
    allowedOrigins: JSON.parse(endpoint.allowedOrigins) as string[]
  }));
};

export const getEndpointById = (id: string): Endpoint | null => {
  const stmt = db.prepare('SELECT * FROM endpoints WHERE id = ?');
  const endpoint = stmt.get(id) as DbEndpoint | null;
  return endpoint ? {
    ...endpoint,
    allowedOrigins: JSON.parse(endpoint.allowedOrigins) as string[]
  } : null;
};

export const createEndpoint = (endpoint: Omit<Endpoint, 'id' | 'createdAt'>): Endpoint => {
  const id = nanoid();
  const createdAt = new Date().toISOString();
  
  const stmt = db.prepare(`
    INSERT INTO endpoints (
      id, apiType, name, targetUrl, allowedOrigins, description,
      createdAt, status, lastTested, proxyUrl
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    endpoint.apiType,
    endpoint.name,
    endpoint.targetUrl,
    JSON.stringify(endpoint.allowedOrigins),
    endpoint.description,
    createdAt,
    endpoint.status,
    endpoint.lastTested || null,
    endpoint.proxyUrl || null
  );

  return {
    id,
    createdAt,
    ...endpoint
  };
};

export const updateEndpoint = (
  id: string,
  endpoint: Partial<Omit<Endpoint, 'id' | 'createdAt'>>
): boolean => {
  const updates = Object.entries(endpoint)
    .filter(([_, value]) => value !== undefined)
    .map(([key, value]) => {
      if (key === 'allowedOrigins') {
        return [key, JSON.stringify(value)];
      }
      return [key, value];
    });

  if (updates.length === 0) return false;

  const setClauses = updates.map(([key]) => `${key} = ?`).join(', ');
  const values = updates.map(([_, value]) => value);

  const stmt = db.prepare(`
    UPDATE endpoints
    SET ${setClauses}
    WHERE id = ?
  `);

  const result = stmt.run(...values, id);
  return result.changes > 0;
};

export const deleteEndpoint = (id: string): boolean => {
  const stmt = db.prepare('DELETE FROM endpoints WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
};

export const updateEndpointStatus = (
  id: string,
  status: Endpoint['status'],
  lastTested: string = new Date().toISOString()
): boolean => {
  const stmt = db.prepare(`
    UPDATE endpoints
    SET status = ?, lastTested = ?
    WHERE id = ?
  `);
  
  const result = stmt.run(status, lastTested, id);
  return result.changes > 0;
};