import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt missing" },
        { status: 400 }
      );
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a helpful nutrition coach." },
        { role: "user", content: prompt },
      ],
    });

    return NextResponse.json({
      response: completion.choices[0].message.content,
    });

  } catch (error) {
    console.error("AI API ERROR:", error);
    return NextResponse.json(
      { error: "AI request failed" },
      { status: 500 }
    );
  }
}
