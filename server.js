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

app.use(cors({
  origin: '*', // Allow all origins for the proxy endpoint
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

function createProxyUrl(config) {
  const proxyId = nanoid(10);
  const baseUrl = process.env.RENDER_EXTERNAL_URL || 
                 'https://openai-endpoint-tester.onrender.com';
  
  const proxyUrl = `${baseUrl}/api/proxy/${proxyId}`;
  
  proxyStore.set(proxyId, {
    ...config,
    created: new Date().toISOString(),
    metadata: {
      endpoint: proxyUrl,
      method: 'POST',
      description: 'Send a POST request with a JSON body containing a "prompt" field',
      requestFormat: {
        prompt: 'string (required)'
      },
      responseFormat: {
        choices: [{
          message: {
            content: 'string (the summarized text)'
          }
        }]
      },
      example: {
        request: {
          prompt: "Text to be summarized"
        },
        response: {
          choices: [{
            message: {
              content: "Summarized version of the text"
            }
          }]
        }
      }
    }
  });

  return { proxyId, proxyUrl };
}

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
    const { proxyUrl } = createProxyUrl({ 
      apiKey,
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

// Proxy endpoint
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
    const openai = new OpenAI({ apiKey: config.apiKey });
    const completion = await openai.chat.completions.create({
      model: config.model,
      messages: [
        {
          role: 'system',
          content: config.systemPrompt
        },
        {
          role: 'user',
          content: prompt
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

// Metadata endpoint - GET request shows documentation
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
          <p>This endpoint provides access to OpenAI's text summarization capability.</p>
          
          <h2>Endpoint URL</h2>
          <p class="endpoint">${config.metadata.endpoint}</p>
          
          <h2>Method</h2>
          <p>${config.metadata.method}</p>
          
          <h2>Description</h2>
          <p>${config.metadata.description}</p>
          
          <h2>Request Format</h2>
          <pre>${JSON.stringify(config.metadata.requestFormat, null, 2)}</pre>
          
          <h2>Response Format</h2>
          <pre>${JSON.stringify(config.metadata.responseFormat, null, 2)}</pre>
          
          <h2>Example</h2>
          <h3>Request:</h3>
          <pre>${JSON.stringify(config.metadata.example.request, null, 2)}</pre>
          
          <h3>Response:</h3>
          <pre>${JSON.stringify(config.metadata.example.response, null, 2)}</pre>
          
          <h2>Try it out</h2>
          <p>Use curl to test the endpoint:</p>
          <pre>curl -X POST ${config.metadata.endpoint} \\
     -H "Content-Type: application/json" \\
     -d '{"prompt": "Text to summarize"}'</pre>
        </body>
      </html>
    `;
    res.setHeader('Content-Type', 'text/html');
    return res.send(html);
  }

  // Return JSON documentation for API requests
  res.json({
    created: config.created,
    ...config.metadata
  });
});

// Handle client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});