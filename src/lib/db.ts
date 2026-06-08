import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import type {
  Branch,
  Doctor,
  Patient,
  Service,
  Product,
  Package,
  Session,
  DoctorTags,
  RawNote,
  SkinPhoto,
  Prescription,
  WhatsAppMessage,
  CheckIn,
  FinancialSummary,
  PatientPortfolio,
  ClinicStatus,
  ClinicAppliance,
  ClinicOffer,
} from "./types";

export const ROOT = path.resolve(process.cwd());
const SOURCE_DB = path.join(ROOT, "data", "kaya.db");
// On Vercel/Amplify the deployment filesystem is read-only; use /tmp for a writable copy.
const IS_VERCEL = Boolean(process.env.VERCEL);
const IS_AMPLIFY = Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
const TMP_DB = "/tmp/kaya.db";
export const DB_PATH = IS_VERCEL || IS_AMPLIFY ? TMP_DB : SOURCE_DB;
export const PHOTOS_DIR = path.join(ROOT, "public", "photos");

let _db: Database.Database | null = null;

export function db(): Database.Database {
  if (_db) return _db;
  let freshCopy = false;
  if (IS_VERCEL || IS_AMPLIFY) {
    // Cold start: copy the pre-seeded DB from the build artifact to /tmp.
    // Also re-copy if /tmp exists but is empty/smaller than source (stale file).
    if (fs.existsSync(SOURCE_DB)) {
      const srcSize = fs.statSync(SOURCE_DB).size;
      const tmpSize = fs.existsSync(TMP_DB) ? fs.statSync(TMP_DB).size : -1;
      if (tmpSize < srcSize) {
        try { fs.copyFileSync(SOURCE_DB, TMP_DB); freshCopy = true; } catch {}
      }
    }
  } else {
    fs.mkdirSync(path.dirname(SOURCE_DB), { recursive: true });
  }
  fs.mkdirSync(PHOTOS_DIR, { recursive: true });
  const handle = new Database(DB_PATH);
  handle.pragma("journal_mode = WAL");
  handle.pragma("foreign_keys = ON");
  _db = handle;
  initSchema(handle);
  // Only reset demo ops data on a fresh Amplify/Vercel cold start (not on every local dev restart)
  if (freshCopy) resetOpsDemo(handle);
  return handle;
}

// ---------------------------------------------------------------------------
// Demo consultation — always present, based on the real Kaya hair-loss case.
// PII is already masked; this is what the doctor would see in the UI.
// ---------------------------------------------------------------------------
const DEMO_TRANSCRIPT = `[person]: Hello doctor, I've been losing a lot of hair recently and my scalp is very dry and flaky.

Doctor: I see. Let's examine the scalp. How long has this been going on?

[person]: About 4–5 months. I've tried different shampoos and I was using minoxidil sometimes — around 0.5 to 1% — but not consistently.

Doctor: I can see clear androgenic pattern hair loss. The scalp is dry as well. Any family history?

[person]: Yes, my father had early hair loss.

Doctor: Makes sense. Any supplements or medications currently?

[person]: I've been taking biotin on and off and tried some other oral supplements, but haven't seen much improvement.

Doctor: Here's our treatment plan: we'll start PRP/GFC therapy — three sessions about 20–25 days apart, then monthly maintenance as needed. You must apply Minoxidil at 5% concentration every single day — consistency is critical. Add oral biotin daily and an anti-hair-fall serum. For the dry scalp, switch to a gentle sulfate-free shampoo and a moisturising cleanser. Apply SPF 30+ on exposed skin daily.

[person]: How long before I can expect results?

Doctor: PRP typically shows results in 3–6 months. Minoxidil takes 4–6 months of consistent use. Come back in 6–8 weeks so we can assess the response. We can also arrange your sessions at our Mumbai clinic if that's more convenient.

[person]: Okay. What is the cost per PRP session?

Doctor: Our coordinator will give you the full pricing breakdown for the GFC/PRP package.`;

// ---------------------------------------------------------------------------
// Purge all session (non-seed) consultations and their attributes.
// Called on every /doctor page render so recordings from a previous session
// don't accumulate. Seed consultation is always preserved.
// ---------------------------------------------------------------------------
export function purgeSessionConsultations(): void {
  const d = db();
  try {
    d.exec(`
      DELETE FROM patient_attributes
      WHERE consultation_id IN (
        SELECT id FROM consultations WHERE is_seed IS NOT 1
      )
    `);
    d.exec("DELETE FROM consultations WHERE is_seed IS NOT 1");
  } catch {}
}

export function purgeSessionPrescriptions(): void {
  const d = db();
  try {
    d.exec("DELETE FROM prescriptions WHERE is_seed IS NOT 1");
  } catch {}
}

// ---------------------------------------------------------------------------
// Reset today's demo appointments back to their seeded statuses and wipe any
// practitioner/FnO sessions created during the demo. Called on every
// /manager/appointments page render so the schedule board is always fresh.
//
// Booking numbers are deterministic (KAYA{200000 + i*137}), so we hardcode
// the canonical seed status per booking number — this is resilient against
// backfill capturing a stale/modified status.
// ---------------------------------------------------------------------------
const KAYA_SEED_STATUSES: Record<string, string> = {
  KAYA200000: "done",
  KAYA200137: "in_consultation",
  KAYA200274: "consultation_done",
  KAYA200411: "arrived",          // Treatment & FnO: pending treatment
  KAYA200548: "booked",
  KAYA200685: "in_treatment",     // Treatment & FnO: session in progress
  KAYA200822: "converted",        // Treatment & FnO: treatment done, FnO pending
  KAYA200959: "booked",
  KAYA201096: "confirmed",
  KAYA201233: "arrived",          // Treatment & FnO: pending treatment
  KAYA201370: "consultation_done",
  KAYA201507: "converted",        // Treatment & FnO: fully complete (ps + fno done)
};

export function resetDemoSchedule(): void {
  const d = db();
  try {
    const today = new Date().toISOString().slice(0, 10);
    // Restore each appointment to its canonical seed status
    const stmt = d.prepare(`
      UPDATE appointments SET status = ?, seed_status = ?
      WHERE contact_booking_number = ? AND date(appointment_ts) = ?
    `);
    for (const [bookingNum, status] of Object.entries(KAYA_SEED_STATUSES)) {
      stmt.run(status, status, bookingNum, today);
    }
    // Wipe practitioner sessions and FnO sessions tied to today's seeded appointments
    d.prepare(`
      DELETE FROM practitioner_sessions
      WHERE appointment_id IN (
        SELECT id FROM appointments
        WHERE contact_booking_number LIKE 'KAYA%' AND date(appointment_ts) = ?
      )
    `).run(today);
    d.prepare(`
      DELETE FROM fno_sessions
      WHERE appointment_id IN (
        SELECT id FROM appointments
        WHERE contact_booking_number LIKE 'KAYA%' AND date(appointment_ts) = ?
      )
    `).run(today);

    // Seed rich practitioner + FnO sessions so Treatment & FnO shows all demo states
    type ApptIdRow = { id: number };

    // KAYA200685 — in_treatment: session in progress, consent signed
    const inTreatAppt = d.prepare(
      "SELECT id FROM appointments WHERE contact_booking_number = ? AND date(appointment_ts) = ?"
    ).get("KAYA200685", today) as ApptIdRow | undefined;
    if (inTreatAppt) {
      d.prepare(`
        INSERT INTO practitioner_sessions (appointment_id, patient_id, status, consent_signed, started_at)
        SELECT ?, patient_id, 'in_progress', 1, datetime('now', '-22 minutes')
        FROM appointments WHERE id = ?
      `).run(inTreatAppt.id, inTreatAppt.id);
    }

    // KAYA200822 — converted: treatment complete, FnO pending
    const fnoAppt = d.prepare(
      "SELECT id FROM appointments WHERE contact_booking_number = ? AND date(appointment_ts) = ?"
    ).get("KAYA200822", today) as ApptIdRow | undefined;
    if (fnoAppt) {
      d.prepare(`
        INSERT INTO practitioner_sessions (appointment_id, patient_id, status, consent_signed, started_at, completed_at, treatment_notes)
        SELECT ?, patient_id, 'completed', 1, datetime('now', '-95 minutes'), datetime('now', '-55 minutes'), 'Procedure completed successfully. Patient tolerated well. No adverse reactions.'
        FROM appointments WHERE id = ?
      `).run(fnoAppt.id, fnoAppt.id);
    }

    // KAYA201507 — converted: fully complete (ps completed + fno submitted)
    const doneAppt = d.prepare(
      "SELECT id FROM appointments WHERE contact_booking_number = ? AND date(appointment_ts) = ?"
    ).get("KAYA201507", today) as ApptIdRow | undefined;
    if (doneAppt) {
      d.prepare(`
        INSERT INTO practitioner_sessions (appointment_id, patient_id, status, consent_signed, started_at, completed_at, treatment_notes)
        SELECT ?, patient_id, 'completed', 1, datetime('now', '-150 minutes'), datetime('now', '-110 minutes'), 'Full session completed. Laser parameters documented. Follow-up in 4 weeks.'
        FROM appointments WHERE id = ?
      `).run(doneAppt.id, doneAppt.id);
      d.prepare(
        "INSERT INTO fno_sessions (appointment_id, status, submitted_at) VALUES (?, 'submitted', datetime('now', '-100 minutes'))"
      ).run(doneAppt.id);
    }
  } catch {}
}

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS branches (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    city TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS doctors (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    specialty TEXT NOT NULL,
    home_branch_id INTEGER REFERENCES branches(id)
);

CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    email TEXT,
    gender TEXT,
    dob TEXT,
    city TEXT,
    state TEXT,
    marital_status TEXT,
    guest_code TEXT,
    home_branch_id INTEGER REFERENCES branches(id),
    premium_tier TEXT DEFAULT 'standard',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS services_catalog (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price_inr INTEGER NOT NULL,
    periodic_days INTEGER,
    description TEXT,
    item_code TEXT,
    is_new_launch INTEGER DEFAULT 0,
    discount_pct INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS products_catalog (
    id INTEGER PRIMARY KEY,
    sku TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price_inr INTEGER NOT NULL,
    description TEXT,
    item_code TEXT,
    is_new_launch INTEGER DEFAULT 0,
    discount_pct INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS packages_purchased (
    id INTEGER PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id),
    service_id INTEGER NOT NULL REFERENCES services_catalog(id),
    sessions_total INTEGER NOT NULL,
    sessions_used INTEGER NOT NULL DEFAULT 0,
    collection_paid_inr INTEGER NOT NULL,
    purchase_date TEXT NOT NULL,
    expiry_date TEXT,
    order_number TEXT
);

CREATE TABLE IF NOT EXISTS sessions_consumed (
    id INTEGER PRIMARY KEY,
    package_id INTEGER REFERENCES packages_purchased(id),
    patient_id INTEGER NOT NULL REFERENCES patients(id),
    branch_id INTEGER NOT NULL REFERENCES branches(id),
    doctor_id INTEGER NOT NULL REFERENCES doctors(id),
    session_date TEXT NOT NULL,
    units_used INTEGER,
    service_name_snapshot TEXT,
    session_type TEXT DEFAULT 'treatment'
);

CREATE TABLE IF NOT EXISTS product_purchases (
    id INTEGER PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id),
    product_id INTEGER NOT NULL REFERENCES products_catalog(id),
    qty INTEGER NOT NULL DEFAULT 1,
    price_paid_inr INTEGER NOT NULL,
    purchase_date TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS check_ins (
    id INTEGER PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id),
    branch_id INTEGER NOT NULL REFERENCES branches(id),
    doctor_id INTEGER REFERENCES doctors(id),
    check_in_ts TEXT NOT NULL,
    status TEXT DEFAULT 'waiting'
);

CREATE TABLE IF NOT EXISTS doctor_notes_raw (
    id INTEGER PRIMARY KEY,
    session_id INTEGER REFERENCES sessions_consumed(id),
    doctor_id INTEGER REFERENCES doctors(id),
    patient_id INTEGER NOT NULL REFERENCES patients(id),
    raw_text TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS doctor_tags (
    id INTEGER PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id),
    session_id INTEGER REFERENCES sessions_consumed(id),
    primary_concern TEXT,
    barrier_status TEXT,
    next_recommended_service TEXT,
    product_adherence_score INTEGER,
    active_acne_status TEXT,
    scar_treatment_candidate INTEGER,
    treatment_ready_for TEXT,
    free_tags_json TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS skin_photos (
    id INTEGER PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id),
    visit_date TEXT NOT NULL,
    region TEXT NOT NULL,
    image_path TEXT NOT NULL,
    uploaded_by_branch_id INTEGER REFERENCES branches(id)
);

CREATE TABLE IF NOT EXISTS prescriptions (
    id INTEGER PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id),
    session_id INTEGER REFERENCES sessions_consumed(id),
    doctor_id INTEGER REFERENCES doctors(id),
    items_json TEXT NOT NULL,
    regimen_notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS whatsapp_queue (
    id INTEGER PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id),
    cohort_name TEXT NOT NULL,
    message_body TEXT NOT NULL,
    discount_code TEXT,
    status TEXT NOT NULL DEFAULT 'queued',
    generated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    sent_at TEXT
);

CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL REFERENCES patients(id),
    branch_id INTEGER NOT NULL REFERENCES branches(id),
    doctor_id INTEGER REFERENCES doctors(id),
    service_type TEXT NOT NULL DEFAULT 'Consultation',
    appointment_ts TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'booked',
    contact_booking_number TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    referred_by TEXT,
    duration_minutes INTEGER DEFAULT 45,
    disposition TEXT,
    sub_disposition TEXT,
    lead_type TEXT DEFAULT 'call',
    campaign TEXT
);

CREATE TABLE IF NOT EXISTS practitioner_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  appointment_id INTEGER REFERENCES appointments(id),
  patient_id INTEGER NOT NULL REFERENCES patients(id),
  photos_json TEXT DEFAULT '[]',
  consent_signed INTEGER DEFAULT 0,
  medical_history TEXT,
  body_type TEXT,
  treatment_notes TEXT,
  started_at TEXT,
  completed_at TEXT,
  status TEXT DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS fno_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  appointment_id INTEGER REFERENCES appointments(id),
  patient_id INTEGER NOT NULL REFERENCES patients(id),
  service_type TEXT NOT NULL,
  bom_items_json TEXT DEFAULT '[]',
  submitted_at TEXT,
  status TEXT DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS consultations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES patients(id),
  appointment_id INTEGER REFERENCES appointments(id),
  doctor_id INTEGER REFERENCES doctors(id),
  transcript_masked TEXT NOT NULL,
  transcript_encrypted TEXT,
  pii_map_encrypted TEXT,
  duration_sec INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS patient_attributes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES patients(id),
  consultation_id INTEGER REFERENCES consultations(id),
  key TEXT NOT NULL,
  value TEXT,
  source TEXT DEFAULT 'consultation',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_consultations_patient ON consultations(patient_id, created_at);
CREATE INDEX IF NOT EXISTS idx_attributes_patient ON patient_attributes(patient_id, key);
CREATE INDEX IF NOT EXISTS idx_sessions_patient ON sessions_consumed(patient_id, session_date);
CREATE INDEX IF NOT EXISTS idx_packages_patient ON packages_purchased(patient_id);
CREATE INDEX IF NOT EXISTS idx_tags_patient ON doctor_tags(patient_id, created_at);
CREATE INDEX IF NOT EXISTS idx_photos_patient ON skin_photos(patient_id, visit_date);
CREATE INDEX IF NOT EXISTS idx_whatsapp_status ON whatsapp_queue(status, generated_at);
`;

export function initSchema(handle?: Database.Database): void {
  const d = handle ?? db();
  d.exec(SCHEMA);
  // Additive migrations — safe to run multiple times
  try { d.exec("ALTER TABLE prescriptions ADD COLUMN image_path TEXT"); } catch {}
  try { d.exec("ALTER TABLE prescriptions ADD COLUMN source_type TEXT DEFAULT 'text'"); } catch {}
  try { d.exec("ALTER TABLE prescriptions ADD COLUMN clinical_recommendation TEXT"); } catch {}
  try { d.exec("ALTER TABLE prescriptions ADD COLUMN dispensing_fee_inr INTEGER DEFAULT 60"); } catch {}
  try { d.exec("ALTER TABLE prescriptions ADD COLUMN is_seed INTEGER DEFAULT 0"); } catch {}

  // Seed demo prescriptions — always refresh seeds so content stays up to date.
  try {
    d.prepare("DELETE FROM prescriptions WHERE is_seed = 1").run();
    const seedPatients = d.prepare("SELECT id FROM patients ORDER BY id LIMIT 8").all() as any[];
    const RX_SEEDS = [
      {
        items: JSON.stringify([
          { problem: "Androgenic Alopecia", problem_type: "chronic", product: "GFC Hair Treatment", product_detail: "In-clinic procedure · scalp injection", dosage: "1 session every 20–25 days · 4 sessions", dosage_detail: "Growth factor concentrate protocol — then monthly maintenance", cost: 4500 },
          { problem: "Androgenic Alopecia", problem_type: "chronic", product: "Minoxidil 5% Solution", product_detail: "Topical · 60 ml", dosage: "Apply 1 ml twice daily to affected scalp", dosage_detail: "Morning & evening · leave-on, do not rinse", cost: 850 },
          { problem: "Hair Thinning", problem_type: null, product: "Anti Hair-Fall Peptide Serum", product_detail: "50 ml", dosage: "Apply 3–4 drops to scalp nightly", dosage_detail: "Massage gently · leave-on overnight", cost: 1200 },
          { problem: "Hyperpigmentation", problem_type: "chronic", product: "Brightening Face Serum", product_detail: "30 ml", dosage: "Apply to affected areas AM & PM", dosage_detail: "After cleansing · before SPF in the morning", cost: 950 },
          { problem: "Skin Brightening", problem_type: null, product: "Brightening Night Cream", product_detail: "50 ml", dosage: "Apply to face every night as the last step", dosage_detail: "After serum · avoid eye area", cost: 900 },
          { problem: "Daily Protection", problem_type: null, product: "SPF 50 PA+++ Sunscreen", product_detail: "50 ml", dosage: "Generous application daily", dosage_detail: "AM · non-negotiable for pigmentation management", cost: 950 },
        ]),
        clinical: "Patient presents with androgenic (pattern) alopecia grade III with dry scalp. Starting GFC Therapy — 4 sessions at 20–25 day intervals, then monthly maintenance. Minoxidil 5% twice daily consistently. Concurrent brightening regimen for facial hyperpigmentation. Follow-up in 6–8 weeks.",
      },
        {
          items: JSON.stringify([
            { problem: "Post-inflammatory hyperpigmentation", problem_type: "chronic", product: "Tretinoin 0.025% Cream", product_detail: "15g tube", dosage: "Apply pea-sized amount", dosage_detail: "PM · nightly · avoid eye area", cost: 580 },
            { problem: "Active acne (hormonal)", problem_type: "acute", product: "Azelaic Acid 15% Gel", product_detail: "20g tube", dosage: "Spot treatment", dosage_detail: "PM · on active lesions only", cost: 490 },
            { problem: "Sun protection", problem_type: null, product: "SPF 50 PA+++ Sunscreen", product_detail: "50 ml", dosage: "Generous application", dosage_detail: "AM · reapply every 2h outdoors", cost: 950 },
            { problem: "Skin Hydration & Texture", problem_type: null, product: "HydraFacial Session", product_detail: "In-clinic procedure", dosage: "1 session every 4 weeks", dosage_detail: "Book with front desk · avoid active breakouts on day of session", cost: null },
            { problem: "Skin Brightening", problem_type: null, product: "Vitamin C Serum 15%", product_detail: "30 ml", dosage: "3–4 drops, apply to face", dosage_detail: "AM · before SPF · allow to absorb 2 min", cost: 1200 },
            { problem: "Sun protection", problem_type: null, product: "Mineral Sunscreen SPF 50+", product_detail: "50 ml", dosage: "Generous application · 2 fingers", dosage_detail: "AM · every 2–3h if outdoors", cost: 850 },
            { problem: "Pore refinement & Skin tone", problem_type: null, product: "Niacinamide 10% Serum", product_detail: "30 ml", dosage: "2–3 drops, apply to face", dosage_detail: "PM · after cleansing · before tretinoin (wait 10 min)", cost: 750 },
            { problem: "Skin barrier repair", problem_type: null, product: "Ceramide Moisturiser", product_detail: "50 ml", dosage: "Apply to face morning and night", dosage_detail: "Last step AM & PM · also acts as a buffer before tretinoin", cost: 900 },
          ]),
          clinical: "Mild PIH with hormonal acne component. Continuing maintenance regimen post Phase 2 peels. Adding HydraFacial monthly for deep-cleansing and hydration. Vitamin C AM for brightening, Niacinamide PM for pore refinement and tone. Emphasis on daily sun protection and nightly retinoid to sustain PIH improvement. Ceramide moisturiser to support barrier health.",
        },
        {
          items: JSON.stringify([
            { problem: "Laser Hair Reduction", problem_type: null, product: "PainFree Laser Session", product_detail: "Full legs · In-clinic procedure", dosage: "1 session every 4–6 weeks · 6 sessions total", dosage_detail: "Shave 24h before · avoid sun exposure 2 weeks after", cost: 3800 },
            { problem: "Sun protection (mandatory)", problem_type: null, product: "SPF 50 PA+++ Sunscreen", product_detail: "50 ml", dosage: "Apply daily to treated area", dosage_detail: "AM · mandatory post-laser — skip = pigmentation risk", cost: 950 },
            { problem: "Post-laser soothing", problem_type: null, product: "Aloe-Based Calming Gel", product_detail: "100 ml", dosage: "Apply to treated area after each session", dosage_detail: "Use for 3 days post-session · keep refrigerated for relief", cost: 650 },
            { problem: "Skin Barrier", problem_type: null, product: "Ceramide Body Lotion", product_detail: "200 ml", dosage: "Apply to treated area twice daily", dosage_detail: "Morning & evening · gentle massage", cost: 1100 },
          ]),
          clinical: "Ongoing laser hair reduction series — full legs. Currently session 3 of 6. Good hair reduction noted. Continue protocol. SPF and ceramide lotion mandatory throughout the series.",
        },
        {
          items: JSON.stringify([
            { problem: "Skin Hydration & Glow", problem_type: null, product: "HydraFacial Session", product_detail: "In-clinic · 60 min", dosage: "1 session every 4 weeks", dosage_detail: "Cleanse → extract → hydrate protocol", cost: 3200 },
            { problem: "Skin Brightening", problem_type: null, product: "Gluta Glow Face Serum", product_detail: "30 ml", dosage: "2–3 drops, apply to cleansed face AM & PM", dosage_detail: "Before moisturiser", cost: 1350 },
            { problem: "Skin Brightening", problem_type: null, product: "NUTRA+ Glutathione Powder", product_detail: "1 sachet per dose", dosage: "1 sachet daily · dissolve under tongue", dosage_detail: "Best taken on an empty stomach", cost: 800 },
            { problem: "Sun protection", problem_type: null, product: "SPF 50 PA+++ Sunscreen", product_detail: "50 ml", dosage: "Apply daily", dosage_detail: "AM · every morning without fail", cost: 950 },
            { problem: "Skin Hydration", problem_type: null, product: "Hyaluronic Acid Serum", product_detail: "30 ml", dosage: "2–3 drops, apply to damp skin", dosage_detail: "PM · before moisturiser", cost: 1100 },
          ]),
          clinical: "Post-HydraFacial maintenance plan. Skin barrier intact, excellent hydration. Recommend monthly HydraFacial sessions. Glutathione supplementation for sustained brightening. Daily SPF non-negotiable.",
        },
        {
          items: JSON.stringify([
            { problem: "Hair Thinning", problem_type: "chronic", product: "PRP Hair Treatment", product_detail: "In-clinic procedure · scalp injection", dosage: "1 session every 3–4 weeks · 4 sessions", dosage_detail: "Platelet-rich plasma — standard scalp protocol", cost: 5500 },
            { problem: "Scalp Health", problem_type: "chronic", product: "Sulfate-Free Gentle Shampoo", product_detail: "200 ml", dosage: "Twice weekly wash", dosage_detail: "Gentle massage, 2-min contact, rinse cool", cost: 750 },
            { problem: "Hair Thinning", problem_type: "chronic", product: "Biotin Tablets", product_detail: "30 tablets", dosage: "1 tablet daily with meals", dosage_detail: "Continue for 3 months, reassess", cost: 650 },
            { problem: "Hair Thinning", problem_type: "chronic", product: "Minoxidil 5% Solution", product_detail: "60 ml", dosage: "1 ml twice daily to scalp", dosage_detail: "Morning & night · do not rinse", cost: 850 },
            { problem: "Scalp Nourishment", problem_type: null, product: "Hair Growth Peptide Serum", product_detail: "50 ml", dosage: "Apply 3–4 drops to scalp nightly", dosage_detail: "Massage in circular motion · leave-on overnight", cost: 1800 },
          ]),
          clinical: "Diffuse hair thinning — telogen effluvium with androgenic component. Starting PRP therapy series of 4 sessions. Concurrent Minoxidil + Biotin home protocol. Dietary review recommended — increase protein and iron. Follow-up in 3 months with trichoscopy.",
        },
        {
          items: JSON.stringify([
            { problem: "Active Acne", problem_type: "acute", product: "Carbon Laser Peel", product_detail: "In-clinic procedure · full face", dosage: "1 session every 3–4 weeks · 4 sessions", dosage_detail: "Avoid retinoids 3 days before · gentle post-care 48h", cost: 2800 },
            { problem: "Active Acne", problem_type: "acute", product: "Clindamycin 1% Gel", product_detail: "20g tube", dosage: "Thin layer on acne-prone areas", dosage_detail: "PM · after cleansing · before moisturiser", cost: 420 },
            { problem: "Post-acne Marks", problem_type: "chronic", product: "Niacinamide 10% Serum", product_detail: "30 ml", dosage: "2–3 drops, apply to face", dosage_detail: "AM · before SPF · allow to absorb", cost: 750 },
            { problem: "Skin Barrier", problem_type: null, product: "Gentle Barrier Moisturiser", product_detail: "50 ml", dosage: "Apply twice daily", dosage_detail: "AM & PM · last step", cost: 850 },
            { problem: "Sun protection", problem_type: null, product: "SPF 50 PA+++ Sunscreen", product_detail: "50 ml", dosage: "Apply every morning", dosage_detail: "AM · mandatory — prevents PIH", cost: 950 },
          ]),
          clinical: "Grade 2 inflammatory acne with mild post-inflammatory hyperpigmentation. Starting Carbon Laser Peel series for active acne clearance. Topical antibiotic + niacinamide home regimen. Strict SPF compliance mandatory to prevent worsening of pigmentation.",
        },
        {
          items: JSON.stringify([
            { problem: "Melasma", problem_type: "chronic", product: "Q-Switch Laser Toning", product_detail: "In-clinic procedure · full face", dosage: "1 session every 4 weeks · 4 sessions", dosage_detail: "No retinoids 3 days before · strict SPF throughout course", cost: 3500 },
            { problem: "Melasma", problem_type: "chronic", product: "Kojic Acid 2% Serum", product_detail: "30 ml", dosage: "Apply to pigmented areas PM", dosage_detail: "After cleansing · before moisturiser · avoid eye area", cost: 1100 },
            { problem: "Melasma", problem_type: "chronic", product: "Vitamin C 15% Serum", product_detail: "30 ml", dosage: "3–4 drops, apply to face AM", dosage_detail: "Before SPF · allow 2 min to absorb", cost: 1200 },
            { problem: "Sun protection (critical)", problem_type: null, product: "SPF 50 PA++++ Tinted Sunscreen", product_detail: "50 ml", dosage: "Generous application · reapply every 2h outdoors", dosage_detail: "AM · non-negotiable — sun triggers melasma", cost: 1050 },
            { problem: "Hydration & Barrier", problem_type: null, product: "Ceramide Moisturiser", product_detail: "50 ml", dosage: "Apply morning and night", dosage_detail: "Last step AM & PM", cost: 900 },
          ]),
          clinical: "Grade 2 bilateral cheek melasma (Fitzpatrick IV). Post-glycolic peel phase, ready for Q-Switch Laser Toning series. Strict SPF compliance confirmed. Home regimen: Vitamin C AM, kojic acid PM. Total 4 monthly sessions. Realistic expectations discussed — maintenance required ongoing.",
        },
      ];
      const rxInsert = d.prepare(`
        INSERT INTO prescriptions (patient_id, items_json, clinical_recommendation, dispensing_fee_inr, source_type, is_seed)
        VALUES (?, ?, ?, 60, 'voice', 1)
      `);
      seedPatients.forEach((p: any, i: number) => {
        const seed = RX_SEEDS[i % RX_SEEDS.length];
        rxInsert.run(p.id, seed.items, seed.clinical);
      });
  } catch {}
  try { d.exec("ALTER TABLE whatsapp_queue ADD COLUMN scheduled_at TEXT"); } catch {}
  try { d.exec("ALTER TABLE whatsapp_queue ADD COLUMN edited_body TEXT"); } catch {}
  try { d.exec("ALTER TABLE patients ADD COLUMN guest_code TEXT"); } catch {}
  try { d.exec("ALTER TABLE patients ADD COLUMN marital_status TEXT"); } catch {}
  try { d.exec("ALTER TABLE patients ADD COLUMN state TEXT"); } catch {}
  try { d.exec("ALTER TABLE services_catalog ADD COLUMN item_code TEXT"); } catch {}
  try { d.exec("ALTER TABLE products_catalog ADD COLUMN item_code TEXT"); } catch {}
  try { d.exec("ALTER TABLE packages_purchased ADD COLUMN order_number TEXT"); } catch {}
  try { d.exec("ALTER TABLE services_catalog ADD COLUMN is_new_launch INTEGER DEFAULT 0"); } catch {}
  try { d.exec("ALTER TABLE products_catalog ADD COLUMN is_new_launch INTEGER DEFAULT 0"); } catch {}
  try { d.exec("ALTER TABLE services_catalog ADD COLUMN discount_pct INTEGER DEFAULT 0"); } catch {}
  try { d.exec("ALTER TABLE products_catalog ADD COLUMN discount_pct INTEGER DEFAULT 0"); } catch {}
  try { d.exec("ALTER TABLE products_catalog ADD COLUMN stock_qty INTEGER DEFAULT 0"); } catch {}
  try { d.exec("ALTER TABLE sessions_consumed ADD COLUMN session_type TEXT DEFAULT 'treatment'"); } catch {}
  try { d.exec("ALTER TABLE sessions_consumed ADD COLUMN treatment_notes TEXT"); } catch {}
  try { d.exec("ALTER TABLE appointments ADD COLUMN referred_by TEXT"); } catch {}
  try { d.exec("ALTER TABLE appointments ADD COLUMN duration_minutes INTEGER DEFAULT 45"); } catch {}
  try { d.exec("ALTER TABLE appointments ADD COLUMN disposition TEXT"); } catch {}
  try { d.exec("ALTER TABLE appointments ADD COLUMN sub_disposition TEXT"); } catch {}
  try { d.exec("ALTER TABLE appointments ADD COLUMN lead_type TEXT DEFAULT 'call'"); } catch {}
  try { d.exec("ALTER TABLE appointments ADD COLUMN campaign TEXT"); } catch {}
  // seed_status stores the original demo status so resetDemoSchedule() can restore it
  try { d.exec("ALTER TABLE appointments ADD COLUMN seed_status TEXT"); } catch {}
  // Backfill seed_status for KAYA-prefixed demo appointments that were seeded before this column existed
  try {
    d.exec(`
      UPDATE appointments SET seed_status = status
      WHERE seed_status IS NULL
        AND contact_booking_number LIKE 'KAYA%'
    `);
  } catch {}
  try {
    d.exec(`CREATE TABLE IF NOT EXISTS saved_cohorts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT NOT NULL,
      description TEXT,
      filter_json TEXT NOT NULL,
      discount_pct INTEGER NOT NULL DEFAULT 0,
      patient_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )`);
  } catch {}
  // Per-branch operational readiness published by the clinic manager for the call center.
  try {
    d.exec(`CREATE TABLE IF NOT EXISTS clinic_status (
      branch_id INTEGER PRIMARY KEY REFERENCES branches(id),
      is_open INTEGER NOT NULL DEFAULT 1,
      status_note TEXT,
      on_duty_doctor_id INTEGER REFERENCES doctors(id),
      doctor_on_leave INTEGER NOT NULL DEFAULT 0,
      doctor_leave_note TEXT,
      appliances_json TEXT NOT NULL DEFAULT '[]',
      offers_json TEXT NOT NULL DEFAULT '[]',
      updated_at TEXT DEFAULT (datetime('now')),
      updated_by TEXT
    )`);
  } catch {}
  // Seed today's appointments — re-seed if fewer than 10 to keep demo board full
  try {
    const today = new Date().toISOString().slice(0, 10);
    const cnt = (d.prepare("SELECT COUNT(*) as cnt FROM appointments WHERE date(appointment_ts) = ?").get(today) as any).cnt;
    if (cnt < 10) {
      const patients = d.prepare("SELECT id FROM patients ORDER BY id LIMIT 12").all() as any[];
      const SERVICES = [
        "Initial Consultation", "HydraFacial · Phase 2", "Carbon Laser Peel",
        "Acne Clearance Program", "Q-Switch Laser Toning", "Chemical Peel",
        "Follow-up Consultation", "Microneedling for Scars", "GFC Hair Treatment",
        "PRP Hair Therapy", "Laser Hair Reduction", "Initial Consultation",
      ];
      const TIMES      = ["09:00","09:30","10:00","10:30","11:00","11:30","12:00","14:00","14:30","15:00","15:30","16:00"];
      const DOCTOR_IDS = [1, 2, 1, 3, 2, 3, 1, 4, 2, 1, 3, 4];
      const DURATIONS  = [30, 60, 60, 45, 60, 45, 30, 75, 60, 60, 60, 30];
      const LEAD_TYPES = ['website_form','chatbot','call','referral','campaign','walk_in','call','referral','chatbot','walk_in','call','campaign'];
      const DISPOSITIONS = ['New Consultation','Follow-up Visit','Treatment Session','Package Session'];
      const SUB_DISPS    = ['New Patient','Existing Patient','Re-engagement','Referral Patient'];
      // Rich mix: new statuses included so schedule board shows all states
      const STATUSES = [
        'done', 'in_consultation', 'consultation_done',
        'arrived', 'booked', 'in_treatment',
        'treatment_done', 'booked', 'confirmed',
        'arrived', 'consultation_done', 'booked',
      ];
      patients.forEach((p: any, i: number) => {
        const branchId = i < 6 ? 1 : 2;
        d.prepare("INSERT OR IGNORE INTO appointments (patient_id, branch_id, doctor_id, service_type, appointment_ts, status, seed_status, contact_booking_number, disposition, sub_disposition, lead_type, duration_minutes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
          p.id, branchId, DOCTOR_IDS[i], SERVICES[i], `${today} ${TIMES[i]}:00`, STATUSES[i], STATUSES[i],
          `KAYA${String(200000 + i * 137)}`,
          DISPOSITIONS[i % DISPOSITIONS.length], SUB_DISPS[i % SUB_DISPS.length], LEAD_TYPES[i], DURATIONS[i]
        );
      });
    }
  } catch (_) {}

  // Seed historical demo appointments (2–3 days ago) for ops page if none exist beyond today
  try {
    const opsCount = (d.prepare("SELECT COUNT(*) as cnt FROM appointments WHERE status IN ('arrived','in_session','converted') AND date(appointment_ts) < date('now')").get() as any).cnt;
    if (opsCount === 0) {
      const patients = d.prepare("SELECT id FROM patients ORDER BY id LIMIT 6").all() as any[];
      const daysAgoStr = (n: number) => {
        const d2 = new Date(); d2.setDate(d2.getDate() - n);
        return d2.toISOString().slice(0, 10);
      };
      const HIST = [
        { daysAgo: 2, time: "10:30", svc: "Carbon Laser Peel",     status: "arrived",   doc: 1, branch: 1 },
        { daysAgo: 2, time: "11:00", svc: "Q-Switch Laser Toning", status: "converted", doc: 2, branch: 1 },
        { daysAgo: 1, time: "09:30", svc: "Microneedling for Scars", status: "converted", doc: 3, branch: 2 },
        { daysAgo: 1, time: "11:30", svc: "Chemical Peel",          status: "arrived",   doc: 1, branch: 2 },
        { daysAgo: 3, time: "10:00", svc: "Acne Clearance Program", status: "converted", doc: 2, branch: 1 },
        { daysAgo: 3, time: "14:00", svc: "GFC Hair Treatment",     status: "converted", doc: 3, branch: 2 },
      ];
      HIST.forEach((h, i) => {
        if (!patients[i]) return;
        const apptId = (d.prepare(
          "INSERT INTO appointments (patient_id, branch_id, doctor_id, service_type, appointment_ts, status, contact_booking_number, duration_minutes) VALUES (?,?,?,?,?,?,?,?) RETURNING id"
        ).get(patients[i].id, h.branch, h.doc, h.svc, `${daysAgoStr(h.daysAgo)} ${h.time}:00`, h.status, `VESC${700000 + i}`, 60) as any)?.id;
        if (!apptId) return;
        // Add a practitioner session for converted appointments
        if (h.status === "converted") {
          const psStatus = i < 2 ? "completed" : "in_progress";
          d.prepare("INSERT OR IGNORE INTO practitioner_sessions (appointment_id, status, consent_signed) VALUES (?, ?, 1)").run(apptId, psStatus);
          // Add FnO for one fully-complete appointment
          if (i === 1) {
            d.prepare("INSERT OR IGNORE INTO fno_sessions (appointment_id, status, submitted_at) VALUES (?, 'submitted', datetime('now'))").run(apptId);
          }
        }
      });
    }
  } catch (_) {}

  // Seed demo doctor notes if none exist
  try {
    const noteCount = (d.prepare("SELECT COUNT(*) as cnt FROM doctor_notes_raw").get() as any).cnt;
    if (noteCount === 0) {
      const now = new Date();
      const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000).toISOString().replace("T", " ").slice(0, 19);

      const alphaPatients = d.prepare("SELECT id FROM patients ORDER BY id LIMIT 8").all() as any[];
      const alphaInsert = d.prepare("INSERT INTO doctor_notes_raw (doctor_id, patient_id, raw_text, created_at) VALUES (?, ?, ?, ?)");
      const alphaNotes = [
        { daysAgo: 119, text: "Initial assessment: Active inflammatory acne grade 2 — comedones and 3 papules on bilateral cheeks and forehead. Skin barrier intact. Patient not using SPF regularly. Started Acne Clearance Program. Prescribed benzoyl peroxide 2.5% PM, gentle cleanser AM/PM, SPF 50 daily. Counselled on sun protection and avoiding self-extraction." },
        { daysAgo: 98, text: "Session 2 follow-up: Good progress — papule count reduced by 40%. Two residual pustules on right cheek. Salicylic acid wash added AM. Barrier intact. Compliance satisfactory. Discussed microneedling — minimum 3 months clearance required before candidacy. Continue current protocol." },
        { daysAgo: 21, text: "Final clearance check: Acne fully resolved. Barrier intact with excellent hydration. Confirmed microneedling candidate — rolling scars Grade 2 bilateral cheeks, boxcar scar left temple. RF microneedling series of 4 sessions recommended. First session to be scheduled in 2 weeks. Discontinue benzoyl peroxide, maintain SPF and barrier cream." },
      ];
      for (const p of alphaPatients) {
        for (const n of alphaNotes) {
          alphaInsert.run(1, p.id, n.text, daysAgo(n.daysAgo));
        }
      }

      const betaPatients = d.prepare("SELECT id FROM patients ORDER BY id LIMIT 14").all().slice(8) as any[];
      const betaInsert = d.prepare("INSERT INTO doctor_notes_raw (doctor_id, patient_id, raw_text, created_at) VALUES (?, ?, ?, ?)");
      const betaNotes = [
        { daysAgo: 89, text: "Initial consultation: Grade 3 bilateral cheek melasma (MASI 12), deep dermal pattern on Wood's lamp. Fitzpatrick Type IV. Previous OTC brighteners — minimal response. Starting Glycolic peel series. Prescribed: brightening serum AM, pigmentation corrector PM, strict SPF 50. Discussed 12-week trajectory and realistic outcome expectations." },
        { daysAgo: 20, text: "Q-Switch readiness review: Melasma intensity reduced ~35% after peel course. Excellent SPF compliance confirmed. Barrier intact, no post-inflammatory hyperpigmentation. Ready for Q-Switch Laser Toning. First session to proceed this week. Continue home regimen throughout. Total 4 monthly sessions planned with monthly review." },
      ];
      for (const p of betaPatients) {
        for (const n of betaNotes) {
          betaInsert.run(2, p.id, n.text, daysAgo(n.daysAgo));
        }
      }
    }
  } catch (_) {}

  // Seed doctor_tags for demo patients so cohorts always have data
  try {
    const tagCount = (d.prepare("SELECT COUNT(*) as cnt FROM doctor_tags").get() as any).cnt;
    if (tagCount === 0) {
      const now = new Date().toISOString().replace("T", " ").slice(0, 19);
      const daysAgo = (n: number) => { const t = new Date(); t.setDate(t.getDate() - n); return t.toISOString().replace("T"," ").slice(0,19); };

      // Alpha cohort patients (first 8): acne cleared → scar candidate
      const alphaPatients = d.prepare("SELECT id FROM patients ORDER BY id LIMIT 8").all() as any[];
      const alphaTag = d.prepare(`INSERT INTO doctor_tags (doctor_id, patient_id, primary_concern, active_acne_status, scar_treatment_candidate, barrier_status, next_recommended_service, product_adherence_score, treatment_ready_for, created_at)
        VALUES (1, ?, 'post_inflammatory_acne_scarring', 'resolved', 1, 'intact', 'Microneedling for Scars', 8, NULL, ?)`);
      for (const p of alphaPatients) alphaTag.run(p.id, daysAgo(21));

      // Beta cohort patients (next 6): melasma → Q-Switch ready
      const betaPatients = d.prepare("SELECT id FROM patients ORDER BY id LIMIT 14").all().slice(8) as any[];
      const betaTag = d.prepare(`INSERT INTO doctor_tags (doctor_id, patient_id, primary_concern, active_acne_status, scar_treatment_candidate, barrier_status, next_recommended_service, product_adherence_score, treatment_ready_for, created_at)
        VALUES (2, ?, 'deep_dermal_melasma', 'resolved', 0, 'intact', 'Q-Switch Laser Toning', 9, 'Q_Switch_Laser', ?)`);
      for (const p of betaPatients) betaTag.run(p.id, daysAgo(20));
    }
  } catch (_) {}

  // Seed follow-up cohort sessions (treatment 2–10 days ago) so the Follow Up queue is non-empty
  try {
    const hasFollowUp = (d.prepare(`
      SELECT COUNT(*) AS cnt FROM sessions_consumed
      WHERE session_type = 'treatment'
        AND session_date >= date('now', '-10 days')
        AND session_date <= date('now', '-2 days')
    `).get() as any).cnt;
    if (hasFollowUp === 0) {
      const dateAgo = (n: number) => { const t = new Date(); t.setDate(t.getDate() - n); return t.toISOString().slice(0, 10); };
      const fuPatients = d.prepare(`
        SELECT pp.id AS pkg_id, pp.patient_id, p.home_branch_id,
               sc.name AS svc,
               (SELECT id FROM doctors WHERE home_branch_id = p.home_branch_id LIMIT 1) AS doctor_id
        FROM packages_purchased pp
        JOIN patients p ON p.id = pp.patient_id
        JOIN services_catalog sc ON sc.id = pp.service_id
        LIMIT 5
      `).all() as any[];
      const insFollowUp = d.prepare(`
        INSERT OR IGNORE INTO sessions_consumed
          (package_id, patient_id, branch_id, doctor_id, session_date, service_name_snapshot, session_type)
        VALUES (?, ?, ?, ?, ?, ?, 'treatment')
      `);
      [3, 5, 7, 4, 6].forEach((daysAgo, i) => {
        const p = fuPatients[i];
        if (p) insFollowUp.run(p.pkg_id, p.patient_id, p.home_branch_id, p.doctor_id, dateAgo(daysAgo), p.svc);
      });
    }
  } catch (_) {}

  // Seed treatment_notes on sessions_consumed rows that don't have them yet
  try {
    const sessionsWithoutNotes = d.prepare(
      "SELECT id, service_name_snapshot, session_type FROM sessions_consumed WHERE treatment_notes IS NULL"
    ).all() as any[];
    if (sessionsWithoutNotes.length > 0) {
      const updateNotes = d.prepare("UPDATE sessions_consumed SET treatment_notes = ? WHERE id = ?");
      for (const s of sessionsWithoutNotes) {
        const svc = (s.service_name_snapshot ?? "").toLowerCase();
        let notes = "";
        if (/acne|clearance|benzoyl|salicyl/.test(svc)) {
          notes = "Patient presents with controlled acne — Grade 1, 2 residual comedones on bilateral cheeks. SPF compliance confirmed. Barrier intact, no sensitisation. Continued topical protocol. Scar candidacy discussed — clearance required for a minimum of 3 more months. Next session in 3 weeks.";
        } else if (/microneedling|scar|rf needl/.test(svc)) {
          notes = "RF Microneedling session completed at 1.5 mm depth, 12 passes, bilateral cheeks. Rolling scars Grade 2 mapped — moderate improvement from baseline. Minimal pinpoint bleeding — normal endpoint. Post-care: barrier cream applied, SPF 50. Patient advised ice compress for 24 h and to avoid active ingredients for 72 h.";
        } else if (/q.switch|laser toning|pigment|melasma/.test(svc)) {
          notes = "Q-Switch Laser Toning session delivered. 532 nm, 3-pass technique, bilateral cheeks and forehead. MASI score tracking: down ~35% from baseline photograph. No post-inflammatory hyperpigmentation noted. SPF 50 protocol strongly reinforced. Avoid direct sun exposure for 48 h. Next session in 4 weeks.";
        } else if (/peel|chemical|glycolic/.test(svc)) {
          notes = "Glycolic acid peel applied at 35% concentration. Light frosting achieved — appropriate endpoint for Fitzpatrick Type IV. Neutralised immediately. Barrier cream applied. Mild peeling expected for 3–5 days post-session. Patient counselled on no picking or scrubbing; strict SPF compliance reinforced.";
        } else if (/hydrafacial|hydra facial|hydra/.test(svc)) {
          notes = "HydraFacial Phase 2 completed. Extractions performed on T-zone — moderate sebaceous plugs cleared. Hydration levels significantly improved versus last visit. Skin tone appears more even and luminous. Home regimen compliance verified — good adherence to niacinamide and SPF. Next phase session scheduled in 4 weeks.";
        } else if (/prp|hair|scalp|follicle/.test(svc)) {
          notes = "PRP session administered. Scalp injection protocol followed — 12 injection points, bilateral distribution. Androgenic pattern assessed — Hamilton-Norwood Grade III, stable. Patient reports reduced shedding since last session (subjective). Platelet-rich plasma prepared at 4× baseline concentration. Continue Minoxidil 5% topical. Review in 6 weeks.";
        } else if (/consultation|initial|assessment/.test(svc)) {
          notes = "Initial consultation completed. Comprehensive skin assessment performed; photographic baseline taken for all zones. Chief concern documented: mixed skin type, PIH, and recurring hormonal acne Grade 2. Treatment trajectory outlined — realistic outcomes discussed over 12-week programme. Home regimen prescribed. Follow-up appointment scheduled for 4 weeks.";
        } else {
          notes = "Treatment session completed as planned. Skin response within expected parameters — incremental improvement noted since last session. No adverse reactions observed. Home regimen reviewed; patient adherence satisfactory. Next session scheduled; timeline communicated to patient.";
        }
        updateNotes.run(notes, s.id);
      }
    }
  } catch (_) {}

  // Additive migration: is_seed flag on consultations
  try { d.exec("ALTER TABLE consultations ADD COLUMN is_seed INTEGER DEFAULT 0"); } catch {}

  // Seed one demo consultation (hair-loss / PRP case) — insert only if no seed exists.
  try {
    const seedExists = (d.prepare("SELECT 1 FROM consultations WHERE is_seed = 1 LIMIT 1").get()) as any;
    if (!seedExists) {
      const firstPatient = d.prepare("SELECT id FROM patients ORDER BY id LIMIT 1").get() as any;
      if (firstPatient) {
        d.prepare(`
          INSERT INTO consultations (patient_id, transcript_masked, is_seed)
          VALUES (?, ?, 1)
        `).run(firstPatient.id, DEMO_TRANSCRIPT);
      }
    }
  } catch {}

  // Additive migration: manager_name on branches
  try {
    d.exec("ALTER TABLE branches ADD COLUMN manager_name TEXT");
  } catch {}
  // Ensure correct branch names and zone data
  try {
    d.prepare("UPDATE branches SET name = 'Kaya Bandra 2', city = 'Mumbai', manager_name = 'Priya Sharma' WHERE id = 1").run();
    d.prepare("UPDATE branches SET name = 'Kaya Bandra 1', city = 'Mumbai', manager_name = 'Rohit Kumar' WHERE id = 2").run();
  } catch {}
  // Additive migration: zone fields on branches
  try { d.exec("ALTER TABLE branches ADD COLUMN zone_name TEXT"); } catch {}
  try { d.exec("ALTER TABLE branches ADD COLUMN zone_manager_name TEXT"); } catch {}
  try {
    d.prepare("UPDATE branches SET zone_name = 'Mumbai Zone', zone_manager_name = 'Anjali Mehta' WHERE id IN (1, 2) AND (zone_name IS NULL OR zone_name = '')").run();
    // fallback: any branch without a zone
    d.prepare("UPDATE branches SET zone_name = 'Zone ' || id, zone_manager_name = 'Zone Manager' WHERE zone_name IS NULL OR zone_name = ''").run();
  } catch {}

  // Seed prescription-matched products into catalog so checkout can auto-fill prices.
  // Safe to run multiple times — INSERT OR IGNORE on unique SKU.
  try {
    const ins = d.prepare(`
      INSERT OR IGNORE INTO products_catalog (sku, name, category, price_inr, description)
      VALUES (?, ?, ?, ?, ?)
    `);
    const rxProducts: [string, string, string, number, string][] = [
      ["RX-MINOXIDIL-5",   "Minoxidil 5% Solution",                         "Hair Care",     850,  "Topical minoxidil for androgenic alopecia · 60 ml"],
      ["RX-MINOXIDIL-5H",  "मिनॉक्सिडेल (Minoxidil 5%)",                    "Hair Care",     850,  "Topical minoxidil for androgenic alopecia · 60 ml"],
      ["RX-HAIR-SERUM",    "Anti Hair-Fall Serum",                           "Hair Care",    1800,  "Scalp strengthening serum · 50 ml"],
      ["RX-GLUTA-SERUM",   "Gluta Glow Face Serum",                          "Brightening",  2200,  "Glutathione brightening serum · 30 ml"],
      ["RX-HYPER-SERUM",   "Hyperpigmentation Reducing Face Serum",          "Pigmentation", 2600,  "Targeted hyperpigmentation corrector · 30 ml"],
      ["RX-GLUTA-NUTRA",   "Kaya NUTRA+ Glutathione Mouth Melt Powder",      "Supplements",  1500,  "Oral glutathione · 30 sachets"],
      ["RX-BRIGHT-CREAM",  "Kaya Brightening Night Cream",                   "Brightening",  1950,  "Brightening night cream · 50 ml"],
      ["RX-BIOTIN",        "Biotin Tablets",                                  "Supplements",   650,  "Hair & nail supplement · 30 tablets"],
      ["RX-SLS-SHAMPOO",   "Sulfate-Free Gentle Shampoo",                    "Hair Care",     750,  "Gentle scalp-safe shampoo · 200 ml"],
      ["RX-SPF50",         "SPF 50 PA+++ Sunscreen",                         "Sun Care",      950,  "Daily broad-spectrum sunscreen · 50 ml"],
      ["RX-SALICYLIC",     "Salicylic Acid Face Wash 2%",                    "Acne",          750,  "BHA cleanser for acne · 100 ml"],
      ["RX-BENZ-PEROX",   "Benzoyl Peroxide Gel 2.5%",                      "Acne",          480,  "Topical antibacterial for acne · 30 g"],
      ["RX-TRETINOIN",     "Tretinoin Cream 0.025%",                         "Anti-Ageing",   980,  "Retinoid cream for renewal · 20 g"],
      ["RX-AZ-GEL",        "Azelaic Acid Gel 15%",                           "Pigmentation", 1200,  "Dual-action pigmentation & acne gel · 30 g"],
      ["RX-BARRIER",       "Ceramide Barrier Repair Cream",                  "Barrier",       950,  "Intensive barrier repair · 50 ml"],
    ];
    for (const row of rxProducts) ins.run(...row);
  } catch {}

  // Seed stock quantities for catalog products (idempotent — only updates where stock is 0)
  try {
    const stockSeeds: Record<string, number> = {
      "RX-MINOXIDIL-5":  24, "RX-MINOXIDIL-5H": 18, "RX-HAIR-SERUM":   12,
      "RX-GLUTA-SERUM":   8, "RX-HYPER-SERUM":   5, "RX-GLUTA-NUTRA":  30,
      "RX-BRIGHT-CREAM": 15, "RX-BIOTIN":        40, "RX-SLS-SHAMPOO":  22,
      "RX-SPF50":        35, "RX-SALICYLIC":     28, "RX-BENZ-PEROX":   14,
      "RX-TRETINOIN":     9, "RX-AZ-GEL":        11, "RX-BARRIER":      20,
    };
    const upd = d.prepare("UPDATE products_catalog SET stock_qty = ? WHERE sku = ? AND (stock_qty IS NULL OR stock_qty = 0)");
    for (const [sku, qty] of Object.entries(stockSeeds)) upd.run(qty, sku);
  } catch {}
}

/**
 * Wipe all treatment/FnO sessions and reset appointment statuses so the
 * ops demo flow can be run from scratch. Called automatically on Amplify/Vercel
 * cold starts (fresh DB copy). Not called on local dev restarts.
 */
export function resetOpsDemo(handle?: Database.Database): void {
  const d = handle ?? db();
  try {
    d.exec("DELETE FROM fno_sessions");
    d.exec("DELETE FROM practitioner_sessions");
    // Reset all recent arrived/in_session/converted → arrived (ready to start)
    d.prepare(`
      UPDATE appointments SET status = 'arrived'
      WHERE status IN ('arrived','in_session','converted')
        AND date(appointment_ts) >= date('now', '-30 days')
    `).run();
    // Re-seed 3 demo entries so all ops filter tabs show data immediately
    const appts = d.prepare(
      "SELECT id FROM appointments WHERE status = 'arrived' ORDER BY appointment_ts DESC LIMIT 6"
    ).all() as any[];
    if (appts.length >= 2) {
      // 2nd: completed treatment, pending FnO
      d.prepare("UPDATE appointments SET status = 'converted' WHERE id = ?").run(appts[1].id);
      d.prepare("INSERT OR IGNORE INTO practitioner_sessions (appointment_id, status, consent_signed) VALUES (?, 'completed', 1)").run(appts[1].id);
    }
    if (appts[3]) {
      // 4th: in-progress treatment
      d.prepare("UPDATE appointments SET status = 'converted' WHERE id = ?").run(appts[3].id);
      d.prepare("INSERT OR IGNORE INTO practitioner_sessions (appointment_id, status, consent_signed) VALUES (?, 'in_progress', 1)").run(appts[3].id);
    }
    if (appts[4]) {
      // 5th: fully complete (treatment + FnO)
      d.prepare("UPDATE appointments SET status = 'converted' WHERE id = ?").run(appts[4].id);
      d.prepare("INSERT OR IGNORE INTO practitioner_sessions (appointment_id, status, consent_signed) VALUES (?, 'completed', 1)").run(appts[4].id);
      d.prepare("INSERT OR IGNORE INTO fno_sessions (appointment_id, status, submitted_at) VALUES (?, 'submitted', datetime('now'))").run(appts[4].id);
    }
  } catch (_) {}
}

export function resetSchema(): void {
  if (_db) {
    try { _db.pragma("wal_checkpoint(TRUNCATE)"); } catch {}
    _db.close();
    _db = null;
  }
  // Remove DB file and any leftover WAL / SHM files to avoid SQLITE_IOERR_SHORT_READ
  for (const suffix of ["", "-wal", "-shm"]) {
    const p = DB_PATH + suffix;
    if (fs.existsSync(p)) { try { fs.unlinkSync(p); } catch {} }
  }
  if (fs.existsSync(PHOTOS_DIR)) {
    for (const f of fs.readdirSync(PHOTOS_DIR)) {
      try { fs.unlinkSync(path.join(PHOTOS_DIR, f)); } catch {}
    }
  }
  // Open a fresh DB directly — bypasses the Vercel/Amplify copy-from-source logic
  // in db() so resetSchema always produces a truly clean slate regardless of platform.
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const fresh = new Database(DB_PATH);
  fresh.pragma("journal_mode = WAL");
  fresh.pragma("foreign_keys = ON");
  _db = fresh;
  initSchema(fresh);
}

// ----- High-level helpers ---------------------------------------------------

export function getPatientPortfolio(patientId: number): PatientPortfolio | null {
  const d = db();
  const patient = d
    .prepare(
      `SELECT p.*, b.name AS home_branch_name, b.city AS home_branch_city
       FROM patients p LEFT JOIN branches b ON b.id = p.home_branch_id
       WHERE p.id = ?`
    )
    .get(patientId) as any;
  if (!patient) return null;

  const sessions = d
    .prepare(
      `SELECT s.*, b.name AS branch_name, b.city AS branch_city, doc.name AS doctor_name
       FROM sessions_consumed s
       LEFT JOIN branches b ON b.id = s.branch_id
       LEFT JOIN doctors doc ON doc.id = s.doctor_id
       WHERE s.patient_id = ? ORDER BY s.session_date DESC`
    )
    .all(patientId) as any[];

  const packages = d
    .prepare(
      `SELECT pk.*, sc.name AS service_name, sc.category AS service_category,
              sc.periodic_days AS service_periodic_days
       FROM packages_purchased pk
       JOIN services_catalog sc ON sc.id = pk.service_id
       WHERE pk.patient_id = ? ORDER BY pk.purchase_date DESC`
    )
    .all(patientId) as any[];

  const product_purchases = d
    .prepare(
      `SELECT pp.*, pc.name AS product_name, pc.sku, pc.category, pc.description, pc.price_inr
       FROM product_purchases pp
       JOIN products_catalog pc ON pc.id = pp.product_id
       WHERE pp.patient_id = ? ORDER BY pp.purchase_date DESC`
    )
    .all(patientId) as any[];

  const tags = d
    .prepare(
      `SELECT * FROM doctor_tags WHERE patient_id = ? ORDER BY created_at DESC`
    )
    .all(patientId) as DoctorTags[];

  const notes = d
    .prepare(
      `SELECT * FROM doctor_notes_raw WHERE patient_id = ? ORDER BY created_at DESC`
    )
    .all(patientId) as RawNote[];

  const photos = d
    .prepare(
      `SELECT * FROM skin_photos WHERE patient_id = ? ORDER BY visit_date ASC`
    )
    .all(patientId) as SkinPhoto[];

  const prescriptionRows = d
    .prepare(
      `SELECT pr.*, doc.name AS doctor_name FROM prescriptions pr
       LEFT JOIN doctors doc ON doc.id = pr.doctor_id
       WHERE pr.patient_id = ? ORDER BY pr.created_at DESC`
    )
    .all(patientId) as any[];

  const prescriptions = prescriptionRows.map((r) => ({
    ...r,
    items: normalizeRxItems(r.items_json),
  }));

  const consultations = d
    .prepare(
      `SELECT * FROM consultations WHERE patient_id = ? ORDER BY created_at DESC`
    )
    .all(patientId) as any[];

  // Latest value per key (rows are inserted newest-first by created_at desc).
  const attrRows = d
    .prepare(
      `SELECT * FROM patient_attributes WHERE patient_id = ? ORDER BY created_at DESC`
    )
    .all(patientId) as any[];
  const seen = new Set<string>();
  const attributes = attrRows.filter((a) => {
    if (seen.has(a.key)) return false;
    seen.add(a.key);
    return true;
  });

  return {
    patient,
    sessions,
    packages,
    product_purchases,
    tags,
    notes,
    photos,
    prescriptions,
    consultations,
    attributes,
  };
}

// Accepts both the new RxRow[] shape and the legacy {name,instructions,duration_days}[]
// shape so older seeded prescriptions keep rendering after the schema change.
function normalizeRxItems(itemsJson: string): any[] {
  let parsed: any[] = [];
  try {
    parsed = JSON.parse(itemsJson || "[]");
  } catch {
    parsed = [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.map((it) => {
    if (it && (it.product !== undefined || it.problem !== undefined)) {
      return {
        problem: it.problem ?? null,
        problem_type: it.problem_type ?? null,
        product: String(it.product ?? ""),
        product_detail: it.product_detail ?? null,
        dosage: String(it.dosage ?? ""),
        dosage_detail: it.dosage_detail ?? null,
        cost: it.cost ?? null,
      };
    }
    // Legacy shape
    const dur = Number(it?.duration_days) || 0;
    return {
      problem: null,
      problem_type: null,
      product: String(it?.name ?? ""),
      product_detail: dur ? `${dur} days` : null,
      dosage: String(it?.instructions ?? ""),
      dosage_detail: null,
      cost: null,
    };
  });
}

// Match a prescription product/medicine name against the catalog to auto-fill cost.
export function lookupCatalogPrice(name: string): number | null {
  if (!name || !name.trim()) return null;
  const d = db();
  // Strip non-ASCII characters (Hindi script etc.) and normalize
  const ascii = name.replace(/[^\x00-\x7F]/g, " ").trim();
  const q = ascii.toLowerCase();

  // 1. Exact match on either name form
  for (const nm of [name.trim().toLowerCase(), q]) {
    const r = d.prepare(`SELECT price_inr FROM products_catalog WHERE lower(name) = ? LIMIT 1`).get(nm) as any;
    if (r) return r.price_inr;
    const s = d.prepare(`SELECT price_inr FROM services_catalog WHERE lower(name) = ? LIMIT 1`).get(nm) as any;
    if (s) return s.price_inr;
  }

  // 2. Substring match — catalog name ⊂ query OR query ⊂ catalog name
  const pSub = d.prepare(
    `SELECT price_inr FROM products_catalog WHERE ? LIKE '%' || lower(name) || '%' OR lower(name) LIKE '%' || ? || '%' LIMIT 1`
  ).get(q, q) as any;
  if (pSub) return pSub.price_inr;
  const sSub = d.prepare(
    `SELECT price_inr FROM services_catalog WHERE ? LIKE '%' || lower(name) || '%' OR lower(name) LIKE '%' || ? || '%' LIMIT 1`
  ).get(q, q) as any;
  if (sSub) return sSub.price_inr;

  // 3. Keyword token overlap — split query into significant words, score catalog entries
  const STOP = new Set(["the","a","an","for","to","of","and","with","in","on","ml","g","mg",
    "tablet","tablets","capsule","capsules","solution","cream","gel","serum","powder","drops"]);
  const tokens = q.split(/[\s\-\(\)\/\·\.]+/).filter(t => t.length > 3 && !STOP.has(t));
  if (tokens.length > 0) {
    const allProds = d.prepare("SELECT name, price_inr FROM products_catalog").all() as { name: string; price_inr: number }[];
    let bestScore = 0, bestPrice: number | null = null;
    for (const row of allProds) {
      const rowLow = row.name.toLowerCase();
      const score = tokens.filter(t => rowLow.includes(t)).length;
      if (score > 0 && score > bestScore) { bestScore = score; bestPrice = row.price_inr; }
    }
    if (bestPrice != null) return bestPrice;
  }

  return null;
}

export function latestTagsFor(patientId: number): DoctorTags | null {
  const d = db();
  return (
    (d
      .prepare(
        `SELECT * FROM doctor_tags WHERE patient_id = ? ORDER BY created_at DESC LIMIT 1`
      )
      .get(patientId) as DoctorTags | undefined) ?? null
  );
}

export type PackageBalance = Package & {
  service_name: string;
  unit_price: number;
  sessions_remaining: number;
  net_revenue_recognized_inr: number;
  unearned_balance_inr: number;
};

export function packageBalance(patientId: number): PackageBalance[] {
  const d = db();
  const rows = d
    .prepare(
      `SELECT pk.*, sc.name AS service_name, sc.price_inr AS unit_price
       FROM packages_purchased pk
       JOIN services_catalog sc ON sc.id = pk.service_id
       WHERE pk.patient_id = ? AND pk.sessions_used < pk.sessions_total`
    )
    .all(patientId) as any[];
  return rows.map((r) => {
    const perSession = r.collection_paid_inr / r.sessions_total;
    const recognized = Math.round(perSession * r.sessions_used);
    return {
      ...r,
      sessions_remaining: r.sessions_total - r.sessions_used,
      net_revenue_recognized_inr: recognized,
      unearned_balance_inr: r.collection_paid_inr - recognized,
    };
  });
}

export function clinicFinancialSummary(): FinancialSummary {
  const d = db();
  const pkgs = d
    .prepare(
      `SELECT collection_paid_inr, sessions_total, sessions_used FROM packages_purchased`
    )
    .all() as any[];
  const totalCollection = pkgs.reduce(
    (acc, r) => acc + r.collection_paid_inr,
    0
  );
  const totalRecognized = pkgs.reduce(
    (acc, r) =>
      acc +
      (r.sessions_total > 0
        ? Math.round((r.collection_paid_inr * r.sessions_used) / r.sessions_total)
        : 0),
    0
  );
  const productRow = d
    .prepare(`SELECT COALESCE(SUM(price_paid_inr), 0) AS s FROM product_purchases`)
    .get() as any;
  const productCollection = productRow.s ?? 0;

  return {
    package_collection_inr: totalCollection,
    package_net_revenue_inr: totalRecognized,
    package_unearned_balance_inr: totalCollection - totalRecognized,
    product_collection_inr: productCollection,
    total_collection_inr: totalCollection + productCollection,
    total_net_revenue_inr: totalRecognized + productCollection,
  };
}

export function listBranches(): Branch[] {
  return db().prepare("SELECT * FROM branches ORDER BY id").all() as Branch[];
}

export function listAllPatients(): Patient[] {
  return db().prepare("SELECT * FROM patients ORDER BY name").all() as Patient[];
}

export function listLiveCheckIns(): Array<CheckIn & { patient_name: string; branch_name: string }> {
  return db()
    .prepare(
      `SELECT ci.*, p.name AS patient_name, b.name AS branch_name
       FROM check_ins ci
       JOIN patients p ON p.id = ci.patient_id
       JOIN branches b ON b.id = ci.branch_id
       WHERE ci.status = 'waiting' ORDER BY ci.check_in_ts`
    )
    .all() as any[];
}

export function searchCatalog(q: string): {
  products: Product[];
  services: Service[];
} {
  const like = `%${q}%`;
  const d = db();
  const products = d
    .prepare(
      `SELECT * FROM products_catalog
       WHERE name LIKE ? OR sku LIKE ? OR category LIKE ? OR description LIKE ? OR item_code LIKE ?
       ORDER BY name LIMIT 25`
    )
    .all(like, like, like, like, like) as Product[];
  const services = d
    .prepare(
      `SELECT * FROM services_catalog
       WHERE name LIKE ? OR category LIKE ? OR description LIKE ? OR item_code LIKE ?
       ORDER BY name LIMIT 25`
    )
    .all(like, like, like, like) as Service[];
  return { products, services };
}

export function getAllCatalog(): { products: Product[]; services: Service[] } {
  const d = db();
  const products = d.prepare("SELECT * FROM products_catalog ORDER BY category, name").all() as Product[];
  const services = d.prepare("SELECT * FROM services_catalog ORDER BY category, name").all() as Service[];
  return { products, services };
}

export type SalesRecord = {
  customer_id: string;
  guest_code: string;
  sales_id: string;
  order_number: string | null;
  patient_id: number;
  patient_name: string;
  phone: string;
  branch_name: string;
  last_visit_branch: string | null;
  record_type: "session_package" | "product";
  item_name: string;
  item_code: string | null;
  category: string;
  sessions_total: number | null;
  sessions_used: number | null;
  sessions_pending: number | null;
  expiry_date: string | null;
  collection_paid_inr: number;
  purchase_date: string;
};

export function getSalesRecords(type?: "session_package" | "product"): SalesRecord[] {
  const d = db();
  const results: SalesRecord[] = [];

  if (!type || type === "session_package") {
    const pkgs = d.prepare(`
      SELECT p.id AS patient_id, p.name AS patient_name, p.phone,
             p.guest_code,
             b.name AS branch_name,
             pk.id AS package_id, pk.sessions_total, pk.sessions_used,
             pk.collection_paid_inr, pk.purchase_date, pk.expiry_date, pk.order_number,
             sc.name AS item_name, sc.category, sc.item_code,
             (SELECT b2.name FROM sessions_consumed sc2
              JOIN branches b2 ON b2.id = sc2.branch_id
              WHERE sc2.package_id = pk.id
              ORDER BY sc2.session_date DESC LIMIT 1) AS last_visit_branch
      FROM packages_purchased pk
      JOIN patients p ON p.id = pk.patient_id
      JOIN branches b ON b.id = p.home_branch_id
      JOIN services_catalog sc ON sc.id = pk.service_id
      ORDER BY pk.purchase_date DESC
    `).all() as any[];
    for (const r of pkgs) {
      results.push({
        customer_id: `KYA-${String(r.patient_id).padStart(5, "0")}`,
        guest_code: r.guest_code ?? `GDRC${String(r.patient_id + 10000)}`,
        sales_id: `PKG-${String(r.package_id).padStart(6, "0")}`,
        order_number: r.order_number,
        patient_id: r.patient_id,
        patient_name: r.patient_name,
        phone: r.phone,
        branch_name: r.branch_name,
        last_visit_branch: r.last_visit_branch ?? r.branch_name,
        record_type: "session_package",
        item_name: r.item_name,
        item_code: r.item_code ?? null,
        category: r.category,
        sessions_total: r.sessions_total,
        sessions_used: r.sessions_used,
        sessions_pending: r.sessions_total - r.sessions_used,
        expiry_date: r.expiry_date,
        collection_paid_inr: r.collection_paid_inr,
        purchase_date: r.purchase_date,
      });
    }
  }

  if (!type || type === "product") {
    const prods = d.prepare(`
      SELECT p.id AS patient_id, p.name AS patient_name, p.phone,
             p.guest_code,
             b.name AS branch_name,
             pp.id AS purchase_id, pp.qty, pp.price_paid_inr, pp.purchase_date,
             pc.name AS item_name, pc.category, pc.item_code
      FROM product_purchases pp
      JOIN patients p ON p.id = pp.patient_id
      JOIN branches b ON b.id = p.home_branch_id
      JOIN products_catalog pc ON pc.id = pp.product_id
      ORDER BY pp.purchase_date DESC
    `).all() as any[];
    for (const r of prods) {
      results.push({
        customer_id: `KYA-${String(r.patient_id).padStart(5, "0")}`,
        guest_code: r.guest_code ?? `GDRC${String(r.patient_id + 10000)}`,
        sales_id: `PRD-${String(r.purchase_id).padStart(6, "0")}`,
        order_number: null,
        patient_id: r.patient_id,
        patient_name: r.patient_name,
        phone: r.phone,
        branch_name: r.branch_name,
        last_visit_branch: r.branch_name,
        record_type: "product",
        item_name: r.item_name,
        item_code: r.item_code ?? null,
        category: r.category,
        sessions_total: null,
        sessions_used: null,
        sessions_pending: null,
        expiry_date: null,
        collection_paid_inr: r.price_paid_inr * r.qty,
        purchase_date: r.purchase_date,
      });
    }
  }

  results.sort((a, b) => b.purchase_date.localeCompare(a.purchase_date));
  return results;
}

export type MonthlyRevenueSummary = {
  month: string; // "YYYY-MM"
  label: string; // "May 2026"
  collection_inr: number;
  net_revenue_inr: number;
  sessions_consumed_count: number;
};

export function getMonthlyRevenue(monthsBack = 2): MonthlyRevenueSummary[] {
  const d = db();
  const results: MonthlyRevenueSummary[] = [];
  const today = new Date();
  for (let i = 0; i < monthsBack; i++) {
    const dt = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const month = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
    const label = dt.toLocaleString("en-IN", { month: "long", year: "numeric" });

    const col = (d.prepare(
      `SELECT COALESCE(SUM(collection_paid_inr),0) AS total
       FROM packages_purchased WHERE strftime('%Y-%m', purchase_date) = ?`
    ).get(month) as any).total as number;

    const prodCol = (d.prepare(
      `SELECT COALESCE(SUM(price_paid_inr * qty),0) AS total
       FROM product_purchases WHERE strftime('%Y-%m', purchase_date) = ?`
    ).get(month) as any).total as number;

    const sessCount = (d.prepare(
      `SELECT COUNT(*) AS cnt FROM sessions_consumed WHERE strftime('%Y-%m', session_date) = ?`
    ).get(month) as any).cnt as number;

    // Net revenue = sum of (price_per_session × sessions consumed this month per package)
    const pkgNetRevenue = (d.prepare(
      `SELECT COALESCE(SUM(
         CAST(pp.collection_paid_inr AS REAL) / NULLIF(pp.sessions_total, 0)
       ), 0) AS total
       FROM sessions_consumed sc
       JOIN packages_purchased pp ON pp.id = sc.package_id
       WHERE strftime('%Y-%m', sc.session_date) = ?`
    ).get(month) as any).total as number;

    const netRevenue = pkgNetRevenue + prodCol;

    results.push({ month, label, collection_inr: col + prodCol, net_revenue_inr: Math.round(netRevenue), sessions_consumed_count: sessCount });
  }
  return results;
}

// ---------------------------------------------------------------------------
// Appointments
// ---------------------------------------------------------------------------

export type AppointmentRow = {
  id: number;
  patient_id: number;
  patient_name: string;
  phone: string;
  email: string | null;
  guest_code: string | null;
  branch_id: number;
  branch_name: string;
  doctor_id: number | null;
  doctor_name: string | null;
  service_type: string;
  appointment_ts: string;
  status: string;
  contact_booking_number: string | null;
  notes: string | null;
  referred_by: string | null;
  duration_minutes: number;
  disposition: string | null;
  sub_disposition: string | null;
  lead_type: string | null;
  campaign: string | null;
  city: string | null;
  state: string | null;
};

export function getAppointments(date: string, branchId?: number): AppointmentRow[] {
  const d = db();
  let sql = `
    SELECT a.id, a.patient_id, p.name AS patient_name, p.phone, p.email,
           p.guest_code, a.branch_id, b.name AS branch_name,
           a.doctor_id, doc.name AS doctor_name,
           a.service_type, a.appointment_ts, a.status,
           a.contact_booking_number, a.notes, a.referred_by,
           COALESCE(a.duration_minutes, 45) AS duration_minutes,
           a.disposition, a.sub_disposition, a.lead_type, a.campaign,
           p.city, p.state
    FROM appointments a
    JOIN patients p ON p.id = a.patient_id
    JOIN branches b ON b.id = a.branch_id
    LEFT JOIN doctors doc ON doc.id = a.doctor_id
    WHERE date(a.appointment_ts) = ?
  `;
  const params: any[] = [date];
  if (branchId) { sql += " AND a.branch_id = ?"; params.push(branchId); }
  sql += " ORDER BY a.appointment_ts ASC";
  return d.prepare(sql).all(...params) as AppointmentRow[];
}

export function updateAppointmentTime(id: number, appointmentTs: string): void {
  db().prepare("UPDATE appointments SET appointment_ts = ? WHERE id = ?").run(appointmentTs, id);
}

export function updateAppointmentStatus(id: number, status: string): void {
  db().prepare("UPDATE appointments SET status = ? WHERE id = ?").run(status, id);
}

export type ConfirmationQueueRow = {
  id: number;
  patient_name: string;
  phone: string;
  service_type: string;
  appointment_ts: string;
  doctor_name: string | null;
  branch_name: string;
  referred_by: string | null;
  disposition: string | null;
  sub_disposition: string | null;
  lead_type: string | null;
  campaign: string | null;
  pending_sessions: number;
  last_visit: string | null;
};

export function getTodayConfirmationQueue(date: string): ConfirmationQueueRow[] {
  const d = db();
  return d.prepare(`
    SELECT a.id, p.name AS patient_name, p.phone,
           a.service_type, a.appointment_ts,
           doc.name AS doctor_name, b.name AS branch_name,
           a.referred_by, a.disposition, a.sub_disposition, a.lead_type, a.campaign,
           COALESCE((
             SELECT SUM(pk.sessions_total - pk.sessions_used)
             FROM packages_purchased pk
             WHERE pk.patient_id = p.id AND pk.sessions_used < pk.sessions_total
           ), 0) AS pending_sessions,
           (SELECT MAX(s.session_date) FROM sessions_consumed s WHERE s.patient_id = p.id) AS last_visit
    FROM appointments a
    JOIN patients p ON p.id = a.patient_id
    JOIN branches b ON b.id = a.branch_id
    LEFT JOIN doctors doc ON doc.id = a.doctor_id
    WHERE date(a.appointment_ts) = ? AND a.status = 'booked'
    ORDER BY a.appointment_ts ASC
  `).all(date) as ConfirmationQueueRow[];
}

export type PendingSessionPatient = {
  id: number;
  name: string;
  phone: string;
  branch_name: string;
  pending_sessions: number;
  last_visit: string | null;
  days_since_visit: number | null;
  service_names: string;
};

export function getPendingSessionPatients(): PendingSessionPatient[] {
  const d = db();
  return d.prepare(`
    SELECT p.id, p.name, p.phone, b.name AS branch_name,
           SUM(pk.sessions_total - pk.sessions_used) AS pending_sessions,
           MAX(s.session_date) AS last_visit,
           CAST(julianday('now') - julianday(MAX(s.session_date)) AS INTEGER) AS days_since_visit,
           GROUP_CONCAT(DISTINCT sc.name) AS service_names
    FROM packages_purchased pk
    JOIN patients p ON p.id = pk.patient_id
    LEFT JOIN branches b ON b.id = p.home_branch_id
    LEFT JOIN sessions_consumed s ON s.patient_id = p.id
    LEFT JOIN services_catalog sc ON sc.id = pk.service_id
    WHERE pk.sessions_used < pk.sessions_total
      AND p.id NOT IN (
        SELECT DISTINCT patient_id FROM appointments
        WHERE date(appointment_ts) >= date('now')
          AND status NOT IN ('no_show', 'rescheduled')
      )
    GROUP BY p.id
    ORDER BY days_since_visit DESC NULLS LAST
    LIMIT 50
  `).all() as PendingSessionPatient[];
}

export function listZoneManagers(): Array<{ zone_name: string; zone_manager_name: string }> {
  return db().prepare(`
    SELECT DISTINCT zone_name, zone_manager_name
    FROM branches
    WHERE zone_name IS NOT NULL AND zone_manager_name IS NOT NULL
    ORDER BY zone_name
  `).all() as any[];
}

export function listBranchFinancials(): Array<{
  branch_id: number;
  collection_inr: number;
  net_revenue_inr: number;
  unearned_inr: number;
}> {
  return db().prepare(`
    SELECT
      p.home_branch_id AS branch_id,
      COALESCE(SUM(pp.collection_paid_inr), 0) AS collection_inr,
      COALESCE(SUM(
        CAST(pp.collection_paid_inr AS REAL) * pp.sessions_used / NULLIF(pp.sessions_total, 0)
      ), 0) AS net_revenue_inr,
      COALESCE(SUM(
        CAST(pp.collection_paid_inr AS REAL) * (pp.sessions_total - pp.sessions_used) / NULLIF(pp.sessions_total, 0)
      ), 0) AS unearned_inr
    FROM packages_purchased pp
    JOIN patients p ON p.id = pp.patient_id
    GROUP BY p.home_branch_id
  `).all() as any[];
}

export function listBranchStats(): Array<{
  id: number; name: string; city: string; manager_name: string | null;
  zone_name: string | null; zone_manager_name: string | null;
  total_patients: number; sessions_used: number; sessions_pending: number;
  doctor_count: number;
}> {
  const d = db();
  const branches = d.prepare("SELECT * FROM branches ORDER BY id").all() as any[];
  return branches.map(b => {
    const patientCount = (d.prepare("SELECT COUNT(*) as cnt FROM patients WHERE home_branch_id = ?").get(b.id) as any).cnt;
    const sessionStats = d.prepare(`
      SELECT COALESCE(SUM(sessions_used),0) as used,
             COALESCE(SUM(sessions_total - sessions_used),0) as pending
      FROM packages_purchased pk
      JOIN patients p ON p.id = pk.patient_id
      WHERE p.home_branch_id = ?
    `).get(b.id) as any;
    const doctorCount = (d.prepare("SELECT COUNT(*) as cnt FROM doctors WHERE home_branch_id = ?").get(b.id) as any).cnt;
    return {
      id: b.id, name: b.name, city: b.city,
      manager_name: b.manager_name ?? null,
      zone_name: b.zone_name ?? null,
      zone_manager_name: b.zone_manager_name ?? null,
      total_patients: patientCount,
      sessions_used: sessionStats.used,
      sessions_pending: sessionStats.pending,
      doctor_count: doctorCount,
    };
  });
}

export function listAllDoctors(): Array<{
  id: number; name: string; specialty: string; branch_id: number; branch_name: string;
}> {
  return db().prepare(`
    SELECT d.id, d.name, d.specialty, d.home_branch_id AS branch_id, b.name AS branch_name
    FROM doctors d
    LEFT JOIN branches b ON b.id = d.home_branch_id
    ORDER BY d.home_branch_id, d.name
  `).all() as any[];
}

export function convertAppointmentToCheckIn(id: number): AppointmentRow | null {
  const d = db();
  const appt = d.prepare("SELECT * FROM appointments WHERE id = ?").get(id) as any;
  if (!appt) return null;
  // Create check_in
  d.prepare(
    "INSERT INTO check_ins (patient_id, branch_id, doctor_id, check_in_ts, status) VALUES (?, ?, ?, datetime('now'), 'waiting')"
  ).run(appt.patient_id, appt.branch_id, appt.doctor_id);
  // Mark appointment converted
  d.prepare("UPDATE appointments SET status = 'converted' WHERE id = ?").run(id);
  return getAppointments(appt.appointment_ts.slice(0, 10)).find(a => a.id === id) ?? null;
}

export type SavedCohort = {
  id: number; label: string; description: string | null;
  filter_json: string; discount_pct: number; patient_count: number; created_at: string;
};

export function listSavedCohorts(): SavedCohort[] {
  return db().prepare("SELECT * FROM saved_cohorts ORDER BY created_at DESC").all() as SavedCohort[];
}

export function saveCohort(label: string, description: string, filterJson: string, discountPct: number, patientCount: number): SavedCohort {
  const d = db();
  const result = d.prepare(
    "INSERT INTO saved_cohorts (label, description, filter_json, discount_pct, patient_count) VALUES (?, ?, ?, ?, ?)"
  ).run(label, description, filterJson, discountPct, patientCount);
  return d.prepare("SELECT * FROM saved_cohorts WHERE id = ?").get(result.lastInsertRowid) as SavedCohort;
}

export function deleteSavedCohort(id: number): void {
  db().prepare("DELETE FROM saved_cohorts WHERE id = ?").run(id);
}

/**
 * Ensures at least 3 demo waiting check-ins exist for the doctor portal demo.
 * Called on each doctor page load; idempotent — does nothing if already populated.
 */
export function ensureDemoCheckIns(): void {
  const d = db();
  try {
    // Always refresh: clear any leftover waiting check-ins and re-seed fresh ones.
    // This ensures the doctor portal always shows a full live queue on every page load.
    d.exec("DELETE FROM check_ins WHERE status = 'waiting'");

    const patients  = d.prepare("SELECT id, name FROM patients ORDER BY id LIMIT 6").all() as any[];
    const doctors   = d.prepare("SELECT id FROM doctors ORDER BY id LIMIT 3").all() as any[];
    const branches  = d.prepare("SELECT id FROM branches ORDER BY id LIMIT 2").all() as any[];
    if (!patients.length) return;

    const ins = d.prepare(
      "INSERT INTO check_ins (patient_id, branch_id, doctor_id, check_in_ts, status) VALUES (?, ?, ?, datetime('now', ?), 'waiting')"
    );

    const DEMO_CI = [
      { pIdx: 0, bIdx: 0, dIdx: 0, minsAgo: -31 },
      { pIdx: 1, bIdx: 0, dIdx: 0, minsAgo: -18 },
      { pIdx: 2, bIdx: 1, dIdx: 1, minsAgo: -9 },
      { pIdx: 3, bIdx: 0, dIdx: 0, minsAgo: -4 },
    ];

    for (const ci of DEMO_CI) {
      const p = patients[ci.pIdx];
      if (!p) continue;
      const b   = branches[ci.bIdx] ?? branches[0];
      const doc = doctors[ci.dIdx]  ?? doctors[0];
      ins.run(p.id, b?.id ?? 1, doc?.id ?? 1, `${ci.minsAgo} minutes`);
    }
  } catch {}
}

/**
 * Returns patients who had a 'converted' appointment today — used to pre-populate
 * "Today's Completed" in the doctor portal sidebar on page load.
 */
export function getTodayAppointments(): Array<{
  id: number; patient_id: number; patient_name: string;
  status: string; appointment_ts: string; branch_name: string | null;
}> {
  try {
    const d = db();
    return d.prepare(`
      SELECT a.id, a.patient_id, p.name AS patient_name,
             a.status, a.appointment_ts, b.name AS branch_name
      FROM appointments a
      JOIN patients p ON p.id = a.patient_id
      LEFT JOIN branches b ON b.id = p.home_branch_id
      WHERE date(a.appointment_ts) = date('now')
        AND a.status NOT IN ('cancelled', 'no_show', 'rescheduled', 'done', 'converted')
      ORDER BY a.appointment_ts ASC
      LIMIT 20
    `).all() as any[];
  } catch { return []; }
}

export function getCompletedToday(): Array<{ id: number; name: string; fee?: number }> {
  try {
    const d = db();
    const rows = d.prepare(`
      SELECT p.id, p.name,
             ROUND(CAST(pk.collection_paid_inr AS REAL) / MAX(pk.sessions_total, 1)) AS fee
      FROM appointments a
      JOIN patients p ON p.id = a.patient_id
      LEFT JOIN packages_purchased pk ON pk.patient_id = p.id
      WHERE a.status IN ('converted', 'treatment_done')
        AND date(a.appointment_ts) = date('now')
      GROUP BY p.id
      ORDER BY a.appointment_ts ASC
      LIMIT 4
    `).all() as any[];
    return rows.map((r: any) => ({ id: r.id, name: r.name, fee: r.fee ?? undefined }));
  } catch {
    return [];
  }
}

// ----- Clinic status (operational readiness) --------------------------------

export const DEFAULT_APPLIANCES = [
  "Q-Switch Laser (Pigmentation)",
  "Diode Laser (Hair Reduction)",
  "HydraFacial Machine",
  "Carbon Peel Laser",
  "RF Microneedling Device",
  "Comedone Steamer",
  "Cryo Chiller / Cooling",
];

function defaultAppliances(): ClinicAppliance[] {
  return DEFAULT_APPLIANCES.map((name) => ({ name, working: true, note: "" }));
}

function parseAppliances(json: string | null | undefined): ClinicAppliance[] {
  if (!json) return defaultAppliances();
  try {
    const arr = JSON.parse(json);
    if (Array.isArray(arr) && arr.length) {
      return arr.map((a: any) => ({
        name: String(a.name ?? ""),
        working: a.working !== false,
        note: a.note ? String(a.note) : "",
      })).filter((a: ClinicAppliance) => a.name);
    }
  } catch {}
  return defaultAppliances();
}

function parseOffers(json: string | null | undefined): ClinicOffer[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    if (Array.isArray(arr)) {
      return arr.map((o: any) => ({
        title: String(o.title ?? ""),
        detail: o.detail ? String(o.detail) : "",
        discount_pct: o.discount_pct == null ? null : Number(o.discount_pct),
        valid_till: o.valid_till ? String(o.valid_till) : null,
        active: o.active !== false,
      })).filter((o: ClinicOffer) => o.title);
    }
  } catch {}
  return [];
}

// Read-model for every branch, merging stored status with sensible defaults.
export function listClinicStatus(): ClinicStatus[] {
  const d = db();
  const branches = d
    .prepare("SELECT id, name, city, manager_name FROM branches ORDER BY id")
    .all() as any[];
  const rows = d.prepare("SELECT * FROM clinic_status").all() as any[];
  const byBranch = new Map<number, any>(rows.map((r) => [r.branch_id, r]));
  const docName = (id: number | null) =>
    id ? ((d.prepare("SELECT name FROM doctors WHERE id = ?").get(id) as any)?.name ?? null) : null;

  return branches.map((b) => {
    const r = byBranch.get(b.id);
    return {
      branch_id: b.id,
      branch_name: b.name,
      city: b.city,
      manager_name: b.manager_name ?? null,
      is_open: r ? r.is_open : 1,
      status_note: r?.status_note ?? null,
      on_duty_doctor_id: r?.on_duty_doctor_id ?? null,
      on_duty_doctor_name: docName(r?.on_duty_doctor_id ?? null),
      doctor_on_leave: r ? r.doctor_on_leave : 0,
      doctor_leave_note: r?.doctor_leave_note ?? null,
      appliances: parseAppliances(r?.appliances_json),
      offers: parseOffers(r?.offers_json),
      updated_at: r?.updated_at ?? null,
      updated_by: r?.updated_by ?? null,
    };
  });
}

export function getClinicStatus(branchId: number): ClinicStatus | null {
  return listClinicStatus().find((s) => s.branch_id === branchId) ?? null;
}

export type ClinicStatusInput = {
  is_open?: boolean;
  status_note?: string | null;
  on_duty_doctor_id?: number | null;
  doctor_on_leave?: boolean;
  doctor_leave_note?: string | null;
  appliances?: ClinicAppliance[];
  offers?: ClinicOffer[];
  updated_by?: string | null;
};

export function upsertClinicStatus(branchId: number, input: ClinicStatusInput): ClinicStatus | null {
  const d = db();
  const existing = d.prepare("SELECT * FROM clinic_status WHERE branch_id = ?").get(branchId) as any;
  const merged = {
    is_open: input.is_open === undefined ? (existing?.is_open ?? 1) : input.is_open ? 1 : 0,
    status_note: input.status_note === undefined ? (existing?.status_note ?? null) : input.status_note,
    on_duty_doctor_id:
      input.on_duty_doctor_id === undefined ? (existing?.on_duty_doctor_id ?? null) : input.on_duty_doctor_id,
    doctor_on_leave:
      input.doctor_on_leave === undefined ? (existing?.doctor_on_leave ?? 0) : input.doctor_on_leave ? 1 : 0,
    doctor_leave_note:
      input.doctor_leave_note === undefined ? (existing?.doctor_leave_note ?? null) : input.doctor_leave_note,
    appliances_json:
      input.appliances === undefined ? (existing?.appliances_json ?? "[]") : JSON.stringify(input.appliances),
    offers_json: input.offers === undefined ? (existing?.offers_json ?? "[]") : JSON.stringify(input.offers),
    updated_by: input.updated_by ?? existing?.updated_by ?? null,
  };
  d.prepare(
    `INSERT INTO clinic_status
       (branch_id, is_open, status_note, on_duty_doctor_id, doctor_on_leave, doctor_leave_note, appliances_json, offers_json, updated_at, updated_by)
     VALUES (@branch_id, @is_open, @status_note, @on_duty_doctor_id, @doctor_on_leave, @doctor_leave_note, @appliances_json, @offers_json, datetime('now'), @updated_by)
     ON CONFLICT(branch_id) DO UPDATE SET
       is_open=@is_open, status_note=@status_note, on_duty_doctor_id=@on_duty_doctor_id,
       doctor_on_leave=@doctor_on_leave, doctor_leave_note=@doctor_leave_note,
       appliances_json=@appliances_json, offers_json=@offers_json,
       updated_at=datetime('now'), updated_by=@updated_by`
  ).run({ branch_id: branchId, ...merged });
  return getClinicStatus(branchId);
}

export type PractitionerSession = {
  id: number;
  appointment_id: number;
  patient_id: number;
  photos_json: string;
  consent_signed: number;
  medical_history: string | null;
  body_type: string | null;
  treatment_notes: string | null;
  started_at: string | null;
  completed_at: string | null;
  status: string;
};

export function getPractitionerSession(appointmentId: number): PractitionerSession | null {
  const row = db().prepare("SELECT * FROM practitioner_sessions WHERE appointment_id = ?").get(appointmentId);
  return (row as PractitionerSession | undefined) ?? null;
}

export function upsertPractitionerSession(
  appointmentId: number,
  patientId: number,
  data: Partial<Omit<PractitionerSession, 'id' | 'appointment_id' | 'patient_id'>>
): PractitionerSession {
  const d = db();
  const existing = d.prepare("SELECT id FROM practitioner_sessions WHERE appointment_id = ?").get(appointmentId);
  if (existing) {
    const fields = Object.keys(data) as Array<keyof typeof data>;
    if (fields.length > 0) {
      const set = fields.map(f => f + ' = ?').join(', ');
      d.prepare('UPDATE practitioner_sessions SET ' + set + ' WHERE appointment_id = ?').run(
        ...fields.map(f => data[f] as any), appointmentId
      );
    }
  } else {
    const allData: Record<string, any> = { appointment_id: appointmentId, patient_id: patientId, ...data };
    const fieldNames = Object.keys(allData);
    const placeholders = fieldNames.map(() => '?').join(', ');
    d.prepare(
      'INSERT INTO practitioner_sessions (' + fieldNames.join(', ') + ') VALUES (' + placeholders + ')'
    ).run(...fieldNames.map(f => allData[f]));
  }
  return d.prepare("SELECT * FROM practitioner_sessions WHERE appointment_id = ?").get(appointmentId) as PractitionerSession;
}

export type FnoSession = {
  id: number;
  appointment_id: number;
  patient_id: number;
  service_type: string;
  bom_items_json: string;
  submitted_at: string | null;
  status: string;
};

export function getFnoSession(appointmentId: number): FnoSession | null {
  const row = db().prepare("SELECT * FROM fno_sessions WHERE appointment_id = ?").get(appointmentId);
  return (row as FnoSession | undefined) ?? null;
}

export function upsertFnoSession(
  appointmentId: number,
  patientId: number,
  serviceType: string,
  bomItemsJson: string
): FnoSession {
  const d = db();
  const existing = d.prepare("SELECT id FROM fno_sessions WHERE appointment_id = ?").get(appointmentId);
  if (existing) {
    d.prepare("UPDATE fno_sessions SET bom_items_json = ? WHERE appointment_id = ?").run(bomItemsJson, appointmentId);
  } else {
    d.prepare(
      "INSERT INTO fno_sessions (appointment_id, patient_id, service_type, bom_items_json) VALUES (?, ?, ?, ?)"
    ).run(appointmentId, patientId, serviceType, bomItemsJson);
  }
  return d.prepare("SELECT * FROM fno_sessions WHERE appointment_id = ?").get(appointmentId) as FnoSession;
}

export function submitFnoSession(appointmentId: number): void {
  db().prepare(
    "UPDATE fno_sessions SET status = 'submitted', submitted_at = datetime('now') WHERE appointment_id = ?"
  ).run(appointmentId);
}

export type TreatmentOpsRow = {
  appointment_id: number;
  patient_id: number;
  patient_name: string;
  phone: string;
  service_type: string;
  appointment_ts: string;
  appt_status: string;
  branch_name: string;
  doctor_name: string | null;
  // Practitioner session
  ps_id: number | null;
  ps_status: string | null;
  ps_photos: number;
  ps_consent: number;
  ps_started_at: string | null;
  ps_completed_at: string | null;
  ps_notes: string | null;
  // FnO session
  fno_id: number | null;
  fno_status: string | null;
  fno_submitted_at: string | null;
};

export type ArrivedPatient = {
  appointment_id: number;
  patient_id: number;
  patient_name: string;
  phone: string;
  service_type: string;
  appointment_ts: string;
  appt_status: string;
  branch_name: string;
  doctor_name: string | null;
};

export function listArrivedToday(): ArrivedPatient[] {
  const today = new Date().toISOString().slice(0, 10);
  return db().prepare(`
    SELECT
      a.id              AS appointment_id,
      p.id              AS patient_id,
      p.name            AS patient_name,
      p.phone,
      a.service_type,
      a.appointment_ts,
      a.status          AS appt_status,
      b.name            AS branch_name,
      doc.name          AS doctor_name
    FROM appointments a
    JOIN patients p   ON p.id  = a.patient_id
    JOIN branches b   ON b.id  = a.branch_id
    LEFT JOIN doctors doc ON doc.id = a.doctor_id
    WHERE date(a.appointment_ts) = ?
      AND a.status IN ('arrived','in_session')
    ORDER BY a.appointment_ts ASC
  `).all(today) as ArrivedPatient[];
}

export function getTreatmentOps(lookbackDays = 30): TreatmentOpsRow[] {
  return db().prepare(`
    SELECT
      a.id              AS appointment_id,
      p.id              AS patient_id,
      p.name            AS patient_name,
      p.phone,
      a.service_type,
      a.appointment_ts,
      a.status          AS appt_status,
      b.name            AS branch_name,
      doc.name          AS doctor_name,
      ps.id             AS ps_id,
      ps.status         AS ps_status,
      COALESCE(json_array_length(ps.photos_json), 0) AS ps_photos,
      COALESCE(ps.consent_signed, 0)  AS ps_consent,
      ps.started_at     AS ps_started_at,
      ps.completed_at   AS ps_completed_at,
      ps.treatment_notes AS ps_notes,
      fs.id             AS fno_id,
      fs.status         AS fno_status,
      fs.submitted_at   AS fno_submitted_at
    FROM appointments a
    JOIN patients p   ON p.id  = a.patient_id
    JOIN branches b   ON b.id  = a.branch_id
    LEFT JOIN doctors doc ON doc.id = a.doctor_id
    LEFT JOIN practitioner_sessions ps ON ps.appointment_id = a.id
    LEFT JOIN fno_sessions          fs ON fs.appointment_id = a.id
    WHERE a.status IN ('arrived','in_session','in_treatment','converted','treatment_done','rescheduled')
      AND date(a.appointment_ts) >= date('now', '-' || ? || ' days')
    ORDER BY a.appointment_ts DESC
  `).all(lookbackDays) as TreatmentOpsRow[];
}

export function getNextAppointment(patientId: number): { appointment_ts: string; service_type: string; doctor_name: string | null } | null {
  return db().prepare(`
    SELECT a.appointment_ts, a.service_type, d.name AS doctor_name
    FROM appointments a
    LEFT JOIN doctors d ON d.id = a.doctor_id
    WHERE a.patient_id = ?
      AND date(a.appointment_ts) > date('now')
      AND a.status NOT IN ('no_show', 'converted', 'done', 'rescheduled')
    ORDER BY a.appointment_ts ASC
    LIMIT 1
  `).get(patientId) as { appointment_ts: string; service_type: string; doctor_name: string | null } | null;
}
