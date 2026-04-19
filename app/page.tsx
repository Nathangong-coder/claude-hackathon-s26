import Link from "next/link";
import { Disclaimer } from "@/components/Disclaimer";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col px-5 pb-8 pt-10">
      <p className="text-sm font-medium uppercase tracking-wide text-teal-800">
        Post-discharge companion
      </p>
      <h1 className="mt-2 text-3xl font-semibold leading-tight text-stone-900">
        Turn discharge paperwork into a clear daily plan.
      </h1>
      <p className="mt-4 text-base leading-relaxed text-stone-600">
        Paste your after-visit summary, review what we extracted, then use Today
        and Check-in to stay on track.
      </p>
      <div className="mt-8 flex flex-col gap-3">
        <Link
          href="/upload"
          className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-teal-700 px-5 text-center font-medium text-white shadow-sm transition hover:bg-teal-800"
        >
          Add discharge instructions
        </Link>
        <Link
          href="/plan"
          className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-stone-200 bg-white px-5 text-center font-medium text-stone-800 hover:bg-stone-50"
        >
          Open Today
        </Link>
      </div>
      <Disclaimer />
    </main>
  );
}
