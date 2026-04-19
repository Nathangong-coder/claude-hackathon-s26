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

function fileSize(file: File) {
  const kb = file.size / 1024;
  return kb < 1024 ? `${Math.round(kb)} KB` : `${(kb / 1024).toFixed(1)} MB`;
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
  const [showTextarea, setShowTextarea] = useState(false);
  const [dragOver, setDragOver] = useState(false);
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

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files);
    addFiles(dropped);
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
        <main className="flex flex-1 flex-col px-5 pb-8 pt-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setView("upload")}
              className="flex size-10 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 text-lg"
              aria-label="Back"
            >
              ←
            </button>
            <div>
              <h1 className="text-2xl font-bold text-stone-900">Review files</h1>
              <p className="text-sm text-stone-500">{files.length} file{files.length !== 1 ? "s" : ""} ready to process</p>
            </div>
          </div>

          <ul className="mt-6 space-y-3">
            {files.map((file, i) => (
              <li
                key={`${file.name}-${i}`}
                className="flex items-center gap-4 rounded-2xl border border-stone-200 bg-white px-5 py-4 shadow-sm"
              >
                <span className="text-3xl">{fileIcon(file)}</span>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-base font-medium text-stone-800">{file.name}</p>
                  <p className="text-sm text-stone-400">{fileSize(file)}</p>
                </div>
                <button
                  onClick={() => removeFile(i)}
                  disabled={loading}
                  className="flex size-8 items-center justify-center rounded-lg text-stone-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-40 transition-colors"
                  aria-label={`Remove ${file.name}`}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>

          {/* Add more */}
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="flex-1 rounded-2xl border border-dashed border-stone-300 bg-stone-50 py-3 text-sm font-medium text-stone-600 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 disabled:opacity-60 transition-colors"
            >
              + Add files
            </button>
            <button
              type="button"
              onClick={() => setShowCamera(true)}
              disabled={loading}
              className="flex-1 rounded-2xl border border-dashed border-stone-300 bg-stone-50 py-3 text-sm font-medium text-stone-600 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 disabled:opacity-60 transition-colors"
            >
              📷 Take photo
            </button>
          </div>

          {error && (
            <p className="mt-4 rounded-2xl bg-amber-50 border border-amber-200 px-5 py-4 text-base text-amber-900" role="alert">
              {error}
            </p>
          )}

          {loading && loadingMsg && (
            <div className="mt-4 flex items-center gap-3 rounded-2xl bg-teal-50 border border-teal-100 px-5 py-4">
              <span className="text-xl animate-spin">⏳</span>
              <p className="text-base font-medium text-teal-800">{loadingMsg}</p>
            </div>
          )}

          <div className="mt-auto pt-8">
            <button
              type="button"
              onClick={processFiles}
              disabled={loading}
              className="w-full min-h-14 rounded-2xl bg-teal-700 px-5 text-lg font-semibold text-white shadow-sm transition hover:bg-teal-800 disabled:opacity-60"
            >
              {loading ? loadingMsg || "Working…" : `Extract care plan →`}
            </button>
          </div>

          <Disclaimer />
        </main>
      )}

      {/* ── UPLOAD VIEW ── */}
      {view === "upload" && (
        <main className="flex flex-1 flex-col px-5 pb-8 pt-6">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-teal-50 text-4xl">
              📋
            </div>
            <div>
              <h1 className="text-3xl font-bold text-stone-900">Add discharge instructions</h1>
              <p className="text-base text-stone-500">Photo, PDF, or paste text</p>
            </div>
          </div>

          {/* Drag & drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed px-6 py-14 text-center transition-colors ${
              dragOver
                ? "border-teal-400 bg-teal-50"
                : "border-stone-200 bg-white hover:border-teal-300 hover:bg-teal-50/50"
            }`}
          >
            <span className="text-7xl">📂</span>
            <div>
              <p className="text-xl font-semibold text-stone-700">Drop files here</p>
              <p className="mt-1 text-base text-stone-400">or tap to browse — images & PDFs supported</p>
            </div>
            <span className="rounded-xl bg-teal-700 px-6 py-3 text-base font-semibold text-white">
              Browse files
            </span>
          </div>

          {/* Camera + text options */}
          <div className="mt-5 grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setShowCamera(true)}
              disabled={loading}
              className="flex flex-col items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-7 text-center shadow-sm transition hover:border-teal-200 hover:bg-teal-50 disabled:opacity-60"
            >
              <span className="text-4xl">📷</span>
              <span className="text-base font-semibold text-stone-700">Use camera</span>
              <span className="text-sm text-stone-400">Take a photo</span>
            </button>
            <button
              type="button"
              onClick={() => setShowTextarea((v) => !v)}
              className="flex flex-col items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-7 text-center shadow-sm transition hover:border-teal-200 hover:bg-teal-50"
            >
              <span className="text-4xl">✏️</span>
              <span className="text-base font-semibold text-stone-700">Paste text</span>
              <span className="text-sm text-stone-400">Copy from PDF viewer</span>
            </button>
          </div>

          {/* Collapsible textarea */}
          {showTextarea && (
            <div className="mt-4 space-y-3">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={8}
                placeholder="Paste discharge instructions here…"
                className="w-full rounded-2xl border border-stone-200 bg-white p-4 text-base text-stone-900 shadow-sm outline-none placeholder:text-stone-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10"
              />
              <button
                type="button"
                onClick={extractText}
                disabled={loading || !text.trim()}
                className="w-full min-h-14 rounded-2xl bg-teal-700 px-5 text-lg font-semibold text-white shadow-sm transition hover:bg-teal-800 disabled:opacity-60"
              >
                {loading ? loadingMsg || "Working…" : "Extract from text →"}
              </button>
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-2xl bg-amber-50 border border-amber-200 px-5 py-4 text-base text-amber-900" role="alert">
              {error}
            </p>
          )}

          {/* Divider */}
          <div className="mt-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-stone-200" />
            <span className="text-sm text-stone-400">or try a demo</span>
            <div className="h-px flex-1 bg-stone-200" />
          </div>

          {/* Sample */}
          <button
            type="button"
            onClick={loadSample}
            disabled={loading}
            className="mt-4 min-h-12 w-full rounded-2xl border border-stone-200 bg-white px-5 text-base font-medium text-stone-700 shadow-sm transition hover:bg-stone-50 disabled:opacity-60"
          >
            {loading ? loadingMsg || "Loading…" : "Load sample discharge"}
          </button>

          <Disclaimer />
        </main>
      )}
    </>
  );
}
