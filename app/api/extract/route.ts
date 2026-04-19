import { NextResponse } from "next/server";
import { carePlanSchema } from "@/lib/types/care-plan";
import { completeJsonText, getAnthropic, parseJsonFromModelText } from "@/lib/llm";
import { EXTRACT_SYSTEM, buildExtractUserMessage } from "@/lib/prompts/extract";

export async function POST(req: Request) {
  let body: { raw_text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const raw = body.raw_text?.trim();
  if (!raw) {
    return NextResponse.json({ error: "raw_text is required" }, { status: 400 });
  }

  if (!getAnthropic()) {
    return NextResponse.json(
      {
        error: "LLM unavailable",
        hint: "Set ANTHROPIC_API_KEY or use Load sample on the upload page.",
      },
      { status: 503 }
    );
  }

  try {
    const text = await completeJsonText({
      system: EXTRACT_SYSTEM,
      user: buildExtractUserMessage(raw),
      maxTokens: 8192,
    });
    const parsed = parseJsonFromModelText<unknown>(text);
    const result = carePlanSchema.safeParse(parsed);
    if (!result.success) {
      console.error("[extract] validation failed:", JSON.stringify(result.error.flatten(), null, 2));
      console.error("[extract] model output:", text.slice(0, 2000));
      return NextResponse.json(
        { error: "Model output failed validation", details: result.error.flatten() },
        { status: 422 }
      );
    }
    return NextResponse.json({ care_plan: result.data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Extraction failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
