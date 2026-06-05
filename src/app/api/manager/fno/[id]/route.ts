import { NextResponse } from "next/server";
import { upsertFnoSession, submitFnoSession, getFnoSession } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = getFnoSession(Number(params.id));
  return NextResponse.json({ session });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { patient_id, service_type, bom_items } = body;
  upsertFnoSession(
    Number(params.id),
    Number(patient_id),
    String(service_type),
    JSON.stringify(bom_items ?? [])
  );
  submitFnoSession(Number(params.id));
  return NextResponse.json({ ok: true });
}
