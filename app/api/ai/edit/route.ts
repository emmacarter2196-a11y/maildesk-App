import { NextResponse } from "next/server";
import { callAI, type AIProvider } from "@/lib/aiProviders";

export async function POST(req: Request) {
  try {
    const { subject, body, instruction, provider, model, tone } = await req.json();
    if (!body) return NextResponse.json({ error: "Missing body" }, { status: 400 });
    if (!instruction) return NextResponse.json({ error: "Missing instruction" }, { status: 400 });

    const toneInstruction = {
      professional: "professional and polished",
      casual: "casual and conversational",
      friendly: "warm and friendly",
      direct: "direct and concise",
    }[tone as string] || "professional and polished";

    const fullPrompt = `You are editing an existing email draft. Apply the user's edit instruction while keeping the overall message intact. Maintain a ${toneInstruction} tone.

Current subject: ${subject || "(none)"}
Current body:
${body}

Edit instruction: ${instruction}

Return JSON only (no markdown, no code fences) with both the updated subject and body:
{"subject": "...", "body": "..."}

If the edit instruction doesn't change the subject, return the original subject. Always rewrite the full body with the edit applied.`;

    const text = await callAI(
      (provider as AIProvider) || "gemini",
      model || "gemini-flash-latest",
      fullPrompt
    );

    const cleaned = text.replace(/```json|```/g, "").trim();
    try {
      return NextResponse.json(JSON.parse(cleaned));
    } catch {
      // If AI didn't return clean JSON, return text as the new body, keep old subject
      return NextResponse.json({ subject, body: cleaned });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
