import { google } from "googleapis";
import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const token = await getAccessToken();
    if (!token) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

    const { id, title, start, end, notes } = await req.json();
    if (!id || !title) return NextResponse.json({ error: "Missing id or title" }, { status: 400 });

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: token });
    const calendar = google.calendar({ version: "v3", auth });

    const result = await calendar.events.update({
      calendarId: "primary",
      eventId: id,
      requestBody: {
        summary: title,
        description: notes || "",
        start: { dateTime: new Date(start).toISOString() },
        end: { dateTime: new Date(end).toISOString() },
      },
    });

    return NextResponse.json({ success: true, event: result.data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}