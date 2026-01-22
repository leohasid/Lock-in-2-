const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize OpenAI (only reads key when needed, not at import time)
const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new OpenAI({ apiKey });
};

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'mogifi-ai-backend' });
});

// AI endpoint
app.post('/api/ai', async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const openai = getOpenAIClient();
    if (!openai) {
      return res.status(500).json({ 
        error: 'OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.' 
      });
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a helpful nutrition and fitness coach.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1000,
      temperature: 0.7
    });

    const response = completion.choices[0]?.message?.content || 'No response generated';

    res.json({ response });
  } catch (error) {
    console.error('AI API Error:', error);
    
    // Handle specific OpenAI errors
    if (error instanceof OpenAI.APIError) {
      if (error.status === 401) {
        return res.status(500).json({ error: 'Invalid OpenAI API key' });
      }
      if (error.status === 429) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
      }
    }
    
    res.status(500).json({ 
      error: 'Failed to process AI request',
      message: error.message 
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'Mogifi AI Backend',
    endpoints: ['/health', '/api/ai']
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(50));
  console.log(`✅ Server is running!`);
  console.log(`📍 Local:   http://localhost:${PORT}`);
  console.log(`📍 Network: http://0.0.0.0:${PORT}`);
  console.log('='.repeat(50));
  console.log(`\nAvailable endpoints:`);
  console.log(`  GET  /          - Root endpoint`);
  console.log(`  GET  /health    - Health check`);
  console.log(`  POST /api/ai    - AI endpoint\n`);
});
