"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CarePlan, MedScheduleItem } from "@/lib/types/care-plan";
import { loadCarePlan, saveCarePlan } from "@/lib/care-plan-storage";
import { Disclaimer } from "@/components/Disclaimer";
import { MedReminderBanner } from "@/components/MedReminderBanner";
import { SmsReminderSetup } from "@/components/SmsReminderSetup";
import {
  getActiveReminder,
  requestNotificationPermission,
  scheduleMedReminders,
} from "@/lib/reminders";

export default function PlanPage() {
  const [plan, setPlan] = useState<CarePlan | null>(null);
  const [activeReminder, setActiveReminder] = useState<MedScheduleItem | null>(null);
  const [dismissedTimes, setDismissedTimes] = useState<Set<string>>(new Set());
  const [smsRegistered, setSmsRegistered] = useState(false);
  const [smsPhone, setSmsPhone] = useState("");
  const [testStatus, setTestStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const cleanupRef = useRef<(() => void) | null>(null);

  function handleSmsScheduled(sids: string[], phone: string) {
    setSmsRegistered(true);
    setSmsPhone(phone);
    localStorage.setItem("reminder_sids", JSON.stringify(sids));
    localStorage.setItem("sms_registered", "true");
    localStorage.setItem("sms_phone", phone);
  }

  useEffect(() => {
    setPlan(loadCarePlan());
    if (localStorage.getItem("sms_registered")) setSmsRegistered(true);
    const savedPhone = localStorage.getItem("sms_phone");
    if (savedPhone) setSmsPhone(savedPhone);
  }, []);

  async function sendTestSms() {
    if (!smsPhone || !plan?.medication_schedule_today?.length) return;
    setTestStatus("sending");
    const label = plan.medication_schedule_today[0].label;
    try {
      const res = await fetch("/api/test-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: smsPhone, label }),
      });
      setTestStatus(res.ok ? "sent" : "error");
    } catch {
      setTestStatus("error");
    }
  }

  // Schedule browser notifications and poll for in-app banner
  useEffect(() => {
    const schedule = plan?.medication_schedule_today;
    if (!schedule?.length) return;

    requestNotificationPermission();

    cleanupRef.current?.();
    cleanupRef.current = scheduleMedReminders(schedule, (item) => {
      setActiveReminder(item);
    });

    function checkBanner() {
      const reminder = getActiveReminder(schedule!);
      if (reminder && !dismissedTimes.has(reminder.time_local)) {
        setActiveReminder(reminder);
      }
    }

    checkBanner();
    const interval = setInterval(checkBanner, 60_000);
    return () => {
      clearInterval(interval);
      cleanupRef.current?.();
    };
  }, [plan, dismissedTimes]);

  function dismissReminder() {
    if (!activeReminder) return;
    setDismissedTimes((prev) => new Set(prev).add(activeReminder.time_local));
    setActiveReminder(null);
  }

  const progress = useMemo(() => {
    if (!plan) return { done: 0, total: 0 };
    const items = plan.todays_checklist ?? [];
    const done = items.filter((i) => i.done).length;
    return { done, total: items.length };
  }, [plan]);

  function toggleChecklist(id: string) {
    if (!plan) return;
    const next: CarePlan = {
      ...plan,
      todays_checklist: plan.todays_checklist.map((item) =>
        item.id === id ? { ...item, done: !item.done } : item
      ),
    };
    setPlan(next);
    saveCarePlan(next);
  }

  if (!plan) {
    return (
      <main className="flex flex-1 flex-col justify-center px-5 pb-8 pt-8">
        <h1 className="text-2xl font-semibold text-stone-900">Today</h1>
        <p className="mt-3 text-stone-600">
          No care plan yet. Add discharge instructions to see your daily plan.
        </p>
        <Link
          href="/upload"
          className="mt-8 inline-flex min-h-12 items-center justify-center rounded-2xl bg-teal-700 px-5 font-medium text-white"
        >
          Go to upload
        </Link>
        <Disclaimer />
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col px-5 pb-8 pt-8">
      <p className="text-sm text-stone-500">Today</p>
      <h1 className="mt-1 text-2xl font-semibold text-stone-900">
        Your recovery plan
      </h1>
      <p className="mt-2 text-sm text-stone-600">{plan.diagnosis_or_reason}</p>

      {activeReminder ? (
        <div className="mt-4">
          <MedReminderBanner reminder={activeReminder} onDismiss={dismissReminder} />
        </div>
      ) : null}

      {progress.total > 0 ? (
        <div className="mt-5 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-sm font-medium text-stone-800">
            <span>Progress</span>
            <span>
              {progress.done} of {progress.total} done
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-100">
            <div
              className="h-full rounded-full bg-teal-600 transition-all"
              style={{
                width: `${Math.min(100, (progress.done / progress.total) * 100)}%`,
              }}
            />
          </div>
        </div>
      ) : null}

      {plan.medication_schedule_today && plan.medication_schedule_today.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
            Medication times
          </h2>
          <ul className="mt-3 space-y-2">
            {plan.medication_schedule_today.map((m, i) => (
              <li
                key={`${m.time_local}-${i}`}
                className="flex items-center justify-between rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm shadow-sm"
              >
                <span className="font-medium text-stone-900">{m.label}</span>
                <span className="text-stone-600">{m.time_local}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3">
            {smsRegistered ? (
              <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-900">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">You&apos;re registered!</p>
                  <button
                    onClick={() => {
                      setSmsRegistered(false);
                      localStorage.removeItem("sms_registered");
                      localStorage.removeItem("reminder_sids");
                    }}
                    className="text-xs text-teal-700 underline"
                  >
                    Change
                  </button>
                </div>
                <p className="mt-1">You&apos;ll receive a reminder at each medication time.</p>
                <button
                  onClick={sendTestSms}
                  disabled={testStatus === "sending"}
                  className="mt-2 text-xs text-teal-700 underline disabled:opacity-50"
                >
                  {testStatus === "sending" ? "Sending…" : testStatus === "sent" ? "Test sent!" : testStatus === "error" ? "Failed — check console" : "Send test message now"}
                </button>
              </div>
            ) : (
              <SmsReminderSetup
                schedule={plan.medication_schedule_today}
                onScheduled={handleSmsScheduled}
              />
            )}
          </div>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
          Today&apos;s checklist
        </h2>
        <ul className="mt-3 space-y-2">
          {plan.todays_checklist.map((item) => (
            <li key={item.id}>
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                <input
                  type="checkbox"
                  className="mt-1 size-5 rounded border-stone-300 text-teal-700 focus:ring-teal-600"
                  checked={!!item.done}
                  onChange={() => toggleChecklist(item.id)}
                />
                <span className="text-sm leading-snug text-stone-800">
                  {item.label}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <h2 className="text-sm font-semibold text-amber-950">
          Watch for (from your paperwork)
        </h2>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-amber-950">
          {plan.red_flags.map((f, i) => (
            <li key={i}>{f.text}</li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
          Plain language
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-stone-700">
          {plan.plain_language_summary}
        </p>
      </section>

      <section className="mt-8 grid gap-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-stone-900">Activity</h2>
          <p className="mt-1 text-xs font-medium uppercase text-stone-500">
            Do
          </p>
          <ul className="mt-1 list-inside list-disc text-sm text-stone-700">
            {plan.activity.allowances.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs font-medium uppercase text-stone-500">
            Limit / avoid
          </p>
          <ul className="mt-1 list-inside list-disc text-sm text-stone-700">
            {plan.activity.restrictions.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-stone-900">Diet</h2>
          <ul className="mt-2 list-inside list-disc text-sm text-stone-700">
            {plan.diet.do.map((x, i) => (
              <li key={`d-${i}`}>{x}</li>
            ))}
          </ul>
          <ul className="mt-2 list-inside list-disc text-sm text-stone-700">
            {plan.diet.avoid.map((x, i) => (
              <li key={`a-${i}`}>Avoid: {x}</li>
            ))}
          </ul>
        </div>
      </section>

      <Disclaimer />
    </main>
  );
}
