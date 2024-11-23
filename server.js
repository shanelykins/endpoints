// Previous code remains the same until the proxy endpoint handler

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