import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

export async function GET() {
  const fp = path.join(process.cwd(), "fixtures", "sample-care-plan.json");
  const raw = await readFile(fp, "utf-8");
  return NextResponse.json(JSON.parse(raw));
}
