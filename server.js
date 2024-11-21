import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:4173',
    process.env.FRONTEND_URL || 'http://localhost:3000'
  ],
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// OpenAI test endpoint
app.post('/api/test-endpoint', async (req, res) => {
  console.log('Received request to /api/test-endpoint');
  const { apiKey, prompt } = req.body;

  console.log('Request body:', { 
    apiKey: apiKey ? '***' : undefined, 
    prompt 
  });

  if (!apiKey) {
    console.log('Error: Missing API key');
    return res.status(400).json({ error: 'API key is required' });
  }

  if (!prompt) {
    console.log('Error: Missing prompt');
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    console.log('Initializing OpenAI client');
    const openai = new OpenAI({ apiKey });

    console.log('Making request to OpenAI');
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that summarizes text.'
        },
        {
          role: 'user',
          content: `Summarize this text: ${prompt}`
        }
      ]
    });

    console.log('Received response from OpenAI');
    res.json(completion);
  } catch (error) {
    console.error('OpenAI API error:', error);
    
    const errorResponse = {
      error: error instanceof Error ? error.message : 'Failed to connect to OpenAI',
      details: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    };
    
    res.status(500).json(errorResponse);
  }
});

// Catch-all route to serve the frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`CORS enabled for origins: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
});