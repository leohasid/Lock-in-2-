import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(request: Request) {
  // Ensure this is server-side only
  if (typeof window !== "undefined") {
    return NextResponse.json({ error: "This API route is server-side only" }, { status: 403 });
  }

  // Check for API key
  const apiKey = process.env.OPENAI_API_KEY;
  console.log("[Food Estimate API] OPENAI_API_KEY check:", apiKey ? "EXISTS" : "MISSING");
  
  if (!apiKey) {
    const errorMsg = "Missing OPENAI_API_KEY. Please ensure it's set in Vercel environment variables.";
    console.error("[Food Estimate API]", errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
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
    if (!imageData.startsWith("data:image/")) {
      console.error("[Food Estimate API] Invalid image format");
      return NextResponse.json({ error: "Invalid image format" }, { status: 400 });
    }

    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
    
    // Check if base64 data is too large (OpenAI has limits)
    if (base64Data.length > 20 * 1024 * 1024) { // ~20MB base64 = ~15MB image
      console.error("[Food Estimate API] Image too large:", base64Data.length, "bytes");
      return NextResponse.json({ error: "Image is too large. Please use a smaller image." }, { status: 400 });
    }

    const prompt = `You are a nutrition coach. Analyze the photo and estimate calories, protein, carbs, and fats for the primary food. Use the provided label if helpful: "${label || "unknown"}". Respond with strict JSON matching this schema: {"name":string,"calories":number,"protein":number,"carbs":number,"fats":number}.`;

    // Initialize OpenAI client
    const client = new OpenAI({ apiKey: apiKey });

    console.log("[Food Estimate API] Calling OpenAI API with vision model...");
    console.log("[Food Estimate API] Image size:", base64Data.length, "bytes");
    
    // Note: Vision API requires chat.completions.create, not responses.create
    // This is the only route that needs the standard API due to image input
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Data}`,
              },
            },
          ],
        },
      ],
      max_tokens: 200,
      temperature: 0.3, // Lower temperature for more consistent nutrition estimates
    });

    console.log("[Food Estimate API] OpenAI API call successful");

    // Extract response text (using standard chat completions format)
    const outputText = response.choices[0]?.message?.content?.trim() || "";

    if (!outputText) {
      console.error("[Food Estimate API] OpenAI returned empty response. Response structure:", JSON.stringify(response, null, 2));
      throw new Error("OpenAI returned an empty response");
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
    // Comprehensive error logging
    console.error("[Food Estimate API] Error occurred:");
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
      console.error("[Food Estimate API] OpenAI API Error detected:", {
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
    
    // Provide more specific error messages
    let errorMessage = "Unable to analyze food image";
    
    if (error instanceof Error) {
      if (error.message.includes("rate limit") || error.message.includes("429")) {
        errorMessage = "Rate limit exceeded. Please try again in a moment.";
      } else if (error.message.includes("quota") || error.message.includes("insufficient")) {
        errorMessage = "OpenAI API quota exceeded. Please check your account.";
      } else if (error.message.includes("timeout")) {
        errorMessage = "Request timed out. Please try again with a smaller image.";
      } else if (error.message.includes("invalid")) {
        errorMessage = error.message;
      } else {
        errorMessage = `Analysis failed: ${error.message}`;
      }
    }
    
    console.error("[Food Estimate API] Returning error:", errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
