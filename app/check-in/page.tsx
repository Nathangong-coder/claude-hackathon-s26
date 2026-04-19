"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { CarePlan } from "@/lib/types/care-plan";
import { loadCarePlan } from "@/lib/care-plan-storage";
import { Disclaimer } from "@/components/Disclaimer";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "What should I watch out for?",
  "Can I take ibuprofen with my medication?",
  "When should I call my doctor?",
  "What foods should I avoid?",
];

export default function ChatPage() {
  const [plan, setPlan] = useState<CarePlan | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setPlan(loadCarePlan());
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;

    const userMsg: Message = { role: "user", content: trimmed };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setStreaming(true);

    const assistantMsg: Message = { role: "assistant", content: "" };
    setMessages([...next, assistantMsg]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, carePlan: plan }),
      });

      if (!res.ok || !res.body) {
        throw new Error("Request failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setMessages([...next, { role: "assistant", content: accumulated }]);
      }
    } catch {
      setMessages([
        ...next,
        { role: "assistant", content: "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setStreaming(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  return (
    <main className="flex flex-1 flex-col pt-8">
      <div className="px-5">
        <p className="text-sm text-stone-500">Assistant</p>
        <h1 className="mt-1 text-2xl font-semibold text-stone-900">Ask anything</h1>
        {plan && (
          <p className="mt-1 text-sm text-stone-500">{plan.diagnosis_or_reason}</p>
        )}
      </div>

      <div className="mt-4 flex-1 overflow-y-auto px-5 pb-4">
        {messages.length === 0 && (
          <div className="mt-2 space-y-2">
            <p className="text-sm text-stone-500">
              {plan
                ? "Ask me anything about your recovery, medications, or care plan."
                : "Ask me general post-discharge questions. Upload discharge instructions for personalized answers."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-700 shadow-sm hover:bg-stone-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-teal-700 text-white"
                    : "border border-stone-200 bg-white text-stone-800 shadow-sm"
                }`}
              >
                {msg.role === "assistant" && msg.content ? (
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                      strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                      ul: ({ children }) => <ul className="ml-4 list-disc space-y-0.5">{children}</ul>,
                      ol: ({ children }) => <ol className="ml-4 list-decimal space-y-0.5">{children}</ol>,
                      li: ({ children }) => <li>{children}</li>,
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                ) : msg.content ? msg.content : (
                  <span className="inline-flex gap-1">
                    <span className="animate-bounce">·</span>
                    <span className="animate-bounce [animation-delay:0.15s]">·</span>
                    <span className="animate-bounce [animation-delay:0.3s]">·</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-stone-200 bg-white px-4 pb-6 pt-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a question…"
            disabled={streaming}
            className="min-h-[44px] flex-1 resize-none rounded-2xl border border-stone-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 disabled:opacity-50"
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || streaming}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-700 text-white disabled:opacity-40"
            aria-label="Send"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
              <path d="M3.105 2.288a.75.75 0 0 0-.826.95l1.414 4.925A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.087l-1.414 4.926a.75.75 0 0 0 .826.95 28.896 28.896 0 0 0 15.293-7.154.75.75 0 0 0 0-1.115A28.897 28.897 0 0 0 3.105 2.288Z" />
            </svg>
          </button>
        </div>
        <Disclaimer />
      </div>
    </main>
  );
}
