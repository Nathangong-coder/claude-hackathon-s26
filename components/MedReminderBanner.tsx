"use client";

import type { MedScheduleItem } from "@/lib/types/care-plan";

interface Props {
  reminder: MedScheduleItem;
  onDismiss: () => void;
}

export function MedReminderBanner({ reminder, onDismiss }: Props) {
  return (
    <div className="flex items-start justify-between rounded-2xl border border-teal-300 bg-teal-50 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-xl" aria-hidden>💊</span>
        <div>
          <p className="text-sm font-semibold text-teal-900">Medication reminder</p>
          <p className="mt-0.5 text-sm text-teal-800">{reminder.label}</p>
          <p className="mt-0.5 text-xs text-teal-700">{reminder.time_local}</p>
        </div>
      </div>
      <button
        onClick={onDismiss}
        aria-label="Dismiss reminder"
        className="ml-4 shrink-0 text-teal-700 hover:text-teal-900"
      >
        ✕
      </button>
    </div>
  );
}
