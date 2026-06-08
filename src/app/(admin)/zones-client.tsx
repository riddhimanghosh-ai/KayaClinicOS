"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { inr } from "@/lib/utils";
import type { AppointmentRow } from "@/lib/db";

type BranchStat = {
  id: number; name: string; city: string; manager_name: string | null;
  zone_name: string | null; zone_manager_name: string | null;
  total_patients: number; sessions_used: number; sessions_pending: number;
  doctor_count: number;
};

type Doctor = { id: number; name: string; specialty: string; branch_id: number; branch_name: string };

type PendingPatient = {
  id: number; name: string; phone: string; branch_name: string;
  pending_sessions: number; last_visit: string | null;
  days_since_visit: number | null; service_names: string;
};

type SortKey = "status" | "name" | "conv" | "noshows" | "pending" | "overdue";

function attentionScore(
  noShowRate: number,
  pendingSessions: number,
  overdueCount: number,
): number {
  let score = 0;
  if (noShowRate > 25)    score += 2; else if (noShowRate > 10) score += 1;
  if (pendingSessions > 15) score += 2; else if (pendingSessions > 7) score += 1;
  if (overdueCount > 5)   score += 2; else if (overdueCount > 2) score += 1;
  return score;
}

function StatusDot({ score }: { score: number }) {
  if (score >= 3) return <span className="h-2.5 w-2.5 bg-destructive shrink-0 inline-block" title="Needs attention" />;
  if (score >= 1) return <span className="h-2.5 w-2.5 bg-muted-foreground shrink-0 inline-block" title="Watch" />;
  return <span className="h-2.5 w-2.5 bg-success shrink-0 inline-block" title="Healthy" />;
}

export function ZonesClient({ branchStats, todayAppts, doctors, pendingPatients }: {
  branchStats: BranchStat[];
  todayAppts: AppointmentRow[];
  doctors: Doctor[];
  pendingPatients: PendingPatient[];
}) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [open, setOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("status");
  const [sortAsc, setSortAsc] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const activeBranches = selectedIds.size > 0
    ? branchStats.filter(b => selectedIds.has(b.id))
    : branchStats;

  const toggle = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const cycleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(v => !v);
    else { setSortKey(key); setSortAsc(key === "name"); }
  };

  // Build per-clinic rows
  const rows = activeBranches.map(b => {
    const bAppts     = todayAppts.filter(a => a.branch_id === b.id);
    const bDoctors   = doctors.filter(d => d.branch_id === b.id);
    const noShows    = bAppts.filter(a => a.status === "no_show").length;
    const converted  = bAppts.filter(a => a.status === "converted").length;
    const convRate   = bAppts.length > 0 ? Math.round((converted / bAppts.length) * 100) : null;
    const noShowRate = bAppts.length > 0 ? Math.round((noShows / bAppts.length) * 100) : 0;
    const liveNow    = bAppts.filter(a => a.status === "arrived" || a.status === "in_session").length;
    const overdue    = pendingPatients.filter(p => p.branch_name === b.name && (p.days_since_visit ?? 0) > 90).length;
    const score      = attentionScore(noShowRate, b.sessions_pending, overdue);
    const totalSess  = b.sessions_used + b.sessions_pending;
    const utilPct    = totalSess > 0 ? Math.round((b.sessions_used / totalSess) * 100) : 0;
    return { b, bAppts, bDoctors, noShows, converted, convRate, noShowRate, liveNow, overdue, score, utilPct };
  });

  const sorted = [...rows].sort((a, z) => {
    let cmp = 0;
    if      (sortKey === "status")  cmp = z.score     - a.score;
    else if (sortKey === "name")    cmp = a.b.name.localeCompare(z.b.name);
    else if (sortKey === "conv")    cmp = (z.convRate ?? -1) - (a.convRate ?? -1);
    else if (sortKey === "noshows") cmp = z.noShows - a.noShows;
    else if (sortKey === "pending") cmp = z.b.sessions_pending - a.b.sessions_pending;
    else if (sortKey === "overdue") cmp = z.overdue - a.overdue;
    return sortAsc ? -cmp : cmp;
  });

  function SortTH({ label, k, className }: { label: string; k: SortKey; className?: string }) {
    const active = sortKey === k;
    return (
      <th
        onClick={() => cycleSort(k)}
        className={cn(
          "py-2 font-medium cursor-pointer select-none hover:text-foreground transition-colors",
          active ? "text-foreground" : "text-muted-foreground",
          className,
        )}
      >
        <span className="flex items-center gap-1 justify-end">
          {label}
          <ArrowUpDown className={cn("h-2.5 w-2.5", active ? "opacity-100" : "opacity-30")} />
        </span>
      </th>
    );
  }

  const redCount    = rows.filter(r => r.score >= 3).length;
  const amberCount  = rows.filter(r => r.score >= 1 && r.score < 3).length;

  return (
    <section>
      {/* Section heading + filter */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
        <div className="flex items-center gap-3">
          <h2 className="text-[10px] font-mono font-medium uppercase tracking-widest text-muted-foreground">
            Clinic performance
          </h2>
          <div className="flex items-center gap-2">
            {redCount > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-mono text-destructive">
                <span className="h-1.5 w-1.5 bg-destructive inline-block" />
                {redCount} need attention
              </span>
            )}
            {amberCount > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
                <span className="h-1.5 w-1.5 bg-muted-foreground inline-block" />
                {amberCount} watch
              </span>
            )}
          </div>
        </div>

        <div ref={ref} className="relative">
          <button
            onClick={() => setOpen(v => !v)}
            className="flex items-center gap-1.5 text-xs font-mono border border-border px-3 py-1.5 hover:bg-secondary transition-colors"
          >
            {selectedIds.size === 0 ? "All clinics" : `${selectedIds.size} selected`}
            <ChevronDown className="h-3 w-3" />
          </button>
          {open && (
            <div className="absolute right-0 top-full mt-1 z-20 bg-card border border-border shadow-md min-w-[220px]">
              <button
                onClick={() => setSelectedIds(new Set())}
                className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:bg-secondary border-b border-border font-mono"
              >
                Show all
              </button>
              {branchStats.map(b => (
                <button
                  key={b.id}
                  onClick={() => toggle(b.id)}
                  className="w-full text-left px-3 py-2 text-xs flex items-center gap-2.5 hover:bg-secondary transition-colors"
                >
                  <span className={cn(
                    "h-3.5 w-3.5 border flex items-center justify-center shrink-0 transition-colors",
                    selectedIds.has(b.id) ? "border-primary bg-primary" : "border-border"
                  )}>
                    {selectedIds.has(b.id) && <Check className="h-2.5 w-2.5 text-background" />}
                  </span>
                  <span className="flex-1 truncate">{b.name}</span>
                  {b.zone_name && (
                    <span className="text-[10px] text-muted-foreground font-mono shrink-0">{b.zone_name}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Scorecard table */}
      <div className="border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/30 border-b border-border">
            <tr className="text-[10px] uppercase tracking-wide">
              <th
                onClick={() => cycleSort("status")}
                className={cn("w-6 px-3 py-2 cursor-pointer", sortKey === "status" ? "text-foreground" : "text-muted-foreground")}
              />
              <th
                onClick={() => cycleSort("name")}
                className={cn("text-left px-4 py-2 font-medium cursor-pointer select-none hover:text-foreground transition-colors", sortKey === "name" ? "text-foreground" : "text-muted-foreground")}
              >
                Clinic
              </th>
              <th className="text-right px-3 py-2 font-medium text-muted-foreground">
                Appts
                <div className="text-[9px] font-normal normal-case tracking-normal">today</div>
              </th>
              <SortTH label="Completed %" k="conv" className="px-3 text-right" />
              <SortTH label="No-shows today" k="noshows" className="px-3 text-right" />
              <SortTH label="Pending sess." k="pending"   className="px-3 text-right" />
              <th className="text-right px-3 py-2 font-medium text-muted-foreground">Util %</th>
              <SortTH label="Overdue pts" k="overdue"   className="px-3 text-right" />
              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Doctors</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(({ b, bAppts, bDoctors, noShows, convRate, noShowRate, liveNow, overdue, score, utilPct }) => (
              <tr key={b.id} className="border-t border-border/50 hover:bg-secondary/10 transition-colors">
                <td className="px-3 py-3">
                  <StatusDot score={score} />
                </td>
                <td className="px-4 py-3">
                  <div className="font-semibold">{b.name}</div>
                  <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                    {b.city}
                    {b.zone_name && <span className="ml-1.5">· {b.zone_name}</span>}
                  </div>
                  {b.manager_name && (
                    <div className="text-[10px] text-muted-foreground mt-0.5">{b.manager_name}</div>
                  )}
                </td>
                <td className="px-3 py-3 text-right tabular-nums">
                  <div className="font-semibold">{bAppts.length}</div>
                  {liveNow > 0 && (
                    <div className="text-[10px] text-primary font-mono">{liveNow} live</div>
                  )}
                </td>
                <td className="px-3 py-3 text-right tabular-nums">
                  {convRate !== null ? (
                    <span className={cn("font-semibold", convRate >= 60 ? "text-success" : convRate >= 40 ? "text-foreground" : "text-destructive")}>
                      {convRate}%
                    </span>
                  ) : <span className="text-muted-foreground text-xs">—</span>}
                </td>
                <td className="px-3 py-3 text-right tabular-nums">
                  {noShows > 0 ? (
                    <span className={cn("font-semibold", noShowRate > 20 ? "text-destructive" : noShowRate > 10 ? "text-muted-foreground" : "text-foreground")}>
                      {noShows}
                      <span className="text-[10px] text-muted-foreground ml-1">({noShowRate}%)</span>
                    </span>
                  ) : <span className="text-muted-foreground text-xs">—</span>}
                </td>
                <td className="px-3 py-3 text-right tabular-nums">
                  <span className={cn("font-semibold", b.sessions_pending > 15 ? "text-destructive" : b.sessions_pending > 7 ? "text-muted-foreground" : "text-foreground")}>
                    {b.sessions_pending}
                  </span>
                </td>
                <td className="px-3 py-3 text-right tabular-nums">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-14 h-1.5 bg-secondary overflow-hidden">
                      <div className="h-full bg-primary/60" style={{ width: `${utilPct}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground w-7 text-right">{utilPct}%</span>
                  </div>
                </td>
                <td className="px-3 py-3 text-right tabular-nums">
                  {overdue > 0 ? (
                    <span className={cn("font-semibold", overdue > 5 ? "text-destructive" : overdue > 2 ? "text-muted-foreground" : "text-foreground")}>
                      {overdue}
                    </span>
                  ) : <span className="text-success text-xs">0</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="text-xs">{b.doctor_count} doctor{b.doctor_count !== 1 ? "s" : ""}</div>
                  {bDoctors.length > 0 && (
                    <div className="text-[10px] text-muted-foreground truncate max-w-[140px]">
                      {bDoctors.slice(0, 2).map(d => d.name.replace(/^Dr\.?\s*/i, "")).join(", ")}
                      {bDoctors.length > 2 ? ` +${bDoctors.length - 2}` : ""}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 mt-2 text-[10px] text-muted-foreground font-mono">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 bg-destructive inline-block" />Needs attention</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 bg-muted-foreground inline-block" />Watch</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 bg-success inline-block" />Healthy</span>
        <span className="ml-auto">Click column headers to sort</span>
      </div>
    </section>
  );
}
