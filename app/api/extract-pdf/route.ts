import { NextRequest, NextResponse } from "next/server";
import { getAnthropic } from "@/lib/llm";

export async function POST(req: NextRequest) {
  const client = getAnthropic();
  if (!client) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not set" }, { status: 503 });
  }

  const form = await req.formData();
  const file = form.get("pdf") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No PDF provided" }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "File must be a PDF" }, { status: 400 });
  }
  if (file.size > 32 * 1024 * 1024) {
    return NextResponse.json({ error: "PDF too large (max 32MB)" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const b64 = Buffer.from(bytes).toString("base64");

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: { type: "base64", media_type: "application/pdf", data: b64 },
            } as never,
            {
              type: "text",
              text: "Extract all text from this discharge document exactly as it appears. Return ONLY the raw text — no commentary, no markdown.",
            },
          ],
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    const raw_text = textBlock && "text" in textBlock ? (textBlock.text as string).trim() : "";
    return NextResponse.json({ raw_text });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "PDF extraction failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
