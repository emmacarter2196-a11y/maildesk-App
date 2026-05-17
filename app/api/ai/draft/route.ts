import { NextResponse } from "next/server";
import { callAI, type AIProvider } from "@/lib/aiProviders";

export async function POST(req: Request) {
  try {
    const { prompt, provider, model, tone, signature } = await req.json();
    if (!prompt) return NextResponse.json({ error: "Missing prompt" }, { status: 400 });

    const toneInstruction = {
      professional: "professional and polished",
      casual: "casual and conversational",
      friendly: "warm and friendly",
      direct: "direct and concise",
    }[tone as string] || "professional and polished";

    const signaturePart = signature
      ? `\n\nEnd the email with this signature exactly (with the line break before it):\n\n${signature}`
      : "";

    const fullPrompt = `Write a ${toneInstruction} email based on this brief: "${prompt}".${signaturePart}\n\nReturn JSON only: {"subject":"...","body":"..."}`;

    const text = await callAI(
      (provider as AIProvider) || "gemini",
      model || "gemini-flash-latest",
      fullPrompt
    );

    const cleaned = text.replace(/```json|```/g, "").trim();
    try {
      return NextResponse.json(JSON.parse(cleaned));
    } catch {
      return NextResponse.json({ subject: "Draft", body: cleaned });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}