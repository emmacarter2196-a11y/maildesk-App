import { NextResponse } from "next/server";
import { callAI, type AIProvider } from "@/lib/aiProviders";

export async function POST(req: Request) {
  try {
    const { emails, provider, model } = await req.json();
    if (!emails) return NextResponse.json({ error: "Missing emails" }, { status: 400 });

    const prompt = `Here are some emails I copied from my inbox:\n\n${emails}\n\nSummarize each email in 1-2 sentences. Group urgent ones first. Be concise and practical.`;

    const summary = await callAI(
      (provider as AIProvider) || "gemini",
      model || "gemini-flash-latest",
      prompt
    );

    return NextResponse.json({ summary });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}