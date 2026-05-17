import { google } from "googleapis";
import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const token = await getAccessToken();
    if (!token) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: token });
    const calendar = google.calendar({ version: "v3", auth });

    await calendar.events.delete({ calendarId: "primary", eventId: id });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}