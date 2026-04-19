import Anthropic from "@anthropic-ai/sdk";

const DEFAULT_MODEL = "claude-haiku-4-5-20251001";

export function getAnthropic(): Anthropic | null {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  return new Anthropic({ apiKey: key });
}

export function getModel(): string {
  return process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL;
}

/** Strip markdown fences and parse JSON */
export function parseJsonFromModelText<T>(text: string): T {
  let t = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(t);
  if (fence) t = fence[1].trim();
  return JSON.parse(t) as T;
}

export async function completeJsonText(params: {
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<string> {
  const client = getAnthropic();
  if (!client) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }
  const msg = await client.messages.create({
    model: getModel(),
    max_tokens: params.maxTokens ?? 4096,
    system: params.system,
    messages: [{ role: "user", content: params.user }],
  });
  const block = msg.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("No text response from model");
  }
  return block.text;
}
