import { NextResponse } from "next/server";
import { generateAIText } from "@/lib/ai-provider";

export async function POST(request: Request) {
  // Ensure this is server-side only
  if (typeof window !== "undefined") {
    return NextResponse.json({ error: "This API route is server-side only" }, { status: 403 });
  }

  if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Missing API key. Set OPENAI_API_KEY or ANTHROPIC_API_KEY." }, { status: 500 });
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
      gender,
      workoutExtraNotes,
      wantsAIWorkoutPlan,
      wantsMacrosPlan,
    } = requestData;

    if (!fitnessGoal || !equipment || !height || !age || !weight || !aggressiveness) {
      console.error("[Generate Plan API] Missing required fields");
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const genderNorm =
      typeof gender === "string" ? gender.toLowerCase().trim() : "";
    const isFemale = genderNorm === "female" || genderNorm === "f";

    // Calculate BMI and BMR for context — Mifflin-St Jeor
    const bmi = weight / ((height / 100) ** 2);
    const bmrConstant = isFemale ? -161 : 5;
    const bmr = 10 * weight + 6.25 * height - 5 * age + bmrConstant;

    const genderLabel = isFemale ? "female" : genderNorm === "male" || genderNorm === "m" ? "male" : "not specified";
    const notesBlock =
      typeof workoutExtraNotes === "string" && workoutExtraNotes.trim().length > 0
        ? `\n- Extra preferences / constraints from the user: ${workoutExtraNotes.trim()}`
        : "";
    const gymRequested = wantsAIWorkoutPlan !== false;
    const macrosRequested = wantsMacrosPlan !== false;

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

    const systemPrompt = `You are an expert fitness and nutrition coach. Create personalized plans based on the user's profile.

User Profile:
- Sex (for programming load/recovery context): ${genderLabel}
- Goal: ${goalLabels[fitnessGoal]}
- Equipment: ${equipmentLabels[equipment]}
- Height: ${height} cm
- Age: ${age} years
- Weight: ${weight} kg
- BMI: ${bmi.toFixed(1)}
- BMR (Mifflin–St Jeor): ${bmr.toFixed(0)} kcal/day
- Intensity: ${aggressivenessLabels[aggressiveness]}${notesBlock}

Generate detailed plans as requested:
- Gym/workout JSON: ${gymRequested ? "REQUIRED — full weekly schedule as specified below" : "You may return a minimal placeholder gymPlan if not needed, but still output valid JSON keys."}
- Nutrition JSON: ${macrosRequested ? "REQUIRED — full macros plan as specified below" : "You may return sensible defaults in nutritionPlan."}

Details for gym plan (when applicable):

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

    const responseText = await generateAIText("generate-plan", {
      prompt,
      maxTokens: 4000,
    });
    
    if (!responseText) {
      throw new Error("Empty response from AI");
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
        throw new Error("Could not parse JSON from AI response");
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
    console.error("[Generate Plan API] Error:", error?.message);
    const errorMessage = error?.message || "Failed to generate plan. Please try again.";
    if (errorMessage.includes("API key") || errorMessage.includes("invalid")) {
      return NextResponse.json({ error: "AI API key is missing or invalid." }, { status: 500 });
    }
    if (errorMessage.includes("rate limit") || error?.status === 429) {
      return NextResponse.json({ error: "Rate limit exceeded. Please try again in a moment." }, { status: 429 });
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

