import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { RxRow } from "@/lib/types";

// PATCH: clinic manager fills/updates the cost of prescription rows.
// Body: { costs: { [rowIndex: number]: number | null }, dispensing_fee_inr?: number }
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const rxId = Number(params.id);
  if (!rxId) return NextResponse.json({ error: "Invalid prescription id" }, { status: 400 });

  const body = await req.json();
  const costs: Record<string, number | null> = body.costs ?? {};

  const d = db();
  const row = d.prepare(`SELECT * FROM prescriptions WHERE id = ?`).get(rxId) as any;
  if (!row) return NextResponse.json({ error: "Prescription not found" }, { status: 404 });

  let items: RxRow[] = [];
  try {
    items = JSON.parse(row.items_json || "[]");
  } catch {
    items = [];
  }

  items = items.map((it, i) => {
    if (Object.prototype.hasOwnProperty.call(costs, String(i))) {
      const c = costs[String(i)];
      return { ...it, cost: c === null || c === undefined ? null : Number(c) };
    }
    return it;
  });

  const dispensing =
    body.dispensing_fee_inr !== undefined ? Number(body.dispensing_fee_inr) : row.dispensing_fee_inr;

  const updated = d
    .prepare(
      `UPDATE prescriptions SET items_json = ?, dispensing_fee_inr = ? WHERE id = ? RETURNING *`
    )
    .get(JSON.stringify(items), dispensing, rxId) as any;

  return NextResponse.json({ prescription: { ...updated, items } });
}
