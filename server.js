import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';
import { nanoid } from 'nanoid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// In-memory store for proxy configurations
const proxyStore = new Map();

// CORS configuration
app.use(cors({
  origin: process.env.RENDER_EXTERNAL_URL || ['http://localhost:5173', 'http://localhost:3001'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// Proxy endpoint handler
app.post('/api/proxy/:proxyId', async (req, res) => {
  const { proxyId } = req.params;
  const { prompt } = req.body;
  
  const config = proxyStore.get(proxyId);
  
  if (!config) {
    return res.status(404).json({ error: 'Proxy configuration not found' });
  }

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    // Handle different API types
    switch (config.apiType) {
      case 'openai':
        const openai = new OpenAI({ apiKey: config.apiKey });
        const completion = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: prompt }
          ]
        });
        return res.json(completion);

      case 'anthropic':
        const response = await fetch('https://api.anthropic.com/v1/complete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': config.apiKey,
          },
          body: JSON.stringify({
            prompt: `\n\nHuman: ${prompt}\n\nAssistant:`,
            model: 'claude-2',
            max_tokens_to_sample: 300,
          }),
        });
        const anthropicData = await response.json();
        return res.json(anthropicData);

      case 'cohere':
        const cohereResponse = await fetch('https://api.cohere.ai/v1/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify({
            prompt,
            model: 'command',
            max_tokens: 300,
          }),
        });
        const cohereData = await cohereResponse.json();
        return res.json(cohereData);

      case 'google-ai':
        const googleResponse = await fetch(`${config.targetUrl}/generateText`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify({
            prompt: { text: prompt },
          }),
        });
        const googleData = await googleResponse.json();
        return res.json(googleData);

      case 'azure-openai':
        const azureOpenai = new OpenAI({
          apiKey: config.apiKey,
          baseURL: config.targetUrl,
          defaultQuery: { 'api-version': '2024-02-15-preview' },
        });
        const azureCompletion = await azureOpenai.chat.completions.create({
          model: 'gpt-35-turbo', // Azure deployment name
          messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: prompt }
          ]
        });
        return res.json(azureCompletion);

      case 'huggingface':
        const huggingfaceResponse = await fetch(config.targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify({ inputs: prompt }),
        });
        const huggingfaceData = await huggingfaceResponse.json();
        return res.json(huggingfaceData);

      case 'custom':
        // For custom endpoints, forward the request as-is
        const customResponse = await fetch(config.targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(config.apiKey && { 'Authorization': `Bearer ${config.apiKey}` }),
          },
          body: JSON.stringify(req.body),
        });
        const customData = await customResponse.json();
        return res.json(customData);

      default:
        throw new Error(`Unsupported API type: ${config.apiType}`);
    }
  } catch (error) {
    console.error('Proxy request error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to process request' 
    });
  }
});

// Test endpoint
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

    // Generate proxy URL for successful connection
    const proxyId = nanoid(10);
    const baseUrl = process.env.RENDER_EXTERNAL_URL || 'http://localhost:3001';
    const proxyUrl = `${baseUrl}/api/proxy/${proxyId}`;
    
    // Store the configuration
    proxyStore.set(proxyId, {
      apiKey,
      apiType: 'openai',
      model: 'gpt-3.5-turbo',
      systemPrompt: 'You are a helpful assistant that summarizes text.'
    });

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

// Documentation endpoint
app.get('/api/proxy/:proxyId', (req, res) => {
  const { proxyId } = req.params;
  const config = proxyStore.get(proxyId);
  
  if (!config) {
    return res.status(404).json({ error: 'Proxy configuration not found' });
  }

  // Return documentation in HTML format for browser viewing
  if (req.headers.accept?.includes('text/html')) {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>API Endpoint Documentation</title>
          <style>
            body { font-family: system-ui; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.6; }
            pre { background: #f6f8fa; padding: 16px; border-radius: 6px; overflow-x: auto; }
            .endpoint { color: #0969da; font-family: monospace; }
          </style>
        </head>
        <body>
          <h1>API Endpoint Documentation</h1>
          <p>This endpoint provides access to ${config.apiType.toUpperCase()} API capabilities.</p>
          
          <h2>Endpoint URL</h2>
          <p class="endpoint">${req.protocol}://${req.get('host')}/api/proxy/${proxyId}</p>
          
          <h2>Method</h2>
          <p>POST</p>
          
          <h2>Request Format</h2>
          <pre>
{
  "prompt": "Your text or prompt here"
}
          </pre>
          
          <h2>Example Usage</h2>
          <p>Using curl:</p>
          <pre>
curl -X POST ${req.protocol}://${req.get('host')}/api/proxy/${proxyId} \\
  -H "Content-Type: application/json" \\
  -d '{"prompt": "Hello, how are you?"}'
          </pre>
        </body>
      </html>
    `;
    res.setHeader('Content-Type', 'text/html');
    return res.send(html);
  }

  // Return JSON documentation for API requests
  res.json({
    endpoint: `${req.protocol}://${req.get('host')}/api/proxy/${proxyId}`,
    method: 'POST',
    description: `Proxy endpoint for ${config.apiType.toUpperCase()} API`,
    requestFormat: {
      prompt: 'string (required)'
    }
  });
});

// Handle client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});