import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
  }

  try {
    const { messages, context } = await request.json();

    const workoutData = context?.workoutStats || {};
    const systemPrompt = `You are an expert fitness and nutrition AI coach named "Locked In Coach". You are a knowledgeable, friendly, and helpful assistant who can answer ANY questions the user has - whether about fitness, nutrition, health, workouts, or general topics.

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

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.8, // Higher temperature for more natural, varied responses
      max_tokens: 1000, // Allow longer, more detailed responses
      messages: [
        { role: "system" as const, content: systemPrompt },
        ...(Array.isArray(messages) ? messages : []).map((msg: { role: string; content: string }) => ({
          role: (msg.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
          content: msg.content,
        })),
      ],
    });

    const reply = completion.choices[0]?.message?.content?.trim();
    
    if (!reply) {
      console.error("OpenAI returned empty response");
      return NextResponse.json({ 
        error: "AI service returned an empty response. Please try again." 
      }, { status: 500 });
    }

    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error("Consultation API error:", error);
    
    // Provide more specific error messages
    if (error.message?.includes("API key") || error.message?.includes("Invalid API key")) {
      return NextResponse.json({ 
        error: "OpenAI API key is missing or invalid. Please check your Vercel environment variables." 
      }, { status: 500 });
    }
    
    if (error.message?.includes("rate limit") || error.status === 429) {
      return NextResponse.json({ 
        error: "Rate limit exceeded. Please try again in a moment." 
      }, { status: 429 });
    }
    
    if (error.message?.includes("insufficient_quota")) {
      return NextResponse.json({ 
        error: "OpenAI account has insufficient quota. Please check your OpenAI account billing." 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      error: error.message || "Unable to generate a response. Please try again." 
    }, { status: 500 });
  }
}
