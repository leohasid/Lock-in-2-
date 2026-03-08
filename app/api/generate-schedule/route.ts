import { NextResponse } from "next/server";
import { generateAIText } from "@/lib/ai-provider";

export async function POST(request: Request) {
  // Ensure this is server-side only
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
      console.error("[Generate Schedule API] Failed to parse request body:", parseError);
      return NextResponse.json({ error: "Invalid request format" }, { status: 400 });
    }

    const { preferences, month, year, existingReminders } = requestBody;

    const systemPrompt = `You are an expert schedule and routine planner AI assistant. Your job is to create a schedule based ONLY on what the user explicitly mentions.

**CRITICAL RULES:**
1. ONLY create reminders for activities, tasks, or items that the user explicitly mentions in their preferences
2. DO NOT add random workouts, exercises, or activities that the user did not mention
3. DO NOT invent new tasks - only use what the user specified
4. If the user mentions "workout", use that exact term - do not change it to "HIIT workout" or add variations
5. Extract the exact activities the user wants to track from their input

**Your Task:**
Generate a monthly schedule for ${month} ${year} based ONLY on the user's explicit preferences below.

**User Preferences (ONLY use these items):**
${preferences ? preferences : "- No preferences provided. Return an empty schedule."}

**Existing Reminders (to avoid duplicates):**
${existingReminders && existingReminders.length > 0 
  ? existingReminders.map((r: any) => `- ${r.title} at ${r.time} on ${r.date} (${r.type})`).join('\n')
  : "- No existing reminders"}

**Output Format:**
Return a JSON object with a "reminders" array. Each reminder should have:
- title: A clear, descriptive title
- type: One of "supplement", "task", or "habit"
- time: Time in HH:MM format (24-hour)
- date: Date in YYYY-MM-DD format
- repeatFrequency: Optional repeat pattern (e.g., "daily", "weekly", "every 3 days")

Example format:
{
  "reminders": [
    {
      "title": "Morning Workout",
      "type": "task",
      "time": "07:00",
      "date": "2024-01-01",
      "repeatFrequency": "daily"
    }
  ]
}

**Guidelines:**
- ONLY create reminders for items explicitly mentioned by the user
- DO NOT add your own suggestions or variations
- Use the exact wording the user provided for activity names
- Space out activities appropriately throughout the month
- Don't create duplicates of existing reminders
- If user mentions a time, use that time
- If user doesn't mention a time, use reasonable defaults (e.g., 08:00 for morning activities)
- Generate reminders for the entire month based on repeat frequency

**Important:** Return ONLY valid JSON in the format: {"reminders": [...]}. No markdown, no code blocks, just the JSON object.`;

    const userPrompt = `Generate a monthly schedule for ${month} ${year} based ONLY on these user preferences: ${preferences || 'No preferences provided - return empty schedule'}. Only include activities the user explicitly mentioned. Do not add any activities they did not mention.`;

    // Combine system and user prompts into single input
    const prompt = `${systemPrompt}\n\n${userPrompt}`;

    const responseText = await generateAIText("generate-schedule", {
      prompt,
      maxTokens: 4000,
    });
    
    if (!responseText) {
      console.error("[Generate Schedule API] AI returned empty response");
      return NextResponse.json({ 
        error: "AI service returned an empty response. Please try again." 
      }, { status: 500 });
    }

    // Parse the JSON response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseText);
    } catch (parseError) {
      // If response is not valid JSON, try to extract JSON from markdown code blocks
      const jsonMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[1]);
      } else {
        console.error("[Generate Schedule API] Could not parse JSON from AI response:", responseText);
        throw new Error("Could not parse JSON from AI response");
      }
    }

    // Extract reminders array - handle different response formats
    let reminders = [];
    if (Array.isArray(parsedResponse)) {
      reminders = parsedResponse;
    } else if (parsedResponse.reminders && Array.isArray(parsedResponse.reminders)) {
      reminders = parsedResponse.reminders;
    } else if (parsedResponse.schedule && Array.isArray(parsedResponse.schedule)) {
      reminders = parsedResponse.schedule;
    } else {
      // Try to find any array in the response
      const keys = Object.keys(parsedResponse);
      for (const key of keys) {
        if (Array.isArray(parsedResponse[key])) {
          reminders = parsedResponse[key];
          break;
        }
      }
    }

    // Validate and format reminders
    const formattedReminders = reminders
      .filter((r: any) => r.title && r.time && r.date)
      .map((r: any) => ({
        title: r.title,
        type: r.type || "task",
        time: r.time,
        date: r.date,
        repeatFrequency: r.repeatFrequency || "",
      }));

    if (formattedReminders.length === 0) {
      return NextResponse.json({ 
        error: "AI generated an empty schedule. Please try again with more specific preferences." 
      }, { status: 500 });
    }

    console.log("[Generate Schedule API] Successfully generated schedule with", formattedReminders.length, "reminders");
    return NextResponse.json({ 
      reminders: formattedReminders,
      count: formattedReminders.length 
    });
    
  } catch (error: any) {
    console.error("[Generate Schedule API] Error:", error?.message);
    const errorMessage = error?.message || "Unable to generate schedule. Please try again.";
    if (errorMessage.includes("API key") || errorMessage.includes("invalid")) {
      return NextResponse.json({ error: "AI API key is missing or invalid." }, { status: 500 });
    }
    if (errorMessage.includes("rate limit") || error?.status === 429) {
      return NextResponse.json({ error: "Rate limit exceeded. Please try again in a moment." }, { status: 429 });
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

