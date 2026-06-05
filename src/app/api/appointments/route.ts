import { NextRequest, NextResponse } from "next/server";
import { getAppointments, db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get("phone");
  const ts    = req.nextUrl.searchParams.get("appointment_ts");

  // Conflict-check mode: ?phone=...&appointment_ts=...
  if (phone && ts) {
    const d = db();
    const patient = d.prepare("SELECT id FROM patients WHERE phone = ?").get(phone) as { id: number } | undefined;
    if (!patient) return NextResponse.json({ conflicts: [] });

    const tsnorm = ts.replace("T", " ");
    const rows = d.prepare(`
      SELECT
        a.id, a.appointment_ts, a.service_type, a.status,
        COALESCE(a.duration_minutes, 60) AS duration_minutes,
        doc.name AS doctor_name,
        b.name   AS branch_name
      FROM appointments a
      LEFT JOIN doctors  doc ON doc.id = a.doctor_id
      LEFT JOIN branches b   ON b.id   = a.branch_id
      WHERE a.patient_id = ?
        AND a.status IN ('booked','confirmed','arrived','in_session')
        AND datetime(replace(a.appointment_ts,'T',' ')) > datetime(?, '-60 minutes')
        AND datetime(replace(a.appointment_ts,'T',' ')) < datetime(?, '+60 minutes')
      ORDER BY a.appointment_ts
    `).all(patient.id, tsnorm, tsnorm) as object[];
    return NextResponse.json({ conflicts: rows });
  }

  // Patient day-schedule mode: ?phone=...&date=...  (no appointment_ts)
  const dateParam = req.nextUrl.searchParams.get("date");
  if (phone && dateParam) {
    const d = db();
    const patient = d.prepare("SELECT id FROM patients WHERE phone = ?").get(phone) as { id: number } | undefined;
    if (!patient) return NextResponse.json({ appointments: [] });
    const rows = d.prepare(`
      SELECT
        a.id, a.appointment_ts, a.service_type, a.status,
        COALESCE(a.duration_minutes, 60) AS duration_minutes,
        doc.name AS doctor_name
      FROM appointments a
      LEFT JOIN doctors doc ON doc.id = a.doctor_id
      WHERE a.patient_id = ?
        AND date(replace(a.appointment_ts,'T',' ')) = ?
        AND a.status NOT IN ('no_show','rescheduled')
      ORDER BY a.appointment_ts
    `).all(patient.id, dateParam) as object[];
    return NextResponse.json({ appointments: rows });
  }

  // Normal listing mode: ?date=...&branch_id=...
  const date = dateParam ?? new Date().toISOString().slice(0, 10);
  const branchId = req.nextUrl.searchParams.get("branch_id");
  const rows = getAppointments(date, branchId ? Number(branchId) : undefined);
  return NextResponse.json({ rows });
}

export async function POST(req: NextRequest) {
  const { phone, service_type, appointment_ts } = await req.json();
  if (!phone || !service_type || !appointment_ts) {
    return NextResponse.json({ error: "phone, service_type, appointment_ts required" }, { status: 400 });
  }
  const d = db();
  const patient = d.prepare("SELECT id, home_branch_id FROM patients WHERE phone = ?").get(phone) as { id: number; home_branch_id: number } | undefined;
  if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  const result = d.prepare(`
    INSERT INTO appointments (patient_id, branch_id, appointment_ts, service_type, status, lead_type, disposition, sub_disposition)
    VALUES (?, ?, ?, ?, 'booked', 'call', 'Package Session', 'Existing Patient')
  `).run(patient.id, patient.home_branch_id, appointment_ts, service_type);
  return NextResponse.json({ id: result.lastInsertRowid, appointment_ts });
}
