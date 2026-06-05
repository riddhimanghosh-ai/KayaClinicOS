import { clinicFinancialSummary, db, getMonthlyRevenue, listSavedCohorts } from "@/lib/db";
import type { SavedCohort } from "@/lib/db";
import { recipeAlpha, recipeBeta, recipeGapCloser, recipeInactiveUsers, recipeMissedSession, recipeFollowUp, RECIPES } from "@/lib/cohorts";

import { PageHeader } from "@/components/page-header";
import { MetricCard } from "@/components/metric-card";
import { ManagerClient } from "./manager-client";
import { inr, pct, todayISO } from "@/lib/utils";
import type { PendingSessionRow } from "@/app/api/pending-sessions/route";

export const dynamic = "force-dynamic";

function getPendingSessions(): PendingSessionRow[] {
  const today = todayISO();
  const sql = `
    SELECT b.name AS branch_name,
           p.id AS patient_id, p.name AS patient_name,
           pk.id AS package_id,
           sc.id AS service_id, sc.name AS service_name, sc.category AS service_category,
           pk.sessions_total, pk.sessions_used,
           (pk.sessions_total - pk.sessions_used) AS pending,
           pk.expiry_date
    FROM packages_purchased pk
    JOIN patients p ON p.id = pk.patient_id
    JOIN branches b ON b.id = p.home_branch_id
    JOIN services_catalog sc ON sc.id = pk.service_id
    WHERE pk.sessions_used < pk.sessions_total
      AND (pk.expiry_date IS NULL OR pk.expiry_date >= ?)
    ORDER BY pending DESC, b.name, p.name
  `;
  return db().prepare(sql).all(today) as PendingSessionRow[];
}

export default function ManagerPage() {
  const fin = clinicFinancialSummary();
  const monthly = getMonthlyRevenue(2);
  const meta = (k: keyof typeof RECIPES) => ({
    label: RECIPES[k].label,
    description: RECIPES[k].description,
    defaultDiscountPct: RECIPES[k].defaultDiscountPct,
  });
  const cohorts = {
    alpha: { meta: meta("alpha"), rows: recipeAlpha() },
    beta: { meta: meta("beta"), rows: recipeBeta() },
    gap: { meta: meta("gap"), rows: recipeGapCloser(2) },
    inactive: {
      meta: { label: "Inactive Users", description: "Patients who haven't visited the clinic in the selected number of days.", defaultDiscountPct: 15 },
      rows: recipeInactiveUsers(90),
    },
    missed: { meta: { label: "Missed Session", description: "Patients with unused sessions who haven't returned in 14–120 days.", defaultDiscountPct: 0 }, rows: recipeMissedSession() },
    followup: { meta: { label: "Follow Up", description: "Patients who had a treatment 2–10 days ago.", defaultDiscountPct: 0 }, rows: recipeFollowUp() },
  };
  const initialPending = getPendingSessions();
  const savedCohorts = listSavedCohorts();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clinic Manager Console"
        subtitle="Collection · Net Revenue · Cohort Engine · Re-engagement"
      />

      {/* All-time financial summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard label="Total Collection" value={inr(fin.total_collection_inr)} />
        <MetricCard label="Net Revenue" value={inr(fin.total_net_revenue_inr)} hint={`${pct(fin.total_net_revenue_inr, fin.total_collection_inr)} of collection`} />
        <MetricCard label="Unearned Balance" value={inr(fin.package_unearned_balance_inr)} hint="Sessions paid, not yet consumed" accent />
        <MetricCard label="Collection Efficiency" value={pct(fin.total_net_revenue_inr, fin.total_collection_inr)} />
      </div>

      {/* Monthly breakdown */}
      {monthly.length >= 2 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {monthly.map(m => (
            <div key={m.month} className="rounded-lg border border-border bg-card p-4">
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">{m.label}</div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-[10px] text-muted-foreground">Collection</div>
                  <div className="text-lg font-bold text-foreground">{inr(m.collection_inr)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">Net Revenue</div>
                  <div className="text-lg font-bold text-foreground">{inr(m.net_revenue_inr)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">Sessions Done</div>
                  <div className="text-lg font-bold text-foreground">{m.sessions_consumed_count}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ManagerClient
        cohorts={cohorts}
        initialPending={initialPending}
        initialSavedCohorts={savedCohorts}
      />
    </div>
  );
}
