import { NextResponse } from "next/server";
import { generateAIText } from "@/lib/ai-provider";

export async function POST(request: Request) {
  if (typeof window !== "undefined") {
    return NextResponse.json({ error: "This API route is server-side only" }, { status: 403 });
  }

  const hasKey = !!(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY);
  if (!hasKey) {
    return NextResponse.json({
      error: "Missing API key. Set OPENAI_API_KEY or ANTHROPIC_API_KEY in environment variables.",
    }, { status: 500 });
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

    console.log("[Consultation API] Calling AI provider (Claude preferred)...");
    const reply = await generateAIText("consultation", {
      prompt,
      maxTokens: 300,
    });
    
    if (!reply) {
      console.error("[Consultation API] AI returned empty response");
      return NextResponse.json({ 
        error: "AI service returned an empty response. Please try again." 
      }, { status: 500 });
    }

    console.log("[Consultation API] Successfully generated response, length:", reply.length);
    return NextResponse.json({ reply });
    
  } catch (error: any) {
    console.error("[Consultation API] Error:", error?.message);
    const msg = error?.message || "Unable to generate a response. Please try again.";
    if (msg.includes("API key") || msg.includes("invalid")) {
      return NextResponse.json({ error: "AI API key is missing or invalid. Check environment variables." }, { status: 500 });
    }
    if (msg.includes("rate limit") || error?.status === 429) {
      return NextResponse.json({ error: "Rate limit exceeded. Please try again in a moment." }, { status: 429 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
