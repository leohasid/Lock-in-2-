import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OpenAI API key is not configured. Please set OPENAI_API_KEY in your environment variables." }, { status: 500 });
  }

  try {
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return NextResponse.json({ error: "Invalid request format. Please ensure the image data is properly formatted." }, { status: 400 });
    }

    const { imageData, label } = body;
    if (!imageData) {
      return NextResponse.json({ error: "No image data provided" }, { status: 400 });
    }

    // Validate image data format
    if (!imageData.startsWith("data:image/")) {
      return NextResponse.json({ error: "Invalid image format" }, { status: 400 });
    }

    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
    
    // Check if base64 data is too large (OpenAI has limits)
    if (base64Data.length > 20 * 1024 * 1024) { // ~20MB base64 = ~15MB image
      return NextResponse.json({ error: "Image is too large. Please use a smaller image." }, { status: 400 });
    }

    const prompt = `You are a nutrition coach. Analyze the photo and estimate calories, protein, carbs, and fats for the primary food. Use the provided label if helpful: "${label || "unknown"}". Respond with strict JSON matching this schema: {"name":string,"calories":number,"protein":number,"carbs":number,"fats":number}.`;

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
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

    const outputText = response.choices[0]?.message?.content?.trim() || "";

    if (!outputText) {
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
      console.error("JSON parse error:", parseError, "Response:", outputText);
      throw new Error("Failed to parse nutrition data from AI response");
    }

    // Validate the estimate has required fields
    if (!estimate.name || typeof estimate.calories !== "number") {
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

    return NextResponse.json({ estimate });
  } catch (error: any) {
    console.error("Food estimate error:", error);
    
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
    
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
