import { NextResponse } from "next/server";
import { callAI, type AIProvider } from "@/lib/aiProviders";

export async function POST(req: Request) {
  try {
    const { text, provider, model } = await req.json();
    if (!text) return NextResponse.json({ error: "Missing text" }, { status: 400 });

    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const dayOfWeek = now.toLocaleDateString("en-US", { weekday: "long" });

    const prompt = `Parse this calendar event description into structured JSON. Today is ${dayOfWeek}, ${today}.

Description: "${text}"

Return JSON only with this exact shape (no markdown, no code fences):
{
  "title": "short event title",
  "date": "YYYY-MM-DD",
  "time": "HH:MM in 24-hour format, or empty string if not specified",
  "durationMinutes": integer (default 60 if unclear),
  "notes": "any extra context, or empty string"
}

Rules:
- If a day name is given (Monday, Tuesday, etc.), use the NEXT occurrence of that day.
- "today" = ${today}. "tomorrow" = next day.
- If no date specified, use today.
- If no time specified, leave time as empty string.
- Be smart about durations: "meeting" = 30min, "lunch" = 60min, "coffee" = 30min, "call" = 30min, "workout" = 60min.`;

    const text_response = await callAI(
      (provider as AIProvider) || "gemini",
      model || "gemini-flash-latest",
      prompt
    );

    const cleaned = text_response.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return NextResponse.json(parsed);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}