"use client";

import { useState } from "react";
import type { MedScheduleItem } from "@/lib/types/care-plan";

interface Props {
  schedule: MedScheduleItem[];
  onScheduled: (sids: string[], phone: string) => void;
}

type Status = "idle" | "loading" | "success" | "error";

export function SmsReminderSetup({ schedule, onScheduled }: Props) {
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/schedule-reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, schedule }),
      });

      if (!res.ok) {
        const text = await res.text();
        let message = "Failed to schedule reminders";
        try { message = JSON.parse(text).error ?? message; } catch { /* non-JSON body */ }
        throw new Error(message);
      }

      const { sids } = await res.json();
      onScheduled(sids, phone);
      setStatus("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-900">
        <p className="font-semibold">You&apos;re registered! 🎉</p>
        <p className="mt-1">A confirmation text was just sent to {phone}. You&apos;ll get a reminder at each medication time today.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-stone-900">Get SMS reminders</p>
      <p className="mt-1 text-xs text-stone-500">
        We&apos;ll text you at each medication time — no app needed.
      </p>
      <div className="mt-3 flex gap-2">
        <input
          type="tel"
          required
          placeholder="+1 555 000 0000"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="min-w-0 flex-1 rounded-xl border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="shrink-0 rounded-xl bg-teal-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {status === "loading" ? "Scheduling…" : "Enable"}
        </button>
      </div>
      {status === "error" && (
        <p className="mt-2 text-xs text-red-600">{errorMsg}</p>
      )}
    </form>
  );
}
