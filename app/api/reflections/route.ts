import { NextResponse } from "next/server";
import { generateAIText } from "@/lib/ai-provider";

export async function POST(request: Request) {
  if (typeof window !== "undefined") {
    return NextResponse.json({ error: "This API route is server-side only" }, { status: 403 });
  }

  if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Missing API key. Set OPENAI_API_KEY or ANTHROPIC_API_KEY." }, { status: 500 });
  }

  try {
    // Parse request body
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (parseError) {
      console.error("[Reflections API] Failed to parse request body:", parseError);
      return NextResponse.json({ error: "Invalid request format" }, { status: 400 });
    }

    const { currentReflection, previousReflections } = requestBody;

    // Build context from previous reflections
    let contextText = "";
    if (previousReflections && previousReflections.length > 0) {
      contextText = "\n\nPrevious reflections:\n";
      previousReflections.forEach((ref: any, idx: number) => {
        contextText += `\nDay ${idx + 1} (${ref.date}):\n`;
        contextText += `- How was day: ${ref.howWasDay || "N/A"}\n`;
        contextText += `- Grateful: ${ref.grateful || "N/A"}\n`;
        contextText += `- Focus tomorrow: ${ref.focusTomorrow || "N/A"}\n`;
        contextText += `- Ratings: Time Management: ${ref.timeManagement}, Discipline: ${ref.discipline}, Energy: ${ref.energy}, Clarity: ${ref.clarity}\n`;
      });
    }

    const systemPrompt = `You are Mogifi AI Coach, a supportive and insightful AI coach that helps users reflect on their day and improve their life.

Your role:
1. Provide thoughtful, personalized feedback based on the user's daily reflection
2. Identify patterns and trends from their previous reflections
3. Offer constructive advice and encouragement
4. Suggest specific, actionable goals and habits when appropriate
5. Be empathetic, supportive, and motivating

When suggesting goals or habits:
- Make them specific and measurable
- Ensure they're realistic and achievable
- Format goals as: { "id": "unique_id", "title": "Goal title", "target": number, "current": 0, "unit": "unit", "targetDate": "YYYY-MM-DD" }
- Format habits as: { "id": "unique_id", "name": "Habit name" }
- Only suggest 1-2 goals and 1-2 habits maximum
- Return them in JSON format: { "suggestedGoals": [...], "suggestedHabits": [...] }

Provide your feedback in a warm, conversational tone.`;

    const userPrompt = `Today's reflection (${currentReflection.date}):
- How was your day: ${currentReflection.howWasDay}
- What are you grateful for: ${currentReflection.grateful}
- What will you focus on tomorrow: ${currentReflection.focusTomorrow}
- Ratings (1-5 scale):
  * Time Management: ${currentReflection.timeManagement}/5
  * Discipline: ${currentReflection.discipline}/5
  * Energy: ${currentReflection.energy}/5
  * Clarity: ${currentReflection.clarity}/5
${contextText}

Please provide:
1. Personalized feedback on their day
2. Insights based on patterns (if previous reflections available)
3. Encouragement and actionable advice
4. If appropriate, suggest 1-2 specific goals and/or 1-2 habits in JSON format at the end

Format your response as:
[Your feedback text here]

If suggesting goals/habits, add at the end:
\`\`\`json
{
  "suggestedGoals": [...],
  "suggestedHabits": [...]
}
\`\`\``;

    const prompt = `${systemPrompt}\n\n${userPrompt}`;

    const reply = await generateAIText("reflections", {
      prompt,
      maxTokens: 1500,
    });

    if (!reply) {
      console.error("[Reflections API] AI returned empty response");
      return NextResponse.json({ 
        error: "AI service returned an empty response. Please try again." 
      }, { status: 500 });
    }

    // Extract JSON if present
    let suggestedGoals: any[] = [];
    let suggestedHabits: any[] = [];
    const jsonMatch = reply.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        const jsonData = JSON.parse(jsonMatch[1]);
        suggestedGoals = jsonData.suggestedGoals || [];
        suggestedHabits = jsonData.suggestedHabits || [];
      } catch (e) {
        console.error("[Reflections API] Error parsing suggested goals/habits:", e);
      }
    }

    // Remove JSON from feedback text
    const feedback = reply.replace(/```json[\s\S]*?```/g, "").trim();

    console.log("[Reflections API] Successfully generated feedback, length:", feedback.length);
    return NextResponse.json({
      feedback,
      suggestedGoals: suggestedGoals.map((g, idx) => ({
        ...g,
        id: g.id || `goal_${Date.now()}_${idx}`,
      })),
      suggestedHabits: suggestedHabits.map((h, idx) => ({
        ...h,
        id: h.id || `habit_${Date.now()}_${idx}`,
      })),
    });
    
  } catch (error: any) {
    console.error("[Reflections API] Error:", error?.message);
    const msg = error?.message || "Unable to generate feedback. Please try again.";
    if (msg.includes("API key") || msg.includes("invalid")) {
      return NextResponse.json({ error: "AI API key is missing or invalid." }, { status: 500 });
    }
    if (msg.includes("rate limit") || error?.status === 429) {
      return NextResponse.json({ error: "Rate limit exceeded. Please try again in a moment." }, { status: 429 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

