"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  onCapture: (blob: Blob) => void;
  onClose: () => void;
}

export function CameraCapture({ onCapture, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCamera(facing: "environment" | "user") {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    setReady(false);
    setError(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = s;
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        videoRef.current.onloadedmetadata = () => setReady(true);
      }
    } catch {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        streamRef.current = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.onloadedmetadata = () => setReady(true);
        }
      } catch {
        setError("Camera access denied. Use the file upload option instead.");
      }
    }
  }

  useEffect(() => {
    startCamera(facingMode);
    return () => streamRef.current?.getTracks().forEach(t => t.stop());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function flipCamera() {
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    await startCamera(next);
  }

  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    canvas.toBlob(blob => { if (blob) onCapture(blob); }, "image/jpeg", 0.92);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={onClose} className="text-white text-sm font-medium px-3 py-2">
          ✕ Cancel
        </button>
        <span className="text-white text-sm font-semibold">Camera</span>
        <button onClick={flipCamera} className="text-white text-sm font-medium px-3 py-2">
          ⇄ Flip
        </button>
      </div>

      {/* Video feed */}
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="h-full w-full object-cover"
        />
        {/* Corner guides */}
        <div className="pointer-events-none absolute inset-6 rounded-2xl border-2 border-white/20">
          <div className="absolute left-0 top-0 h-8 w-8 border-l-4 border-t-4 border-white rounded-tl-xl" />
          <div className="absolute right-0 top-0 h-8 w-8 border-r-4 border-t-4 border-white rounded-tr-xl" />
          <div className="absolute bottom-0 left-0 h-8 w-8 border-b-4 border-l-4 border-white rounded-bl-xl" />
          <div className="absolute bottom-0 right-0 h-8 w-8 border-b-4 border-r-4 border-white rounded-br-xl" />
        </div>
        {error && (
          <div className="absolute inset-x-4 top-4 rounded-xl bg-red-900/80 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}
      </div>

      {/* Capture button */}
      <div className="flex flex-col items-center gap-3 px-6 pb-10 pt-6">
        <button
          onClick={capture}
          disabled={!ready}
          className="size-20 rounded-full border-4 border-white bg-white/20 disabled:opacity-40 active:scale-95 transition-transform"
        >
          <span className="sr-only">Capture</span>
        </button>
        <p className="text-xs text-white/50">Tap to capture your discharge document</p>
      </div>
    </div>
  );
}
