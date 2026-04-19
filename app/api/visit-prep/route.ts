import { NextRequest, NextResponse } from "next/server";
import { completeJsonText, getAnthropic, parseJsonFromModelText } from "@/lib/llm";

const SYSTEM = `You are a care coordinator helping a patient prepare for their post-discharge follow-up appointment.
Given their care plan, identify the most urgent upcoming appointment and produce a practical visit preparation guide.
Output ONLY valid JSON. No markdown, no commentary.`;

function buildUserMessage(carePlan: unknown): string {
  return `Care plan:
${JSON.stringify(carePlan, null, 2)}

Return JSON with this exact shape:
{
  "when": string (e.g. "Within 2–3 days" — taken directly from follow-up instructions),
  "with_whom": string (e.g. "Primary care doctor" or "Cardiologist"),
  "location": string | null,
  "bring": string[] (practical items the patient should bring: photo ID, insurance card, medication bottles, discharge paperwork, etc.),
  "mention": string[] (specific things to tell the doctor based on THIS care plan — medications started, symptoms to watch, questions about their condition)
}

Be concrete and specific to this patient's situation. The "mention" list should reference their actual diagnosis, medications, and red flags — not generic advice.`;
}

export async function POST(req: NextRequest) {
  console.log("[visit-prep] request received");
  if (!getAnthropic()) {
    console.log("[visit-prep] no API key");
    return NextResponse.json({ error: "API not configured" }, { status: 503 });
  }

  let carePlan: unknown;
  try {
    const body = await req.json();
    carePlan = body.carePlan;
  } catch {
    console.log("[visit-prep] failed to parse body");
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!carePlan) {
    console.log("[visit-prep] no carePlan in body");
    return NextResponse.json({ error: "carePlan is required" }, { status: 400 });
  }

  try {
    console.log("[visit-prep] calling LLM");
    const text = await completeJsonText({
      system: SYSTEM,
      user: buildUserMessage(carePlan),
      maxTokens: 1024,
    });
    console.log("[visit-prep] LLM response:", text.slice(0, 200));
    const parsed = parseJsonFromModelText(text);
    return NextResponse.json(parsed);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed";
    console.error("[visit-prep] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
