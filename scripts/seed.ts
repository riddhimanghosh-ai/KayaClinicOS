import fs from "node:fs";
import path from "node:path";
import { db, resetSchema, clinicFinancialSummary, PHOTOS_DIR } from "../src/lib/db";

// Deterministic PRNG so reseeds are reproducible.
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(42);
const rint = (lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1));
const choice = <T>(arr: readonly T[]) => arr[Math.floor(rng() * arr.length)];

const TODAY = new Date("2026-05-18");
const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const shift = (days: number) => {
  const d = new Date(TODAY);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
};

// ---------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------

const BRANCHES = [
  { id: 1, name: "Kaya Bandra", city: "Mumbai" },
  { id: 2, name: "Kaya Connaught Place", city: "Delhi" },
];

const DOCTORS = [
  { id: 1, name: "Dr. Rohan Malhotra", specialty: "Dermatology & Aesthetics", home_branch_id: 1 },
  { id: 2, name: "Dr. Priya Bhatia", specialty: "Cosmetic Dermatology", home_branch_id: 1 },
  { id: 3, name: "Dr. Aditya Sengupta", specialty: "Dermatology & Laser", home_branch_id: 2 },
  { id: 4, name: "Dr. Neha Iyer", specialty: "Aesthetic Surgery", home_branch_id: 2 },
];

const SERVICES = [
  { id: 1,  name: "Laser Hair Reduction - Full Face", category: "Laser",      price_inr: 36000,  periodic_days: 30,  item_code: "SER-LHR-001", is_new_launch: 0, discount_pct: 0,  description: "6-session full-face LHR package. Targets hair follicles using diode laser for permanent reduction over 6 sessions." },
  { id: 2,  name: "Laser Hair Reduction - Full Body", category: "Laser",      price_inr: 120000, periodic_days: 30,  item_code: "SER-LHR-002", is_new_launch: 0, discount_pct: 10, description: "6-session full-body LHR. Comprehensive hair removal for all body zones including legs, arms, back, and underarms." },
  { id: 3,  name: "Q-Switch Laser Toning",            category: "Laser",      price_inr: 48000,  periodic_days: 21,  item_code: "SER-LSR-003", is_new_launch: 0, discount_pct: 0,  description: "6-session pigmentation correction and skin tone improvement using Q-Switch Nd:YAG laser. Targets melasma and sun spots." },
  { id: 4,  name: "Thermage FLX",                     category: "RF",         price_inr: 180000, periodic_days: 0,   item_code: "SER-RF-004",  is_new_launch: 0, discount_pct: 0,  description: "Single-session radiofrequency skin tightening. Stimulates collagen remodelling for firmer skin — results visible over 3-6 months." },
  { id: 5,  name: "Chemical Peel - Salicylic",        category: "Peel",       price_inr: 18000,  periodic_days: 21,  item_code: "SER-PCL-005", is_new_launch: 0, discount_pct: 15, description: "4-session BHA peel for active acne and congested pores. Penetrates sebaceous follicles to clear blackheads and reduce oil." },
  { id: 6,  name: "Chemical Peel - Glycolic",         category: "Peel",       price_inr: 20000,  periodic_days: 30,  item_code: "SER-PCL-006", is_new_launch: 0, discount_pct: 0,  description: "4-session AHA glow peel. Exfoliates dull skin, improves texture, and brightens uneven skin tone." },
  { id: 7,  name: "Acne Clearance Program",           category: "Acne",       price_inr: 24000,  periodic_days: 21,  item_code: "SER-ACN-007", is_new_launch: 0, discount_pct: 0,  description: "4-session active acne clearance combining light therapy, extractions, and anti-inflammatory treatment." },
  { id: 8,  name: "Hydra Facial",                     category: "Facial",     price_inr: 8000,   periodic_days: 30,  item_code: "SER-FAC-008", is_new_launch: 0, discount_pct: 0,  description: "Single-session 3-step facial: cleanse, exfoliate, and hydrate using vortex infusion technology for an instant glow." },
  { id: 9,  name: "IV Drip - Glow",                   category: "IV",         price_inr: 12000,  periodic_days: 30,  item_code: "SER-IVD-009", is_new_launch: 0, discount_pct: 0,  description: "Single-session antioxidant IV drip with glutathione, vitamin C, and B-complex for skin brightening from within." },
  { id: 10, name: "Microneedling for Scars",          category: "Scar",       price_inr: 42000,  periodic_days: 30,  item_code: "SER-MNS-010", is_new_launch: 1, discount_pct: 0,  description: "6-session fractional microneedling for atrophic acne scars. Creates controlled micro-injuries to stimulate collagen remodelling." },
  { id: 11, name: "Subcision (per scar zone)",        category: "Scar",       price_inr: 15000,  periodic_days: 45,  item_code: "SER-SCN-011", is_new_launch: 0, discount_pct: 0,  description: "Minimally invasive technique to release tethered atrophic scars using a hypodermic needle, allowing skin to lift." },
  { id: 12, name: "Botox (per unit)",                 category: "Injectable", price_inr: 450,    periodic_days: 120, item_code: "SER-BTX-012", is_new_launch: 0, discount_pct: 0,  description: "Botulinum toxin type A per-unit injection. Used for dynamic wrinkle softening on forehead, glabellar, and crow's feet areas." },
  { id: 13, name: "DermaFrac SS",                     category: "Scar",       price_inr: 22000,  periodic_days: 30,  item_code: "SER-AA-022",  is_new_launch: 1, discount_pct: 0,  description: "DermaFrac simultaneous microchanneling + infusion treatment for scars. Serum is infused directly into skin channels for deep penetration." },
  { id: 14, name: "Carbon Laser Peel",                category: "Laser",      price_inr: 15000,  periodic_days: 21,  item_code: "SER-CLR-014", is_new_launch: 1, discount_pct: 20, description: "Carbon laser peel (Hollywood Peel) — carbon lotion applied then vaporised by Q-Switch laser. Deep-cleanses pores, reduces oiliness, and brightens tone." },
  { id: 15, name: "Gentle Touch Small Essential - Upper Neck", category: "RF", price_inr: 28000, periodic_days: 45, item_code: "SER-GTE-015", is_new_launch: 1, discount_pct: 0,  description: "Targeted RF treatment for upper neck skin laxity and jowl area. Uses Gentle Touch handpiece for precise tightening and contouring." },
];

const PRODUCTS = [
  { id: 1, sku: "KAYA-BRT-001", name: "Kaya Brightening Serum",       category: "Pigmentation", price_inr: 2450, item_code: "PC-BRT-001", is_new_launch: 0, discount_pct: 0,  description: "Niacinamide 10% + alpha arbutin serum for daily brightening. Reduces post-inflammatory hyperpigmentation and evens skin tone." },
  { id: 2, sku: "KAYA-VTC-002", name: "Kaya Vitamin C 15% Serum",     category: "Antioxidant",  price_inr: 2900, item_code: "PC-VTC-002", is_new_launch: 0, discount_pct: 10, description: "Stable L-ascorbic acid 15% serum for antioxidant protection and collagen synthesis. Use AM before SPF." },
  { id: 3, sku: "KAYA-SPF-003", name: "Kaya Sunscreen SPF 50 PA+++",  category: "Sun Care",     price_inr: 1100, item_code: "PC-SPF-003", is_new_launch: 0, discount_pct: 0,  description: "Lightweight tinted broad-spectrum mineral + chemical hybrid SPF 50 PA++++. Non-greasy formula suitable for all skin types." },
  { id: 4, sku: "KAYA-ACN-004", name: "Kaya Acne Free Foaming Wash",  category: "Acne",         price_inr: 850,  item_code: "PC-ACN-004", is_new_launch: 0, discount_pct: 15, description: "Salicylic acid 2% foaming cleanser to unclog pores, reduce active breakouts, and control sebum." },
  { id: 5, sku: "KAYA-BAR-005", name: "Kaya Barrier Repair Cream",    category: "Barrier",      price_inr: 1950, item_code: "PC-BAR-005", is_new_launch: 0, discount_pct: 0,  description: "Ceramide NP, cholesterol, and fatty acid blend to restore compromised skin barrier. Use PM on dry or sensitised skin." },
  { id: 6, sku: "KAYA-RET-006", name: "Kaya Retinol Night Cream 0.3%",category: "Anti-Ageing",  price_inr: 2750, item_code: "PC-RET-006", is_new_launch: 1, discount_pct: 0,  description: "Encapsulated retinol 0.3% night cream for fine lines, texture, and cell turnover. Gradual release minimises irritation." },
  { id: 7, sku: "KAYA-PIG-007", name: "Kaya Pigmentation Corrector",  category: "Pigmentation", price_inr: 3200, item_code: "PC-PIG-007", is_new_launch: 0, discount_pct: 0,  description: "Tranexamic acid + kojic acid targeted pigmentation corrector. For stubborn melasma and dark spots." },
  { id: 8, sku: "KAYA-AHA-008", name: "Kaya AHA Glow Toner",          category: "Exfoliant",    price_inr: 1650, item_code: "PC-AHA-008", is_new_launch: 1, discount_pct: 10, description: "Glycolic acid 7% + lactic acid 3% exfoliating toner for weekly use. Smooths texture and improves radiance." },
];

const NAMES: Array<[string, string]> = [
  ["Aanya Sharma", "F"], ["Aarav Patel", "M"], ["Gladston Sequeira", "M"],
  ["Anjali Reddy", "F"], ["Arjun Kapoor", "M"], ["Aditi Gupta", "F"],
  ["Akash Singh", "M"], ["Avani Joshi", "F"], ["Bhavya Mehta", "F"],
  ["Diya Nair", "F"], ["Esha Bhatt", "F"], ["Gauri Desai", "F"],
  ["Ishaan Khanna", "M"], ["Jhanvi Malhotra", "F"], ["Kavya Chopra", "F"],
  ["Kunal Verma", "M"], ["Maya Saxena", "F"], ["Meera Pillai", "F"],
  ["Mihir Bose", "M"], ["Nikita Rao", "F"], ["Niharika Shah", "F"],
  ["Pooja Banerjee", "F"], ["Priya Sengupta", "F"], ["Rahul Trivedi", "M"],
  ["Rajat Khurana", "M"], ["Riya Bhalla", "F"], ["Rohan Chatterjee", "M"],
  ["Sanjana Kulkarni", "F"], ["Shreya Bhardwaj", "F"], ["Siddharth Roy", "M"],
  ["Tanvi Goswami", "F"], ["Tara Krishnan", "F"], ["Varun Hegde", "M"],
  ["Vihaan Menon", "M"], ["Yashvi Jain", "F"], ["Zara Ahluwalia", "F"],
  ["Ainish Kapoor", "M"], ["Karan Subramaniam", "M"], ["Leela Ramaswamy", "F"],
  ["Devika Pandit", "F"],
];

function phoneFor(i: number): string {
  return `+9198${(20000000 + i * 17).toString().padStart(8, "0")}`;
}

// ---------------------------------------------------------------------------
// SVG photo placeholder
// ---------------------------------------------------------------------------

function makePlaceholderSVG(name: string, visitDate: string, region: string, severity: number): string {
  const baseR = 245, baseG = 224, baseB = 210;
  const shift = severity * 18;
  const r = Math.min(baseR + shift, 255);
  const g = Math.max(baseG - shift, 80);
  const b = Math.max(baseB - shift, 80);
  const sevLabel = ["Clear", "Mild", "Moderate", "Severe"][Math.min(severity, 3)];
  const dotRng = mulberry32(hashStr(`${name}|${visitDate}|${region}`));
  let dots = "";
  for (let i = 0; i < severity * 6; i++) {
    const x = 40 + Math.floor(dotRng() * 240);
    const y = 140 + Math.floor(dotRng() * 160);
    const rr = 3 + Math.floor(dotRng() * 5);
    dots += `<circle cx="${x}" cy="${y}" r="${rr}" fill="#AA3232" opacity="0.85" />`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320">
  <rect width="320" height="320" fill="rgb(${r},${g},${b})" />
  <text x="16" y="32" font-family="system-ui,Helvetica,Arial,sans-serif" font-size="16" font-weight="600" fill="#3C1E14">${escapeXml(name)}</text>
  <text x="16" y="56" font-family="system-ui,Helvetica,Arial,sans-serif" font-size="13" fill="#3C1E14">Visit: ${escapeXml(visitDate)}</text>
  <text x="16" y="76" font-family="system-ui,Helvetica,Arial,sans-serif" font-size="13" fill="#3C1E14">Region: ${escapeXml(region)}</text>
  <text x="16" y="96" font-family="system-ui,Helvetica,Arial,sans-serif" font-size="13" fill="#3C1E14">Severity: ${sevLabel}</text>
  ${dots}
</svg>`;
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]!));
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// ---------------------------------------------------------------------------
// Seeders
// ---------------------------------------------------------------------------

function archetype(idx: number): "alpha" | "beta" | "gap" | "normal" {
  if (idx < 8) return "alpha";
  if (idx < 14) return "beta";
  if (idx < 24) return "gap";
  return "normal";
}

function insertReference() {
  const d = db();
  const insBranch = d.prepare("INSERT OR REPLACE INTO branches (id, name, city) VALUES (?, ?, ?)");
  BRANCHES.forEach((b) => insBranch.run(b.id, b.name, b.city));

  const insDoctor = d.prepare(
    "INSERT OR REPLACE INTO doctors (id, name, specialty, home_branch_id) VALUES (?, ?, ?, ?)"
  );
  DOCTORS.forEach((doc) => insDoctor.run(doc.id, doc.name, doc.specialty, doc.home_branch_id));

  const insSvc = d.prepare(
    "INSERT OR REPLACE INTO services_catalog (id, name, category, price_inr, periodic_days, description, item_code, is_new_launch, discount_pct) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );
  SERVICES.forEach((s) =>
    insSvc.run(s.id, s.name, s.category, s.price_inr, s.periodic_days, s.description, s.item_code, s.is_new_launch, s.discount_pct)
  );

  const insProd = d.prepare(
    "INSERT OR REPLACE INTO products_catalog (id, sku, name, category, price_inr, description, item_code, is_new_launch, discount_pct) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );
  PRODUCTS.forEach((p) =>
    insProd.run(p.id, p.sku, p.name, p.category, p.price_inr, p.description, p.item_code, p.is_new_launch, p.discount_pct)
  );
}

function findService(name: string) {
  return SERVICES.find((s) => s.name === name)!;
}

function findProduct(sku: string) {
  return PRODUCTS.find((p) => p.sku === sku)!;
}

const MARITAL_STATUSES = ["single", "married", "divorced", "widowed"] as const;
const STATES = ["Maharashtra", "Delhi", "Karnataka", "Tamil Nadu", "Telangana", "Gujarat", "West Bengal"] as const;

function guestCodeFor(patientId: number): string {
  return `GDRC${patientId + 10000}`;
}

function orderNumberFor(pkgId: number, patientId: number): string {
  return `ORD-${String(10000000 + pkgId * 300 + patientId).padStart(9, "0")}`;
}

function addPackage(
  patientId: number,
  branchId: number,
  serviceName: string,
  sessionsTotal: number,
  sessionsUsed: number,
  purchaseOffsetDays: number,
  doctorId: number
): number {
  const svc = findService(serviceName);
  const purchaseDate = shift(-purchaseOffsetDays);
  const expiry = shift(-purchaseOffsetDays + 365);
  const d = db();
  const info = d
    .prepare(
      `INSERT INTO packages_purchased (patient_id, service_id, sessions_total, sessions_used,
        collection_paid_inr, purchase_date, expiry_date) VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      patientId,
      svc.id,
      sessionsTotal,
      sessionsUsed,
      svc.price_inr,
      isoDate(purchaseDate),
      isoDate(expiry)
    );
  const pkgId = Number(info.lastInsertRowid);
  d.prepare("UPDATE packages_purchased SET order_number = ? WHERE id = ?")
   .run(orderNumberFor(pkgId, patientId), pkgId);

  const cadence = Math.max(svc.periodic_days || 30, 14);
  const insSess = d.prepare(
    `INSERT INTO sessions_consumed (package_id, patient_id, branch_id, doctor_id, session_date, service_name_snapshot, session_type)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  // First entry is always a Consultation
  const consultDate = new Date(purchaseDate);
  consultDate.setUTCDate(consultDate.getUTCDate() + 1);
  insSess.run(pkgId, patientId, branchId, doctorId, isoDate(consultDate), svc.name, "consultation");

  for (let i = 0; i < sessionsUsed; i++) {
    let sessDate = new Date(purchaseDate);
    sessDate.setUTCDate(sessDate.getUTCDate() + cadence * (i + 1) + 1);
    if (sessDate.getTime() > TODAY.getTime()) {
      sessDate = shift(-cadence * (sessionsUsed - i));
    }
    insSess.run(pkgId, patientId, branchId, doctorId, isoDate(sessDate), svc.name, "treatment");
  }
  return pkgId;
}

function addProductPurchase(patientId: number, sku: string, daysAgo: number, qty = 1) {
  const prod = findProduct(sku);
  db()
    .prepare(
      "INSERT INTO product_purchases (patient_id, product_id, qty, price_paid_inr, purchase_date) VALUES (?, ?, ?, ?, ?)"
    )
    .run(patientId, prod.id, qty, prod.price_inr * qty, isoDate(shift(-daysAgo)));
}

type TagInput = {
  primary_concern: string | null;
  barrier_status: string | null;
  next_recommended_service: string | null;
  product_adherence_score: number;
  active_acne_status: string;
  scar_treatment_candidate: number;
  treatment_ready_for: string | null;
  free_tags?: Record<string, any>;
};

function addTags(patientId: number, t: TagInput) {
  db()
    .prepare(
      `INSERT INTO doctor_tags (patient_id, session_id, primary_concern, barrier_status,
        next_recommended_service, product_adherence_score, active_acne_status,
        scar_treatment_candidate, treatment_ready_for, free_tags_json)
       VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      patientId,
      t.primary_concern,
      t.barrier_status,
      t.next_recommended_service,
      t.product_adherence_score,
      t.active_acne_status,
      t.scar_treatment_candidate,
      t.treatment_ready_for,
      JSON.stringify(t.free_tags ?? {})
    );
}

function addPhotos(
  patientId: number,
  patientName: string,
  branchId: number,
  startDaysAgo: number,
  n: number,
  region: string,
  severityCurve: number[]
) {
  const insPhoto = db().prepare(
    "INSERT INTO skin_photos (patient_id, visit_date, region, image_path, uploaded_by_branch_id) VALUES (?, ?, ?, ?, ?)"
  );
  for (let i = 0; i < n; i++) {
    const date = shift(-startDaysAgo + i * 21);
    const severity = severityCurve[Math.min(i, severityCurve.length - 1)];
    const fname = `p${patientId}_${isoDate(date)}_${region}.svg`;
    const fpath = path.join(PHOTOS_DIR, fname);
    fs.writeFileSync(fpath, makePlaceholderSVG(patientName, isoDate(date), region, severity));
    // Store path relative to /public so Next can serve as /photos/<file>.
    insPhoto.run(patientId, isoDate(date), region, `photos/${fname}`, branchId);
  }
}

function seedAlpha(patientId: number, name: string, branchId: number) {
  const doctorId = branchId === 1 ? 1 : 3;
  addPackage(patientId, branchId, "Acne Clearance Program", 4, 4, 120, doctorId);
  addProductPurchase(patientId, "KAYA-ACN-004", 110);
  addProductPurchase(patientId, "KAYA-BAR-005", 40);
  addProductPurchase(patientId, "KAYA-SPF-003", 30);
  addTags(patientId, {
    primary_concern: "post_inflammatory_acne_scarring",
    barrier_status: "intact",
    next_recommended_service: "Microneedling for Scars",
    product_adherence_score: 8,
    active_acne_status: "resolved",
    scar_treatment_candidate: 1,
    treatment_ready_for: "Microneedling",
    free_tags: { recommend_cycle_days: 30, subcision_indicated_zones: ["left_cheek"] },
  });
  addPhotos(patientId, name, branchId, 120, 5, "left_cheek", [3, 3, 2, 1, 1]);
}

function seedBeta(patientId: number, name: string, branchId: number) {
  const doctorId = branchId === 1 ? 2 : 4;
  addPackage(patientId, branchId, "Chemical Peel - Glycolic", 4, 2, 90, doctorId);
  addProductPurchase(patientId, "KAYA-BRT-001", 30);
  addProductPurchase(patientId, "KAYA-PIG-007", 20);
  addProductPurchase(patientId, "KAYA-SPF-003", 25);
  addTags(patientId, {
    primary_concern: "deep_dermal_melasma",
    barrier_status: "intact",
    next_recommended_service: "Q-Switch Laser Toning",
    product_adherence_score: 9,
    active_acne_status: "resolved",
    scar_treatment_candidate: 0,
    treatment_ready_for: "Q_Switch_Laser",
    free_tags: { melasma_grade: "MASI_12", phototype: "IV" },
  });
  addPhotos(patientId, name, branchId, 90, 4, "upper_cheek_zygoma", [2, 2, 2, 1]);
}

function seedGap(patientId: number, name: string, branchId: number, idx: number) {
  const doctorId = branchId === 1 ? 1 : 3;
  const svcName = idx % 2 === 0 ? "Laser Hair Reduction - Full Face" : "Q-Switch Laser Toning";
  addPackage(patientId, branchId, svcName, 6, 2, 180, doctorId);
  addProductPurchase(patientId, "KAYA-SPF-003", 150);
  addTags(patientId, {
    primary_concern: "periodic_maintenance",
    barrier_status: "intact",
    next_recommended_service: svcName,
    product_adherence_score: 5,
    active_acne_status: "resolved",
    scar_treatment_candidate: 0,
    treatment_ready_for: null,
    free_tags: { churn_risk: "high", drop_off_month: 4 },
  });
  addPhotos(patientId, name, branchId, 180, 3, "chin_neck", [1, 1, 1]);
}

function seedNormal(patientId: number, _name: string, branchId: number, idx: number) {
  const doctorId = (idx % 4) + 1;
  const flavor = idx % 4;
  if (flavor === 0) {
    addPackage(patientId, branchId, "Laser Hair Reduction - Full Face", 6, 5, 200, doctorId);
    addProductPurchase(patientId, "KAYA-SPF-003", 60);
  } else if (flavor === 1) {
    addPackage(patientId, branchId, "Hydra Facial", 1, 1, 15, doctorId);
    addProductPurchase(patientId, "KAYA-VTC-002", 10);
  } else if (flavor === 2) {
    addPackage(patientId, branchId, "IV Drip - Glow", 1, 1, 30, doctorId);
  } else {
    addPackage(patientId, branchId, "Chemical Peel - Salicylic", 4, 3, 80, doctorId);
    addProductPurchase(patientId, "KAYA-ACN-004", 70);
  }
  addTags(patientId, {
    primary_concern: "general_skin_health",
    barrier_status: "intact",
    next_recommended_service: null,
    product_adherence_score: rint(5, 9),
    active_acne_status: choice(["resolved", "resolving"] as const),
    scar_treatment_candidate: 0,
    treatment_ready_for: null,
    free_tags: {},
  });
}

function seedPatients() {
  const d = db();
  const insPatient = d.prepare(
    `INSERT INTO patients (name, phone, email, gender, dob, city, state, marital_status, guest_code, home_branch_id, premium_tier)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  NAMES.forEach(([name, gender], idx) => {
    const archetypeKey = archetype(idx);
    const branchId = idx % 2 === 0 ? 1 : 2;
    const city = branchId === 1 ? "Mumbai" : "Delhi";
    const state = branchId === 1 ? "Maharashtra" : "Delhi";
    const dob = new Date(1985 + (idx % 18), idx % 12, (idx % 27) + 1)
      .toISOString()
      .slice(0, 10);
    const tier = idx % 5 === 0 ? "premium" : "standard";
    const marital = MARITAL_STATUSES[idx % MARITAL_STATUSES.length];

    const info = insPatient.run(
      name,
      phoneFor(idx),
      `${name.toLowerCase().replace(/\s+/g, ".")}@example.in`,
      gender,
      dob,
      city,
      state,
      marital,
      guestCodeFor(idx + 1),
      branchId,
      tier
    );
    const patientId = Number(info.lastInsertRowid);

    if (archetypeKey === "alpha") seedAlpha(patientId, name, branchId);
    else if (archetypeKey === "beta") seedBeta(patientId, name, branchId);
    else if (archetypeKey === "gap") seedGap(patientId, name, branchId, idx);
    else seedNormal(patientId, name, branchId, idx);
  });
}

function seedCheckIns() {
  const d = db();
  const targets = [1, 9, 15, 25];
  const ins = d.prepare(
    "INSERT INTO check_ins (patient_id, branch_id, doctor_id, check_in_ts, status) VALUES (?, ?, ?, ?, ?)"
  );
  for (const pid of targets) {
    const row = d
      .prepare("SELECT home_branch_id FROM patients WHERE id = ?")
      .get(pid) as any;
    if (!row) continue;
    const branchId = row.home_branch_id;
    const doctorId = branchId === 1 ? 1 : 3;
    ins.run(pid, branchId, doctorId, `${isoDate(TODAY)}T10:30:00`, "waiting");
  }
}

function main() {
  resetSchema();
  insertReference();
  seedPatients();
  seedCheckIns();
  const summary = clinicFinancialSummary();
  console.log(`Seeded ${NAMES.length} patients across ${BRANCHES.length} branches.`);
  console.log(`  Collection:           ₹${summary.total_collection_inr.toLocaleString("en-IN")}`);
  console.log(`  Net Revenue:          ₹${summary.total_net_revenue_inr.toLocaleString("en-IN")}`);
  console.log(`  Unearned balance:     ₹${summary.package_unearned_balance_inr.toLocaleString("en-IN")}`);
  const photosDir = PHOTOS_DIR;
  const nPhotos = fs.readdirSync(photosDir).length;
  console.log(`  Photos generated:     ${nPhotos}`);
}

main();
