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
app.use(cors({
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
// Increase limit for food-estimate (base64 images can be 1–2MB)
app.use(express.json({ limit: '10mb' }));

// Handle preflight OPTIONS requests
app.options('*', cors());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'mogifi-ai-backend' });
});

// Explicitly handle OPTIONS for /api/ai (CORS preflight)
app.options('/api/ai', cors(), (req, res) => {
  res.status(200).end();
});

// Explicitly handle OPTIONS for /api/food-estimate (CORS preflight)
app.options('/api/food-estimate', cors(), (req, res) => {
  res.status(200).end();
});

// Food estimate (vision) endpoint - uses OpenAI to analyze food images
app.post('/api/food-estimate', async (req, res) => {
  console.log('[Railway Backend] POST /api/food-estimate received');
  try {
    const { imageData, label } = req.body;

    if (!imageData) {
      return res.status(400).json({ error: 'No image data provided' });
    }

    if (typeof imageData !== 'string' || !imageData.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Invalid image format. Expected data URL.' });
    }

    const openai = getOpenAIClient();
    if (!openai) {
      return res.status(500).json({
        error: 'OpenAI API key not configured. Set OPENAI_API_KEY in Railway environment variables.',
      });
    }

    const userHint = label && String(label).trim() ? String(label).trim() : null;
    const prompt = `Estimate calories and macros from this food image. ${userHint ? `User said: "${userHint}". Use as primary hint. ` : ''}
For packaged foods (chips, drinks, branded items): identify product, use official nutrition if known, else estimate.
For meals: identify items, estimate portions, sum macros. Return ONLY valid JSON:
{"foods":[{"name":"","calories":0,"protein_g":0,"carbs_g":0,"fat_g":0}],"total_calories":0,"total_protein_g":0,"total_carbs_g":0,"total_fat_g":0}`;

    const base64 = imageData.replace(/^data:image\/\w+;base64,/, '');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64}`,
                detail: 'low', // 512x512, ~85 tokens - faster processing
              },
            },
          ],
        },
      ],
      max_tokens: 400,
      temperature: 0.3,
    });

    const outputText = completion.choices[0]?.message?.content?.trim() || '';
    if (!outputText) {
      return res.status(500).json({ error: 'AI returned an empty response' });
    }

    // Extract JSON from response
    const jsonStart = outputText.indexOf('{');
    const jsonEnd = outputText.lastIndexOf('}');
    const jsonString = jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart
      ? outputText.slice(jsonStart, jsonEnd + 1)
      : outputText;

    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch (e) {
      console.error('[Railway Backend] JSON parse error:', e, 'Response:', outputText);
      return res.status(500).json({ error: 'Failed to parse nutrition data from AI response' });
    }

    // Support both new format (foods + totals) and legacy format (name, calories, protein, carbs, fats)
    let estimate;
    if (parsed.foods && Array.isArray(parsed.foods)) {
      const name = parsed.foods.map((f) => f?.name || '').filter(Boolean).join(', ') || label || 'Meal';
      estimate = {
        name: name.length > 80 ? name.slice(0, 77) + '…' : name,
        calories: Number(parsed.total_calories ?? parsed.foods.reduce((s, f) => s + (f?.calories || 0), 0)) || 0,
        protein: Number(parsed.total_protein_g ?? parsed.foods.reduce((s, f) => s + (f?.protein_g || 0), 0)) || 0,
        carbs: Number(parsed.total_carbs_g ?? parsed.foods.reduce((s, f) => s + (f?.carbs_g || 0), 0)) || 0,
        fats: Number(parsed.total_fat_g ?? parsed.foods.reduce((s, f) => s + (f?.fat_g || 0), 0)) || 0,
      };
    } else {
      if (!parsed.name && typeof parsed.calories !== 'number') {
        return res.status(500).json({ error: 'Invalid nutrition data format from AI' });
      }
      estimate = {
        name: String(parsed.name || label || 'Unknown meal'),
        calories: Number(parsed.calories || 0),
        protein: Number(parsed.protein ?? parsed.protein_g || 0),
        carbs: Number(parsed.carbs ?? parsed.carbs_g || 0),
        fats: Number(parsed.fats ?? parsed.fat_g || 0),
      };
    }

    console.log('[Railway Backend] Food estimate success:', estimate.name);
    res.json({ estimate });
  } catch (error) {
    console.error('[Railway Backend] Food estimate error:', error);
    if (error instanceof OpenAI.APIError) {
      if (error.status === 401) {
        return res.status(500).json({ error: 'Invalid OpenAI API key' });
      }
      if (error.status === 429) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
      }
    }
    res.status(500).json({
      error: error.message || 'Failed to analyze food image',
    });
  }
});

// AI endpoint
app.post('/api/ai', async (req, res) => {
  console.log('[Railway Backend] POST /api/ai received');
  console.log('[Railway Backend] Request body:', req.body);
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

    console.log('[Railway Backend] Successfully generated response');
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
    endpoints: ['/health', '/api/ai', '/api/food-estimate']
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
  console.log(`  POST /api/ai             - AI text endpoint`);
  console.log(`  POST /api/food-estimate  - Food image analysis\n`);
});
