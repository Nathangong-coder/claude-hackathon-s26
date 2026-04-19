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
  if (!getAnthropic()) {
    return NextResponse.json({ error: "API not configured" }, { status: 503 });
  }

  const { carePlan } = await req.json();
  if (!carePlan) {
    return NextResponse.json({ error: "carePlan is required" }, { status: 400 });
  }

  try {
    const text = await completeJsonText({
      system: SYSTEM,
      user: buildUserMessage(carePlan),
      maxTokens: 1024,
    });
    const parsed = parseJsonFromModelText(text);
    return NextResponse.json(parsed);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
