import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
  }

  try {
    const { meals, totals, goals } = await request.json();

    if (!meals || !Array.isArray(meals) || meals.length === 0) {
      return NextResponse.json({ error: "No meals provided" }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Format meals for analysis
    const mealsList = meals.map((meal: any) => 
      `${meal.name}: ${meal.calories} cal, ${meal.protein}g protein, ${meal.carbs}g carbs, ${meal.fats}g fats`
    ).join("\n");

    const systemPrompt = `You are a nutrition expert and health coach. Analyze the user's daily meals and provide a comprehensive analysis focusing on:
1. **Benefits**: What's good about their food choices (nutrients, vitamins, health benefits)
2. **Negatives/Concerns**: Areas for improvement (excess sugar, sodium, lack of nutrients, unhealthy choices)
3. **Recommendations**: Specific suggestions for improving their nutrition

Be constructive, educational, and encouraging. Highlight both positive aspects and areas for improvement. Keep the response concise but informative (3-4 paragraphs).`;

    const userPrompt = `Analyze my meals for today:

Meals consumed:
${mealsList}

Daily totals:
- Calories: ${totals.calories} / ${goals.calories} target
- Protein: ${totals.protein}g / ${goals.protein}g target
- Carbs: ${totals.carbs}g / ${goals.carbs}g target
- Fats: ${totals.fats}g / ${goals.fats}g target

Provide an analysis of the benefits and negatives of what I've eaten today, along with recommendations.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      max_tokens: 800,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const analysis = completion.choices[0]?.message?.content?.trim();
    
    if (!analysis) {
      return NextResponse.json({ 
        error: "AI service returned an empty response. Please try again." 
      }, { status: 500 });
    }

    return NextResponse.json({ analysis });
  } catch (error: any) {
    console.error("Meal analysis API error:", error);
    return NextResponse.json({ 
      error: error.message || "Failed to analyze meals. Please try again." 
    }, { status: 500 });
  }
}
