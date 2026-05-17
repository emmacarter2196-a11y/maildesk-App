import { NextResponse } from "next/server";
import { callAI, type AIProvider } from "@/lib/aiProviders";

export async function POST(req: Request) {
  try {
    const { title, provider, model } = await req.json();
    if (!title) return NextResponse.json({ error: "Missing title" }, { status: 400 });

    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const dayOfWeek = now.toLocaleDateString("en-US", { weekday: "long" });

    const prompt = `Today is ${dayOfWeek}, ${today}. Suggest a smart time slot for this task: "${title}".

Consider:
- Deep work (writing, coding, planning): morning, 60-90 min
- Meetings/calls: 10-11am or 2-3pm, 30-45 min
- Quick tasks/errands: late afternoon, 15-30 min
- Workouts/exercise: 7am or 6pm, 60 min
- Lunch/coffee: 12-1pm or 3pm, 30-60 min

Return JSON only (no markdown, no fences):
{
  "date": "YYYY-MM-DD (today or near-future)",
  "time": "HH:MM in 24-hour format",
  "durationMinutes": integer,
  "reasoning": "1 short sentence explaining the choice"
}`;

    const text = await callAI(
      (provider as AIProvider) || "gemini",
      model || "gemini-flash-latest",
      prompt
    );

    const cleaned = text.replace(/```json|```/g, "").trim();
    return NextResponse.json(JSON.parse(cleaned));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}