import { NextRequest, NextResponse } from "next/server";
import { updateAppointmentStatus, updateAppointmentTime, db } from "@/lib/db";

export const dynamic = "force-dynamic";

// These are actual columns on the appointments table
const APPT_FIELDS = new Set([
  "service_type", "doctor_id", "disposition", "sub_disposition",
  "lead_type", "campaign", "referred_by", "notes",
]);

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  const body = await req.json();

  if (body.status) updateAppointmentStatus(id, body.status);
  if (body.appointment_ts) updateAppointmentTime(id, body.appointment_ts);

  // Update appointment-table fields
  const apptFields = Object.keys(body).filter(k => APPT_FIELDS.has(k));
  if (apptFields.length > 0) {
    const set = apptFields.map(f => `${f} = ?`).join(", ");
    db().prepare(`UPDATE appointments SET ${set} WHERE id = ?`).run(
      ...apptFields.map(f => body[f]),
      id
    );
  }

  // email lives on patients table
  if (body.email !== undefined) {
    const appt = db().prepare("SELECT patient_id FROM appointments WHERE id = ?").get(id) as any;
    if (appt) {
      db().prepare("UPDATE patients SET email = ? WHERE id = ?").run(body.email, appt.patient_id);
    }
  }

  return NextResponse.json({ ok: true });
}
