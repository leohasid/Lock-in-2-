import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
  }

  try {
    const { currentReflection, previousReflections } = await request.json();

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
- Ratings:
  * Time Management: ${currentReflection.timeManagement}/3
  * Discipline: ${currentReflection.discipline}/3
  * Energy: ${currentReflection.energy}/3
  * Clarity: ${currentReflection.clarity}/3
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

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.8,
      max_tokens: 1500,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const reply = completion.choices[0]?.message?.content?.trim() || "";

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
        console.error("Error parsing suggested goals/habits:", e);
      }
    }

    // Remove JSON from feedback text
    const feedback = reply.replace(/```json[\s\S]*?```/g, "").trim();

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
    console.error("Reflections API error:", error);
    return NextResponse.json(
      { error: error.message || "Unable to generate feedback. Please try again." },
      { status: 500 }
    );
  }
}

