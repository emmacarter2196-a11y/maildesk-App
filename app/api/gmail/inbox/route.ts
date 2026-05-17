import { google } from "googleapis";
import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const token = await getAccessToken();
    if (!token) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    // Read ?count= from the URL, default to 20, clamp between 1 and 50
    const { searchParams } = new URL(req.url);
    const count = Math.min(Math.max(parseInt(searchParams.get("count") || "20"), 1), 50);

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: token });
    const gmail = google.gmail({ version: "v1", auth });

    const list = await gmail.users.messages.list({
      userId: "me",
      maxResults: count,
      q: "in:inbox",
    });

    const messageIds = list.data.messages || [];

    const emails = await Promise.all(
      messageIds.map(async (m) => {
        const msg = await gmail.users.messages.get({
          userId: "me",
          id: m.id!,
          format: "metadata",
          metadataHeaders: ["Subject", "From", "Date"],
        });
        const headers = msg.data.payload?.headers || [];
        const get = (name: string) =>
          headers.find((h) => h.name === name)?.value || "";

        return {
          id: msg.data.id,
          subject: get("Subject") || "(no subject)",
          from: get("From"),
          date: get("Date"),
          snippet: msg.data.snippet || "",
          unread: (msg.data.labelIds || []).includes("UNREAD"),
        };
      })
    );

    return NextResponse.json({ emails });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}