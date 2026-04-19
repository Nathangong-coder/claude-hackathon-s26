import Link from "next/link";
import { Disclaimer } from "@/components/Disclaimer";

const FEATURES = [
  {
    href: "/upload",
    icon: "📷",
    title: "Upload",
    description: "Paste or photograph your discharge paperwork",
  },
  {
    href: "/plan",
    icon: "📋",
    title: "Your Plan",
    description: "Daily checklist, meds, and red flags at a glance",
  },
  {
    href: "/check-in",
    icon: "🩺",
    title: "Check-in",
    description: "Log symptoms and get escalation guidance",
  },
];

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col px-6 pb-8 pt-12">
      <p className="text-base font-semibold uppercase tracking-widest text-teal-700">
        Post-discharge companion
      </p>
      <h1 className="mt-4 text-6xl font-bold leading-tight text-stone-900">
        Your recovery,<br />simplified.
      </h1>
      <p className="mt-5 text-xl leading-relaxed text-stone-500">
        Turn confusing discharge paperwork into a clear daily plan — with medication reminders and symptom check-ins.
      </p>

      <div className="mt-10 grid grid-cols-3 gap-4">
        {FEATURES.map(({ href, icon, title, description }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-4 rounded-3xl border border-stone-200 bg-white px-4 py-7 shadow-sm transition hover:shadow-md hover:border-teal-200 text-center"
          >
            <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-4xl">
              {icon}
            </span>
            <div>
              <p className="text-xl font-bold text-stone-900">{title}</p>
              <p className="mt-1 text-sm text-stone-500">{description}</p>
            </div>
          </Link>
        ))}
      </div>

      <Link
        href="/upload"
        className="mt-10 inline-flex min-h-16 items-center justify-center rounded-2xl bg-teal-700 px-6 text-center text-xl font-semibold text-white shadow-sm transition hover:bg-teal-800"
      >
        Get started →
      </Link>

      <Disclaimer />
    </main>
  );
}
