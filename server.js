import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';
import { nanoid } from 'nanoid';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://suqeeuvlkdlzutspxprh.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cWVldXZsa2RsenV0c3B4cHJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzIzOTc1OTMsImV4cCI6MjA0Nzk3MzU5M30.nmyHCEKFPA7pUP35qsHHmaX7K58JmG3c_vFUxmKWSAE';

const supabase = createClient(supabaseUrl, supabaseKey);

// CORS configuration
app.use(cors({
  origin: process.env.RENDER_EXTERNAL_URL || ['http://localhost:5173', 'http://localhost:3001'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// API Routes
app.get('/api/endpoints', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('endpoints')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const endpoints = data.map(endpoint => ({
      id: endpoint.id,
      apiType: endpoint.api_type,
      name: endpoint.name,
      targetUrl: endpoint.target_url,
      allowedOrigins: endpoint.allowed_origins,
      description: endpoint.description,
      createdAt: endpoint.created_at,
      status: endpoint.status,
      lastTested: endpoint.last_tested,
      proxyUrl: endpoint.proxy_url
    }));

    res.json(endpoints);
  } catch (error) {
    console.error('Error fetching endpoints:', error);
    res.status(500).json({ error: 'Failed to fetch endpoints' });
  }
});

app.post('/api/endpoints', async (req, res) => {
  try {
    const id = nanoid();
    const proxyId = nanoid(10);
    const baseUrl = process.env.RENDER_EXTERNAL_URL || 'http://localhost:3001';
    const proxyUrl = `${baseUrl}/api/proxy/${proxyId}`;
    
    const endpoint = {
      id,
      api_type: req.body.apiType,
      name: req.body.name,
      target_url: req.body.targetUrl,
      allowed_origins: ['*'],
      description: req.body.description || '',
      created_at: new Date().toISOString(),
      status: 'not_tested',
      proxy_url: proxyUrl
    };

    const { error } = await supabase
      .from('endpoints')
      .insert([endpoint]);

    if (error) throw error;

    res.status(201).json({
      id,
      apiType: endpoint.api_type,
      name: endpoint.name,
      targetUrl: endpoint.target_url,
      allowedOrigins: endpoint.allowed_origins,
      description: endpoint.description,
      createdAt: endpoint.created_at,
      status: endpoint.status,
      proxyUrl: endpoint.proxy_url
    });
  } catch (error) {
    console.error('Error creating endpoint:', error);
    res.status(500).json({ error: error.message || 'Failed to create endpoint' });
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

    res.json(completion);
  } catch (error) {
    console.error('OpenAI API error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to connect to OpenAI'
    });
  }
});

app.post('/api/proxy/:proxyId', async (req, res) => {
  try {
    const baseUrl = process.env.RENDER_EXTERNAL_URL || 'http://localhost:3001';
    const { data: endpoint, error } = await supabase
      .from('endpoints')
      .select()
      .eq('proxy_url', `${baseUrl}/api/proxy/${req.params.proxyId}`)
      .single();

    if (error || !endpoint) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }

    const apiKey = req.headers['x-api-key'];
    if (!apiKey || typeof apiKey !== 'string') {
      return res.status(400).json({ error: 'API key is required in x-api-key header' });
    }

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
          content: req.body.prompt
        }
      ]
    });

    res.json(completion);
  } catch (error) {
    console.error('Proxy request error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to process request' 
    });
  }
});

// Handle client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});