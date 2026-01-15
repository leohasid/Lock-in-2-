import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(request: Request) {
  // Ensure this is server-side only
  if (typeof window !== "undefined") {
    return NextResponse.json({ error: "This API route is server-side only" }, { status: 403 });
  }

  // Check for API key
  const apiKey = process.env.OPENAI_API_KEY;
  console.log("[Generate Plan API] OPENAI_API_KEY check:", apiKey ? "EXISTS" : "MISSING");
  
  if (!apiKey) {
    const errorMsg = "Missing OPENAI_API_KEY. Please ensure it's set in Vercel environment variables.";
    console.error("[Generate Plan API]", errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }

  try {
    // Parse request body
    let requestData;
    try {
      requestData = await request.json();
    } catch (parseError) {
      console.error("[Generate Plan API] Failed to parse request body:", parseError);
      return NextResponse.json(
        { error: "Invalid request body. Expected JSON." },
        { status: 400 }
      );
    }

    const {
      fitnessGoal,
      equipment,
      height,
      age,
      weight,
      aggressiveness,
    } = requestData;

    if (!fitnessGoal || !equipment || !height || !age || !weight || !aggressiveness) {
      console.error("[Generate Plan API] Missing required fields");
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Calculate BMI and BMR for context
    // Using Mifflin-St Jeor equation (assuming male for calculation - can be adjusted)
    const bmi = weight / ((height / 100) ** 2);
    // BMR calculation: For males use +5, for females use -161 (defaulting to male)
    const bmr = 10 * weight + 6.25 * height - 5 * age + 5;

    const goalLabels: Record<string, string> = {
      lose_weight: "lose weight",
      gain_weight: "gain weight",
      build_muscle: "build muscle",
    };

    const equipmentLabels: Record<string, string> = {
      full_gym: "full gym with all equipment",
      home_gym: "home gym with basic equipment",
      minimal: "minimal equipment (dumbbells, resistance bands)",
      bodyweight_only: "bodyweight exercises only",
    };

    const aggressivenessLabels: Record<string, string> = {
      moderate: "moderate (sustainable, steady progress)",
      aggressive: "aggressive (faster results, more commitment)",
      very_aggressive: "very aggressive (maximum intensity, rapid results)",
    };

    const systemPrompt = `You are an expert fitness and nutrition coach. Create a personalized workout plan and nutrition plan based on the user's profile.

User Profile:
- Goal: ${goalLabels[fitnessGoal]}
- Equipment: ${equipmentLabels[equipment]}
- Height: ${height} cm
- Age: ${age} years
- Weight: ${weight} kg
- BMI: ${bmi.toFixed(1)}
- BMR: ${bmr.toFixed(0)} kcal/day
- Intensity: ${aggressivenessLabels[aggressiveness]}

Generate TWO detailed plans:

1. GYM PLAN (JSON format):
{
  "planName": "string (e.g., 'Push/Pull/Legs Split')",
  "weeklySchedule": [
    {
      "day": "Monday",
      "workoutName": "string",
      "exercises": [
        {
          "name": "string",
          "sets": number,
          "reps": "string (e.g., '8-12' or 'AMRAP')",
          "rest": "string (e.g., '60-90 seconds')",
          "notes": "string (optional)"
        }
      ]
    }
  ],
  "duration": "string (e.g., '12 weeks')",
  "notes": "string (general guidance)"
}

2. NUTRITION PLAN (JSON format):
{
  "dailyCalories": number,
  "macros": {
    "protein": number (grams),
    "carbs": number (grams),
    "fats": number (grams)
  },
  "mealsPerDay": number,
  "mealTiming": "string (guidance on when to eat)",
  "hydration": "string (water intake recommendation)",
  "supplements": ["string (optional recommendations)"],
  "notes": "string (dietary guidance)"
}

Adjust calories based on goal:
- Lose weight: BMR * 1.2-1.4 (moderate) to 1.1-1.3 (aggressive) - 300-500 deficit
- Gain weight: BMR * 1.5-1.7 (moderate) to 1.6-1.9 (aggressive) + 300-500 surplus
- Build muscle: BMR * 1.4-1.6 (moderate) to 1.5-1.8 (aggressive) + 200-400 surplus

Respond with ONLY valid JSON in this exact format:
{
  "gymPlan": { ... },
  "nutritionPlan": { ... }
}`;

    const userPrompt = "Generate my personalized fitness and nutrition plan based on my profile. Respond with ONLY valid JSON in this exact format: {\"gymPlan\": {...}, \"nutritionPlan\": {...}}";

    // Combine system and user prompts into single input
    const prompt = `${systemPrompt}\n\n${userPrompt}`;

    // Initialize OpenAI client
    const client = new OpenAI({ apiKey: apiKey });

    console.log("[Generate Plan API] Calling OpenAI API with responses.create...");
    console.log("[Generate Plan API] Prompt length:", prompt.length, "characters");
    
    // Call OpenAI API using responses.create
    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
      max_output_tokens: 4000,
    });

    console.log("[Generate Plan API] OpenAI API call successful");

    // Extract response text
    const responseText = response.output_text?.trim();
    
    if (!responseText) {
      console.error("[Generate Plan API] OpenAI returned empty response. Response structure:", JSON.stringify(response, null, 2));
      throw new Error("Empty response from OpenAI");
    }

    // Try to extract JSON from response
    let plans;
    try {
      // First, try to parse directly
      plans = JSON.parse(responseText);
    } catch {
      // If that fails, try to extract JSON from markdown code blocks or text
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        plans = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not parse JSON from OpenAI response");
      }
    }

    // Validate structure
    if (!plans.gymPlan || !plans.nutritionPlan) {
      console.error("[Generate Plan API] Invalid plan structure:", plans);
      throw new Error("Invalid plan structure");
    }

    console.log("[Generate Plan API] Successfully generated plans");
    return NextResponse.json({
      gymPlan: plans.gymPlan,
      nutritionPlan: plans.nutritionPlan,
    });
    
  } catch (error: any) {
    // Comprehensive error logging
    console.error("[Generate Plan API] Error occurred:");
    console.error("Error type:", error?.constructor?.name);
    console.error("Error message:", error?.message);
    console.error("Error status:", error?.status);
    console.error("Error code:", error?.code);
    console.error("Error response:", error?.response);
    if (error?.response) {
      console.error("Error response status:", error.response.status);
      console.error("Error response data:", JSON.stringify(error.response.data, null, 2));
    }
    console.error("Error stack:", error?.stack);
    
    // Handle specific OpenAI API errors
    if (error instanceof OpenAI.APIError) {
      console.error("[Generate Plan API] OpenAI API Error detected:", {
        status: error.status,
        code: error.code,
        type: error.type,
        message: error.message,
      });

      if (error.status === 401 || error.code === "invalid_api_key") {
        return NextResponse.json({ 
          error: "OpenAI API key is invalid. Please check your Vercel environment variables." 
        }, { status: 500 });
      }

      if (error.status === 429 || error.code === "rate_limit_exceeded") {
        return NextResponse.json({ 
          error: "Rate limit exceeded. Please try again in a moment." 
        }, { status: 429 });
      }

      if (error.code === "insufficient_quota") {
        return NextResponse.json({ 
          error: "OpenAI account has insufficient quota. Please check your OpenAI account billing." 
        }, { status: 500 });
      }
    }
    
    // Handle method not found errors (if responses.create doesn't exist)
    if (error?.message?.includes("responses") || error?.message?.includes("method") || error?.code === "method_not_found") {
      console.error("[Generate Plan API] Possible API method issue - responses.create may not be available");
      console.error("[Generate Plan API] Full error details:", JSON.stringify(error, null, 2));
    }
    
    // Return generic error with message
    const errorMessage = error?.message || "Failed to generate plan. Please try again.";
    console.error("[Generate Plan API] Returning error:", errorMessage);
    return NextResponse.json(
      { 
        error: errorMessage
      },
      { status: 500 }
    );
  }
}

