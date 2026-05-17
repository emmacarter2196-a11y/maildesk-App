import { google } from "googleapis";
import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/auth";
import { callAI, type AIProvider } from "@/lib/aiProviders";

function decodeBody(data: string) {
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
}

function extractText(payload: any): string {
  if (!payload) return "";
  if (payload.body?.data && payload.mimeType === "text/plain") {
    return decodeBody(payload.body.data);
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        return decodeBody(part.body.data);
      }
    }
    for (const part of payload.parts) {
      if (part.mimeType === "text/html" && part.body?.data) {
        return decodeBody(part.body.data).replace(/<[^>]+>/g, " ");
      }
    }
    for (const part of payload.parts) {
      const nested = extractText(part);
      if (nested) return nested;
    }
  }
  return "";
}

export async function POST(req: Request) {
  try {
    const token = await getAccessToken();
    if (!token) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

    const { messageId, provider, model } = await req.json();
    if (!messageId) return NextResponse.json({ error: "Missing messageId" }, { status: 400 });

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: token });
    const gmail = google.gmail({ version: "v1", auth });

    const msg = await gmail.users.messages.get({
      userId: "me",
      id: messageId,
      format: "full",
    });

    const subject = msg.data.payload?.headers?.find(h => h.name === "Subject")?.value || "";
    const from = msg.data.payload?.headers?.find(h => h.name === "From")?.value || "";
    let bodyText = extractText(msg.data.payload).trim();
    if (bodyText.length > 4000) bodyText = bodyText.slice(0, 4000) + "\n[…truncated…]";
    if (!bodyText) return NextResponse.json({ summary: "No readable text in this email." });

    const prompt = `Summarize this email in 2-3 sentences. Be specific about what action (if any) is needed.\n\nFrom: ${from}\nSubject: ${subject}\n\n${bodyText}`;
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