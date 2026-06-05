import { NextRequest, NextResponse } from "next/server";
import { db, ROOT, lookupCatalogPrice, getPatientPortfolio } from "@/lib/db";
import type { RxRow } from "@/lib/types";
import fs from "node:fs";
import path from "node:path";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const patientId = Number(params.id);
  if (!patientId) return NextResponse.json({ error: "Invalid patient id" }, { status: 400 });
  const portfolio = getPatientPortfolio(patientId);
  if (!portfolio) return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  return NextResponse.json({
    patient: portfolio.patient,
    prescriptions: portfolio.prescriptions,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const patientId = Number(params.id);
  if (!patientId) return NextResponse.json({ error: "Invalid patient id" }, { status: 400 });

  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    // Image / scan upload
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const regimenNotes = (formData.get("regimen_notes") as string) ?? null;
    const doctorId = formData.get("doctor_id") ? Number(formData.get("doctor_id")) : null;

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const ext = file.name.split(".").pop() ?? "jpg";
    const filename = `p${patientId}_${Date.now()}.${ext}`;
    const dir = path.join(ROOT, "public", "prescriptions");
    fs.mkdirSync(dir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(path.join(dir, filename), buffer);

    const result = db()
      .prepare(
        `INSERT INTO prescriptions (patient_id, doctor_id, items_json, regimen_notes, image_path, source_type)
         VALUES (?, ?, ?, ?, ?, 'image') RETURNING *`
      )
      .get(patientId, doctorId, "[]", regimenNotes, `prescriptions/${filename}`) as any;

    return NextResponse.json({ prescription: { ...result, items: [] } });
  }

  // JSON body — text or voice
  const body = await req.json();
  const {
    items = [],
    regimen_notes = null,
    clinical_recommendation = null,
    dispensing_fee_inr = 60,
    doctor_id = null,
    session_id = null,
    source_type = "text",
  } = body;

  if (!Array.isArray(items)) {
    return NextResponse.json({ error: "items must be an array" }, { status: 400 });
  }

  // Normalize rows and auto-fill any missing cost from the catalog.
  const rows: RxRow[] = items
    .map((it: any): RxRow => {
      const product = String(it.product ?? "").trim();
      const cost =
        it.cost === null || it.cost === undefined || it.cost === ""
          ? lookupCatalogPrice(product)
          : Number(it.cost);
      return {
        problem: it.problem ? String(it.problem).trim() : null,
        problem_type:
          it.problem_type === "chronic" || it.problem_type === "acute" ? it.problem_type : null,
        product,
        product_detail: it.product_detail ? String(it.product_detail).trim() : null,
        dosage: String(it.dosage ?? "").trim(),
        dosage_detail: it.dosage_detail ? String(it.dosage_detail).trim() : null,
        cost: Number.isFinite(cost as number) ? (cost as number) : null,
      };
    })
    .filter((it: RxRow) => it.product);

  const result = db()
    .prepare(
      `INSERT INTO prescriptions
        (patient_id, session_id, doctor_id, items_json, regimen_notes, clinical_recommendation, dispensing_fee_inr, source_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`
    )
    .get(
      patientId,
      session_id,
      doctor_id,
      JSON.stringify(rows),
      regimen_notes,
      clinical_recommendation,
      dispensing_fee_inr,
      source_type
    ) as any;

  return NextResponse.json({ prescription: { ...result, items: rows } });
}
