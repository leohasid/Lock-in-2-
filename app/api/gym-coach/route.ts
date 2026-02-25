import { NextResponse } from "next/server";
import OpenAI from "openai";

const WEEKDAY_NAMES: Record<number, string> = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY. Add it to .env.local: OPENAI_API_KEY=sk-..." },
      { status: 500 }
    );
  }

  try {
    const { messages, context } = await request.json();
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "messages array required" }, { status: 400 });
    }

    const selectedOptions = (context?.selectedOptions as string[]) || [];
    const manualSchedule = (context?.manualScheduleByPlan as Record<string, { days: number[] }>) || {};
    const planNames = (context?.planNames as string[]) || [];

    const scheduleDesc = Object.entries(manualSchedule)
      .filter(([id]) => selectedOptions.includes(id))
      .map(([id, v]) => {
        const days = (v?.days ?? []).map((d) => WEEKDAY_NAMES[d as keyof typeof WEEKDAY_NAMES] ?? d);
        return `${id}: ${days.length ? days.join(", ") : "Rest (no days)"}`;
      })
      .join("; ") || "No schedule set";

    const systemPrompt = `You are the Mogifi AI Fitness Coach. You help users with their workouts and can **directly update their workout schedule** in the app.

**Current setup:**
- Selected plans: ${planNames.join(", ") || "None"}
- Current schedule (option → days): ${scheduleDesc}
- Day indices: Sunday=0, Monday=1, Tuesday=2, Wednesday=3, Thursday=4, Friday=5, Saturday=6

**You CAN update the schedule.** When the user asks to change which days they train (e.g. "put Option 1 on Monday and Wednesday", "make Tuesday a rest day", "schedule my workouts for Mon Wed Fri"), you MUST return a scheduleUpdate in your response.

**Response format - you MUST respond with valid JSON only:**
{
  "reply": "Your friendly message to the user confirming what you did.",
  "scheduleUpdate": {
    "option1": { "days": [1, 3] },
    "option2": { "days": [2, 5] }
  }
}

Rules for scheduleUpdate:
- Include ONLY options that are in selectedOptions: ${JSON.stringify(selectedOptions)}
- Each option maps to { "days": [array of 0-6] } for the weekdays that option runs
- Days not assigned to any option = Rest
- If user wants Rest for a day, do NOT include that day in any option
- If no schedule change is needed, use "scheduleUpdate": null
- Return ONLY the JSON object, no markdown, no \`\`\`json\`\`\` wrapper`;

    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m: { role: string; content: string }) => ({
          role: m.role as "user" | "assistant" | "system",
          content: m.content,
        })),
      ],
      response_format: { type: "json_object" } as const,
      max_tokens: 500,
    });

    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) {
      return NextResponse.json({ error: "Empty AI response" }, { status: 500 });
    }

    let parsed: { reply?: string; scheduleUpdate?: Record<string, { days: number[] }> | null };
    try {
      parsed = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : { reply: content };
    }

    const reply = parsed.reply || content;
    const scheduleUpdate = parsed.scheduleUpdate ?? null;

    return NextResponse.json({ reply, scheduleUpdate });
  } catch (error: any) {
    console.error("[gym-coach]", error);
    return NextResponse.json(
      { error: error?.message || "AI request failed" },
      { status: 500 }
    );
  }
}
