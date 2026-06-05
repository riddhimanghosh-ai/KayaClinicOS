import { NextResponse } from "next/server";
import { upsertPractitionerSession, getPractitionerSession } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = getPractitionerSession(Number(params.id));
  return NextResponse.json({ session });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { patient_id, photos, consent_signed, medical_history, body_type, treatment_notes, started_at, completed_at, status } = body;
  const session = upsertPractitionerSession(Number(params.id), Number(patient_id), {
    photos_json: JSON.stringify(photos ?? []),
    consent_signed: consent_signed ? 1 : 0,
    medical_history: medical_history ?? null,
    body_type: body_type ?? null,
    treatment_notes: treatment_notes ?? null,
    started_at: started_at ?? null,
    completed_at: completed_at ?? null,
    status: status ?? 'pending',
  });
  return NextResponse.json({ session });
}
