import { NextRequest, NextResponse } from "next/server";
import { listClinicStatus, upsertClinicStatus } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ statuses: listClinicStatus() });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const branchId = Number(body.branch_id);
  if (!branchId) {
    return NextResponse.json({ error: "branch_id required" }, { status: 400 });
  }
  const status = upsertClinicStatus(branchId, {
    is_open: body.is_open,
    status_note: body.status_note,
    on_duty_doctor_id: body.on_duty_doctor_id === undefined ? undefined : body.on_duty_doctor_id ?? null,
    doctor_on_leave: body.doctor_on_leave,
    doctor_leave_note: body.doctor_leave_note,
    appliances: body.appliances,
    offers: body.offers,
    updated_by: body.updated_by ?? null,
  });
  return NextResponse.json({ status });
}
