import { NextResponse } from "next/server";
import {
  checkInRequestSchema,
  checkInResponseSchema,
} from "@/lib/types/care-plan";
import { completeJsonText, getAnthropic, parseJsonFromModelText } from "@/lib/llm";
import { CHECKIN_SYSTEM, buildCheckinUserMessage } from "@/lib/prompts/checkin";

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsedReq = checkInRequestSchema.safeParse(json);
  if (!parsedReq.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsedReq.error.flatten() },
      { status: 400 }
    );
  }

  if (!getAnthropic()) {
    return NextResponse.json(
      {
        error: "LLM unavailable",
        hint: "Set ANTHROPIC_API_KEY for live triage, or use demo responses client-side.",
      },
      { status: 503 }
    );
  }

  try {
    const text = await completeJsonText({
      system: CHECKIN_SYSTEM,
      user: buildCheckinUserMessage({
        symptoms: parsedReq.data.symptoms,
        red_flags: parsedReq.data.red_flags,
        care_plan_summary: parsedReq.data.care_plan_summary,
      }),
      maxTokens: 2048,
    });
    const parsed = parseJsonFromModelText<unknown>(text);
    const result = checkInResponseSchema.safeParse(parsed);
    if (!result.success) {
      return NextResponse.json(
        { error: "Model output failed validation", details: result.error.flatten() },
        { status: 422 }
      );
    }
    return NextResponse.json(result.data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Check-in failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
