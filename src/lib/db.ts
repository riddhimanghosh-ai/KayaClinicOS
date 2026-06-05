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
  if (IS_VERCEL || IS_AMPLIFY) {
    // Cold start: copy the pre-seeded DB from the build artifact to /tmp
    if (!fs.existsSync(TMP_DB) && fs.existsSync(SOURCE_DB)) {
      try {
        fs.copyFileSync(SOURCE_DB, TMP_DB);
      } catch (e) {
        // If copy fails, that's ok - DB will be created fresh
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

  // Seed one demo prescription (hair-loss case from the provided JSON).
  try {
    const rxSeedExists = d.prepare("SELECT 1 FROM prescriptions WHERE is_seed = 1 LIMIT 1").get() as any;
    if (!rxSeedExists) {
      const firstPatient = d.prepare("SELECT id FROM patients ORDER BY id LIMIT 1").get() as any;
      if (firstPatient) {
        const demoItems = JSON.stringify([
          { problem: "हेयर लॉस", problem_type: "chronic", product: "मिनॉक्सिडेल (Minoxidil 5%)", product_detail: "Topical solution · 60 ml", dosage: "Apply 1 ml twice daily to affected scalp", dosage_detail: "Morning & evening · leave-on, do not rinse", cost: null },
          { problem: "हेयर लॉस", problem_type: "chronic", product: "GFC Therapy (Growth Factor Concentrate)", product_detail: "In-clinic procedure", dosage: "1 session every 20–25 days · 3 sessions", dosage_detail: "Then monthly maintenance as needed", cost: null },
          { problem: "हेयर लॉस", problem_type: null, product: "Anti Hair-Fall Serum", product_detail: "50 ml", dosage: "Apply 3–4 drops to scalp nightly", dosage_detail: "Massage gently · leave-on overnight", cost: null },
          { problem: "Skin Renewal", problem_type: null, product: "Peeling Session", product_detail: "In-clinic chemical peel", dosage: "1 session every 3–4 weeks", dosage_detail: "Follow post-peel care instructions", cost: null },
          { problem: "Skin Glow", problem_type: null, product: "Gluta Glow Face Serum", product_detail: "30 ml", dosage: "2–3 drops, apply to cleansed face AM & PM", dosage_detail: "Before moisturiser", cost: null },
          { problem: "Hyperpigmentation", problem_type: "chronic", product: "Hyperpigmentation Reducing Face Serum", product_detail: "30 ml", dosage: "Apply to affected areas morning & evening", dosage_detail: "After cleansing · before SPF in the morning", cost: null },
          { problem: "Skin Glow & Hydration", problem_type: null, product: "Kaya NUTRA+ Glutathione Mouth Melt Powder", product_detail: "1 sachet per dose", dosage: "1 sachet daily · dissolve under tongue", dosage_detail: "Best taken on an empty stomach", cost: null },
          { problem: "Skin Brightening", problem_type: null, product: "Kaya Brightening Night Cream", product_detail: "50 ml", dosage: "Apply to face every night as the last step", dosage_detail: "After serum · avoid eye area", cost: null },
        ]);
        const demoClinical = "Patient presents with androgenic (pattern) alopecia with dry scalp, and concurrent skin concerns (hyperpigmentation, dullness). Plan: PRP/GFC therapy — 3 sessions at 20–25 day intervals, then monthly maintenance. Minoxidil 5% to be applied consistently twice daily. Peeling sessions for skin renewal. Complete home-care regimen as prescribed below. Increase water intake, eat a protein-rich balanced diet, apply SPF 30+ daily. Follow-up in 6–8 weeks to assess response.";
        d.prepare(`
          INSERT INTO prescriptions (patient_id, items_json, clinical_recommendation, dispensing_fee_inr, source_type, is_seed)
          VALUES (?, ?, ?, 60, 'voice', 1)
        `).run(firstPatient.id, demoItems, demoClinical);
      }
    }
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
  try { d.exec("ALTER TABLE sessions_consumed ADD COLUMN session_type TEXT DEFAULT 'treatment'"); } catch {}
  try { d.exec("ALTER TABLE appointments ADD COLUMN referred_by TEXT"); } catch {}
  try { d.exec("ALTER TABLE appointments ADD COLUMN duration_minutes INTEGER DEFAULT 45"); } catch {}
  try { d.exec("ALTER TABLE appointments ADD COLUMN disposition TEXT"); } catch {}
  try { d.exec("ALTER TABLE appointments ADD COLUMN sub_disposition TEXT"); } catch {}
  try { d.exec("ALTER TABLE appointments ADD COLUMN lead_type TEXT DEFAULT 'call'"); } catch {}
  try { d.exec("ALTER TABLE appointments ADD COLUMN campaign TEXT"); } catch {}
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
  // Seed today's appointments if none exist (dev only)
  try {
    const today = new Date().toISOString().slice(0, 10);
    const cnt = (d.prepare("SELECT COUNT(*) as cnt FROM appointments WHERE date(appointment_ts) = ?").get(today) as any).cnt;
    if (cnt === 0) {
      const patients = d.prepare("SELECT id FROM patients ORDER BY id LIMIT 8").all() as any[];
      const SERVICES   = ["Consultation","Laser Hair Reduction","Carbon Laser Peel","Acne Clearance Program","Q-Switch Laser Toning","Chemical Peel","Consultation","Microneedling for Scars"];
      const TIMES      = ["09:00","09:30","10:00","10:30","11:00","11:30","14:00","14:30"];
      // Distribute across 4 doctors so no doctor has overlapping slots
      const DOCTOR_IDS = [1, 2, 1, 3, 2, 3, 1, 4];
      // Realistic treatment durations (minutes)
      const DURATIONS  = [30, 60, 60, 45, 60, 45, 30, 75];
      const LEAD_TYPES = ['website_form', 'chatbot', 'call', 'referral', 'campaign', 'walk_in'];
      const DISPOSITIONS = ['New Consultation', 'Follow-up Visit', 'Treatment Session', 'Package Session'];
      const SUB_DISPS = ['New Patient', 'Existing Patient', 'Re-engagement', 'Referral Patient'];
      patients.forEach((p: any, i: number) => {
        const branchId = i < 4 ? 1 : 2;
        d.prepare("INSERT OR IGNORE INTO appointments (patient_id, branch_id, doctor_id, service_type, appointment_ts, status, contact_booking_number, disposition, sub_disposition, lead_type, duration_minutes) VALUES (?, ?, ?, ?, ?, 'booked', ?, ?, ?, ?, ?)").run(
          p.id, branchId, DOCTOR_IDS[i], SERVICES[i], `${today} ${TIMES[i]}:00`, `VESC${String(100000 + i * 173)}`,
          DISPOSITIONS[i % DISPOSITIONS.length], SUB_DISPS[i % SUB_DISPS.length], LEAD_TYPES[i % LEAD_TYPES.length], DURATIONS[i]
        );
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
}

export function resetSchema(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
  if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
  if (fs.existsSync(PHOTOS_DIR)) {
    for (const f of fs.readdirSync(PHOTOS_DIR)) {
      fs.unlinkSync(path.join(PHOTOS_DIR, f));
    }
  }
  initSchema();
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
       JOIN branches b ON b.id = s.branch_id
       JOIN doctors doc ON doc.id = s.doctor_id
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
  const q = name.trim().toLowerCase();
  const product = d
    .prepare(`SELECT price_inr FROM products_catalog WHERE lower(name) = ? LIMIT 1`)
    .get(q) as any;
  if (product) return product.price_inr;
  const service = d
    .prepare(`SELECT price_inr FROM services_catalog WHERE lower(name) = ? LIMIT 1`)
    .get(q) as any;
  if (service) return service.price_inr;
  // Fuzzy: catalog name contained in the spoken product name or vice versa.
  const pLike = d
    .prepare(
      `SELECT price_inr FROM products_catalog WHERE ? LIKE '%' || lower(name) || '%' OR lower(name) LIKE '%' || ? || '%' LIMIT 1`
    )
    .get(q, q) as any;
  if (pLike) return pLike.price_inr;
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

    const avgSvcPrice = col > 0 && sessCount > 0
      ? col / (d.prepare(
          `SELECT COALESCE(SUM(sessions_total),0) AS t FROM packages_purchased WHERE strftime('%Y-%m', purchase_date) = ?`
        ).get(month) as any).t
      : 0;

    const netRevenue = sessCount * avgSvcPrice + prodCol;

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
      AND a.status IN ('arrived','in_session','converted')
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
    WHERE a.status IN ('arrived','in_session','converted','rescheduled')
      AND date(a.appointment_ts) >= date('now', '-' || ? || ' days')
    ORDER BY a.appointment_ts DESC
  `).all(lookbackDays) as TreatmentOpsRow[];
}
