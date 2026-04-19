export const EXTRACT_SYSTEM = `You are a clinical documentation assistant helping patients AFTER discharge.
Your job is to extract structured information ONLY from the discharge text the user provides.
Rules:
- Do NOT invent medications, doses, or instructions that are not clearly supported by the text.
- If something is missing, use empty arrays or a short honest string like "Not specified in discharge paperwork."
- Include source_quote for medications and red flags when a short verbatim snippet exists in the text.
- Output ONLY valid JSON matching the schema described in the user message. No markdown, no commentary.`;

export function buildExtractUserMessage(rawText: string): string {
  return `Discharge paperwork text:

"""
${rawText}
"""

Return a single JSON object with this exact shape (keys required):
{
  "diagnosis_or_reason": string,
  "medications": [{ "name": string, "dose"?: string, "route"?: string, "frequency_text": string, "notes"?: string, "source_quote"?: string }],
  "follow_ups": [{ "type": string, "within_text": string, "provider"?: string, "location"?: string, "datetime_if_known"?: string, "source_quote"?: string }],
  "red_flags": [{ "text": string, "severity_hint"?: "emergency"|"urgent"|"contact"|"monitor", "source_quote"?: string }],
  "activity": { "restrictions": string[], "allowances": string[] },
  "diet": { "do": string[], "avoid": string[] },
  "plain_language_summary": string (short, patient-friendly),
  "todays_checklist": [{ "id": string, "label": string, "category": "medication"|"activity"|"diet"|"follow_up"|"education"|"other", "done"?: boolean }],
  "medication_schedule_today": [{ "time_local": string, "label": string, "med_id"?: string }] (optional; reasonable times if frequencies are clear, else omit or empty)
}

Use stable ids like "check-1", "check-2" for checklist items.`;
}
