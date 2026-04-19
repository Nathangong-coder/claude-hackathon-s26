"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { CarePlan } from "@/lib/types/care-plan";
import { saveCarePlan } from "@/lib/care-plan-storage";
import { Disclaimer } from "@/components/Disclaimer";
import { CameraCapture } from "@/components/CameraCapture";

type View = "upload" | "review";

function fileIcon(file: File) {
  if (file.type === "application/pdf") return "📄";
  if (file.type.startsWith("image/")) return "🖼️";
  return "📎";
}

async function extractFile(file: File): Promise<string> {
  const isPdf = file.type === "application/pdf";
  const form = new FormData();
  if (isPdf) {
    form.append("pdf", file, file.name);
  } else {
    form.append("image", file, file.name);
  }
  const res = await fetch(isPdf ? "/api/extract-pdf" : "/api/extract-image", {
    method: "POST",
    body: form,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Extraction failed");
  if (!data.raw_text) throw new Error("No text found in file");
  return data.raw_text as string;
}

export default function UploadPage() {
  const router = useRouter();
  const [view, setView] = useState<View>("upload");
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function addFiles(incoming: File[]) {
    if (!incoming.length) return;
    setFiles((prev) => {
      const names = new Set(prev.map((f) => f.name));
      const deduped = incoming.filter((f) => !names.has(f.name));
      return [...prev, ...deduped];
    });
    setView("review");
  }

  function removeFile(index: number) {
    setFiles((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) setView("upload");
      return next;
    });
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    addFiles(selected);
    e.target.value = "";
  }

  function onCameraCapture(blob: Blob) {
    setShowCamera(false);
    const file = new File([blob], `capture-${Date.now()}.jpg`, { type: blob.type });
    addFiles([file]);
  }

  async function loadSample() {
    setError(null);
    setLoading(true);
    setLoadingMsg("Loading sample…");
    try {
      const res = await fetch("/api/sample-care-plan");
      if (!res.ok) throw new Error("Could not load sample");
      saveCarePlan((await res.json()) as CarePlan);
      router.push("/plan");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load sample");
    } finally {
      setLoading(false);
      setLoadingMsg("");
    }
  }

  async function extractText() {
    setError(null);
    const raw = text.trim();
    if (!raw) { setError("Paste your discharge text first."); return; }
    setLoading(true);
    setLoadingMsg("Extracting…");
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_text: raw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.hint ? `${data.error} — ${data.hint}` : data.error ?? "Failed");
      saveCarePlan(data.care_plan as CarePlan);
      router.push("/plan");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
      setLoadingMsg("");
    }
  }

  async function processFiles() {
    setError(null);
    setLoading(true);
    const parts: string[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        setLoadingMsg(`Reading file ${i + 1} of ${files.length}…`);
        parts.push(await extractFile(files[i]));
      }
      setLoadingMsg("Building your care plan…");
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_text: parts.join("\n\n---\n\n") }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.hint ? `${data.error} — ${data.hint}` : data.error ?? "Failed");
      saveCarePlan(data.care_plan as CarePlan);
      router.push("/plan");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
      setLoadingMsg("");
    }
  }

  return (
    <>
      {showCamera && (
        <CameraCapture onCapture={onCameraCapture} onClose={() => setShowCamera(false)} />
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        multiple
        className="hidden"
        onChange={onFileChange}
      />

      {/* ── REVIEW VIEW ── */}
      {view === "review" && (
        <main className="flex flex-1 flex-col px-5 pb-8 pt-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setView("upload")}
              className="flex size-9 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
              aria-label="Back"
            >
              ←
            </button>
            <h1 className="text-2xl font-semibold text-stone-900">Files to process</h1>
          </div>
          <p className="mt-1 text-sm text-stone-500">{files.length} file{files.length !== 1 ? "s" : ""} selected</p>

          <ul className="mt-6 space-y-2">
            {files.map((file, i) => (
              <li
                key={`${file.name}-${i}`}
                className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 shadow-sm"
              >
                <span className="text-xl">{fileIcon(file)}</span>
                <span className="flex-1 truncate text-sm text-stone-800">{file.name}</span>
                <button
                  onClick={() => removeFile(i)}
                  disabled={loading}
                  className="flex size-7 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 disabled:opacity-40"
                  aria-label={`Remove ${file.name}`}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>

          {error && (
            <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950" role="alert">
              {error}
            </p>
          )}

          {loading && loadingMsg && (
            <p className="mt-4 text-sm text-stone-500">{loadingMsg}</p>
          )}

          <div className="mt-auto flex flex-col gap-3 pt-8">
            <button
              type="button"
              onClick={processFiles}
              disabled={loading}
              className="min-h-12 rounded-2xl bg-teal-700 px-5 font-medium text-white shadow-sm transition hover:bg-teal-800 disabled:opacity-60"
            >
              {loading ? loadingMsg || "Working…" : "Extract & review in Today"}
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="min-h-12 rounded-2xl border border-stone-200 bg-white px-5 font-medium text-stone-800 hover:bg-stone-50 disabled:opacity-60"
            >
              🖼️ Add more files
            </button>
            <button
              type="button"
              onClick={() => setShowCamera(true)}
              disabled={loading}
              className="min-h-12 rounded-2xl border border-teal-200 bg-teal-50 px-5 font-medium text-teal-800 hover:bg-teal-100 disabled:opacity-60"
            >
              📷 Take a photo
            </button>
          </div>

          <Disclaimer />
        </main>
      )}

      {/* ── UPLOAD VIEW ── */}
      {view === "upload" && (
        <main className="flex flex-1 flex-col px-5 pb-8 pt-8">
          <h1 className="text-2xl font-semibold text-stone-900">Add discharge instructions</h1>
          <p className="mt-2 text-sm text-stone-600">
            Paste text, take a photo, or upload images and PDFs from your discharge paperwork.
          </p>

          <label className="mt-6 text-sm font-medium text-stone-800" htmlFor="raw">
            Discharge text
          </label>
          <textarea
            id="raw"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            placeholder="Paste discharge instructions here…"
            className="mt-2 w-full rounded-2xl border border-stone-200 bg-white p-4 text-base text-stone-900 shadow-sm outline-none ring-teal-600/20 placeholder:text-stone-400 focus:border-teal-600 focus:ring-4"
          />

          {error && (
            <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950" role="alert">
              {error}
            </p>
          )}

          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={extractText}
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

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="min-h-12 rounded-2xl border border-stone-200 bg-white px-5 font-medium text-stone-800 hover:bg-stone-50 disabled:opacity-60"
            >
              🖼️ Upload images or PDFs
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
      )}
    </>
  );
}
