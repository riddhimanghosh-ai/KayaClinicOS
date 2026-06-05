import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * POST /api/manager/ops-reset
 * Wipes all practitioner_sessions and fno_sessions and resets appointment
 * statuses back to demo values so the Treatment & FnO flow can be demoed again.
 */
export async function POST() {
  try {
    const d = db();

    // Clear all treatment and FnO session data
    d.prepare("DELETE FROM fno_sessions").run();
    d.prepare("DELETE FROM practitioner_sessions").run();

    // Reset appointment statuses to a demo-ready mix:
    // arrived / in_session / converted  →  arrived / arrived / arrived (ready to work)
    // booked / no_show stay as-is
    d.prepare(`
      UPDATE appointments
      SET status = CASE
        WHEN status IN ('converted', 'in_session') THEN 'arrived'
        ELSE status
      END
      WHERE status IN ('converted', 'in_session', 'arrived')
    `).run();

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}
