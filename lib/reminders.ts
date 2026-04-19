import type { MedScheduleItem } from "@/lib/types/care-plan";

function parseTimeToday(timeLocal: string): Date | null {
  const match = timeLocal.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3]?.toUpperCase();

  if (meridiem === "PM" && hours !== 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;

  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export function scheduleMedReminders(
  schedule: MedScheduleItem[],
  onFire: (item: MedScheduleItem) => void
): () => void {
  const now = Date.now();
  const timeouts: ReturnType<typeof setTimeout>[] = [];

  for (const item of schedule) {
    const fireAt = parseTimeToday(item.time_local);
    if (!fireAt) continue;

    const delay = fireAt.getTime() - now;
    if (delay < 0) continue;

    const id = setTimeout(() => {
      if (typeof window !== "undefined" && Notification.permission === "granted") {
        new Notification("Time for your medication", {
          body: item.label,
          icon: "/favicon.ico",
        });
      }
      onFire(item);
    }, delay);

    timeouts.push(id);
  }

  return () => timeouts.forEach(clearTimeout);
}

export function getActiveReminder(
  schedule: MedScheduleItem[],
  windowMinutes = 15
): MedScheduleItem | null {
  const now = new Date();

  for (const item of schedule) {
    const fireAt = parseTimeToday(item.time_local);
    if (!fireAt) continue;

    const diffMin = (fireAt.getTime() - now.getTime()) / 60_000;
    if (diffMin >= -windowMinutes && diffMin <= windowMinutes) return item;
  }

  return null;
}
