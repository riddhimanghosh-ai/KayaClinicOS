import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  if (!q || q.length < 2) {
    return NextResponse.json({ patients: [] });
  }
  const like = `%${q}%`;
  const patients = db()
    .prepare(
      `SELECT id, name, phone, email FROM patients
       WHERE name LIKE ? OR phone LIKE ?
       ORDER BY name
       LIMIT 20`
    )
    .all(like, like) as Array<{ id: number; name: string; phone: string; email: string | null }>;
  return NextResponse.json({ patients });
}
