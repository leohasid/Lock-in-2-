# API Integration Guide for Plan Generation

## Current Status

The onboarding flow now collects user data and stores it locally. The AI plan generation has been temporarily disabled to avoid API routing issues during development.

## When You're Ready to Add AI Plan Generation

### Option 1: Use Next.js API Routes (Current Setup)

The API route is already created at `/app/api/generate-plan/route.ts`. To enable it:

1. **Set up your OpenAI API key** in `.env.local`:
   ```
   OPENAI_API_KEY=sk-proj-your-key-here
   ```

2. **Update `/app/onboarding/page.tsx`** to call the API:

   Replace the `handleSubmit` function with:

   ```typescript
   const handleSubmit = async () => {
     setLoading(true);
     try {
       // Store onboarding data
       localStorage.setItem("onboardingData", JSON.stringify(data));
       
       // Generate custom plan using OpenAI
       const response = await fetch("/api/generate-plan", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify(data),
       });

       if (!response.ok) {
         const errorData = await response.json();
         throw new Error(errorData.error || "Failed to generate plan");
       }

       const { gymPlan, nutritionPlan } = await response.json();

       // Store plans
       localStorage.setItem("customGymPlan", JSON.stringify(gymPlan));
       localStorage.setItem("customNutritionPlan", JSON.stringify(nutritionPlan));
       localStorage.setItem("onboardingCompleted", "true");

       router.push("/subscribe");
     } catch (error) {
       console.error("Error:", error);
       alert(`Failed to generate plan: ${error instanceof Error ? error.message : "Unknown error"}`);
       setLoading(false);
     }
   };
   ```

### Option 2: External API Service (Recommended for Production)

For better scalability and security, host your API on a separate service:

#### Using Vercel Serverless Functions

1. Deploy your Next.js app to Vercel
2. Add `OPENAI_API_KEY` to Vercel environment variables
3. The API route will work automatically

#### Using a Separate Backend (Node.js/Express, Python/Flask, etc.)

1. **Create your API endpoint** (e.g., `https://your-api.com/generate-plan`)

2. **Update `/app/onboarding/page.tsx`**:

   ```typescript
   const response = await fetch("https://your-api.com/generate-plan", {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify(data),
   });
   ```

3. **Backend example (Node.js/Express)**:

   ```javascript
   const express = require('express');
   const OpenAI = require('openai');
   const app = express();

   app.use(express.json());

   app.post('/generate-plan', async (req, res) => {
     const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
     
     // Your plan generation logic here
     // (similar to /app/api/generate-plan/route.ts)
     
     res.json({ gymPlan, nutritionPlan });
   });
   ```

## Data Structure

The onboarding collects:
- `fitnessGoal`: "lose_weight" | "gain_weight" | "build_muscle"
- `equipment`: "full_gym" | "home_gym" | "minimal" | "bodyweight_only"
- `height`: number (cm)
- `age`: number
- `weight`: number (kg)
- `aggressiveness`: "moderate" | "aggressive" | "very_aggressive"

## Plan Structure Expected

The API should return:

```json
{
  "gymPlan": {
    "planName": "string",
    "weeklySchedule": [
      {
        "day": "Monday",
        "workoutName": "string",
        "exercises": [
          {
            "name": "string",
            "sets": number,
            "reps": "string",
            "rest": "string",
            "notes": "string (optional)"
          }
        ]
      }
    ],
    "duration": "string",
    "notes": "string"
  },
  "nutritionPlan": {
    "dailyCalories": number,
    "macros": {
      "protein": number,
      "carbs": number,
      "fats": number
    },
    "mealsPerDay": number,
    "mealTiming": "string",
    "hydration": "string",
    "supplements": ["string"],
    "notes": "string"
  }
}
```

## Testing

1. Complete the onboarding flow
2. Check `localStorage` in browser DevTools:
   - `onboardingData` - User's answers
   - `customGymPlan` - Generated workout plan
   - `customNutritionPlan` - Generated nutrition plan

## Security Notes

- **Never expose your OpenAI API key** in client-side code
- Always use server-side API routes or a separate backend
- Consider rate limiting for production
- Validate and sanitize all user inputs

