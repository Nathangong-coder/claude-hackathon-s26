import { NextRequest, NextResponse } from "next/server";
import { getAnthropic } from "@/lib/llm";

const VISION_SYSTEM = (
  "You are a document text extractor. Extract all visible text from the image " +
  "exactly as it appears and return it as plain text. " +
  "Return ONLY the raw text content — no commentary, no markdown."
);

export async function POST(req: NextRequest) {
  const client = getAnthropic();
  if (!client) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not set" }, { status: 503 });
  }

  const form = await req.formData();
  const file = form.get("image") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "File must be an image" }, { status: 400 });
  }
  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: "Image too large (max 20MB)" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const b64 = Buffer.from(bytes).toString("base64");
  const mediaType = file.type as "image/jpeg" | "image/png" | "image/gif" | "image/webp";

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      system: VISION_SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: b64 },
            },
            {
              type: "text",
              text: "Extract all text from this discharge document exactly as it appears.",
            },
          ],
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    const raw_text = textBlock && "text" in textBlock ? (textBlock.text as string).trim() : "";
    return NextResponse.json({ raw_text });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Vision extraction failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
