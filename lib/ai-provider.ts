/**
 * AI Provider - Routes tasks to Claude (Anthropic) or OpenAI based on best fit.
 * Set ANTHROPIC_API_KEY and OPENAI_API_KEY in your environment (Vercel/Railway).
 *
 * Task routing:
 * - Claude: consultation, reflections, meal-analysis, gym-coach (conversational, analytical)
 * - OpenAI: food-estimate (vision), generate-schedule, generate-plan (structured JSON), ai/general
 */

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

export type AITaskType =
  | "consultation"
  | "reflections"
  | "meal-analysis"
  | "gym-coach"
  | "food-estimate"
  | "generate-schedule"
  | "generate-plan"
  | "general";

export interface AITextOptions {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AIVisionOptions {
  prompt: string;
  imageData: string; // base64 data URL or raw base64
  maxTokens?: number;
}

function getPreferredProvider(task: AITaskType): "claude" | "openai" {
  switch (task) {
    case "consultation":
    case "reflections":
    case "meal-analysis":
    case "gym-coach":
      return "claude";
    case "food-estimate":
    case "generate-schedule":
    case "generate-plan":
    case "general":
      return "openai";
    default:
      return "openai";
  }
}

function getClaudeModel(task: AITaskType): string {
  switch (task) {
    case "consultation":
    case "gym-coach":
      return "claude-3-5-haiku-20241022";
    case "reflections":
    case "meal-analysis":
      return "claude-3-5-sonnet-20241022";
    default:
      return "claude-3-5-haiku-20241022";
  }
}

function getOpenAIModel(task: AITaskType): string {
  switch (task) {
    case "food-estimate":
      return "gpt-4o-mini";
    case "generate-schedule":
    case "generate-plan":
      return "gpt-4o-mini";
    default:
      return "gpt-4o-mini";
  }
}

/**
 * Generate text response - routes to Claude or OpenAI based on task type.
 */
export async function generateAIText(
  task: AITaskType,
  options: AITextOptions
): Promise<string> {
  const preferred = getPreferredProvider(task);
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  // Try preferred provider first, fallback to the other
  if (preferred === "claude" && anthropicKey) {
    try {
      return await callClaude(task, options);
    } catch (err) {
      console.warn(`[AI Provider] Claude failed for ${task}, falling back to OpenAI:`, err);
    }
  }

  if (openaiKey) {
    try {
      return await callOpenAI(task, options);
    } catch (err) {
      if (preferred === "claude" && anthropicKey) {
        console.warn(`[AI Provider] OpenAI failed, retrying with Claude:`, err);
        return await callClaude(task, options);
      }
      throw err;
    }
  }

  if (anthropicKey) {
    return await callClaude(task, options);
  }

  throw new Error(
    "No AI provider configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY in environment variables."
  );
}

async function callClaude(task: AITaskType, options: AITextOptions): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const model = getClaudeModel(task);
  const maxTokens = options.maxTokens ?? 1024;

  const systemContent = options.systemPrompt ?? "You are a helpful assistant.";
  const userContent = options.prompt;

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: systemContent,
    messages: [{ role: "user", content: userContent }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  return (textBlock as { type: "text"; text: string })?.text?.trim() ?? "";
}

async function callOpenAI(task: AITaskType, options: AITextOptions): Promise<string> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  const model = getOpenAIModel(task);
  const maxTokens = options.maxTokens ?? 1024;

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
  if (options.systemPrompt) {
    messages.push({ role: "system", content: options.systemPrompt });
  }
  messages.push({ role: "user", content: options.prompt });

  const response = await client.chat.completions.create({
    model,
    messages,
    max_tokens: maxTokens,
    temperature: options.temperature ?? 0.7,
  });

  return response.choices[0]?.message?.content?.trim() ?? "";
}

/**
 * Vision task (image analysis) - uses OpenAI (best vision support).
 * Falls back to Claude 3 if OpenAI unavailable.
 */
export async function generateAIVision(options: AIVisionOptions): Promise<string> {
  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (openaiKey) {
    try {
      return await callOpenAIVision(options);
    } catch (err) {
      console.warn("[AI Provider] OpenAI vision failed, trying Claude:", err);
    }
  }

  if (anthropicKey) {
    return await callClaudeVision(options);
  }

  throw new Error(
    "No AI provider configured for vision. Set OPENAI_API_KEY or ANTHROPIC_API_KEY."
  );
}

async function callOpenAIVision(options: AIVisionOptions): Promise<string> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  const base64 = options.imageData.replace(/^data:image\/\w+;base64,/, "");

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: options.prompt },
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${base64}`,
              detail: "low", // 512x512, ~85 tokens - much faster for Vercel serverless
            },
          },
        ],
      },
    ],
    max_tokens: options.maxTokens ?? 200,
    temperature: 0.3,
  });

  return response.choices[0]?.message?.content?.trim() ?? "";
}

async function callClaudeVision(options: AIVisionOptions): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const base64 = options.imageData.replace(/^data:image\/\w+;base64,/, "");

  const response = await client.messages.create({
    model: "claude-3-5-haiku-20241022",
    max_tokens: options.maxTokens ?? 200,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: options.prompt },
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/jpeg",
              data: base64,
            },
          },
        ],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  return (textBlock as { type: "text"; text: string })?.text?.trim() ?? "";
}
