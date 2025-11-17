import { NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
  }

  try {
    const { imageData, label } = await request.json();
    if (!imageData) {
      return NextResponse.json({ error: "imageData is required" }, { status: 400 });
    }

    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");

    const prompt = `You are a nutrition coach. Analyze the photo and estimate calories, protein, carbs, and fats for the primary food. Use the provided label if helpful: "${label || "unknown"}". Respond with strict JSON matching this schema: {"name":string,"calories":number,"protein":number,"carbs":number,"fats":number}.`;

    const response = await client.responses.create({
      model: "gpt-4o-mini",
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            { type: "input_image", image_base64: base64Data },
          ],
        },
      ],
    });

    const outputText = response.output
      ?.map((part) => {
        if ("content" in part && Array.isArray(part.content)) {
          return part.content.map((item) => (item.type === "output_text" ? item.text : "")).join(" ");
        }
        return "";
      })
      .join(" ")
      .trim();

    if (!outputText) {
      throw new Error("Model response empty");
    }

    const jsonStart = outputText.indexOf("{");
    const jsonEnd = outputText.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error("Model response missing JSON");
    }
    const jsonString = outputText.slice(jsonStart, jsonEnd + 1);
    const estimate = JSON.parse(jsonString);

    return NextResponse.json({ estimate });
  } catch (error) {
    console.error("Food estimate error", error);
    return NextResponse.json({ error: "Unable to analyze food" }, { status: 500 });
  }
}
