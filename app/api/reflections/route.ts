import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(request: Request) {
  // Ensure this is server-side only
  if (typeof window !== "undefined") {
    return NextResponse.json({ error: "This API route is server-side only" }, { status: 403 });
  }

  // Check for API key
  const apiKey = process.env.OPENAI_API_KEY;
  console.log("[Reflections API] OPENAI_API_KEY check:", apiKey ? "EXISTS" : "MISSING");
  
  if (!apiKey) {
    const errorMsg = "Missing OPENAI_API_KEY. Please ensure it's set in Vercel environment variables.";
    console.error("[Reflections API]", errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
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

    // Combine system and user prompts into single input
    const prompt = `${systemPrompt}\n\n${userPrompt}`;

    // Initialize OpenAI client
    const client = new OpenAI({ apiKey: apiKey });

    console.log("[Reflections API] Calling OpenAI API with responses.create...");
    console.log("[Reflections API] Prompt length:", prompt.length, "characters");
    
    // Call OpenAI API using responses.create
    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
      max_output_tokens: 1500,
    });

    console.log("[Reflections API] OpenAI API call successful");

    // Extract response text
    const reply = response.output_text?.trim() || "";

    if (!reply) {
      console.error("[Reflections API] OpenAI returned empty response. Response structure:", JSON.stringify(response, null, 2));
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
    // Comprehensive error logging
    console.error("[Reflections API] Error occurred:");
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
      console.error("[Reflections API] OpenAI API Error detected:", {
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
      console.error("[Reflections API] Possible API method issue - responses.create may not be available");
      console.error("[Reflections API] Full error details:", JSON.stringify(error, null, 2));
    }
    
    // Return generic error with message
    const errorMessage = error?.message || "Unable to generate feedback. Please try again.";
    console.error("[Reflections API] Returning error:", errorMessage);
    return NextResponse.json({ 
      error: errorMessage 
    }, { status: 500 });
  }
}

