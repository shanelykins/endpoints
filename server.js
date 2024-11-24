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

// Handle both GET (documentation) and POST (proxy) requests
app.all('/api/proxy/:proxyId', async (req, res) => {
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

    // Return documentation for GET requests
    if (req.method === 'GET') {
      // If browser is requesting HTML
      if (req.headers.accept?.includes('text/html')) {
        const html = `
          <!DOCTYPE html>
          <html>
            <head>
              <title>API Endpoint Documentation - ${endpoint.name}</title>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body { 
                  font-family: system-ui, -apple-system, sans-serif;
                  line-height: 1.5;
                  max-width: 800px;
                  margin: 40px auto;
                  padding: 0 20px;
                  color: #333;
                }
                pre {
                  background: #f6f8fa;
                  padding: 16px;
                  border-radius: 6px;
                  overflow-x: auto;
                }
                .endpoint {
                  color: #0969da;
                  font-family: monospace;
                }
                .header {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  margin-bottom: 2rem;
                }
                .status {
                  padding: 4px 8px;
                  border-radius: 4px;
                  font-size: 14px;
                }
                .status.operational {
                  background: #dcfce7;
                  color: #166534;
                }
                .status.error {
                  background: #fee2e2;
                  color: #991b1b;
                }
                .status.not-tested {
                  background: #f3f4f6;
                  color: #374151;
                }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>${endpoint.name}</h1>
                <span class="status ${endpoint.status}">
                  ${endpoint.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              
              <p>${endpoint.description || 'No description provided.'}</p>
              
              <h2>Endpoint URL</h2>
              <p class="endpoint">${endpoint.proxy_url}</p>
              
              <h2>Method</h2>
              <p>POST</p>
              
              <h2>Headers</h2>
              <pre>Content-Type: application/json
x-api-key: YOUR_API_KEY</pre>
              
              <h2>Request Format</h2>
              <pre>{
  "prompt": "Your text to be processed"
}</pre>
              
              <h2>Response Format</h2>
              <pre>{
  "id": "chatcmpl-...",
  "choices": [{
    "message": {
      "content": "Processed response"
    }
  }]
}</pre>
              
              <h2>Example Usage</h2>
              <p>Using curl:</p>
              <pre>curl -X POST ${endpoint.proxy_url} \\
     -H "Content-Type: application/json" \\
     -H "x-api-key: YOUR_API_KEY" \\
     -d '{"prompt": "Text to process"}'</pre>
              
              <h2>Rate Limits</h2>
              <p>This endpoint uses the underlying API's rate limits.</p>
              
              <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #666;">
                <p>Last tested: ${endpoint.last_tested ? new Date(endpoint.last_tested).toLocaleString() : 'Never'}</p>
                <p>Created: ${new Date(endpoint.created_at).toLocaleString()}</p>
              </footer>
            </body>
          </html>
        `;
        res.setHeader('Content-Type', 'text/html');
        return res.send(html);
      }
      
      // Return JSON documentation
      return res.json({
        name: endpoint.name,
        description: endpoint.description,
        endpoint: endpoint.proxy_url,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'YOUR_API_KEY'
        },
        requestFormat: {
          prompt: 'string (required)'
        },
        responseFormat: {
          id: 'string',
          choices: [{
            message: {
              content: 'string (processed response)'
            }
          }]
        },
        example: {
          request: {
            prompt: 'Text to process'
          }
        }
      });
    }

    // Handle POST requests (actual proxy functionality)
    if (req.method === 'POST') {
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

      // Update last tested timestamp and status
      await supabase
        .from('endpoints')
        .update({ 
          last_tested: new Date().toISOString(),
          status: 'operational'
        })
        .eq('proxy_url', endpoint.proxy_url);

      res.json(completion);
    }
  } catch (error) {
    console.error('Proxy request error:', error);
    
    // Update status to error if request fails
    if (req.method === 'POST') {
      await supabase
        .from('endpoints')
        .update({ 
          last_tested: new Date().toISOString(),
          status: 'error'
        })
        .eq('proxy_url', `${process.env.RENDER_EXTERNAL_URL || 'http://localhost:3001'}/api/proxy/${req.params.proxyId}`);
    }

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