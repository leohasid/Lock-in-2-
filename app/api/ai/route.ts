import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(request: Request) {
  // Ensure this is server-side only
  if (typeof window !== "undefined") {
    return NextResponse.json({ error: "This API route is server-side only" }, { status: 403 });
  }

  // Check for API key
  const apiKey = process.env.OPENAI_API_KEY;
  console.log("[AI API] OPENAI_API_KEY check:", apiKey ? "EXISTS" : "MISSING");
  
  if (!apiKey) {
    const errorMsg = "Missing OPENAI_API_KEY. Please ensure it's set in Vercel environment variables.";
    console.error("[AI API]", errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }

  try {
    // Parse request body
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (parseError) {
      console.error("[AI API] Failed to parse request body:", parseError);
      return NextResponse.json({ error: "Invalid request format" }, { status: 400 });
    }

    // Extract prompt or message from request body
    // Support multiple formats: prompt, message, or messages array
    let prompt: string;
    
    if (requestBody.prompt) {
      // Format 1: Direct prompt
      prompt = requestBody.prompt;
    } else if (requestBody.message) {
      // Format 2: Single message (from nutrition page)
      // Build context-aware prompt if context is provided
      const context = requestBody.context || {};
      
      if (context.currentCalories !== undefined) {
        // Nutrition context
        prompt = `You are a helpful AI nutrition coach. Answer the user's question about nutrition and fitness.

Current nutrition status:
- Calories: ${context.currentCalories} / ${context.currentGoals?.calories || 'N/A'}
- Protein: ${context.currentMacros?.protein || 0}g / ${context.currentGoals?.protein || 'N/A'}g
- Carbs: ${context.currentMacros?.carbs || 0}g / ${context.currentGoals?.carbs || 'N/A'}g
- Fats: ${context.currentMacros?.fats || 0}g / ${context.currentGoals?.fats || 'N/A'}g

User question: ${requestBody.message}

Provide a helpful, conversational response.`;
      } else {
        // Simple message without context
        prompt = requestBody.message;
      }
    } else if (requestBody.messages && Array.isArray(requestBody.messages)) {
      // Format 3: Messages array (from consultation page)
      // Convert messages array to a single prompt
      const messages = requestBody.messages as Array<{ role: string; content: string }>;
      const context = requestBody.context || {};
      const workoutData = context?.workoutStats || {};
      
      const systemContext = `You are an expert fitness and nutrition AI coach named "Mogifi AI Coach". You are a knowledgeable, friendly, and helpful assistant who can answer ANY questions the user has - whether about fitness, nutrition, health, workouts, or general topics.

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
- If the user wants a workout plan, help them create one based on their goals and equipment

**Conversation History:**`;

      const conversationText = messages
        .map((msg) => {
          const role = msg.role === "assistant" ? "Assistant" : "User";
          return `${role}: ${msg.content || ""}`;
        })
        .join("\n");

      prompt = `${systemContext}\n\n${conversationText}\n\nAssistant:`;
    } else {
      console.error("[AI API] Invalid request body - missing 'prompt', 'message', or 'messages'");
      return NextResponse.json({ 
        error: "Invalid request format. Provide 'prompt', 'message', or 'messages' in request body." 
      }, { status: 400 });
    }

    if (!prompt || prompt.trim().length === 0) {
      console.error("[AI API] Empty prompt");
      return NextResponse.json({ error: "Prompt cannot be empty" }, { status: 400 });
    }

    // Initialize OpenAI client
    const client = new OpenAI({ apiKey: apiKey });

    console.log("[AI API] Calling OpenAI API with chat.completions.create...");
    console.log("[AI API] Prompt length:", prompt.length, "characters");
    
    // Use standard OpenAI SDK - chat.completions.create (reliable, works on Vercel)
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 1000,
      temperature: 0.8,
    });

    console.log("[AI API] OpenAI API call successful");

    // Extract response text from standard format
    const reply = completion.choices[0]?.message?.content?.trim();
    
    if (!reply) {
      console.error("[AI API] OpenAI returned empty response. Response structure:", JSON.stringify(completion, null, 2));
      return NextResponse.json({ 
        error: "AI service returned an empty response. Please try again." 
      }, { status: 500 });
    }

    console.log("[AI API] Successfully generated response, length:", reply.length);
    
    // Return response in format expected by frontend
    // Support both 'reply' (consultation page) and 'response' (nutrition page) formats
    return NextResponse.json({ 
      reply: reply,
      response: reply, // Also include 'response' for nutrition page compatibility
    });
    
  } catch (error: any) {
    // Comprehensive error logging
    console.error("[AI API] Error occurred:");
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
      console.error("[AI API] OpenAI API Error detected:", {
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
    console.error("[AI API] Returning generic error:", errorMessage);
    return NextResponse.json({ 
      error: errorMessage 
    }, { status: 500 });
  }
}
