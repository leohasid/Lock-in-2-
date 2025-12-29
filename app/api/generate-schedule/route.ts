import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
  }

  try {
    const { preferences, month, year, existingReminders } = await request.json();

    const systemPrompt = `You are an expert schedule and routine planner AI assistant. Your job is to create a comprehensive, well-organized monthly schedule that helps users establish and maintain a healthy, productive routine.

**Your Task:**
Generate a complete monthly schedule for ${month} ${year} that includes:
- Workout/exercise sessions (distributed throughout the week)
- Meal times and nutrition reminders
- Supplement reminders
- Habit tracking items
- Task reminders
- Rest days and recovery periods
- Any other routine activities the user wants to track

**User Preferences:**
${preferences ? `- ${preferences}` : "- No specific preferences provided. Create a balanced, healthy routine."}

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
- Create a realistic, sustainable routine
- Space out activities appropriately
- Include variety in workout types
- Consider rest days and recovery
- Make meal times consistent
- Include morning and evening routines
- Distribute activities throughout the day
- Don't create duplicates of existing reminders
- Make the schedule personalized based on user preferences
- Generate reminders for the entire month

**Important:** Return ONLY valid JSON in the format: {"reminders": [...]}. No markdown, no code blocks, just the JSON object.`;

    const userPrompt = `Generate a complete monthly schedule for ${month} ${year}. ${preferences ? `User preferences: ${preferences}` : 'Create a balanced, healthy routine with workouts, meals, supplements, and habits.'}`;

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      max_tokens: 4000,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const response = completion.choices[0]?.message?.content?.trim();
    
    if (!response) {
      return NextResponse.json({ 
        error: "AI service returned an empty response. Please try again." 
      }, { status: 500 });
    }

    // Parse the JSON response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(response);
    } catch (parseError) {
      // If response is not valid JSON, try to extract JSON from markdown code blocks
      const jsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[1]);
      } else {
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

    return NextResponse.json({ 
      reminders: formattedReminders,
      count: formattedReminders.length 
    });
  } catch (error: any) {
    console.error("Schedule generation API error:", error);
    
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
      error: error.message || "Unable to generate schedule. Please try again." 
    }, { status: 500 });
  }
}

