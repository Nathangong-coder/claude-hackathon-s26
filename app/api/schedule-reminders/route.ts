import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { z } from "zod";

const bodySchema = z.object({
  phone: z.string().min(7),
  schedule: z.array(
    z.object({
      time_local: z.string(),
      label: z.string(),
      med_id: z.string().optional(),
    })
  ),
});

function parseTimeToday(timeLocal: string): Date | null {
  const match = timeLocal.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3]?.toUpperCase();

  if (meridiem === "PM" && hours !== 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;

  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
}

export async function POST(req: NextRequest) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    return NextResponse.json({ error: "Twilio not configured" }, { status: 503 });
  }

  const body = bodySchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { phone, schedule } = body.data;
  const client = twilio(accountSid, authToken);
  const sids: string[] = [];
  const now = new Date();

  for (const item of schedule) {
    const sendAt = parseTimeToday(item.time_local);
    if (!sendAt) continue;

    // Twilio requires SendAt to be at least 15 minutes in the future
    const minutesUntil = (sendAt.getTime() - now.getTime()) / 60_000;
    if (minutesUntil < 15) continue;

    const msg = await client.messages.create({
      to: phone,
      from: fromNumber,
      body: `💊 Reminder: ${item.label}`,
      sendAt: sendAt,
      scheduleType: "fixed",
      messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
    });

    sids.push(msg.sid);
  }

  return NextResponse.json({ sids });
}
