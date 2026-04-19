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

const CATEGORY_ICON: Record<string, string> = {
  medication: "💊",
  activity: "🚶",
  diet: "🥗",
  follow_up: "📅",
  education: "📖",
  other: "✔️",
};

type Tab = "today" | "alerts" | "details";

function todayLabel() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function PlanPage() {
  const [plan, setPlan] = useState<CarePlan | null>(null);
  const [activeReminder, setActiveReminder] = useState<MedScheduleItem | null>(null);
  const [dismissedTimes, setDismissedTimes] = useState<Set<string>>(new Set());
  const [scheduledSids, setScheduledSids] = useState<string[]>([]);
  const [tab, setTab] = useState<Tab>("today");
  const cleanupRef = useRef<(() => void) | null>(null);

  function handleSmsScheduled(sids: string[]) {
    setScheduledSids(sids);
    localStorage.setItem("reminder_sids", JSON.stringify(sids));
  }

  useEffect(() => {
    setPlan(loadCarePlan());
    const saved = localStorage.getItem("reminder_sids");
    if (saved) setScheduledSids(JSON.parse(saved));
  }, []);

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
    return { done: items.filter((i) => i.done).length, total: items.length };
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

  const schedule = plan.medication_schedule_today ?? [];
  const smsSchedule = schedule.length > 0
    ? schedule
    : plan.medications.map((m) => ({
        time_local: "as scheduled",
        label: `${m.name}${m.dose ? ` ${m.dose}` : ""} — ${m.frequency_text}`,
      }));

  const TABS: { id: Tab; label: string; dot?: boolean }[] = [
    { id: "today", label: "Today" },
    { id: "alerts", label: "Alerts", dot: plan.red_flags.length > 0 || !!activeReminder },
    { id: "details", label: "Details" },
  ];

  return (
    <main className="flex flex-1 overflow-hidden -mx-[calc((100vw-100%)/2)] w-screen">
      {/* Left sidebar */}
      <div className="flex w-[30%] shrink-0 flex-col bg-teal-700 px-6 py-8">
        <p className="text-sm font-medium uppercase tracking-wide text-teal-300">{todayLabel()}</p>
        <h1 className="mt-4 text-4xl font-bold leading-tight text-white">Your Plan</h1>
        <p className="mt-4 text-lg leading-snug text-teal-100">{plan.diagnosis_or_reason}</p>

        {progress.total > 0 && (
          <div className="mt-8 rounded-2xl bg-teal-600 p-5 text-center">
            <span className="text-5xl font-bold text-white leading-none">{progress.done}</span>
            <span className="text-2xl font-bold text-teal-300">/{progress.total}</span>
            <p className="mt-2 text-sm text-teal-300">tasks done</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-teal-500">
              <div
                className="h-full rounded-full bg-white transition-all duration-500"
                style={{ width: `${Math.min(100, (progress.done / progress.total) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Tab buttons — vertical */}
        <div className="mt-auto flex flex-col gap-2 pt-8">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative rounded-xl px-4 py-3 text-left text-base font-semibold transition-colors ${
                tab === t.id
                  ? "bg-white text-teal-700"
                  : "text-teal-200 hover:bg-teal-600"
              }`}
            >
              {t.label}
              {t.dot && tab !== t.id && (
                <span className="absolute right-3 top-3 size-2.5 rounded-full bg-amber-400" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Right content panel */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {activeReminder && (
          <div className="px-4 pt-4">
            <MedReminderBanner reminder={activeReminder} onDismiss={dismissReminder} />
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-4 pb-6 pt-4">

        {/* TODAY */}
        {tab === "today" && (
          <div className="flex flex-col gap-5">

            {/* Med schedule — full-width grid tiles */}
            {schedule.length > 0 && (
              <div>
                <p className="text-base font-semibold uppercase tracking-wide text-stone-400">Medication Times</p>
                <ul className="mt-3 grid grid-cols-2 gap-3">
                  {schedule.map((m, i) => (
                    <li
                      key={`${m.time_local}-${i}`}
                      className="flex flex-col items-center justify-center rounded-2xl border border-teal-100 bg-teal-50 py-5 px-3 shadow-sm"
                    >
                      <span className="text-2xl font-extrabold text-teal-700">{m.time_local}</span>
                      <span className="mt-2 text-center text-base text-stone-600 leading-snug">{m.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* SMS setup */}
            {scheduledSids.length === 0 && (
              <SmsReminderSetup schedule={smsSchedule} onScheduled={handleSmsScheduled} />
            )}

            {/* Checklist */}
            <div>
              <p className="text-base font-semibold uppercase tracking-wide text-stone-400">Checklist</p>
              <ul className="mt-3 grid grid-cols-2 gap-3">
                {plan.todays_checklist.map((item) => (
                  <li key={item.id}>
                    <label className="flex h-full cursor-pointer flex-col rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                      <span className="text-4xl">{CATEGORY_ICON[item.category] ?? "✔️"}</span>
                      <span className={`mt-3 flex-1 text-base leading-snug ${item.done ? "line-through text-stone-400" : "text-stone-800"}`}>
                        {item.label}
                      </span>
                      <div className="mt-4 flex justify-end">
                        <input
                          type="checkbox"
                          className="size-7 rounded border-stone-300 text-teal-700 focus:ring-teal-600"
                          checked={!!item.done}
                          onChange={() => toggleChecklist(item.id)}
                        />
                      </div>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* ALERTS */}
        {tab === "alerts" && (() => {
          const emergency = plan.red_flags.filter(f => f.severity_hint === "emergency");
          const urgent = plan.red_flags.filter(f => f.severity_hint === "urgent");
          const watch = plan.red_flags.filter(f => !f.severity_hint || (f.severity_hint !== "emergency" && f.severity_hint !== "urgent"));
          return (
            <div className="flex flex-col gap-5">
              {emergency.length > 0 && (
                <div className="rounded-2xl border border-red-300 bg-red-50 p-5">
                  <p className="text-base font-semibold uppercase tracking-wide text-red-700">🚨 Call 911</p>
                  <ul className="mt-4 grid grid-cols-2 gap-3">
                    {emergency.map((f, i) => (
                      <li key={i} className="flex flex-col gap-3 rounded-xl border border-red-200 bg-white p-4">
                        <span className="text-3xl">🚨</span>
                        <span className="text-base text-red-900 leading-snug">{f.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {urgent.length > 0 && (
                <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5">
                  <p className="text-base font-semibold uppercase tracking-wide text-amber-700">⚠️ Urgent — Go to ER or Urgent Care</p>
                  <ul className="mt-4 grid grid-cols-2 gap-3">
                    {urgent.map((f, i) => (
                      <li key={i} className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-white p-4">
                        <span className="text-3xl">⚠️</span>
                        <span className="text-base text-amber-950 leading-snug">{f.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {watch.length > 0 && (
                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
                  <p className="text-base font-semibold uppercase tracking-wide text-stone-500">ℹ️ Monitor & Contact Doctor</p>
                  <ul className="mt-4 grid grid-cols-2 gap-3">
                    {watch.map((f, i) => (
                      <li key={i} className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4">
                        <span className="text-3xl">ℹ️</span>
                        <span className="text-base text-stone-700 leading-snug">{f.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {plan.follow_ups.length > 0 && (
                <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                  <p className="text-base font-semibold uppercase tracking-wide text-stone-400">📅 Follow-ups</p>
                  <ul className="mt-4 grid grid-cols-2 gap-3">
                    {plan.follow_ups.map((f, i) => (
                      <li key={i} className="flex flex-col gap-1 rounded-xl border border-stone-100 bg-stone-50 p-4">
                        <span className="text-base font-semibold text-stone-900">{f.type}</span>
                        <span className="text-base text-stone-500">{f.within_text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })()}

        {/* DETAILS */}
        {tab === "details" && (
          <div className="flex flex-col gap-5">
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <p className="text-base font-semibold uppercase tracking-wide text-stone-400">Summary</p>
              <p className="mt-3 text-base leading-relaxed text-stone-700">{plan.plain_language_summary}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                <p className="text-base font-semibold uppercase tracking-wide text-stone-400">🚶 Activity</p>
                <p className="mt-4 text-sm font-bold text-teal-700">Do</p>
                <ul className="mt-2 space-y-2">
                  {plan.activity.allowances.map((x, i) => (
                    <li key={i} className="text-base text-stone-700">• {x}</li>
                  ))}
                </ul>
                <p className="mt-4 text-sm font-bold text-red-500">Avoid</p>
                <ul className="mt-2 space-y-2">
                  {plan.activity.restrictions.map((x, i) => (
                    <li key={i} className="text-base text-stone-700">• {x}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                <p className="text-base font-semibold uppercase tracking-wide text-stone-400">🥗 Diet</p>
                <p className="mt-4 text-sm font-bold text-teal-700">Do</p>
                <ul className="mt-2 space-y-2">
                  {plan.diet.do.map((x, i) => (
                    <li key={i} className="text-base text-stone-700">• {x}</li>
                  ))}
                </ul>
                <p className="mt-4 text-sm font-bold text-red-500">Avoid</p>
                <ul className="mt-2 space-y-2">
                  {plan.diet.avoid.map((x, i) => (
                    <li key={i} className="text-base text-stone-700">• {x}</li>
                  ))}
                </ul>
              </div>
            </div>

            <Disclaimer />
          </div>
        )}
        </div>
      </div>
    </main>
  );
}
