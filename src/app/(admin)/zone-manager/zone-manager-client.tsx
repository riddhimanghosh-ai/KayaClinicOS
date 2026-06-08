"use client";

import { useState, useRef, useEffect } from "react";
import { Globe, MapPin, ChevronRight, TrendingUp, TrendingDown, CheckCircle2, AlertTriangle, ChevronDown, Check, Calendar } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { inr } from "@/lib/utils";
import type { AppointmentRow } from "@/lib/db";
import type { ClinicStatus } from "@/lib/types";

type BranchStat = {
  id: number; name: string; city: string; manager_name: string | null;
  zone_name: string | null; zone_manager_name: string | null;
  total_patients: number; sessions_used: number; sessions_pending: number;
  doctor_count: number;
};
type BranchFin = { branch_id: number; collection_inr: number; net_revenue_inr: number; unearned_inr: number };
type Doctor    = { id: number; name: string; specialty: string; branch_id: number; branch_name: string };
type MonthRow  = { month: string; label: string; collection_inr: number; net_revenue_inr: number; sessions_consumed_count: number };

function StatBox({ label, value, sub, accent, green, amber }: {
  label: string; value: string | number; sub?: string;
  accent?: boolean; green?: boolean; amber?: boolean;
}) {
  return (
    <div className={["border px-5 py-4 space-y-1", accent ? "border-primary/30 bg-primary/5" : "border-border bg-card"].join(" ")}>
      <div className={["text-2xl font-bold tabular-nums leading-none",
        accent ? "text-primary" : green ? "text-success" : amber ? "text-amber-600" : "text-foreground"].join(" ")}>
        {value}
      </div>
      <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{label}</div>
      {sub && <div className="text-[10px] text-muted-foreground font-mono">{sub}</div>}
    </div>
  );
}

function SectionHeading({ children, href, linkLabel }: { children: React.ReactNode; href?: string; linkLabel?: string }) {
  return (
    <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
      <h2 className="text-[10px] font-mono font-medium uppercase tracking-widest text-muted-foreground">{children}</h2>
      {href && (
        <Link href={href} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors font-mono">
          {linkLabel ?? "Open"} <ChevronRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

// Multi-select store filter
function StoreFilter({
  branches,
  selectedIds,
  onChange,
}: {
  branches: BranchStat[];
  selectedIds: Set<number>;
  onChange: (ids: Set<number>) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    onChange(next);
  };

  const label = selectedIds.size === 0
    ? "All stores"
    : selectedIds.size === 1
    ? branches.find(b => selectedIds.has(b.id))?.name ?? "1 store"
    : `${selectedIds.size} stores`;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 text-sm font-medium border border-border px-4 py-2 bg-card hover:bg-secondary transition-colors"
      >
        <Globe className="h-4 w-4 text-muted-foreground" />
        {label}
        <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-20 bg-card border border-border shadow-md min-w-[220px]">
          <button
            onClick={() => onChange(new Set())}
            className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:bg-secondary border-b border-border font-mono"
          >
            Show all stores
          </button>
          {branches.map(b => (
            <button
              key={b.id}
              onClick={() => toggle(b.id)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-secondary transition-colors text-left"
            >
              <span className={cn(
                "h-3.5 w-3.5 border flex items-center justify-center shrink-0",
                selectedIds.has(b.id) ? "border-primary bg-primary" : "border-border"
              )}>
                {selectedIds.has(b.id) && <Check className="h-2.5 w-2.5 text-background" />}
              </span>
              <span className="flex-1 text-xs text-foreground">{b.name}</span>
              <span className="text-[10px] text-muted-foreground font-mono">{b.city}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ZoneManagerClient({
  zone, managerName, branches: allBranches, branchFin: allBranchFin, doctors,
  clinicStatus: allClinicStatus, monthlyRevenue, todayAppts: allTodayAppts, todayLabel,
}: {
  zone: string | null;
  managerName: string | null;
  branches: BranchStat[];
  branchFin: BranchFin[];
  doctors: Doctor[];
  clinicStatus: ClinicStatus[];
  monthlyRevenue: MonthRow[];
  todayAppts: AppointmentRow[];
  todayLabel: string;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectedMonth, setSelectedMonth] = useState<string>(
    monthlyRevenue.length > 0 ? monthlyRevenue[0].month : ""
  );

  // Apply store filter
  const branches    = selectedIds.size > 0 ? allBranches.filter(b => selectedIds.has(b.id)) : allBranches;
  const branchFin   = selectedIds.size > 0 ? allBranchFin.filter(f => selectedIds.has(f.branch_id)) : allBranchFin;
  const clinicStatus = selectedIds.size > 0 ? allClinicStatus.filter(cs => selectedIds.has(cs.branch_id)) : allClinicStatus;
  const todayAppts  = selectedIds.size > 0 ? allTodayAppts.filter(a => selectedIds.has(a.branch_id)) : allTodayAppts;

  // ── Aggregates ───────────────────────────────────────────────────────────
  const totalCollection = branchFin.reduce((s, f) => s + f.collection_inr, 0);
  const totalNetRevenue = branchFin.reduce((s, f) => s + f.net_revenue_inr, 0);
  const totalUnearned   = branchFin.reduce((s, f) => s + f.unearned_inr, 0);
  const totalPatients   = branches.reduce((s, b) => s + b.total_patients, 0);
  const totalUsed       = branches.reduce((s, b) => s + b.sessions_used, 0);
  const totalPending    = branches.reduce((s, b) => s + b.sessions_pending, 0);

  const apptByStatus = {
    booked:     todayAppts.filter(a => a.status === "booked").length,
    confirmed:  todayAppts.filter(a => a.status === "confirmed").length,
    arrived:    todayAppts.filter(a => a.status === "arrived").length,
    in_session: todayAppts.filter(a => a.status === "in_session").length,
    converted:  todayAppts.filter(a => a.status === "converted").length,
    no_show:    todayAppts.filter(a => a.status === "no_show").length,
  };
  const liveCount      = apptByStatus.arrived + apptByStatus.in_session;
  const conversionRate = todayAppts.length > 0 ? Math.round((apptByStatus.converted / todayAppts.length) * 100) : 0;

  const doctorCount    = branches.reduce((s, b) => s + b.doctor_count, 0);
  const patientsPerDoc = doctorCount > 0 ? Math.round(totalPatients / doctorCount) : totalPatients;
  const totalSessions  = totalUsed + totalPending;
  const utilPct        = totalSessions > 0 ? Math.round((totalUsed / totalSessions) * 100) : 0;
  const zoneConvRate   = todayAppts.length > 0 ? Math.round((apptByStatus.converted / todayAppts.length) * 100) : 0;

  const latestMonth = monthlyRevenue[0];
  const prevMonth   = monthlyRevenue[1];
  const revDelta    = latestMonth && prevMonth ? latestMonth.collection_inr - prevMonth.collection_inr : null;

  // Selected month revenue
  const selMonthData = monthlyRevenue.find(r => r.month === selectedMonth) ?? latestMonth;
  const selMonthIdx  = monthlyRevenue.findIndex(r => r.month === selectedMonth);
  const selPrevData  = selMonthIdx >= 0 ? monthlyRevenue[selMonthIdx + 1] : null;
  const selDelta     = selMonthData && selPrevData
    ? selMonthData.collection_inr - selPrevData.collection_inr
    : null;

  return (
    <div className="space-y-10 pb-16">

      {/* ── Top bar: title + month selector + store filter ── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight" style={{ fontFamily: "Inter Tight, sans-serif", letterSpacing: "-0.02em" }}>
            {zone ?? "Network Overview"}
          </h1>
          {managerName && (
            <p className="text-xs text-muted-foreground mt-0.5">Zonal Head: {managerName}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Month selector */}
          <div className="relative flex items-center gap-1.5 border border-border bg-card px-3 py-2 text-sm">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="appearance-none bg-transparent text-sm font-medium pr-4 focus:outline-none cursor-pointer"
            >
              {monthlyRevenue.map((r, i) => (
                <option key={r.month} value={r.month}>
                  {i === 0 ? `${r.label} (this month)` : r.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
          </div>
          <StoreFilter branches={allBranches} selectedIds={selectedIds} onChange={setSelectedIds} />
        </div>
      </div>

      {/* ── Network Financials ── */}
      <section>
        <SectionHeading>{selMonthData?.label ?? "This month"} — financials</SectionHeading>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Month-scoped revenue */}
          <div className="border border-primary/30 bg-primary/5 px-5 py-4 space-y-1">
            <div className="text-2xl font-bold tabular-nums leading-none text-primary">
              {inr(selMonthData?.collection_inr ?? 0)}
            </div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Collection</div>
            {selDelta !== null && (
              <div className={`text-[10px] font-mono flex items-center gap-1 ${selDelta >= 0 ? "text-success" : "text-destructive"}`}>
                {selDelta >= 0 ? "▲" : "▼"} {inr(Math.abs(selDelta))} vs {selPrevData?.label}
              </div>
            )}
          </div>
          <div className="border border-border bg-card px-5 py-4 space-y-1">
            <div className="text-2xl font-bold tabular-nums leading-none text-success">
              {inr(selMonthData?.net_revenue_inr ?? 0)}
            </div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Net Revenue</div>
            <div className="text-[10px] text-muted-foreground font-mono">
              {selMonthData?.sessions_consumed_count ?? 0} sessions consumed
            </div>
          </div>
          {/* Unearned = collection - net revenue for selected month */}
          <StatBox
            label="Unearned Balance"
            value={inr((selMonthData?.collection_inr ?? 0) - (selMonthData?.net_revenue_inr ?? 0))}
            sub="collection − net revenue"
            amber
          />
          <StatBox label="Total Patients"     value={totalPatients} />
          <StatBox label="Sessions Used"      value={totalUsed} />
          <StatBox label="Sessions Pending"   value={totalPending} amber />
        </div>
      </section>

      {/* ── Today ── */}
      <section>
        <SectionHeading href="/manager/appointments" linkLabel="Schedule board">
          Today — {todayLabel}
        </SectionHeading>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Appointment funnel */}
          <div className="border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold">Appointments — {todayAppts.length} total</span>
              {todayAppts.length > 0 && (
                <span className="text-xs text-muted-foreground">{conversionRate}% converted</span>
              )}
            </div>
            <div className="space-y-2">
              {[
                { label: "Booked",     count: apptByStatus.booked,     color: "bg-blue-400" },
                { label: "Confirmed",  count: apptByStatus.confirmed,  color: "bg-blue-500" },
                { label: "Arrived",    count: apptByStatus.arrived,    color: "bg-amber-400" },
                { label: "In Session", count: apptByStatus.in_session, color: "bg-violet-500" },
                { label: "Completed",  count: apptByStatus.converted,  color: "bg-success" },
                { label: "No Show",    count: apptByStatus.no_show,    color: "bg-muted-foreground/40" },
              ].map(row => (
                <div key={row.label} className="flex items-center gap-3">
                  <div className="w-24 text-xs text-muted-foreground shrink-0">{row.label}</div>
                  <div className="flex-1 h-4 bg-secondary overflow-hidden">
                    <div className={`h-full ${row.color} transition-all`}
                      style={{ width: todayAppts.length > 0 ? `${(row.count / todayAppts.length) * 100}%` : "0%" }} />
                  </div>
                  <span className="text-xs font-bold w-5 text-right tabular-nums">{row.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Appliances / facilities */}
          <div className="border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Unavailable Appliances &amp; Facilities</span>
            </div>
            <div className="space-y-2">
              {clinicStatus.map(cs => {
                const down = cs.appliances.filter((a: any) => !a.working);
                const allOk = down.length === 0 && cs.is_open && !cs.doctor_on_leave;
                return (
                  <div key={cs.branch_id}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-foreground">{cs.branch_name}</span>
                      {allOk && (
                        <span className="flex items-center gap-1 text-[10px] text-success font-mono ml-auto">
                          <CheckCircle2 className="h-3 w-3" />All working
                        </span>
                      )}
                    </div>
                    {!cs.is_open && (
                      <div className="text-[11px] text-destructive font-mono px-2 py-1 bg-destructive/5 border border-destructive/20">
                        Store closed
                      </div>
                    )}
                    {!!cs.doctor_on_leave && (
                      <div className="text-[11px] text-muted-foreground font-mono px-2 py-1 bg-secondary border border-border">
                        Doctor on leave{cs.doctor_leave_note ? ` — ${cs.doctor_leave_note}` : ""}
                      </div>
                    )}
                    {down.map((a: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-[11px] text-destructive px-2 py-1 bg-destructive/5 border border-destructive/20 mt-1">
                        <span className="h-1.5 w-1.5 bg-destructive shrink-0 inline-block" />
                        {a.name} — not working
                      </div>
                    ))}
                  </div>
                );
              })}
              {clinicStatus.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No status data available.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Zone Performance ── */}
      <section>
        <SectionHeading>Zone performance</SectionHeading>
        <div className="border border-border overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-3 bg-secondary/30 border-b border-border">
            <Globe className="h-4 w-4 text-primary shrink-0" />
            <span className="font-semibold text-sm">{zone ?? "All zones"}</span>
            {managerName && (
              <span className="text-xs text-muted-foreground">· Zonal Head: <span className="font-medium text-foreground">{managerName}</span></span>
            )}
            <div className="ml-auto flex items-center gap-3 text-xs">
              {liveCount > 0 && (
                <span className="flex items-center gap-1 text-primary font-mono text-[10px] uppercase tracking-wider">
                  <span className="h-1.5 w-1.5 bg-primary animate-pulse" />{liveCount} live
                </span>
              )}
              <span className="text-muted-foreground font-mono text-[10px]">{todayAppts.length} appts today</span>
              {zoneConvRate > 0 && <span className="text-success font-mono text-[10px]">{zoneConvRate}% converted</span>}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-border border-b border-border">
            {[
              { label: "Clinics",          value: branches.length },
              { label: "Doctors",          value: doctorCount },
              { label: "Patients",         value: totalPatients },
              { label: "Pts / Doctor",     value: patientsPerDoc },
              { label: "Sessions Used",    value: totalUsed },
              { label: "Sessions Pending", value: totalPending },
            ].map(kv => (
              <div key={kv.label} className="px-4 py-3 text-center">
                <div className="text-lg font-bold tabular-nums">{kv.value}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{kv.label}</div>
              </div>
            ))}
          </div>

          <div className="px-5 py-2 bg-card border-b border-border flex items-center gap-3">
            <span className="text-[10px] text-muted-foreground w-32 shrink-0">Session utilisation</span>
            <div className="flex-1 h-1.5 bg-secondary overflow-hidden">
              <div className="h-full bg-primary/60" style={{ width: `${utilPct}%` }} />
            </div>
            <span className="text-[11px] font-semibold tabular-nums w-10 text-right">{utilPct}%</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/20">
                <tr className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  <th className="text-left px-5 py-2 font-medium">Clinic</th>
                  <th className="text-left px-3 py-2 font-medium">Manager</th>
                  <th className="text-right px-3 py-2 font-medium">Patients</th>
                  <th className="text-right px-3 py-2 font-medium">Doctors</th>
                  <th className="text-right px-3 py-2 font-medium">Used</th>
                  <th className="text-right px-3 py-2 font-medium">Pending</th>
                  <th className="px-4 py-2 font-medium w-32">Utilisation</th>
                  <th className="text-right px-4 py-2 font-medium">Today</th>
                </tr>
              </thead>
              <tbody>
                {branches.map(b => {
                  const total  = b.sessions_used + b.sessions_pending;
                  const util   = total > 0 ? Math.round((b.sessions_used / total) * 100) : 0;
                  const bAppts = todayAppts.filter(a => a.branch_id === b.id);
                  const bLive  = bAppts.filter(a => a.status === "arrived" || a.status === "in_session").length;
                  const bDone  = bAppts.filter(a => a.status === "converted").length;
                  return (
                    <tr key={b.id} className="border-t border-border/50 hover:bg-secondary/20 transition-colors">
                      <td className="px-5 py-3">
                        <div className="font-semibold">{b.name}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3" />{b.city}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">{b.manager_name ?? "—"}</td>
                      <td className="px-3 py-3 text-right font-semibold tabular-nums">{b.total_patients}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-xs">{b.doctor_count}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-success font-medium">{b.sessions_used}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-amber-600 font-medium">{b.sessions_pending}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-secondary overflow-hidden">
                            <div className="h-full bg-primary/60" style={{ width: `${util}%` }} />
                          </div>
                          <span className="text-[10px] text-muted-foreground w-7 text-right">{util}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="text-xs font-medium">{bAppts.length} appts</div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          {bLive > 0 && <span className="text-primary">{bLive} live · </span>}
                          {bDone > 0 && <span className="text-success">{bDone} done</span>}
                          {bLive === 0 && bDone === 0 && "—"}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Revenue Trend ── */}
      <section>
        <SectionHeading>Revenue trend</SectionHeading>
        <div className="border border-border bg-card">
          {latestMonth && prevMonth && revDelta !== null && (
            <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
              <span className="text-sm text-muted-foreground">Month-on-month</span>
              <span className={`flex items-center gap-1 text-sm font-semibold ${revDelta >= 0 ? "text-success" : "text-destructive"}`}>
                {revDelta >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {inr(Math.abs(revDelta))} {revDelta >= 0 ? "up" : "down"} vs {prevMonth.label}
              </span>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="text-left px-5 py-3 font-medium">Month</th>
                  <th className="text-right px-4 py-3 font-medium">Collection</th>
                  <th className="text-right px-4 py-3 font-medium">Net Revenue</th>
                  <th className="text-right px-4 py-3 font-medium">Sessions</th>
                  <th className="text-right px-5 py-3 font-medium">vs prev</th>
                </tr>
              </thead>
              <tbody>
                {monthlyRevenue
                  .filter(r => r.collection_inr > 0 || r.sessions_consumed_count > 0)
                  .map((row, i, arr) => {
                    const prev      = arr[i + 1];
                    const delta     = prev ? row.collection_inr - prev.collection_inr : null;
                    const isUp      = delta != null && delta > 0;
                    const isSelected = row.month === selectedMonth;
                    return (
                      <tr
                        key={row.month}
                        onClick={() => setSelectedMonth(row.month)}
                        className={`border-b border-border/50 last:border-0 cursor-pointer transition-colors ${isSelected ? "bg-primary/5" : "hover:bg-secondary/50"}`}
                      >
                        <td className="px-5 py-3 font-medium">
                          <div className="flex items-center gap-2">
                            {isSelected && <span className="h-1.5 w-1.5 bg-primary rounded-full shrink-0" />}
                            {row.label}
                            {i === 0 && <span className="text-[10px] font-mono text-muted-foreground">(current)</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold">{inr(row.net_revenue_inr)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-success font-semibold">{inr(row.collection_inr)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{row.sessions_consumed_count}</td>
                        <td className="px-5 py-3 text-right">
                          {delta != null ? (
                            <span className={`text-xs font-medium ${isUp ? "text-success" : "text-destructive"}`}>
                              {isUp ? "▲" : "▼"} {inr(Math.abs(delta))}
                            </span>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

    </div>
  );
}
