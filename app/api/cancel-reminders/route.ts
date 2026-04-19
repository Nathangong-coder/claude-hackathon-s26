import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { z } from "zod";

const bodySchema = z.object({
  sids: z.array(z.string()),
});

export async function POST(req: NextRequest) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    return NextResponse.json({ error: "Twilio not configured" }, { status: 503 });
  }

  const body = bodySchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const client = twilio(accountSid, authToken);
  const results = await Promise.allSettled(
    body.data.sids.map((sid) => client.messages(sid).update({ status: "canceled" }))
  );

  const cancelled = results.filter((r) => r.status === "fulfilled").length;
  return NextResponse.json({ cancelled });
}
