import { db } from "./db";
import { chatJSON } from "./llm";
import type { ExtractedTags } from "./types";

const TAG_SCHEMA_EXAMPLE = {
  primary_concern: "deep_dermal_melasma",
  barrier_status: "intact | thin | compromised",
  next_recommended_service: "name from services catalog or null",
  product_adherence_score: "integer 0-10",
  active_acne_status: "active | resolving | resolved",
  scar_treatment_candidate: "0 or 1",
  treatment_ready_for: "free-form short tag e.g. Q_Switch_Laser or null",
  free_tags: { any_extra_observations: "as a flat object" },
};

const SYSTEM_PROMPT =
  "You are a clinical NLP extractor for a dermatology chain (Kaya Skin Clinic, India). " +
  "You read short post-consultation notes written by a doctor in free text and extract structured tags. " +
  "Always output a single JSON object that matches the schema below. " +
  "Use null when a field is unknown. Never invent observations.\n" +
  "Schema:\n" +
  JSON.stringify(TAG_SCHEMA_EXAMPLE, null, 2);

export async function extractTags(noteText: string): Promise<ExtractedTags> {
  const user =
    "Extract structured tags from the following post-consultation note. Output JSON only.\n\nNOTE:\n" +
    noteText.trim();
  const raw = await chatJSON(SYSTEM_PROMPT, user, 400);
  return normalize(raw);
}

function strOrNull(v: any): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function intOrNull(v: any): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function normalize(raw: any): ExtractedTags {
  let scar = raw?.scar_treatment_candidate;
  if (typeof scar === "string") {
    scar = ["1", "true", "yes", "y"].includes(scar.toLowerCase()) ? 1 : 0;
  } else if (typeof scar === "boolean") {
    scar = scar ? 1 : 0;
  } else {
    scar = intOrNull(scar) ?? 0;
  }
  scar = scar ? 1 : 0;

  let freeTags = raw?.free_tags ?? {};
  if (typeof freeTags !== "object" || Array.isArray(freeTags)) {
    freeTags = { raw: String(freeTags) };
  }

  return {
    primary_concern: strOrNull(raw?.primary_concern),
    barrier_status: strOrNull(raw?.barrier_status),
    next_recommended_service: strOrNull(raw?.next_recommended_service),
    product_adherence_score: intOrNull(raw?.product_adherence_score),
    active_acne_status: strOrNull(raw?.active_acne_status),
    scar_treatment_candidate: scar,
    treatment_ready_for: strOrNull(raw?.treatment_ready_for),
    free_tags: freeTags,
  };
}

export type SavedTags = ExtractedTags & {
  id: number;
  patient_id: number;
  session_id: number | null;
};

export function persistTags(
  patientId: number,
  sessionId: number | null,
  rawText: string,
  tags: ExtractedTags
): SavedTags {
  const d = db();
  d.prepare(
    "INSERT INTO doctor_notes_raw (session_id, patient_id, raw_text) VALUES (?, ?, ?)"
  ).run(sessionId, patientId, rawText);
  const info = d
    .prepare(
      `INSERT INTO doctor_tags (patient_id, session_id, primary_concern, barrier_status,
        next_recommended_service, product_adherence_score, active_acne_status,
        scar_treatment_candidate, treatment_ready_for, free_tags_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      patientId,
      sessionId,
      tags.primary_concern,
      tags.barrier_status,
      tags.next_recommended_service,
      tags.product_adherence_score,
      tags.active_acne_status,
      tags.scar_treatment_candidate,
      tags.treatment_ready_for,
      JSON.stringify(tags.free_tags ?? {})
    );
  return { ...tags, id: Number(info.lastInsertRowid), patient_id: patientId, session_id: sessionId };
}

export async function extractAndSave(
  patientId: number,
  sessionId: number | null,
  rawText: string
): Promise<SavedTags> {
  const tags = await extractTags(rawText);
  return persistTags(patientId, sessionId, rawText, tags);
}

// ---------------------------------------------------------------------------
// Flexible cohort data-point extraction from a (PII-masked) consultation.
// Returns a flat { key: value } map; new keys need no schema change.
// ---------------------------------------------------------------------------

const ATTR_SYSTEM =
  "You extract structured patient data points from a dermatology/trichology consultation transcript (Kaya Skin Clinic, India). " +
  "Output a single FLAT JSON object of key → short string value (join multiple values with commas, no arrays). " +
  "Only include data points actually stated in the transcript. Use snake_case keys. " +
  "Do not invent values. Do not include personal identifiers (names, phone, email, address).\n\n" +
  "Useful keys when present:\n" +
  "skin_type (oily/dry/combination/normal/sensitive), " +
  "hair_type (normal/oily/dry/frizzy/fine/thick), " +
  "hair_condition (thinning/shedding/brittle/healthy), " +
  "scalp_condition (dry/oily/flaky/sensitive/normal), " +
  "hair_loss_type (androgenic/telogen_effluvium/alopecia_areata/other), " +
  "primary_concern (e.g. hair_loss / acne / pigmentation / dry_scalp), " +
  "secondary_concern, " +
  "symptoms (comma-separated, e.g. 'dry skin, hair thinning, dandruff'), " +
  "symptom_duration (e.g. '3 months'), " +
  "current_medications (comma-separated, e.g. 'minoxidil, biotin'), " +
  "allergies (comma-separated known allergies), " +
  "height_cm, weight_kg, age, " +
  "diet (e.g. vegetarian / protein-deficient / balanced), " +
  "water_intake (e.g. low / 2 litres daily), " +
  "sleep_hours, sleep_cycle (regular/irregular), " +
  "smoking (yes/no/unknown), alcohol (yes/no/unknown), " +
  "stress_level (high/medium/low), " +
  "sun_exposure (high/moderate/low), " +
  "family_history (e.g. male pattern baldness / diabetes), " +
  "treatment_plan (comma-separated planned treatments, e.g. 'PRP, Minoxidil 5%, Biotin'), " +
  "follow_up_weeks (e.g. 6), " +
  "patient_concerns (main concerns the patient voiced, comma-separated).";

export async function extractAttributes(maskedText: string): Promise<Record<string, string>> {
  let raw: Record<string, any> = {};
  try {
    raw = await chatJSON(ATTR_SYSTEM, "Transcript:\n" + maskedText.trim(), 600);
  } catch {
    raw = {};
  }
  const EMPTY = new Set([
    "", "none", "n/a", "na", "null", "nil", "-", "unknown", "not mentioned",
    "not stated", "not specified", "not provided", "not applicable", "no",
  ]);
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw || {})) {
    if (v == null) continue;
    const key = String(k).trim().toLowerCase().replace(/\s+/g, "_");
    const val = typeof v === "object" ? JSON.stringify(v) : String(v).trim();
    if (key && val && !EMPTY.has(val.toLowerCase())) out[key] = val;
  }
  // Lightweight regex backstop so mock/offline mode still surfaces common points.
  const t = maskedText;
  const grab = (re: RegExp, key: string, unit = "") => {
    if (out[key]) return;
    const m = t.match(re);
    if (m) out[key] = (m[1] + unit).trim();
  };
  grab(/(\d{2,3})\s?(?:kg|kilograms?)\b/i, "weight_kg");
  grab(/(\d{2,3})\s?(?:cm|centimet)/i, "height_cm");
  grab(/\b(normal|oily|dry|combination|sensitive)\s+skin\b/i, "skin_type");
  return out;
}
