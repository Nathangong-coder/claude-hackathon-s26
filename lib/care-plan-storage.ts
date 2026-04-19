import type { CarePlan } from "@/lib/types/care-plan";

const KEY = "pdc-care-plan-v1";

export function saveCarePlan(plan: CarePlan): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(plan));
  localStorage.removeItem("sms_registered");
  localStorage.removeItem("sms_phone");
  localStorage.removeItem("reminder_sids");
}

export function loadCarePlan(): CarePlan | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CarePlan;
  } catch {
    return null;
  }
}

export function clearCarePlan(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}
