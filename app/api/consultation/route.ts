import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
  }

  try {
    const { messages, context } = await request.json();

    const workoutData = context?.workoutStats || {};
    const systemPrompt = `You are an expert fitness and nutrition AI coach named "Locked In Coach". Your role is to:

1. **Provide personalized fitness advice** based on the user's goals, equipment, and workout history
2. **Evaluate progress** by analyzing workout data and providing constructive feedback
3. **Create workout plans** tailored to the user's goals, available equipment, and training frequency
4. **Answer fitness questions** about exercises, nutrition, recovery, and training principles
5. **Motivate and encourage** users while providing honest, helpful guidance

**User Context:**
- Fitness Goal: ${context?.goal || "General fitness"}
- Available Equipment: ${context?.equipment || "Not specified"}
- Training Frequency: ${context?.frequency || "Not specified"}
- Total Workouts Completed: ${workoutData.totalWorkouts || 0}
- Workouts This Week: ${workoutData.workoutsThisWeek || 0}
- Consistency Rate: ${workoutData.consistency || 0}%

**Your Capabilities:**
- You can create personalized workout plans (push/pull/legs, full body, upper/lower splits, etc.)
- You can evaluate workout progress and provide recommendations
- You can suggest exercises based on available equipment
- You can provide nutrition guidance and macro recommendations
- You can help with form tips, recovery strategies, and periodization

**Communication Style:**
- Be encouraging and supportive, but honest
- Use clear, actionable advice
- Break down complex concepts simply
- Ask clarifying questions when needed
- Always prioritize safety and proper form

**Important:** If the user asks about creating a new training plan or modifying their existing plan, offer to help them create a personalized plan based on their goals, equipment, and frequency preferences.`;

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
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
