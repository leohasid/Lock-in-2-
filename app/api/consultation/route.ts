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

    // Extract prompt from request body
    // Support both new format (prompt) and legacy format (messages)
    let prompt: string;
    
    if (requestBody.prompt) {
      // New format: direct prompt
      prompt = requestBody.prompt;
    } else if (requestBody.messages && Array.isArray(requestBody.messages)) {
      // Legacy format: convert messages array to prompt
      const { messages, context } = requestBody;
      const workoutData = context?.workoutStats || {};
      const isFitnessMode = context?.mode === "fitness";

      const fitnessContextBlock = isFitnessMode
        ? `
**User's current workout setup in the app:**
- Plans in use: ${context?.selectedPlanNames || "None yet"}
- Training days (this week): ${context?.trainingDaysSummary || "Not set"}
${context?.plansInUse?.length ? `- Each plan has day types (e.g. Push/Pull/Legs or custom names). The user can assign which weekdays to each day type in "Training days" and pick which plans to use in "Workout plan".` : "- They can select plans in Workout plan and set which days to train in Training days."}

**Your role as AI Fitness Coach:**
- Help with workout-related questions: form, substitutes, volume, rest, progression.
- Help them use the app: suggest which days to train, which plan to use, how to change or add exercises.
- You cannot change the app yourself; give clear, step-by-step instructions (e.g. "Go to Workout plan, tap Option 1, then open Training days and set Push to Mon/Wed").
- Be supportive and practical. If they want to change their plan or training days, tell them exactly where to go in the app and what to tap.
- Keep answers focused on fitness and their workout plan unless they ask something else.`
        : "";

      const systemContext = isFitnessMode
        ? `You are the Mogifi AI Fitness Coach. You help users with their workouts and with using the workout section of the app (workout plans, training days, exercises).${fitnessContextBlock}

**How to respond:**
- Be clear and actionable. When suggesting changes, say where in the app to go (Workout plan, Training days, or a specific option).
- You can suggest modifying which days they train, which plan to use, exercise swaps, sets/reps, or rest.
- Be friendly and supportive. Keep responses concise but complete.

**Conversation History:**`
        : `You are an expert fitness and nutrition AI coach named "Mogifi AI Coach". You are a knowledgeable, friendly, and helpful assistant who can answer ANY questions the user has - whether about fitness, nutrition, health, workouts, or general topics.

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

      // Convert messages to conversation format
      const conversationText = messages
        .map((msg: { role: string; content: string }) => {
          const role = msg.role === "assistant" ? "Assistant" : "User";
          return `${role}: ${msg.content || ""}`;
        })
        .join("\n");

      prompt = `${systemContext}\n\n${conversationText}\n\nAssistant:`;
    } else {
      console.error("[Consultation API] Invalid request body - missing 'prompt' or 'messages'");
      return NextResponse.json({ error: "Invalid request format. Provide 'prompt' or 'messages' in request body." }, { status: 400 });
    }

    if (!prompt || prompt.trim().length === 0) {
      console.error("[Consultation API] Empty prompt");
      return NextResponse.json({ error: "Prompt cannot be empty" }, { status: 400 });
    }

    // Initialize OpenAI client
    const client = new OpenAI({ 
      apiKey: apiKey,
    });

    console.log("[Consultation API] Calling OpenAI API with responses.create...");
    console.log("[Consultation API] Prompt length:", prompt.length, "characters");
    
    // Call OpenAI API using responses.create
    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
      max_output_tokens: 300,
    });

    console.log("[Consultation API] OpenAI API call successful");

    // Extract response text
    const reply = response.output_text?.trim();
    
    if (!reply) {
      console.error("[Consultation API] OpenAI returned empty response. Response structure:", JSON.stringify(response, null, 2));
      return NextResponse.json({ 
        error: "AI service returned an empty response. Please try again." 
      }, { status: 500 });
    }

    console.log("[Consultation API] Successfully generated response, length:", reply.length);
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
      console.error("Error response data:", JSON.stringify(error.response.data, null, 2));
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
    
    // Handle method not found errors (if responses.create doesn't exist)
    if (error?.message?.includes("responses") || error?.message?.includes("method") || error?.code === "method_not_found") {
      console.error("[Consultation API] Possible API method issue - responses.create may not be available");
      console.error("[Consultation API] Full error details:", JSON.stringify(error, null, 2));
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
