import { GoogleGenerativeAI } from "@google/generative-ai";

export type AIProvider = "gemini" | "openai" | "anthropic" | "groq";

export async function callAI(provider: AIProvider, model: string, prompt: string): Promise<string> {
  switch (provider) {
    case "gemini":
      return callGemini(model, prompt);
    case "openai":
      return callOpenAI(model, prompt);
    case "anthropic":
      return callAnthropic(model, prompt);
    case "groq":
      return callGroq(model, prompt);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

async function callGemini(model: string, prompt: string): Promise<string> {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not set in .env.local");
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const result = await genAI.getGenerativeModel({ model }).generateContent(prompt);
  return result.response.text();
}

async function callOpenAI(model: string, prompt: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set in .env.local");
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `OpenAI error ${res.status}`);
  return data.choices[0].message.content;
}

async function callAnthropic(model: string, prompt: string): Promise<string> {
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
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `Anthropic error ${res.status}`);
  return data.content[0].text;
}

async function callGroq(model: string, prompt: string): Promise<string> {
  if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY not set in .env.local");
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `Groq error ${res.status}`);
  return data.choices[0].message.content;
}