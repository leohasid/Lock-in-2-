import { NextResponse } from "next/server";
import { generateAIVision } from "@/lib/ai-provider";

export async function POST(request: Request) {
  if (typeof window !== "undefined") {
    return NextResponse.json({ error: "This API route is server-side only" }, { status: 403 });
  }

  if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Missing API key. Set OPENAI_API_KEY or ANTHROPIC_API_KEY." }, { status: 500 });
  }

  try {
    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error("[Food Estimate API] Failed to parse request body:", parseError);
      return NextResponse.json({ error: "Invalid request format. Please ensure the image data is properly formatted." }, { status: 400 });
    }

    const { imageData, label } = body;
    if (!imageData) {
      console.error("[Food Estimate API] No image data provided");
      return NextResponse.json({ error: "No image data provided" }, { status: 400 });
    }

    // Validate image data format
    if (typeof imageData !== "string") {
      console.error("[Food Estimate API] Image data is not a string, type:", typeof imageData);
      return NextResponse.json({ error: "Invalid image data type" }, { status: 400 });
    }
    
    if (!imageData.startsWith("data:image/")) {
      console.error("[Food Estimate API] Invalid image format. First 100 chars:", imageData.substring(0, 100));
      console.error("[Food Estimate API] Image data length:", imageData.length);
      return NextResponse.json({ error: "Invalid image format. Expected data URL starting with 'data:image/'" }, { status: 400 });
    }
    
    // Check if it's a valid base64 data URL
    if (!imageData.includes("base64,")) {
      console.error("[Food Estimate API] Image data URL missing base64 marker");
      return NextResponse.json({ error: "Invalid image format. Missing base64 data" }, { status: 400 });
    }

    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
    
    // Check if base64 data is too large (OpenAI has limits)
    if (base64Data.length > 20 * 1024 * 1024) { // ~20MB base64 = ~15MB image
      console.error("[Food Estimate API] Image too large:", base64Data.length, "bytes");
      return NextResponse.json({ error: "Image is too large. Please use a smaller image." }, { status: 400 });
    }

    const userHint = label && label.trim() ? label.trim() : null;
    const prompt = `You are a nutrition analysis AI.

Your task is to estimate calories and macronutrients from a food image.
The user may also provide a text description of the meal.
${userHint ? `\nUser description: "${userHint}"\n\nUse this as the primary hint for identifying foods. ` : ""}
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

    const outputText = await generateAIVision({
      prompt,
      imageData: imageData,
      maxTokens: 600,
    });

    if (!outputText) {
      throw new Error("AI returned an empty response");
    }

    // Try to extract JSON from the response
    let jsonString = outputText;
    const jsonStart = outputText.indexOf("{");
    const jsonEnd = outputText.lastIndexOf("}");
    
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      jsonString = outputText.slice(jsonStart, jsonEnd + 1);
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("[Food Estimate API] JSON parse error:", parseError, "Response:", outputText);
      throw new Error("Failed to parse nutrition data from AI response");
    }

    // Support both new format (foods + totals) and legacy format (name, calories, protein, carbs, fats)
    let estimate: { name: string; calories: number; protein: number; carbs: number; fats: number };
    if (parsed.foods && Array.isArray(parsed.foods)) {
      const name = parsed.foods.map((f: { name?: string }) => f?.name || "").filter(Boolean).join(", ") || label || "Meal";
      estimate = {
        name: name.length > 80 ? name.slice(0, 77) + "…" : name,
        calories: Number(parsed.total_calories ?? parsed.foods.reduce((s: number, f: { calories?: number }) => s + (f?.calories || 0), 0)) || 0,
        protein: Number(parsed.total_protein_g ?? parsed.foods.reduce((s: number, f: { protein_g?: number }) => s + (f?.protein_g || 0), 0)) || 0,
        carbs: Number(parsed.total_carbs_g ?? parsed.foods.reduce((s: number, f: { carbs_g?: number }) => s + (f?.carbs_g || 0), 0)) || 0,
        fats: Number(parsed.total_fat_g ?? parsed.foods.reduce((s: number, f: { fat_g?: number }) => s + (f?.fat_g || 0), 0)) || 0,
      };
    } else {
      if (!parsed.name && typeof parsed.calories !== "number") {
        console.error("[Food Estimate API] Invalid nutrition data format:", parsed);
        throw new Error("Invalid nutrition data format from AI");
      }
      estimate = {
        name: String(parsed.name || label || "Unknown meal"),
        calories: Number(parsed.calories || 0),
        protein: Number(parsed.protein ?? parsed.protein_g || 0),
        carbs: Number(parsed.carbs ?? parsed.carbs_g || 0),
        fats: Number(parsed.fats ?? parsed.fat_g || 0),
      };
    }

    console.log("[Food Estimate API] Successfully estimated nutrition data");
    return NextResponse.json({ estimate });
    
  } catch (error: any) {
    console.error("[Food Estimate API] Error:", error?.message);
    let errorMessage = "Unable to analyze food image";
    if (error?.message?.includes("rate limit") || error?.status === 429) {
      errorMessage = "Rate limit exceeded. Please try again in a moment.";
    } else if (error?.message?.includes("quota") || error?.message?.includes("insufficient")) {
      errorMessage = "AI API quota exceeded. Please check your account.";
    } else if (error?.message?.includes("timeout")) {
      errorMessage = "Request timed out. Please try again with a smaller image.";
    } else if (error?.message?.includes("invalid") || error?.message?.includes("API key")) {
      errorMessage = "AI API key is missing or invalid.";
    } else if (error?.message) {
      errorMessage = `Analysis failed: ${error.message}`;
    }
    
    console.error("[Food Estimate API] Returning error:", errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
