import { GoogleGenerativeAI } from "@google/generative-ai";

export type AIProvider = "gemini" | "openai" | "anthropic" | "groq";

// Friendly model identity for self-awareness questions
function modelIdentity(provider: AIProvider, model: string): string {
  const map: Record<AIProvider, string> = {
    gemini: `Google Gemini (model: ${model})`,
    openai: `OpenAI ${model}`,
    anthropic: `Anthropic Claude (model: ${model})`,
    groq: `Groq-hosted ${model}`,
  };
  return map[provider];
}

function systemPrompt(provider: AIProvider, model: string): string {
  return `You are the AI assistant inside MailDesk, an email and calendar app. You are powered by ${modelIdentity(provider, model)}. If asked what model you are, identify yourself accordingly. Help write, summarize, and organize emails and calendar events.`;
}

export async function callAI(provider: AIProvider, model: string, prompt: string): Promise<string> {
  const sys = systemPrompt(provider, model);
  switch (provider) {
    case "gemini": return callGemini(model, sys, prompt);
    case "openai": return callOpenAI(model, sys, prompt);
    case "anthropic": return callAnthropic(model, sys, prompt);
    case "groq": return callGroq(model, sys, prompt);
    default: throw new Error(`Unknown provider: ${provider}`);
  }
}

async function callGemini(model: string, sys: string, prompt: string): Promise<string> {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not set in .env.local");
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const result = await genAI.getGenerativeModel({
    model,
    systemInstruction: sys,
  }).generateContent(prompt);
  return result.response.text();
}

async function callOpenAI(model: string, sys: string, prompt: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set in .env.local");
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: prompt },
      ],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `OpenAI error ${res.status}`);
  return data.choices[0].message.content;
}

async function callAnthropic(model: string, sys: string, prompt: string): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not set in .env.local");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system: sys,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `Anthropic error ${res.status}`);
  return data.content[0].text;
}

async function callGroq(model: string, sys: string, prompt: string): Promise<string> {
  if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY not set in .env.local");
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: prompt },
      ],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `Groq error ${res.status}`);
  return data.choices[0].message.content;
}