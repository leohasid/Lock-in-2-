import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(request: Request) {
  // Ensure this is server-side only
  if (typeof window !== "undefined") {
    return NextResponse.json({ error: "This API route is server-side only" }, { status: 403 });
  }

  // Check for API key
  const apiKey = process.env.OPENAI_API_KEY;
  console.log("[Generate Schedule API] OPENAI_API_KEY check:", apiKey ? "EXISTS" : "MISSING");
  
  if (!apiKey) {
    const errorMsg = "Missing OPENAI_API_KEY. Please ensure it's set in Vercel environment variables.";
    console.error("[Generate Schedule API]", errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
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

    // Initialize OpenAI client
    const client = new OpenAI({ apiKey: apiKey });

    console.log("[Generate Schedule API] Calling OpenAI API with responses.create...");
    console.log("[Generate Schedule API] Prompt length:", prompt.length, "characters");
    
    // Call OpenAI API using responses.create
    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
      max_output_tokens: 4000,
    });

    console.log("[Generate Schedule API] OpenAI API call successful");

    // Extract response text
    const responseText = response.output_text?.trim();
    
    if (!responseText) {
      console.error("[Generate Schedule API] OpenAI returned empty response. Response structure:", JSON.stringify(response, null, 2));
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
    // Comprehensive error logging
    console.error("[Generate Schedule API] Error occurred:");
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
      console.error("[Generate Schedule API] OpenAI API Error detected:", {
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
      console.error("[Generate Schedule API] Possible API method issue - responses.create may not be available");
      console.error("[Generate Schedule API] Full error details:", JSON.stringify(error, null, 2));
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
    const errorMessage = error?.message || "Unable to generate schedule. Please try again.";
    console.error("[Generate Schedule API] Returning error:", errorMessage);
    return NextResponse.json({ 
      error: errorMessage 
    }, { status: 500 });
  }
}

