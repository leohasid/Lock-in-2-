import { NextResponse } from "next/server";
import { generateAIVision } from "@/lib/ai-provider";

// Vercel: allow up to 60s (Hobby plan supports this). Prevents timeout during AI vision.
export const maxDuration = 60;
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (typeof window !== "undefined") {
    return NextResponse.json({ error: "This API route is server-side only" }, { status: 403 });
  }

  if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Missing API key. Set OPENAI_API_KEY or ANTHROPIC_API_KEY." }, { status: 500 });
  }

  try {
    // Vercel has 4.5MB body limit - reject oversized requests early with clear error
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > 4 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Image too large. Please use a smaller photo or compress before uploading." },
        { status: 413 }
      );
    }

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
    const prompt = `Estimate nutrition from this food image. ${userHint ? `User said: "${userHint}". ` : ""}
Identify foods, estimate portions, sum macros. For packaged items with visible branding, use typical product nutrition.
Return ONLY this JSON (no markdown):
{"foods":[{"name":"","calories":0,"protein_g":0,"carbs_g":0,"fat_g":0}],"total_calories":0,"total_protein_g":0,"total_carbs_g":0,"total_fat_g":0}`;

    const outputText = await generateAIVision({
      prompt,
      imageData: imageData,
      maxTokens: 350,
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
