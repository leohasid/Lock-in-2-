import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
  }

  try {
    const { messages, context } = await request.json();

    const systemPrompt = `You are a supportive fitness AI coach. Always personalize advice using the context below and respond in clear, encouraging language.

Goal: ${context?.goal || "unspecified"}
Equipment: ${context?.equipment || "not provided"}
Frequency: ${context?.frequency || "not provided"}`;

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

    const reply = completion.choices[0]?.message?.content?.trim()
      || "I'm here and ready to help whenever you are.";

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Consultation API error", error);
    return NextResponse.json({ error: "Unable to generate a response." }, { status: 500 });
  }
}
