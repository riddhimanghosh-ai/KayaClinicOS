import { NextRequest, NextResponse } from "next/server";
import { transcribeAudio } from "@/lib/llm";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("audio") as File | null;
    if (!file) return NextResponse.json({ error: "audio file required" }, { status: 400 });
    const buf = Buffer.from(await file.arrayBuffer());
    const transcript = await transcribeAudio(buf, file.type || "audio/webm");
    return NextResponse.json({ transcript });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Transcription failed" }, { status: 500 });
  }
}
