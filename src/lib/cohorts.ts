import { db } from "./db";
import type { CohortRow } from "./types";

const LATEST_TAGS_CTE = `
WITH latest_tags AS (
  SELECT t.* FROM doctor_tags t
  JOIN (
    SELECT patient_id, MAX(created_at) AS mx
    FROM doctor_tags GROUP BY patient_id
  ) m ON m.patient_id = t.patient_id AND m.mx = t.created_at
)
`;

function todayDate(): Date {
  return new Date();
}

// ---------------------------------------------------------------------------
// Recipe Alpha — Acne → Scar transition
// ---------------------------------------------------------------------------

export function recipeAlpha(withinDays = 180): CohortRow[] {
  const cutoff = new Date(todayDate().getTime() - withinDays * 86400000)
    .toISOString()
    .slice(0, 10);

  const sql =
    LATEST_TAGS_CTE +
    `
    SELECT p.id AS patient_id, p.name AS patient_name, p.phone,
           b.name AS branch_name,
           lt.primary_concern, lt.active_acne_status, lt.scar_treatment_candidate,
           lt.barrier_status, lt.next_recommended_service,
           MAX(s.session_date) AS last_acne_session
    FROM patients p
    JOIN branches b ON b.id = p.home_branch_id
    JOIN sessions_consumed s ON s.patient_id = p.id
    JOIN services_catalog sc ON sc.id = (
      SELECT pk.service_id FROM packages_purchased pk WHERE pk.id = s.package_id
    )
    JOIN latest_tags lt ON lt.patient_id = p.id
    WHERE sc.category IN ('Acne', 'Peel')
      AND s.session_date >= ?
      AND lt.active_acne_status = 'resolved'
      AND lt.scar_treatment_candidate = 1
      AND lt.barrier_status IN ('intact', 'stable')
    GROUP BY p.id
    ORDER BY last_acne_session DESC
  `;
  const rows = db().prepare(sql).all(cutoff) as any[];
  return rows.map((r) => ({
    patient_id: r.patient_id,
    patient_name: r.patient_name,
    phone: r.phone,
    branch_name: r.branch_name,
    reason: `Completed acne clearance on ${r.last_acne_session}, doctor flagged scar-treatment-ready with ${r.barrier_status} barrier. Next recommended: ${r.next_recommended_service ?? "Microneedling for Scars"}.`,
    suggested_discount_pct: 20,
    context: {
      cohort: "alpha",
      last_acne_session: r.last_acne_session,
      next_recommended_service: r.next_recommended_service,
      barrier_status: r.barrier_status,
    },
  }));
}

// ---------------------------------------------------------------------------
// Recipe Beta — Pigmentation layering
// ---------------------------------------------------------------------------

export function recipeBeta(): CohortRow[] {
  const sql =
    LATEST_TAGS_CTE +
    `
    SELECT p.id AS patient_id, p.name AS patient_name, p.phone,
           b.name AS branch_name,
           lt.primary_concern, lt.treatment_ready_for, lt.next_recommended_service,
           lt.barrier_status,
           MAX(pp.purchase_date) AS last_brightening_purchase
    FROM patients p
    JOIN branches b ON b.id = p.home_branch_id
    JOIN product_purchases pp ON pp.patient_id = p.id
    JOIN products_catalog pc ON pc.id = pp.product_id
    JOIN latest_tags lt ON lt.patient_id = p.id
    WHERE pc.category IN ('Pigmentation')
      AND lt.primary_concern IN ('deep_dermal_melasma', 'melasma')
      AND lt.treatment_ready_for = 'Q_Switch_Laser'
    GROUP BY p.id
    ORDER BY last_brightening_purchase DESC
  `;
  const rows = db().prepare(sql).all() as any[];
  return rows.map((r) => ({
    patient_id: r.patient_id,
    patient_name: r.patient_name,
    phone: r.phone,
    branch_name: r.branch_name,
    reason: `Bought brightening product on ${r.last_brightening_purchase}; doctor tagged deep dermal melasma and flagged ready for Q-Switch Laser Toning.`,
    suggested_discount_pct: 15,
    context: {
      cohort: "beta",
      last_brightening_purchase: r.last_brightening_purchase,
      next_recommended_service: r.next_recommended_service ?? "Q-Switch Laser Toning",
    },
  }));
}

// ---------------------------------------------------------------------------
// Recipe Gap-Closer — 6-month inactivity with unused sessions
// ---------------------------------------------------------------------------

export function recipeGapCloser(monthsInactive = 6): CohortRow[] {
  const sql = `
    SELECT p.id AS patient_id, p.name AS patient_name, p.phone,
           b.name AS branch_name,
           pk.id AS package_id, pk.sessions_total, pk.sessions_used,
           pk.collection_paid_inr, pk.purchase_date,
           sc.name AS service_name,
           (SELECT MAX(session_date) FROM sessions_consumed WHERE patient_id = p.id) AS last_any_visit
    FROM patients p
    JOIN branches b ON b.id = p.home_branch_id
    JOIN packages_purchased pk ON pk.patient_id = p.id
    JOIN services_catalog sc ON sc.id = pk.service_id
    WHERE pk.sessions_used < pk.sessions_total
      AND (pk.expiry_date IS NULL OR pk.expiry_date >= date('now'))
  `;
  const rows = db().prepare(sql).all() as any[];
  const out: CohortRow[] = [];
  const today = todayDate();
  const cutoffDays = monthsInactive * 30;

  for (const r of rows) {
    const lastVisitStr = r.last_any_visit ?? r.purchase_date;
    if (!lastVisitStr) continue;
    const last = new Date(lastVisitStr);
    if (isNaN(last.getTime())) continue;
    const daysSince = Math.floor((today.getTime() - last.getTime()) / 86400000);
    if (daysSince < cutoffDays) continue;
    const monthsSince = Math.floor(daysSince / 30);
    const sessionsRemaining = r.sessions_total - r.sessions_used;
    const perSession = r.collection_paid_inr / r.sessions_total;
    const unearned = Math.round(perSession * sessionsRemaining);
    const reason =
      `No clinic visit in ${monthsSince} month${monthsSince !== 1 ? "s" : ""} — ` +
      `${sessionsRemaining} unused session${sessionsRemaining !== 1 ? "s" : ""} on ${r.service_name} ` +
      `(${r.sessions_used}/${r.sessions_total} used). ` +
      `₹${unearned.toLocaleString("en-IN")} of paid balance unclaimed.`;
    out.push({
      patient_id: r.patient_id,
      patient_name: r.patient_name,
      phone: r.phone,
      branch_name: r.branch_name,
      reason,
      suggested_discount_pct: 20,
      context: {
        cohort: "gap",
        package_id: r.package_id,
        service_name: r.service_name,
        sessions_used: r.sessions_used,
        sessions_total: r.sessions_total,
        sessions_remaining: sessionsRemaining,
        unearned_balance_inr: unearned,
        days_since_last: daysSince,
        months_since_last: monthsSince,
      },
    });
  }
  out.sort((a, b) => (b.context.unearned_balance_inr ?? 0) - (a.context.unearned_balance_inr ?? 0));
  return out;
}

// ---------------------------------------------------------------------------
// Custom DSL
// ---------------------------------------------------------------------------

export type CustomFilter = {
  primary_concern?: string | null;
  barrier_status?: string | null;
  treatment_ready_for?: string | null;
  active_acne_status?: string | null;
  scar_treatment_candidate?: number | null;
  min_adherence?: number | null;
  purchased_product_category?: string | null;
  bought_service_category?: string | null;
  branch_id?: number | null;
  min_unearned_balance_inr?: number | null;
  min_total_collection_inr?: number | null;
  // NEW
  min_sessions_used?: number | null;
  max_sessions_unused?: number | null;
  last_visited_after?: string | null;
  expiry_before?: string | null;
  cohort_label?: string | null;
  upsell_service?: string | null;
};

export function customQuery(
  f: CustomFilter,
  discountPct = 10,
  cohortLabel = "custom"
): CohortRow[] {
  let sql =
    LATEST_TAGS_CTE +
    `
    SELECT p.id AS patient_id, p.name AS patient_name, p.phone, p.home_branch_id,
           b.name AS branch_name,
           lt.primary_concern, lt.barrier_status, lt.treatment_ready_for,
           lt.active_acne_status, lt.scar_treatment_candidate,
           lt.product_adherence_score, lt.next_recommended_service
    FROM patients p
    JOIN branches b ON b.id = p.home_branch_id
    LEFT JOIN latest_tags lt ON lt.patient_id = p.id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (f.primary_concern) {
    sql += " AND lt.primary_concern = ?";
    params.push(f.primary_concern);
  }
  if (f.barrier_status) {
    sql += " AND lt.barrier_status = ?";
    params.push(f.barrier_status);
  }
  if (f.treatment_ready_for) {
    sql += " AND lt.treatment_ready_for = ?";
    params.push(f.treatment_ready_for);
  }
  if (f.active_acne_status) {
    sql += " AND lt.active_acne_status = ?";
    params.push(f.active_acne_status);
  }
  if (f.scar_treatment_candidate != null) {
    sql += " AND lt.scar_treatment_candidate = ?";
    params.push(Number(f.scar_treatment_candidate));
  }
  if (f.min_adherence != null) {
    sql += " AND COALESCE(lt.product_adherence_score, 0) >= ?";
    params.push(f.min_adherence);
  }
  if (f.branch_id != null) {
    sql += " AND p.home_branch_id = ?";
    params.push(f.branch_id);
  }
  if (f.purchased_product_category) {
    sql +=
      " AND p.id IN (SELECT pp.patient_id FROM product_purchases pp JOIN products_catalog pc ON pc.id = pp.product_id WHERE pc.category = ?)";
    params.push(f.purchased_product_category);
  }
  if (f.bought_service_category) {
    sql +=
      " AND p.id IN (SELECT pk.patient_id FROM packages_purchased pk JOIN services_catalog sc ON sc.id = pk.service_id WHERE sc.category = ?)";
    params.push(f.bought_service_category);
  }
  if (f.min_sessions_used != null) {
    sql += " AND (SELECT COALESCE(SUM(pk2.sessions_used),0) FROM packages_purchased pk2 WHERE pk2.patient_id = p.id) >= ?";
    params.push(f.min_sessions_used);
  }
  if (f.max_sessions_unused != null) {
    sql += " AND (SELECT COALESCE(SUM(pk2.sessions_total - pk2.sessions_used),0) FROM packages_purchased pk2 WHERE pk2.patient_id = p.id AND (pk2.expiry_date IS NULL OR pk2.expiry_date >= date('now'))) <= ?";
    params.push(f.max_sessions_unused);
  }
  if (f.last_visited_after) {
    sql += " AND (SELECT MAX(s2.session_date) FROM sessions_consumed s2 WHERE s2.patient_id = p.id) >= ?";
    params.push(f.last_visited_after);
  }
  if (f.expiry_before) {
    sql += " AND EXISTS(SELECT 1 FROM packages_purchased pk3 WHERE pk3.patient_id = p.id AND pk3.expiry_date IS NOT NULL AND pk3.expiry_date <= ?)";
    params.push(f.expiry_before);
  }

  const rows = db().prepare(sql).all(...params) as any[];

  const out: CohortRow[] = [];
  for (const r of rows) {
    const [unearned, collection] = financialsFor(r.patient_id);
    if (f.min_unearned_balance_inr != null && unearned < f.min_unearned_balance_inr) continue;
    if (f.min_total_collection_inr != null && collection < f.min_total_collection_inr) continue;

    const reasonParts: string[] = [];
    if (r.primary_concern) reasonParts.push(`concern: ${r.primary_concern}`);
    if (r.barrier_status) reasonParts.push(`barrier: ${r.barrier_status}`);
    if (r.treatment_ready_for) reasonParts.push(`ready for: ${r.treatment_ready_for}`);
    const reason = reasonParts.length
      ? `Custom cohort — ${reasonParts.join(", ")}`
      : "Custom cohort match";

    out.push({
      patient_id: r.patient_id,
      patient_name: r.patient_name,
      phone: r.phone,
      branch_name: r.branch_name,
      reason,
      suggested_discount_pct: discountPct,
      context: {
        cohort: cohortLabel,
        next_recommended_service: r.next_recommended_service,
        unearned_balance_inr: unearned,
        total_collection_inr: collection,
      },
    });
  }
  return out;
}

function financialsFor(patientId: number): [number, number] {
  const d = db();
  const pkgs = d
    .prepare(
      "SELECT collection_paid_inr, sessions_total, sessions_used FROM packages_purchased WHERE patient_id = ?"
    )
    .all(patientId) as any[];
  const productsRow = d
    .prepare(
      "SELECT COALESCE(SUM(price_paid_inr), 0) AS s FROM product_purchases WHERE patient_id = ?"
    )
    .get(patientId) as any;
  const products = productsRow?.s ?? 0;
  const collection = pkgs.reduce((acc, p) => acc + p.collection_paid_inr, 0) + products;
  const recognized = pkgs.reduce(
    (acc, p) =>
      acc + (p.sessions_total > 0 ? Math.round((p.collection_paid_inr * p.sessions_used) / p.sessions_total) : 0),
    0
  );
  const packageCollection = pkgs.reduce((acc, p) => acc + p.collection_paid_inr, 0);
  const unearned = packageCollection - recognized;
  return [unearned, collection];
}

export function recipeInactiveUsers(daysSince = 90): CohortRow[] {
  const sql = `
    SELECT p.id AS patient_id, p.name AS patient_name, p.phone,
           b.name AS branch_name,
           (SELECT MAX(session_date) FROM sessions_consumed WHERE patient_id = p.id) AS last_any_visit,
           (SELECT COUNT(*) FROM packages_purchased WHERE patient_id = p.id) AS total_packages,
           (SELECT COALESCE(SUM(collection_paid_inr),0) FROM packages_purchased WHERE patient_id = p.id) AS total_spent
    FROM patients p
    JOIN branches b ON b.id = p.home_branch_id
  `;
  const rows = db().prepare(sql).all() as any[];
  const out: CohortRow[] = [];
  const today = todayDate();

  for (const r of rows) {
    const lastVisitStr = r.last_any_visit;
    if (!lastVisitStr) continue;
    const last = new Date(lastVisitStr);
    if (isNaN(last.getTime())) continue;
    const days = Math.floor((today.getTime() - last.getTime()) / 86400000);
    if (days < daysSince) continue;
    out.push({
      patient_id: r.patient_id,
      patient_name: r.patient_name,
      phone: r.phone,
      branch_name: r.branch_name,
      reason: `No clinic visit in ${days} days (last: ${lastVisitStr}). Spent ₹${Number(r.total_spent).toLocaleString("en-IN")} across ${r.total_packages} package${r.total_packages !== 1 ? "s" : ""}.`,
      suggested_discount_pct: 15,
      context: { cohort: "inactive", days_since_last: days, total_spent: r.total_spent },
    });
  }
  out.sort((a, b) => (b.context.days_since_last ?? 0) - (a.context.days_since_last ?? 0));
  return out;
}

// ---------------------------------------------------------------------------
// Recipe Missed Session — active packages, last session 14–120 days ago
// ---------------------------------------------------------------------------

export function recipeMissedSession(): CohortRow[] {
  const sql = `
    SELECT p.id AS patient_id, p.name AS patient_name, p.phone,
           b.name AS branch_name,
           pk.id AS package_id, sc.name AS service_name,
           pk.sessions_used, pk.sessions_total,
           (pk.sessions_total - pk.sessions_used) AS sessions_remaining,
           (SELECT MAX(s2.session_date) FROM sessions_consumed s2 WHERE s2.patient_id = p.id) AS last_visit
    FROM patients p
    JOIN branches b ON b.id = p.home_branch_id
    JOIN packages_purchased pk ON pk.patient_id = p.id
    JOIN services_catalog sc ON sc.id = pk.service_id
    WHERE pk.sessions_used > 0
      AND pk.sessions_used < pk.sessions_total
      AND (pk.expiry_date IS NULL OR pk.expiry_date >= date('now'))
    GROUP BY p.id, pk.id
  `;
  const rows = db().prepare(sql).all() as any[];
  const today = todayDate();
  const out: CohortRow[] = [];
  for (const r of rows) {
    if (!r.last_visit) continue;
    const daysSince = Math.floor((today.getTime() - new Date(r.last_visit).getTime()) / 86400000);
    if (daysSince < 14 || daysSince > 120) continue;
    out.push({
      patient_id: r.patient_id,
      patient_name: r.patient_name,
      phone: r.phone,
      branch_name: r.branch_name,
      reason: `Missed session — last visited ${daysSince} days ago, ${r.sessions_remaining} session${r.sessions_remaining !== 1 ? "s" : ""} remaining on ${r.service_name}.`,
      suggested_discount_pct: 0,
      context: {
        cohort: "missed",
        service_name: r.service_name,
        sessions_remaining: r.sessions_remaining,
        days_since_last: daysSince,
        last_visit: r.last_visit,
      },
    });
  }
  out.sort((a, b) => (b.context.days_since_last ?? 0) - (a.context.days_since_last ?? 0));
  return out;
}

// ---------------------------------------------------------------------------
// Recipe Follow Up — patients who had a treatment in the last 2–10 days
// ---------------------------------------------------------------------------

export function recipeFollowUp(): CohortRow[] {
  const sql = `
    SELECT p.id AS patient_id, p.name AS patient_name, p.phone,
           b.name AS branch_name,
           MAX(s.session_date) AS last_treatment,
           sc.name AS service_name
    FROM patients p
    JOIN branches b ON b.id = p.home_branch_id
    JOIN sessions_consumed s ON s.patient_id = p.id
    LEFT JOIN packages_purchased pk ON pk.id = s.package_id
    LEFT JOIN services_catalog sc ON sc.id = pk.service_id
    WHERE s.session_type = 'treatment'
      AND s.session_date >= date('now', '-10 days')
      AND s.session_date <= date('now', '-2 days')
    GROUP BY p.id
    ORDER BY last_treatment DESC
  `;
  const rows = db().prepare(sql).all() as any[];
  return rows.map(r => ({
    patient_id: r.patient_id,
    patient_name: r.patient_name,
    phone: r.phone,
    branch_name: r.branch_name,
    reason: `Recent treatment: ${r.service_name ?? "session"} on ${r.last_treatment}. Follow up to check skin response.`,
    suggested_discount_pct: 0,
    context: {
      cohort: "followup",
      service_name: r.service_name,
      last_treatment: r.last_treatment,
    },
  }));
}

export const RECIPES = {
  alpha: {
    label: "Scar Treatment Upsell",
    description:
      "Acne-cleared patients with intact barrier, doctor-confirmed ready for scar treatment.",
    defaultDiscountPct: 20,
    run: () => recipeAlpha(),
  },
  beta: {
    label: "Q-Switch Laser Upsell",
    description:
      "Brightening product buyers with melasma, doctor-flagged ready for laser toning.",
    defaultDiscountPct: 15,
    run: () => recipeBeta(),
  },
  gap: {
    label: "Pending Session Re-engagement",
    description:
      "Patients who haven't visited in 6+ months but still have unused sessions and paid balance locked.",
    defaultDiscountPct: 20,
    run: () => recipeGapCloser(),
  },
  missed: {
    label: "Missed Session",
    description: "Patients who haven't returned for their next session in 14–120 days despite having unused sessions.",
    defaultDiscountPct: 0,
  },
  followup: {
    label: "Follow Up",
    description: "Patients who had a treatment 2–10 days ago — reach out to check how their skin is responding.",
    defaultDiscountPct: 0,
  },
} as const;

export type RecipeKey = keyof typeof RECIPES;
