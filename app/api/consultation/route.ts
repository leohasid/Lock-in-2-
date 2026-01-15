import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(request: Request) {
  // Ensure this is server-side only
  if (typeof window !== "undefined") {
    return NextResponse.json({ error: "This API route is server-side only" }, { status: 403 });
  }

  // Check for API key
  const apiKey = process.env.OPENAI_API_KEY;
  console.log("[Consultation API] OPENAI_API_KEY check:", apiKey ? "EXISTS" : "MISSING");
  
  if (!apiKey) {
    const errorMsg = "Missing OPENAI_API_KEY. Please ensure it's set in Vercel environment variables for Production environment.";
    console.error("[Consultation API]", errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }

  try {
    // Parse request body
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (parseError) {
      console.error("[Consultation API] Failed to parse request body:", parseError);
      return NextResponse.json({ error: "Invalid request format" }, { status: 400 });
    }

    const { messages, context } = requestBody;

    if (!messages || !Array.isArray(messages)) {
      console.error("[Consultation API] Invalid messages array");
      return NextResponse.json({ error: "Invalid messages format" }, { status: 400 });
    }

    const workoutData = context?.workoutStats || {};
    const systemPrompt = `You are an expert fitness and nutrition AI coach named "Mogifi AI Coach". You are a knowledgeable, friendly, and helpful assistant who can answer ANY questions the user has - whether about fitness, nutrition, health, workouts, or general topics.

**Your Primary Role:**
- Answer ANY question the user asks - be it fitness-related, nutrition, health, general knowledge, or casual conversation
- Provide personalized fitness advice when relevant
- Evaluate workout progress when asked
- Create workout plans when requested
- Be conversational, natural, and engaging - NOT robotic or automated
- Have a real conversation, not just follow a script

**User Context (use this when relevant to fitness questions):**
- Fitness Goal: ${context?.goal || "General fitness"}
- Available Equipment: ${context?.equipment || "Not specified"}
- Training Frequency: ${context?.frequency || "Not specified"}
- Total Workouts Completed: ${workoutData.totalWorkouts || 0}
- Workouts This Week: ${workoutData.workoutsThisWeek || 0}
- Consistency Rate: ${workoutData.consistency || 0}%

**How to Respond:**
- Answer questions naturally and conversationally
- If asked about fitness/nutrition, use the user context above
- If asked about other topics, answer helpfully
- Be engaging and personable - like talking to a knowledgeable friend
- Don't be repetitive or use templates - each response should be unique
- Ask follow-up questions to understand the user better
- Provide detailed, thoughtful answers

**Important:** 
- You can answer ANY question - don't limit yourself to just fitness
- Be natural and conversational, not automated
- Each response should feel personalized and genuine
- If the user wants a workout plan, help them create one based on their goals and equipment`;

    // Initialize OpenAI client
    const openai = new OpenAI({ 
      apiKey: apiKey,
    });

    console.log("[Consultation API] Calling OpenAI API...");
    
    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.8,
      max_tokens: 1000,
      messages: [
        { role: "system" as const, content: systemPrompt },
        ...messages.map((msg: { role: string; content: string }) => ({
          role: (msg.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
          content: msg.content || "",
        })),
      ],
    });

    console.log("[Consultation API] OpenAI API call successful");

    // Extract response text
    const reply = completion.choices[0]?.message?.content?.trim();
    
    if (!reply) {
      console.error("[Consultation API] OpenAI returned empty response. Response structure:", JSON.stringify(completion, null, 2));
      return NextResponse.json({ 
        error: "AI service returned an empty response. Please try again." 
      }, { status: 500 });
    }

    console.log("[Consultation API] Successfully generated response");
    return NextResponse.json({ reply });
    
  } catch (error: any) {
    // Comprehensive error logging
    console.error("[Consultation API] Error occurred:");
    console.error("Error type:", error?.constructor?.name);
    console.error("Error message:", error?.message);
    console.error("Error status:", error?.status);
    console.error("Error code:", error?.code);
    console.error("Error response:", error?.response);
    if (error?.response) {
      console.error("Error response status:", error.response.status);
      console.error("Error response data:", error.response.data);
    }
    console.error("Error stack:", error?.stack);
    
    // Handle specific OpenAI API errors
    if (error instanceof OpenAI.APIError) {
      console.error("[Consultation API] OpenAI API Error detected:", {
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
    
    // Handle generic API key errors
    if (error?.message?.includes("API key") || error?.message?.includes("Invalid API key") || error?.code === "invalid_api_key") {
      return NextResponse.json({ 
        error: "OpenAI API key is missing or invalid. Please check your Vercel environment variables." 
      }, { status: 500 });
    }
    
    // Handle rate limit errors
    if (error?.message?.includes("rate limit") || error?.status === 429) {
      return NextResponse.json({ 
        error: "Rate limit exceeded. Please try again in a moment." 
      }, { status: 429 });
    }
    
    // Handle quota errors
    if (error?.message?.includes("insufficient_quota") || error?.code === "insufficient_quota") {
      return NextResponse.json({ 
        error: "OpenAI account has insufficient quota. Please check your OpenAI account billing." 
      }, { status: 500 });
    }
    
    // Return generic error with message
    const errorMessage = error?.message || "Unable to generate a response. Please try again.";
    console.error("[Consultation API] Returning generic error:", errorMessage);
    return NextResponse.json({ 
      error: errorMessage 
    }, { status: 500 });
  }
}
