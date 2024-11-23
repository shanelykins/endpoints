import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';
import { nanoid } from 'nanoid';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabase = createClient(
  'https://suqeeuvlkdlzutspxprh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cWVldXZsa2RsenV0c3B4cHJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzIzOTc1OTMsImV4cCI6MjA0Nzk3MzU5M30.nmyHCEKFPA7pUP35qsHHmaX7K58JmG3c_vFUxmKWSAE'
);

const app = express();
const PORT = process.env.PORT || 3001;

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
    res.json(data);
  } catch (error) {
    console.error('Error fetching endpoints:', error);
    res.status(500).json({ error: 'Failed to fetch endpoints' });
  }
});

app.get('/api/endpoints/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('endpoints')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error fetching endpoint:', error);
    res.status(500).json({ error: 'Failed to fetch endpoint' });
  }
});

app.post('/api/endpoints', async (req, res) => {
  try {
    const newEndpoint = {
      id: nanoid(),
      ...req.body,
      status: 'not_tested',
      last_tested: null,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('endpoints')
      .insert([newEndpoint])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating endpoint:', error);
    res.status(500).json({ error: 'Failed to create endpoint' });
  }
});

app.put('/api/endpoints/:id', async (req, res) => {
  try {
    const updates = {
      ...req.body,
      last_tested: req.body.status !== 'not_tested' ? new Date().toISOString() : null
    };

    const { data, error } = await supabase
      .from('endpoints')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error updating endpoint:', error);
    res.status(500).json({ error: 'Failed to update endpoint' });
  }
});

app.delete('/api/endpoints/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('endpoints')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting endpoint:', error);
    res.status(500).json({ error: 'Failed to delete endpoint' });
  }
});

app.post('/api/test-endpoint', async (req, res) => {
  const { apiKey, prompt } = req.body;

  if (!apiKey || !prompt) {
    return res.status(400).json({ error: 'API key and prompt are required' });
  }

  try {
    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: prompt }
      ]
    });

    const proxyUrl = `${process.env.RENDER_EXTERNAL_URL || 'http://localhost:3001'}/api/proxy/${nanoid(10)}`;
    res.json({ ...completion, proxy_url: proxyUrl });
  } catch (error) {
    console.error('OpenAI API error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to connect to OpenAI'
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