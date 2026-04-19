export const CHECKIN_SYSTEM = `You are a conservative triage assistant for patients reviewing AFTER-visit discharge instructions.
You compare the patient's reported symptoms to the red flags and discharge context provided.
Rules:
- You are NOT diagnosing. You give guidance to seek appropriate care based on the discharge text.
- If uncertain between provider vs urgent, choose the safer (more urgent) option.
- Always mention emergency services (911 in the US) for life-threatening symptoms if relevant.
- Output ONLY valid JSON as specified. No markdown.`;

export function buildCheckinUserMessage(payload: {
  symptoms: Record<string, unknown>;
  red_flags: unknown[];
  care_plan_summary?: string;
}): string {
  return `Patient symptom check-in (structured):

${JSON.stringify(payload.symptoms, null, 2)}

Discharge red flags (from their paperwork):
${JSON.stringify(payload.red_flags, null, 2)}

Optional summary of their care plan:
${payload.care_plan_summary ?? "(none)"}

Return JSON with this exact shape:
{
  "tier": "home" | "provider" | "urgent",
  "rationale": string (2-4 sentences, plain language),
  "matched_flags": string[] (which red flag texts or themes matched),
  "warning": string (headline for the patient),
  "reason_for_concern": string (why this matters),
  "triggering_excerpt": string (short quote or paraphrase tied to discharge instructions),
  "shareable_text": string (3-6 sentences the patient could show a caregiver or nurse)
}`;
}
