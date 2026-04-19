"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { CarePlan } from "@/lib/types/care-plan";
import { saveCarePlan } from "@/lib/care-plan-storage";
import { Disclaimer } from "@/components/Disclaimer";
import { CameraCapture } from "@/components/CameraCapture";

export default function UploadPage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadSample() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/sample-care-plan");
      if (!res.ok) throw new Error("Could not load sample");
      const plan = (await res.json()) as CarePlan;
      saveCarePlan(plan);
      router.push("/plan");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load sample");
    } finally {
      setLoading(false);
    }
  }

  async function extract() {
    setError(null);
    const raw = text.trim();
    if (!raw) {
      setError("Paste your discharge text first.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_text: raw }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.hint
            ? `${data.error ?? "Request failed"} — ${data.hint}`
            : data.error ?? "Extraction failed"
        );
      }
      saveCarePlan(data.care_plan as CarePlan);
      router.push("/plan");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function processImageBlob(blob: Blob) {
    setShowCamera(false);
    setError(null);
    setLoading(true);
    const isPdf = blob.type === "application/pdf";
    try {
      const form = new FormData();
      if (isPdf) {
        form.append("pdf", blob, "discharge.pdf");
      } else {
        form.append("image", blob, "capture.jpg");
      }
      const visionRes = await fetch(isPdf ? "/api/extract-pdf" : "/api/extract-image", { method: "POST", body: form });
      const visionData = await visionRes.json();
      if (!visionRes.ok) throw new Error(visionData.error ?? "Image extraction failed");

      const raw_text: string = visionData.raw_text;
      if (!raw_text) throw new Error("No text found in image");

      const extractRes = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_text }),
      });
      const extractData = await extractRes.json();
      if (!extractRes.ok) {
        throw new Error(
          extractData.hint
            ? `${extractData.error ?? "Request failed"} — ${extractData.hint}`
            : extractData.error ?? "Extraction failed"
        );
      }
      saveCarePlan(extractData.care_plan as CarePlan);
      router.push("/plan");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processImageBlob(file);
    e.target.value = "";
  }

  return (
    <>
      {showCamera && (
        <CameraCapture
          onCapture={processImageBlob}
          onClose={() => setShowCamera(false)}
        />
      )}

      <main className="flex flex-1 flex-col px-5 pb-8 pt-8">
        <h1 className="text-2xl font-semibold text-stone-900">
          Add discharge instructions
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          Paste text from your after-visit summary. For the hackathon demo, use{" "}
          <strong>Load sample</strong> if you do not have an API key configured.
        </p>

        <label className="mt-6 text-sm font-medium text-stone-800" htmlFor="raw">
          Discharge text
        </label>
        <textarea
          id="raw"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={12}
          placeholder="Paste discharge instructions here…"
          className="mt-2 w-full rounded-2xl border border-stone-200 bg-white p-4 text-base text-stone-900 shadow-sm outline-none ring-teal-600/20 placeholder:text-stone-400 focus:border-teal-600 focus:ring-4"
        />

        {error ? (
          <p
            className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={extract}
            disabled={loading}
            className="min-h-12 rounded-2xl bg-teal-700 px-5 font-medium text-white shadow-sm transition hover:bg-teal-800 disabled:opacity-60"
          >
            {loading ? "Working…" : "Extract & review in Today"}
          </button>

          <button
            type="button"
            onClick={() => setShowCamera(true)}
            disabled={loading}
            className="min-h-12 rounded-2xl border border-teal-200 bg-teal-50 px-5 font-medium text-teal-800 hover:bg-teal-100 disabled:opacity-60"
          >
            📷 Use camera
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={onFileChange}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="min-h-12 rounded-2xl border border-stone-200 bg-white px-5 font-medium text-stone-800 hover:bg-stone-50 disabled:opacity-60"
          >
            🖼️ Upload image or PDF
          </button>

          <button
            type="button"
            onClick={loadSample}
            disabled={loading}
            className="min-h-12 rounded-2xl border border-stone-200 bg-white px-5 font-medium text-stone-800 hover:bg-stone-50 disabled:opacity-60"
          >
            Load sample discharge
          </button>
        </div>

        <Disclaimer />
      </main>
    </>
  );
}
