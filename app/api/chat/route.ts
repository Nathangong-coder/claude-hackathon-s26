import { NextRequest } from "next/server";
import { getAnthropic, getModel } from "@/lib/llm";

function buildSystemPrompt(carePlan: Record<string, unknown> | null): string {
  const context = carePlan
    ? `
Patient diagnosis: ${carePlan.diagnosis_or_reason ?? "unknown"}

Plain language summary: ${carePlan.plain_language_summary ?? "none"}

Medications: ${JSON.stringify(carePlan.medications ?? [])}

Red flags to watch for: ${JSON.stringify(carePlan.red_flags ?? [])}

Activity: ${JSON.stringify(carePlan.activity ?? {})}

Diet: ${JSON.stringify(carePlan.diet ?? {})}
`.trim()
    : "No care plan loaded.";

  return `You are a caring, plain-language medical assistant helping a patient after hospital discharge.
You have access to their discharge care plan:

${context}

Rules:
- Answer questions about their condition, medications, recovery, and care plan in simple, reassuring language.
- You do NOT diagnose or prescribe. You explain what their discharge instructions say.
- If symptoms sound serious or match their red flags, tell them to contact their provider or call 911.
- Keep responses concise and easy to read. Use short paragraphs.
- If you don't know something, say so and suggest they call their care team.`;
}

export async function POST(req: NextRequest) {
  const anthropic = getAnthropic();
  if (!anthropic) {
    return new Response(JSON.stringify({ error: "API not configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { messages, carePlan } = await req.json();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = anthropic.messages.stream({
          model: getModel(),
          max_tokens: 1024,
          system: buildSystemPrompt(carePlan),
          messages,
        });
        for await (const chunk of response) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error";
        controller.enqueue(encoder.encode(`\n\n[Error: ${msg}]`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
