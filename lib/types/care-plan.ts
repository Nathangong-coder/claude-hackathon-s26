import { z } from "zod";

export const medicationSchema = z.object({
  name: z.string(),
  dose: z.string().optional(),
  route: z.string().optional(),
  frequency_text: z.string().optional(),
  notes: z.string().optional(),
  source_quote: z.string().optional(),
});

export const followUpSchema = z.object({
  type: z.string(),
  within_text: z.string(),
  provider: z.string().optional(),
  location: z.string().optional(),
  datetime_if_known: z.string().optional(),
  source_quote: z.string().optional(),
});

export const redFlagSchema = z.object({
  text: z.string(),
  severity_hint: z.enum(["emergency", "urgent", "contact", "monitor"]).optional(),
  source_quote: z.string().optional(),
});

export const checklistItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  category: z.enum(["medication", "activity", "diet", "follow_up", "education", "other"]).catch("other"),
  done: z.boolean().optional(),
});

export const medScheduleItemSchema = z.object({
  time_local: z.string(),
  label: z.string(),
  med_id: z.string().optional(),
});

export const carePlanSchema = z.object({
  diagnosis_or_reason: z.string(),
  medications: z.array(medicationSchema),
  follow_ups: z.array(followUpSchema),
  red_flags: z.array(redFlagSchema),
  activity: z.object({
    restrictions: z.array(z.string()),
    allowances: z.array(z.string()),
  }),
  diet: z.object({
    do: z.array(z.string()),
    avoid: z.array(z.string()),
  }),
  plain_language_summary: z.string(),
  todays_checklist: z.array(checklistItemSchema),
  medication_schedule_today: z.array(medScheduleItemSchema).optional(),
});

export type CarePlan = z.infer<typeof carePlanSchema>;
export type MedScheduleItem = z.infer<typeof medScheduleItemSchema>;

export const symptomsSchema = z.object({
  pain: z.number().min(0).max(10),
  fever: z.enum(["none", "low", "high", "unknown"]),
  swelling: z.enum(["none", "mild", "moderate", "severe"]),
  shortness_of_breath: z.enum(["none", "mild", "moderate", "severe"]),
  nausea: z.enum(["none", "mild", "moderate", "severe"]),
  worse_overall: z.boolean(),
});

export type Symptoms = z.infer<typeof symptomsSchema>;

export const checkInRequestSchema = z.object({
  symptoms: symptomsSchema,
  red_flags: z.array(redFlagSchema),
  care_plan_summary: z.string().optional(),
});

export const checkInResponseSchema = z.object({
  tier: z.enum(["home", "provider", "urgent"]),
  rationale: z.string(),
  matched_flags: z.array(z.string()),
  warning: z.string(),
  reason_for_concern: z.string(),
  triggering_excerpt: z.string(),
  shareable_text: z.string(),
});

export type CheckInResponse = z.infer<typeof checkInResponseSchema>;
