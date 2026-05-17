import { google } from "googleapis";
import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const token = await getAccessToken();
    if (!token) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const { to, subject, body } = await req.json();
    if (!to || !subject || !body) {
      return NextResponse.json(
        { error: "Missing to, subject, or body" },
        { status: 400 }
      );
    }

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: token });
    const gmail = google.gmail({ version: "v1", auth });

    // Build a proper email message in RFC 2822 format
    const messageLines = [
      `To: ${to}`,
      `Subject: ${subject}`,
      "Content-Type: text/plain; charset=utf-8",
      "MIME-Version: 1.0",
      "",
      body,
    ];
    const rawMessage = messageLines.join("\r\n");

    // Gmail API requires base64url-encoded raw message
    const encoded = Buffer.from(rawMessage)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const result = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw: encoded },
    });

    return NextResponse.json({ id: result.data.id, success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}