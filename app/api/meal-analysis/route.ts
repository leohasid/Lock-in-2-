import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(request: Request) {
  // Ensure this is server-side only
  if (typeof window !== "undefined") {
    return NextResponse.json({ error: "This API route is server-side only" }, { status: 403 });
  }

  // Check for API key
  const apiKey = process.env.OPENAI_API_KEY;
  console.log("[Meal Analysis API] OPENAI_API_KEY check:", apiKey ? "EXISTS" : "MISSING");
  
  if (!apiKey) {
    const errorMsg = "Missing OPENAI_API_KEY. Please ensure it's set in Vercel environment variables.";
    console.error("[Meal Analysis API]", errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
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

    // Combine system and user prompts into single input
    const prompt = `${systemPrompt}\n\n${userPrompt}`;

    // Initialize OpenAI client
    const client = new OpenAI({ apiKey: apiKey });

    console.log("[Meal Analysis API] Calling OpenAI API with responses.create...");
    console.log("[Meal Analysis API] Prompt length:", prompt.length, "characters");
    
    // Call OpenAI API using responses.create
    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
      max_output_tokens: 800,
    });

    console.log("[Meal Analysis API] OpenAI API call successful");

    // Extract response text
    const analysis = response.output_text?.trim();
    
    if (!analysis) {
      console.error("[Meal Analysis API] OpenAI returned empty response. Response structure:", JSON.stringify(response, null, 2));
      return NextResponse.json({ 
        error: "AI service returned an empty response. Please try again." 
      }, { status: 500 });
    }

    console.log("[Meal Analysis API] Successfully generated analysis, length:", analysis.length);
    return NextResponse.json({ analysis });
    
  } catch (error: any) {
    // Comprehensive error logging
    console.error("[Meal Analysis API] Error occurred:");
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
      console.error("[Meal Analysis API] OpenAI API Error detected:", {
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
      console.error("[Meal Analysis API] Possible API method issue - responses.create may not be available");
      console.error("[Meal Analysis API] Full error details:", JSON.stringify(error, null, 2));
    }
    
    // Return generic error with message
    const errorMessage = error?.message || "Failed to analyze meals. Please try again.";
    console.error("[Meal Analysis API] Returning error:", errorMessage);
    return NextResponse.json({ 
      error: errorMessage 
    }, { status: 500 });
  }
}
