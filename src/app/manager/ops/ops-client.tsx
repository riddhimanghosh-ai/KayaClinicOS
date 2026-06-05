"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardList, Package, CheckCircle2, AlertCircle,
  Clock, Phone, ArrowRight, Filter, CheckSquare, Loader2,
} from "lucide-react";
import type { TreatmentOpsRow } from "@/lib/db";

type FilterKey = "all" | "ongoing" | "pending_treatment" | "pending_fno" | "complete";

function getTreatmentStatus(row: TreatmentOpsRow): "not_started" | "in_progress" | "complete" {
  if (!row.ps_id) return "not_started";
  if (row.ps_status === "completed") return "complete";
  return "in_progress";
}

function getFnoStatus(row: TreatmentOpsRow): "not_applicable" | "pending" | "complete" {
  if (!["converted", "in_session"].includes(row.appt_status)) return "not_applicable";
  if (!row.fno_id) return "pending";
  if (row.fno_status === "submitted") return "complete";
  return "pending";
}

function isPendingTreatment(row: TreatmentOpsRow) {
  return ["arrived", "in_session"].includes(row.appt_status) && getTreatmentStatus(row) !== "complete";
}

function isPendingFno(row: TreatmentOpsRow) {
  return getFnoStatus(row) === "pending";
}

function isComplete(row: TreatmentOpsRow) {
  return getTreatmentStatus(row) === "complete" && getFnoStatus(row) === "complete";
}

const APPT_STATUS_DOT: Record<string, string> = {
  arrived:     "bg-amber-500",
  in_session:  "bg-violet-500",
  converted:   "bg-emerald-600",
  rescheduled: "bg-orange-400",
};
const APPT_STATUS_LABEL: Record<string, string> = {
  arrived:     "Arrived",
  in_session:  "In Session",
  converted:   "Session Done",
  rescheduled: "Rescheduled",
};

function svcBadgeCls(st: string) {
  const s = st.toLowerCase();
  if (s.includes("laser") || s.includes("q-switch") || s.includes("carbon")) return "bg-violet-100 text-violet-800 border-violet-200";
  if (s.includes("peel")) return "bg-amber-100 text-amber-800 border-amber-200";
  if (s.includes("microneedling")) return "bg-blue-100 text-blue-800 border-blue-200";
  if (s.includes("acne")) return "bg-orange-100 text-orange-800 border-orange-200";
  if (s.includes("hair") || s.includes("prp") || s.includes("gfc")) return "bg-rose-100 text-rose-800 border-rose-200";
  if (s.includes("consultation")) return "bg-slate-100 text-slate-600 border-slate-200";
  return "bg-secondary text-muted-foreground border-border";
}

export function OpsClient({ rows }: { rows: TreatmentOpsRow[] }) {
  const [filter, setFilter] = useState<FilterKey>("all");

  const ongoingCount      = rows.filter(r => getTreatmentStatus(r) === "in_progress").length;
  const notStartedCount   = rows.filter(r => isPendingTreatment(r) && getTreatmentStatus(r) === "not_started").length;
  const pendingFnoCount   = rows.filter(isPendingFno).length;
  const completeCount     = rows.filter(isComplete).length;

  const FILTERS: { key: FilterKey; label: string; count: number; color: string; example: string }[] = [
    {
      key: "all", label: "All", count: rows.length, color: "",
      example: "All sessions from the last 30 days — arrived, in progress, done, and rescheduled",
    },
    {
      key: "ongoing", label: "Ongoing Treatment", count: ongoingCount, color: "text-violet-700",
      example: "e.g. patient mid-laser session — photos taken, treatment notes in progress, not yet marked complete",
    },
    {
      key: "pending_treatment", label: "Not Started", count: notStartedCount, color: "text-amber-700",
      example: "e.g. patient has arrived or is in the chair but treatment screen hasn't been opened yet",
    },
    {
      key: "pending_fno", label: "Pending FnO Entry", count: pendingFnoCount, color: "text-amber-700",
      example: "e.g. session is complete but materials used (gloves, gels, serums) haven't been logged in inventory yet",
    },
    {
      key: "complete", label: "Complete", count: completeCount, color: "text-emerald-700",
      example: "Treatment marked done and BOM inventory submitted — nothing left to do for these sessions",
    },
  ];

  const activeFilter = FILTERS.find(f => f.key === filter);

  const visible = rows.filter(row => {
    if (filter === "ongoing")           return getTreatmentStatus(row) === "in_progress";
    if (filter === "pending_treatment") return isPendingTreatment(row) && getTreatmentStatus(row) === "not_started";
    if (filter === "pending_fno")       return isPendingFno(row);
    if (filter === "complete")          return isComplete(row);
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total sessions",    value: rows.length,          icon: ClipboardList, cls: "" },
          { label: "Ongoing treatment", value: ongoingCount,          icon: Clock,         cls: "text-violet-600" },
          { label: "Pending FnO entry", value: pendingFnoCount,       icon: Package,       cls: "text-amber-600" },
          { label: "Fully complete",    value: completeCount,         icon: CheckCircle2,  cls: "text-emerald-600" },
        ].map(m => (
          <div key={m.label} className="rounded-xl border border-border bg-card px-4 py-3">
            <m.icon className={`h-4 w-4 mb-2 ${m.cls || "text-muted-foreground"}`} />
            <div className={`text-2xl font-bold tabular-nums ${m.cls}`}>{m.value}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{m.label}</div>
          </div>
        ))}
      </div>

      {/* Filter chips */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={[
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                filter === f.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border hover:border-foreground text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {f.label}
              <span className={[
                "rounded-full px-1.5 text-[10px] font-bold",
                filter === f.key ? "bg-white/20 text-white" : "bg-secondary",
              ].join(" ")}>{f.count}</span>
            </button>
          ))}
        </div>
        {activeFilter && (
          <p className="text-[11px] text-muted-foreground pl-5 italic">{activeFilter.example}</p>
        )}
      </div>

      {/* Rows */}
      {visible.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
            No sessions match this filter.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {visible.map(row => {
            const tStatus = getTreatmentStatus(row);
            const fStatus = getFnoStatus(row);

            return (
              <Card key={row.appointment_id} className="overflow-hidden hover:shadow-sm transition-shadow">
                <CardContent className="p-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-0">

                    {/* Left: patient + appointment info */}
                    <div className="flex-1 px-4 py-3 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`h-2 w-2 rounded-full shrink-0 ${APPT_STATUS_DOT[row.appt_status] ?? "bg-gray-400"}`} />
                        <span className="font-semibold text-sm">{row.patient_name}</span>
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${svcBadgeCls(row.service_type)}`}>
                          {row.service_type}
                        </span>
                        <Badge variant="outline" className="text-[10px]">{APPT_STATUS_LABEL[row.appt_status] ?? row.appt_status}</Badge>
                        <a
                          href={`tel:${row.phone}`}
                          className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary/50 px-2 py-0.5 text-xs font-medium hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-colors"
                        >
                          <Phone className="h-3 w-3" />{row.phone}
                        </a>
                      </div>
                      <div className="text-xs text-muted-foreground flex flex-wrap gap-2">
                        <span>{row.appointment_ts.slice(0, 16).replace("T", " ")}</span>
                        <span>·</span>
                        <span>{row.branch_name}</span>
                        {row.doctor_name && <><span>·</span><span>Dr. {row.doctor_name}</span></>}
                      </div>
                    </div>

                    {/* Middle: treatment status */}
                    <div className="flex items-stretch border-t sm:border-t-0 sm:border-l border-border">
                      <div className="px-4 py-3 space-y-1.5 min-w-[180px]">
                        <div className="text-[10px] uppercase tracking-wide font-medium text-muted-foreground flex items-center gap-1">
                          <ClipboardList className="h-3 w-3" />Treatment
                        </div>
                        {tStatus === "complete" ? (
                          <div className="flex items-center gap-1.5 text-sm text-emerald-700 font-medium">
                            <CheckCircle2 className="h-4 w-4" />Done
                          </div>
                        ) : tStatus === "in_progress" ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-sm text-violet-700 font-medium">
                              <Clock className="h-3.5 w-3.5" />In progress
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              <PendingChip done={row.ps_photos > 0} label={`${row.ps_photos} photo${row.ps_photos !== 1 ? "s" : ""}`} />
                              <PendingChip done={!!row.ps_consent} label="Consent" />
                              <PendingChip done={!!row.ps_started_at} label="Started" />
                              <PendingChip done={!!row.ps_notes} label="Notes" />
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-sm text-amber-700 font-medium">
                            <AlertCircle className="h-3.5 w-3.5" />Not started
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: FnO status */}
                    <div className="flex items-stretch border-t sm:border-t-0 sm:border-l border-border">
                      <div className="px-4 py-3 space-y-1.5 min-w-[160px]">
                        <div className="text-[10px] uppercase tracking-wide font-medium text-muted-foreground flex items-center gap-1">
                          <Package className="h-3 w-3" />Inventory (FnO)
                        </div>
                        {fStatus === "not_applicable" ? (
                          <div className="text-xs text-muted-foreground">Session not yet done</div>
                        ) : fStatus === "complete" ? (
                          <div className="flex items-center gap-1.5 text-sm text-emerald-700 font-medium">
                            <CheckCircle2 className="h-4 w-4" />Submitted
                            {row.fno_submitted_at && (
                              <span className="text-[10px] text-muted-foreground font-normal">{row.fno_submitted_at.slice(11, 16)}</span>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-sm text-amber-700 font-medium">
                            <AlertCircle className="h-3.5 w-3.5" />Pending entry
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action CTA */}
                    <div className="flex items-center border-t sm:border-t-0 sm:border-l border-border px-4 py-3 shrink-0">
                      {isPendingTreatment(row) && (
                        <div className="flex flex-col gap-1.5">
                          <a
                            href={`/manager/appointments?open=${row.appointment_id}`}
                            className="flex items-center gap-1.5 rounded-lg bg-violet-600 text-white px-3 py-2 text-xs font-semibold hover:bg-violet-700 transition-colors whitespace-nowrap"
                          >
                            Open Treatment <ArrowRight className="h-3.5 w-3.5" />
                          </a>
                          {tStatus === "in_progress" && (
                            <CompleteButton row={row} />
                          )}
                        </div>
                      )}
                      {(isPendingFno(row) && !isPendingTreatment(row)) && (
                        <a
                          href={`/manager/fno/${row.appointment_id}`}
                          className="flex items-center gap-1.5 rounded-lg bg-amber-500 text-white px-3 py-2 text-xs font-semibold hover:bg-amber-600 transition-colors whitespace-nowrap"
                        >
                          Enter Inventory <ArrowRight className="h-3.5 w-3.5" />
                        </a>
                      )}
                      {isComplete(row) && (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                          <CheckCircle2 className="h-4 w-4" />Complete
                        </div>
                      )}
                    </div>

                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CompleteButton({ row }: { row: TreatmentOpsRow }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleComplete() {
    setLoading(true);
    try {
      // Fetch existing session data to preserve photos, consent, notes, etc.
      const getRes = await fetch(`/api/manager/practitioner/${row.appointment_id}`);
      const { session } = await getRes.json();

      await fetch(`/api/manager/practitioner/${row.appointment_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: row.patient_id,
          photos: session ? JSON.parse(session.photos_json || "[]") : [],
          consent_signed: session?.consent_signed ? true : false,
          medical_history: session?.medical_history ?? null,
          body_type: session?.body_type ?? null,
          treatment_notes: session?.treatment_notes ?? null,
          started_at: session?.started_at ?? null,
          completed_at: new Date().toISOString(),
          status: "completed",
        }),
      });

      await fetch(`/api/appointments/${row.appointment_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "converted" }),
      });

      router.refresh();
    } catch (e) {
      console.error("Failed to complete treatment:", e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleComplete}
      disabled={loading}
      className="flex items-center gap-1.5 rounded-lg bg-emerald-600 text-white px-3 py-2 text-xs font-semibold hover:bg-emerald-700 disabled:opacity-60 transition-colors whitespace-nowrap"
    >
      {loading
        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
        : <CheckSquare className="h-3.5 w-3.5" />
      }
      Mark Complete
    </button>
  );
}

function PendingChip({ done, label }: { done: boolean; label: string }) {
  return (
    <span className={[
      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border",
      done
        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : "bg-secondary text-muted-foreground border-border",
    ].join(" ")}>
      {done ? <CheckCircle2 className="h-2.5 w-2.5" /> : <Clock className="h-2.5 w-2.5" />}
      {label}
    </span>
  );
}
