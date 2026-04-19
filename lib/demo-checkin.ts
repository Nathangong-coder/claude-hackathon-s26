import type { CarePlan, CheckInResponse, Symptoms } from "@/lib/types/care-plan";

/** Rule-based fallback when LLM is unavailable (demo / offline). */
export function demoCheckIn(
  symptoms: Symptoms,
  plan: CarePlan
): CheckInResponse {
  const flags = plan.red_flags.map((f) => f.text.toLowerCase()).join(" ");
  const matched: string[] = [];

  let score = 0;
  if (symptoms.fever === "high") {
    score += 3;
    if (flags.includes("fever") || flags.includes("101")) matched.push("Fever threshold from discharge");
  }
  if (symptoms.shortness_of_breath === "moderate" || symptoms.shortness_of_breath === "severe") {
    score += 3;
    matched.push("Breathing symptoms");
  }
  if (symptoms.pain >= 8) {
    score += 2;
    matched.push("Severe pain");
  }
  if (symptoms.swelling === "severe") {
    score += 2;
    if (flags.includes("swelling")) matched.push("Worsening swelling");
  }
  if (symptoms.worse_overall) {
    score += 2;
    matched.push("Overall worse than before");
  }

  let tier: CheckInResponse["tier"] = "home";
  if (score >= 4) tier = "urgent";
  else if (score >= 2) tier = "provider";

  const warning =
    tier === "urgent"
      ? "Seek urgent care now or use emergency services if severe."
      : tier === "provider"
        ? "Contact your care team today for guidance."
        : "Continue home care and keep monitoring as instructed.";

  const rationale =
    tier === "home"
      ? "Your symptoms are relatively stable compared with the warning signs in your discharge instructions. Keep following your plan and reach out if anything changes."
      : "Based on what you reported and the precautions from your discharge paperwork, it is reasonable to get clinician input or urgent evaluation.";

  const excerpt =
    plan.red_flags[0]?.source_quote ??
    plan.red_flags[0]?.text ??
    plan.plain_language_summary.slice(0, 120);

  return {
    tier,
    rationale,
    matched_flags: matched.length ? matched : ["General monitoring"],
    warning,
    reason_for_concern:
      tier === "home"
        ? "No strong match to urgent warning signs right now."
        : "Your symptoms overlap with situations your discharge instructions said to escalate.",
    triggering_excerpt: excerpt,
    shareable_text: `Post-discharge check-in (demo logic): ${warning} Summary: ${plan.diagnosis_or_reason}. Reported pain ${symptoms.pain}/10, fever ${symptoms.fever}, breathing ${symptoms.shortness_of_breath}. This message is not medical advice.`,
  };
}
