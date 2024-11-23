import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';
import { nanoid } from 'nanoid';
import {
  getAllEndpoints,
  getEndpointById,
  createEndpoint,
  updateEndpoint,
  deleteEndpoint,
  updateEndpointStatus
} from './src/db/database';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration for production
app.use(cors({
  origin: process.env.RENDER_EXTERNAL_URL || ['http://localhost:5173', 'http://localhost:3001'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, '../dist')));

// API Routes
app.get('/api/endpoints', (req, res) => {
  try {
    const endpoints = getAllEndpoints();
    res.json(endpoints);
  } catch (error) {
    console.error('Error fetching endpoints:', error);
    res.status(500).json({ error: 'Failed to fetch endpoints' });
  }
});

app.get('/api/endpoints/:id', (req, res) => {
  try {
    const endpoint = getEndpointById(req.params.id);
    if (!endpoint) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }
    res.json(endpoint);
  } catch (error) {
    console.error('Error fetching endpoint:', error);
    res.status(500).json({ error: 'Failed to fetch endpoint' });
  }
});

app.post('/api/endpoints', (req, res) => {
  try {
    const newEndpoint = createEndpoint({
      ...req.body,
      status: 'not_tested',
      lastTested: null
    });
    res.status(201).json(newEndpoint);
  } catch (error) {
    console.error('Error creating endpoint:', error);
    res.status(500).json({ error: 'Failed to create endpoint' });
  }
});

app.put('/api/endpoints/:id', (req, res) => {
  try {
    const success = updateEndpoint(req.params.id, req.body);
    if (!success) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }
    const updatedEndpoint = getEndpointById(req.params.id);
    res.json(updatedEndpoint);
  } catch (error) {
    console.error('Error updating endpoint:', error);
    res.status(500).json({ error: 'Failed to update endpoint' });
  }
});

app.delete('/api/endpoints/:id', (req, res) => {
  try {
    const success = deleteEndpoint(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting endpoint:', error);
    res.status(500).json({ error: 'Failed to delete endpoint' });
  }
});

app.post('/api/test-endpoint', async (req, res) => {
  const { apiKey, prompt } = req.body;

  if (!apiKey) {
    return res.status(400).json({ error: 'API key is required' });
  }

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    const openai = new OpenAI({ apiKey });

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that summarizes text.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const proxyId = nanoid(10);
    const proxyUrl = `${process.env.RENDER_EXTERNAL_URL || 'http://localhost:3001'}/api/proxy/${proxyId}`;

    res.json({
      ...completion,
      proxy_url: proxyUrl
    });
  } catch (error) {
    console.error('OpenAI API error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to connect to OpenAI'
    });
  }
});

// Handle client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});