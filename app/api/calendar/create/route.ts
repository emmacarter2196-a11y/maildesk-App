import { google } from "googleapis";
import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const token = await getAccessToken();
    if (!token) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

    const { title, start, end, notes } = await req.json();
    if (!title) return NextResponse.json({ error: "Missing title" }, { status: 400 });

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: token });
    const calendar = google.calendar({ version: "v3", auth });

    // If no start time, default to right now
    const startDate = start ? new Date(start) : new Date();
    // If no end time, default to 1 hour after start
    const endDate = end ? new Date(end) : new Date(startDate.getTime() + 60 * 60 * 1000);

    const result = await calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: title,
        description: notes || "",
        start: { dateTime: startDate.toISOString() },
        end: { dateTime: endDate.toISOString() },
      },
    });

    return NextResponse.json({
      success: true,
      event: {
        id: result.data.id,
        htmlLink: result.data.htmlLink,
        summary: result.data.summary,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}