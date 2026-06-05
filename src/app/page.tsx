import {
  Building2, Users, CalendarCheck2, TrendingUp, UserCog, ShieldCheck,
  MapPin, Globe, Sparkles, ArrowRight, UserCircle, Activity, Zap,
  Clock, CheckCircle2, AlertTriangle, BarChart3, Wifi, Package,
  ChevronRight, Brain, DollarSign,
} from "lucide-react";
import Link from "next/link";

import {
  clinicFinancialSummary,
  listAllPatients,
  listBranchStats,
  listAllDoctors,
  listClinicStatus,
  getMonthlyRevenue,
  getAppointments,
  getPendingSessionPatients,
  listSavedCohorts,
} from "@/lib/db";
import { llmStatus } from "@/lib/llm";
import { RECIPES } from "@/lib/cohorts";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { inr, pct } from "@/lib/utils";

function StatBox({
  label, value, sub, accent = false, green = false, amber = false,
}: {
  label: string; value: string | number; sub?: string;
  accent?: boolean; green?: boolean; amber?: boolean;
}) {
  return (
    <div className={[
      "rounded-xl border px-5 py-4 space-y-1",
      accent ? "border-primary/30 bg-primary/5" : green ? "border-emerald-200 bg-emerald-50" : amber ? "border-amber-200 bg-amber-50" : "border-border bg-card",
    ].join(" ")}>
      <div className={["text-2xl font-bold tabular-nums leading-none", accent ? "text-primary" : green ? "text-emerald-700" : amber ? "text-amber-700" : "text-foreground"].join(" ")}>
        {value}
      </div>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function SectionHeading({ children, href, linkLabel }: { children: React.ReactNode; href?: string; linkLabel?: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{children}</h2>
      {href && (
        <Link href={href} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors">
          {linkLabel ?? "Open"} <ChevronRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

export default function SuperAdminHome() {
  const fin = clinicFinancialSummary();
  const llm = llmStatus();
  const patients = listAllPatients();
  const branchStats = listBranchStats();
  const doctors = listAllDoctors();
  const clinicStatuses = listClinicStatus();
  const monthlyRevenue = getMonthlyRevenue(3);
  const pendingSessions = getPendingSessionPatients();
  const savedCohorts = listSavedCohorts();

  // Today's appointments
  const today = new Date().toISOString().slice(0, 10);
  const todayAppts = getAppointments(today);
  const apptByStatus = {
    booked:     todayAppts.filter(a => a.status === "booked").length,
    confirmed:  todayAppts.filter(a => a.status === "confirmed").length,
    arrived:    todayAppts.filter(a => a.status === "arrived").length,
    in_session: todayAppts.filter(a => a.status === "in_session").length,
    converted:  todayAppts.filter(a => a.status === "converted").length,
    no_show:    todayAppts.filter(a => a.status === "no_show").length,
  };
  const liveCount = apptByStatus.arrived + apptByStatus.in_session;

  // Zone aggregates
  const zoneMap = new Map<string, { zone_name: string; zone_manager_name: string | null; branches: typeof branchStats }>();
  for (const b of branchStats) {
    const key = b.zone_name ?? "Unassigned";
    if (!zoneMap.has(key)) zoneMap.set(key, { zone_name: key, zone_manager_name: b.zone_manager_name ?? null, branches: [] });
    zoneMap.get(key)!.branches.push(b);
  }
  const zones = Array.from(zoneMap.values()).map(z => ({
    ...z,
    totalPatients: z.branches.reduce((s, b) => s + b.total_patients, 0),
    sessionsUsed:  z.branches.reduce((s, b) => s + b.sessions_used, 0),
    sessionsPending: z.branches.reduce((s, b) => s + b.sessions_pending, 0),
    doctorCount:   z.branches.reduce((s, b) => s + b.doctor_count, 0),
  }));

  // Total session stats
  const totalSessionsUsed    = branchStats.reduce((s, b) => s + b.sessions_used, 0);
  const totalSessionsPending = branchStats.reduce((s, b) => s + b.sessions_pending, 0);

  // Clinic issues
  const clinicsWithIssues = clinicStatuses.filter(cs => !cs.is_open || cs.doctor_on_leave || cs.appliances.some(a => !a.working));

  // Revenue trend — most recent month first
  const latestMonth = monthlyRevenue[0];

  return (
    <div className="space-y-10 pb-16">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <PageHeader
        title="Super Admin"
        subtitle={`KayaOS Network · ${new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}`}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={llm.live ? "success" : "outline"} className="gap-1.5">
              <Brain className="h-3 w-3" />
              AI · {llm.mode} · {llm.provider}
            </Badge>
            <Badge variant={liveCount > 0 ? "default" : "outline"} className="gap-1.5">
              <Activity className="h-3 w-3" />
              {liveCount} live now
            </Badge>
          </div>
        }
      />

      {/* ── Network KPIs ───────────────────────────────────────────────────── */}
      <section>
        <SectionHeading>Network financials</SectionHeading>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatBox label="Total Collection" value={inr(fin.total_collection_inr)} accent />
          <StatBox label="Net Revenue" value={inr(fin.total_net_revenue_inr)} sub={`${pct(fin.total_net_revenue_inr, fin.total_collection_inr)} recognised`} green />
          <StatBox label="Unearned Balance" value={inr(fin.package_unearned_balance_inr)} sub="Unused packages" amber />
          <StatBox label="Total Patients" value={patients.length} />
          <StatBox label="Sessions Used" value={totalSessionsUsed} />
          <StatBox label="Sessions Pending" value={totalSessionsPending} sub={`${pendingSessions.length} patients not booked`} amber />
        </div>
      </section>

      {/* ── Today at a glance ─────────────────────────────────────────────── */}
      <section>
        <SectionHeading href="/manager/appointments" linkLabel="Schedule board">
          Today — {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" })} at a glance
        </SectionHeading>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Appointment funnel */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CalendarCheck2 className="h-4 w-4 text-primary" />
                Appointment pipeline — {todayAppts.length} total
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: "Booked",      count: apptByStatus.booked,     color: "bg-blue-400",    bg: "bg-blue-50",    text: "text-blue-700" },
                { label: "Confirmed",   count: apptByStatus.confirmed,  color: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700" },
                { label: "Arrived",     count: apptByStatus.arrived,    color: "bg-amber-500",   bg: "bg-amber-50",   text: "text-amber-700" },
                { label: "In Session",  count: apptByStatus.in_session, color: "bg-violet-500",  bg: "bg-violet-50",  text: "text-violet-700" },
                { label: "Completed",   count: apptByStatus.converted,  color: "bg-green-600",   bg: "bg-green-50",   text: "text-green-700" },
                { label: "No Show",     count: apptByStatus.no_show,    color: "bg-gray-400",    bg: "bg-gray-50",    text: "text-gray-600" },
              ].map(row => (
                <div key={row.label} className="flex items-center gap-3">
                  <div className="w-24 text-xs text-muted-foreground shrink-0">{row.label}</div>
                  <div className="flex-1 h-5 rounded bg-secondary overflow-hidden">
                    <div
                      className={`h-full rounded ${row.color} transition-all`}
                      style={{ width: todayAppts.length > 0 ? `${(row.count / todayAppts.length) * 100}%` : "0%" }}
                    />
                  </div>
                  <span className={`text-xs font-bold w-5 text-right tabular-nums ${row.text}`}>{row.count}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Clinic readiness */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Wifi className="h-4 w-4 text-primary" />
                Clinic readiness
                {clinicsWithIssues.length > 0 && (
                  <Badge variant="destructive" className="ml-auto text-[10px]">
                    {clinicsWithIssues.length} issue{clinicsWithIssues.length !== 1 ? "s" : ""}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {clinicStatuses.map(cs => {
                const down = cs.appliances.filter(a => !a.working);
                const issue = !cs.is_open || cs.doctor_on_leave || down.length > 0;
                return (
                  <div key={cs.branch_id} className={[
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm",
                    issue ? "bg-red-50 border border-red-100" : "bg-emerald-50 border border-emerald-100",
                  ].join(" ")}>
                    <span className={`h-2 w-2 rounded-full shrink-0 ${cs.is_open ? (issue ? "bg-amber-500" : "bg-emerald-500") : "bg-red-500"}`} />
                    <span className="font-medium flex-1 truncate">{cs.branch_name}</span>
                    {!cs.is_open && <span className="text-[10px] text-red-600 font-medium">Closed</span>}
                    {cs.doctor_on_leave && <span className="text-[10px] text-amber-600 font-medium">Dr on leave</span>}
                    {down.length > 0 && <span className="text-[10px] text-red-600 font-medium">{down.length} device{down.length !== 1 ? "s" : ""} down</span>}
                    {!issue && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                  </div>
                );
              })}
              {clinicStatuses.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-3">No clinic status data yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── Revenue trend ──────────────────────────────────────────────────── */}
      <section>
        <SectionHeading href="/manager/financials" linkLabel="Financials">Revenue trend</SectionHeading>
        <Card>
          <CardContent className="pt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="text-left pb-2 font-medium">Month</th>
                    <th className="text-right pb-2 font-medium">Collection</th>
                    <th className="text-right pb-2 font-medium">Net Revenue</th>
                    <th className="text-right pb-2 font-medium">Sessions</th>
                    <th className="pb-2 w-32 pl-4">vs prev month</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyRevenue.map((row, i) => {
                    const prev = monthlyRevenue[i + 1];
                    const delta = prev ? row.collection_inr - prev.collection_inr : null;
                    const isUp = delta != null && delta > 0;
                    return (
                      <tr key={row.month} className="border-b border-border/50 last:border-0">
                        <td className="py-2.5 font-medium">{row.label}</td>
                        <td className="py-2.5 text-right tabular-nums font-semibold">{inr(row.collection_inr)}</td>
                        <td className="py-2.5 text-right tabular-nums text-emerald-700 font-semibold">{inr(row.net_revenue_inr)}</td>
                        <td className="py-2.5 text-right tabular-nums">{row.sessions_consumed_count}</td>
                        <td className="py-2.5 pl-4">
                          {delta != null ? (
                            <span className={`text-xs font-medium ${isUp ? "text-emerald-600" : "text-red-500"}`}>
                              {isUp ? "▲" : "▼"} {inr(Math.abs(delta))}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ── Branch performance table ───────────────────────────────────────── */}
      <section>
        <SectionHeading href="/manager" linkLabel="Manager console">Branch performance</SectionHeading>
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/40 border-b border-border">
                  <tr className="text-xs text-muted-foreground">
                    <th className="text-left px-4 py-2.5 font-medium">Clinic</th>
                    <th className="text-left px-4 py-2.5 font-medium">Zone</th>
                    <th className="text-left px-4 py-2.5 font-medium">Manager</th>
                    <th className="text-right px-4 py-2.5 font-medium">Patients</th>
                    <th className="text-right px-4 py-2.5 font-medium">Used</th>
                    <th className="text-right px-4 py-2.5 font-medium">Pending</th>
                    <th className="text-right px-4 py-2.5 font-medium">Doctors</th>
                    <th className="px-4 py-2.5 font-medium w-32">Utilisation</th>
                  </tr>
                </thead>
                <tbody>
                  {branchStats.map(b => {
                    const totalSess = b.sessions_used + b.sessions_pending;
                    const util = totalSess > 0 ? Math.round((b.sessions_used / totalSess) * 100) : 0;
                    return (
                      <tr key={b.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-semibold">{b.name}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />{b.city}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{b.zone_name ?? "—"}</td>
                        <td className="px-4 py-3 text-xs">{b.manager_name ?? <span className="text-muted-foreground">—</span>}</td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums">{b.total_patients}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-emerald-700 font-medium">{b.sessions_used}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-amber-600 font-medium">{b.sessions_pending}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{b.doctor_count}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                              <div className="h-full rounded-full bg-primary/60 transition-all" style={{ width: `${util}%` }} />
                            </div>
                            <span className="text-[10px] text-muted-foreground w-8 text-right tabular-nums">{util}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ── Zone breakdown ────────────────────────────────────────────────── */}
      <section>
        <SectionHeading>Zone breakdown</SectionHeading>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {zones.map(z => {
            const utilPct = (z.sessionsUsed + z.sessionsPending) > 0
              ? Math.round((z.sessionsUsed / (z.sessionsUsed + z.sessionsPending)) * 100)
              : 0;
            return (
              <Card key={z.zone_name} className="border border-border/70">
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm leading-tight">{z.zone_name}</div>
                      {z.zone_manager_name && (
                        <div className="text-[10px] text-muted-foreground truncate">Head: {z.zone_manager_name}</div>
                      )}
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {z.branches.length} clinic{z.branches.length !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[
                      { label: "Patients", value: z.totalPatients },
                      { label: "Sess. Used", value: z.sessionsUsed },
                      { label: "Doctors", value: z.doctorCount },
                    ].map(kv => (
                      <div key={kv.label} className="rounded-md bg-secondary/40 py-2">
                        <div className="text-base font-bold tabular-nums">{kv.value}</div>
                        <div className="text-[9px] text-muted-foreground uppercase tracking-wide mt-0.5">{kv.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Session utilisation</span>
                      <span>{utilPct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full rounded-full bg-primary/60" style={{ width: `${utilPct}%` }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ── Cohort engine ─────────────────────────────────────────────────── */}
      <section>
        <SectionHeading href="/manager" linkLabel="Open CRM">
          Cohort engine · {savedCohorts.length} saved cohort{savedCohorts.length !== 1 ? "s" : ""}
        </SectionHeading>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(["alpha", "beta", "gap"] as const).map(key => {
            const recipe = RECIPES[key];
            const colors: Record<string, { bg: string; border: string; badge: string }> = {
              alpha: { bg: "bg-rose-50", border: "border-rose-200", badge: "bg-rose-100 text-rose-700" },
              beta:  { bg: "bg-violet-50", border: "border-violet-200", badge: "bg-violet-100 text-violet-700" },
              gap:   { bg: "bg-amber-50", border: "border-amber-200", badge: "bg-amber-100 text-amber-700" },
            };
            const c = colors[key];
            return (
              <Card key={key} className={`border ${c.border} ${c.bg}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm font-semibold">{recipe.label}</CardTitle>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${c.badge}`}>
                      {recipe.defaultDiscountPct > 0 ? `${recipe.defaultDiscountPct}% offer` : "Re-engage"}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground leading-relaxed">{recipe.description}</p>
                  <Link href="/manager" className="mt-3 flex items-center gap-1 text-xs font-medium text-foreground hover:text-primary transition-colors">
                    <Sparkles className="h-3 w-3" />Build cohort &amp; send WhatsApp
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ── Pending re-engagement ─────────────────────────────────────────── */}
      {pendingSessions.length > 0 && (
        <section>
          <SectionHeading href="/manager" linkLabel="View all">
            Re-engagement needed · {pendingSessions.length} patients with unused sessions
          </SectionHeading>
          <Card>
            <CardContent className="pt-4">
              <div className="space-y-2">
                {pendingSessions.slice(0, 8).map(p => (
                  <div key={p.id} className="flex items-center gap-3 text-sm rounded-lg px-3 py-2 hover:bg-secondary/40 transition-colors">
                    <div className={[
                      "h-2 w-2 rounded-full shrink-0",
                      (p.days_since_visit ?? 99) > 60 ? "bg-red-500" :
                      (p.days_since_visit ?? 99) > 30 ? "bg-amber-500" : "bg-emerald-500",
                    ].join(" ")} />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{p.name}</span>
                      {p.branch_name && <span className="text-xs text-muted-foreground ml-1.5">· {p.branch_name}</span>}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {p.days_since_visit != null ? `${p.days_since_visit}d ago` : "Never visited"}
                    </span>
                    <span className="text-xs font-semibold text-amber-600 shrink-0">
                      {p.pending_sessions} session{p.pending_sessions !== 1 ? "s" : ""} left
                    </span>
                  </div>
                ))}
                {pendingSessions.length > 8 && (
                  <div className="text-center text-xs text-muted-foreground pt-1">
                    +{pendingSessions.length - 8} more patients
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* ── Staff & doctors ───────────────────────────────────────────────── */}
      <section>
        <SectionHeading>Medical team · {doctors.length} doctors</SectionHeading>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {branchStats.map(b => {
            const branchDoctors = doctors.filter(d => d.branch_id === b.id);
            return (
              <Card key={b.id} className="border border-border/70">
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold text-sm">{b.name}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{b.city}</span>
                  </div>
                  {branchDoctors.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No doctors assigned</p>
                  ) : (
                    branchDoctors.map(d => (
                      <div key={d.id} className="flex items-center gap-2 text-xs">
                        <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] shrink-0">
                          {d.name.charAt(0)}
                        </div>
                        <span className="flex-1 font-medium">{d.name.startsWith("Dr") ? d.name : `Dr. ${d.name}`}</span>
                        <span className="text-muted-foreground truncate max-w-[100px]">{d.specialty}</span>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ── System health ─────────────────────────────────────────────────── */}
      <section>
        <SectionHeading>System health</SectionHeading>
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* AI engine */}
              <div className={["rounded-lg border px-4 py-3 space-y-1", llm.live ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"].join(" ")}>
                <div className="flex items-center gap-2">
                  <Brain className={`h-4 w-4 ${llm.live ? "text-emerald-600" : "text-amber-600"}`} />
                  <span className="text-xs font-semibold">AI Engine</span>
                  <span className={`ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded-full ${llm.live ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                    {llm.live ? "Live" : "Mock"}
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground">{llm.provider} · {llm.mode}</div>
                {!llm.live && <div className="text-[10px] text-amber-600">Set API key to enable AI features</div>}
              </div>

              {/* Database */}
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 space-y-1">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs font-semibold">Database</span>
                  <span className="ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Healthy</span>
                </div>
                <div className="text-[10px] text-muted-foreground">SQLite · {patients.length} patients · {branchStats.length} branches</div>
              </div>

              {/* Portals */}
              <div className="rounded-lg border border-border bg-secondary/30 px-4 py-3 space-y-2">
                <div className="text-xs font-semibold mb-1">Portals</div>
                {[
                  { label: "Manager", href: "/manager" },
                  { label: "Doctor", href: "/doctor" },
                  { label: "Customer", href: "/customer" },
                ].map(p => (
                  <Link key={p.href} href={p.href} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    <ChevronRight className="h-3 w-3" />{p.label} →
                  </Link>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
