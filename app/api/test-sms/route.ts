import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { z } from "zod";

const bodySchema = z.object({
  phone: z.string().min(7),
  label: z.string().optional(),
});

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

  const { phone, label = "your medication" } = body.data;
  const client = twilio(accountSid, authToken);
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

  try {
    const msg = await client.messages.create({
      to: phone,
      ...(messagingServiceSid ? { messagingServiceSid } : { from: fromNumber }),
      body: `💊 Reminder: Time to take ${label}.`,
    });
    console.log("[twilio] test SID:", msg.sid, "status:", msg.status, "error:", msg.errorCode, msg.errorMessage);
    return NextResponse.json({ sid: msg.sid, status: msg.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Twilio error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
