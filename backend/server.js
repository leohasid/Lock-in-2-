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
    const prompt = `Your task is to estimate calories and macronutrients from a food image.
The user may also provide a text description of the meal.
${userHint ? `User description: "${userHint}"\n\n` : ''}
If a user description is provided, use it as the primary hint for identifying foods.
Use the image to confirm, refine, and estimate portion sizes.

IMPORTANT:
If the image contains a packaged food product (for example a bag of chips, chocolate bar, drink bottle, or supermarket item with branding), you should attempt to identify the exact product first.

For packaged foods:
1. Detect visible branding, logos, or product names on the packaging.
2. Identify the brand and product name (example: "Doritos Nacho Cheese", "Coca-Cola Original", etc).
3. Use this information to search for the product's official nutrition information online or in common food databases.
4. If nutrition data is found, use the official nutrition values instead of estimating macros.
5. Assume the full package or typical serving size unless the portion eaten is clearly smaller in the image.
6. If the exact product cannot be identified, estimate nutrition using a typical equivalent product.

For non-packaged foods (restaurant meals, home cooked meals, etc), follow the normal analysis process below.

Follow this process:
1. Determine food items.
   - If the user provided a description, start from those foods.
   - Use the image to verify or add missing components.
2. Break the meal into individual components.
   Example: burger bun, chicken fillet, cheese, sauce, fries.
3. Determine cooking or preparation methods if visible
   (fried, grilled, baked, raw, roasted, breaded, etc.).
4. Estimate portion size in grams for each component using:
   - relative size in the image
   - thickness and volume
   - typical portion sizes for that food
   - proportions relative to other foods
5. If the image does not clearly show a component mentioned by the user, assume a realistic portion.
6. Calculate nutritional values for each item:
   - calories
   - protein (g)
   - carbohydrates (g)
   - fat (g)
7. Sum totals for the entire meal.

Return ONLY valid JSON using this format:
{
  "foods": [
    {
      "name": "",
      "brand": "",
      "cooking_method": "",
      "estimated_weight_g": 0,
      "calories": 0,
      "protein_g": 0,
      "carbs_g": 0,
      "fat_g": 0
    }
  ],
  "total_calories": 0,
  "total_protein_g": 0,
  "total_carbs_g": 0,
  "total_fat_g": 0,
  "confidence": 0
}`;

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
              image_url: { url: `data:image/jpeg;base64,${base64}` },
            },
          ],
        },
      ],
      max_tokens: 600,
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
