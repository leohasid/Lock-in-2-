import { NextResponse } from "next/server";
import { generateAIText } from "@/lib/ai-provider";

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt missing" }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "Missing API key. Set OPENAI_API_KEY or ANTHROPIC_API_KEY." }, { status: 500 });
    }

    const response = await generateAIText("general", {
      prompt,
      systemPrompt: "You are a helpful nutrition and fitness coach.",
      maxTokens: 1000,
    });

    return NextResponse.json({ response });

  } catch (error) {
    console.error("AI API ERROR:", error);
    return NextResponse.json({ error: "AI request failed" }, { status: 500 });
  }
}
