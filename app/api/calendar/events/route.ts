import { google } from "googleapis";
import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const token = await getAccessToken();
    if (!token) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const timeMin = searchParams.get("timeMin") || new Date().toISOString();
    const timeMax = searchParams.get("timeMax");

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: token });
    const calendar = google.calendar({ version: "v3", auth });

    const result = await calendar.events.list({
      calendarId: "primary",
      timeMin,
      timeMax: timeMax || undefined,
      maxResults: 250,
      singleEvents: true,
      orderBy: "startTime",
    });

    const events = (result.data.items || []).map(e => ({
      id: e.id,
      summary: e.summary || "(no title)",
      start: e.start?.dateTime || e.start?.date,
      end: e.end?.dateTime || e.end?.date,
      isAllDay: !!e.start?.date,
    }));

    return NextResponse.json({ events });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}