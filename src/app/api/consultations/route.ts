import { NextRequest, NextResponse } from "next/server";
import { transcribeAudio } from "@/lib/llm";
import { processConsultation } from "@/lib/consultations";

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";

  let patientId = 0;
  let appointmentId: number | null = null;
  let doctorId: number | null = null;
  let durationSec: number | null = null;
  let transcript = "";

  try {
    if (contentType.includes("multipart/form-data")) {
      // Recorded or uploaded audio file → transcribe first.
      const form = await req.formData();
      patientId = Number(form.get("patient_id"));
      appointmentId = form.get("appointment_id") ? Number(form.get("appointment_id")) : null;
      doctorId = form.get("doctor_id") ? Number(form.get("doctor_id")) : null;
      durationSec = form.get("duration_sec") ? Number(form.get("duration_sec")) : null;
      const file = form.get("audio") as File | null;
      if (!file) return NextResponse.json({ error: "audio file required" }, { status: 400 });
      const buf = Buffer.from(await file.arrayBuffer());
      transcript = await transcribeAudio(buf, file.type || "audio/webm");
    } else {
      // Pre-transcribed text (e.g. sample transcript for the demo).
      const body = await req.json();
      patientId = Number(body.patient_id);
      appointmentId = body.appointment_id ? Number(body.appointment_id) : null;
      doctorId = body.doctor_id ? Number(body.doctor_id) : null;
      durationSec = body.duration_sec ? Number(body.duration_sec) : null;
      transcript = String(body.transcript ?? "");
    }

    if (!patientId) return NextResponse.json({ error: "patient_id required" }, { status: 400 });
    if (!transcript.trim()) {
      return NextResponse.json({ error: "Empty transcript — nothing to process." }, { status: 400 });
    }

    const result = await processConsultation(
      patientId,
      appointmentId,
      doctorId,
      transcript,
      durationSec
    );
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Consultation processing failed" },
      { status: 500 }
    );
  }
}
