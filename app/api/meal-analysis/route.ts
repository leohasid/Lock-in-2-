import { NextResponse } from "next/server";
import { generateAIText } from "@/lib/ai-provider";

export async function POST(request: Request) {
  if (typeof window !== "undefined") {
    return NextResponse.json({ error: "This API route is server-side only" }, { status: 403 });
  }

  if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Missing API key. Set OPENAI_API_KEY or ANTHROPIC_API_KEY." }, { status: 500 });
  }

  try {
    // Parse request body
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (parseError) {
      console.error("[Meal Analysis API] Failed to parse request body:", parseError);
      return NextResponse.json({ error: "Invalid request format" }, { status: 400 });
    }

    const { meals, totals, goals } = requestBody;

    if (!meals || !Array.isArray(meals) || meals.length === 0) {
      console.error("[Meal Analysis API] No meals provided");
      return NextResponse.json({ error: "No meals provided" }, { status: 400 });
    }

    // Format meals for analysis
    const mealsList = meals.map((meal: any) => 
      `${meal.name}: ${meal.calories} cal, ${meal.protein}g protein, ${meal.carbs}g carbs, ${meal.fats}g fats`
    ).join("\n");

    const systemPrompt = `You are a nutrition expert and health coach. Analyze the user's daily meals and provide a comprehensive analysis focusing on:
1. **Benefits**: What's good about their food choices (nutrients, vitamins, health benefits)
2. **Negatives/Concerns**: Areas for improvement (excess sugar, sodium, lack of nutrients, unhealthy choices)
3. **Recommendations**: Specific suggestions for improving their nutrition

Be constructive, educational, and encouraging. Highlight both positive aspects and areas for improvement. Keep the response concise but informative (3-4 paragraphs).`;

    const userPrompt = `Analyze my meals for today:

Meals consumed:
${mealsList}

Daily totals:
- Calories: ${totals.calories} / ${goals.calories} target
- Protein: ${totals.protein}g / ${goals.protein}g target
- Carbs: ${totals.carbs}g / ${goals.carbs}g target
- Fats: ${totals.fats}g / ${goals.fats}g target

Provide an analysis of the benefits and negatives of what I've eaten today, along with recommendations.`;

    const prompt = `${systemPrompt}\n\n${userPrompt}`;

    const analysis = await generateAIText("meal-analysis", {
      prompt,
      maxTokens: 800,
    });
    
    if (!analysis) {
      console.error("[Meal Analysis API] AI returned empty response");
      return NextResponse.json({ 
        error: "AI service returned an empty response. Please try again." 
      }, { status: 500 });
    }

    console.log("[Meal Analysis API] Successfully generated analysis, length:", analysis.length);
    return NextResponse.json({ analysis });
    
  } catch (error: any) {
    console.error("[Meal Analysis API] Error:", error?.message);
    const msg = error?.message || "Failed to analyze meals. Please try again.";
    if (msg.includes("API key") || msg.includes("invalid")) {
      return NextResponse.json({ error: "AI API key is missing or invalid." }, { status: 500 });
    }
    if (msg.includes("rate limit") || error?.status === 429) {
      return NextResponse.json({ error: "Rate limit exceeded. Please try again in a moment." }, { status: 429 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
