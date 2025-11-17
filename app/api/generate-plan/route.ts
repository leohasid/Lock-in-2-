import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    let requestData;
    try {
      requestData = await request.json();
    } catch {
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

    if (!openai) {
      return NextResponse.json({ error: "OpenAI client not initialized" }, { status: 500 });
    }

    let completion;
    try {
      completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.7,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: "Generate my personalized fitness and nutrition plan based on my profile. Respond with ONLY valid JSON in this exact format: {\"gymPlan\": {...}, \"nutritionPlan\": {...}}",
          },
        ],
        response_format: { type: "json_object" },
      });
    } catch (openaiError) {
      console.error("OpenAI API error:", openaiError);
      // Try without json_object format as fallback
      try {
        completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          temperature: 0.7,
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: "Generate my personalized fitness and nutrition plan based on my profile. Respond with ONLY valid JSON in this exact format: {\"gymPlan\": {...}, \"nutritionPlan\": {...}}",
            },
          ],
        });
      } catch (fallbackError) {
        throw new Error(`OpenAI API failed: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`);
      }
    }

    const responseText = completion.choices[0]?.message?.content?.trim();
    if (!responseText) {
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
      throw new Error("Invalid plan structure");
    }

    return NextResponse.json({
      gymPlan: plans.gymPlan,
      nutritionPlan: plans.nutritionPlan,
    });
  } catch (error) {
    console.error("Generate plan error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorDetails = error instanceof Error ? error.stack : String(error);
    console.error("Error details:", errorDetails);
    
    return NextResponse.json(
      { 
        error: errorMessage || "Failed to generate plan. Please try again.",
        details: process.env.NODE_ENV === "development" ? errorDetails : undefined
      },
      { status: 500 }
    );
  }
}

