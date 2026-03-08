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

    const prompt = `You are a nutrition coach. Analyze the photo and estimate calories, protein, carbs, and fats for the primary food. Use the provided label if helpful: "${label || "unknown"}". Respond with strict JSON matching this schema: {"name":string,"calories":number,"protein":number,"carbs":number,"fats":number}.`;

    const outputText = await generateAIVision({
      prompt,
      imageData: imageData,
      maxTokens: 200,
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

    let estimate;
    try {
      estimate = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("[Food Estimate API] JSON parse error:", parseError, "Response:", outputText);
      throw new Error("Failed to parse nutrition data from AI response");
    }

    // Validate the estimate has required fields
    if (!estimate.name || typeof estimate.calories !== "number") {
      console.error("[Food Estimate API] Invalid nutrition data format:", estimate);
      throw new Error("Invalid nutrition data format from AI");
    }

    // Ensure all values are numbers
    estimate = {
      name: String(estimate.name || label || "Unknown meal"),
      calories: Number(estimate.calories || 0),
      protein: Number(estimate.protein || 0),
      carbs: Number(estimate.carbs || 0),
      fats: Number(estimate.fats || 0),
    };

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
