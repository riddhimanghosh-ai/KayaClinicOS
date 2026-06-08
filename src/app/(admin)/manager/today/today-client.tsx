"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Phone, Users, CalendarCheck2, TrendingUp, AlertCircle,
  Target, Zap, ArrowRight, MessageCircle, CheckCircle2,
  Loader2, CalendarPlus, ExternalLink, ChevronLeft, TriangleAlert, X,
  ShoppingBag,
} from "lucide-react";
import { inr } from "@/lib/utils";
import { CheckoutFlow, serviceTypeBadgeCls } from "@/components/checkout-flow";
import Link from "next/link";
import type { ConfirmationQueueRow, PendingSessionPatient, ArrivedPatient } from "@/lib/db";
import type { CohortRow } from "@/lib/types";

const PIPELINE = [
  { status: "booked",     label: "Booked",     color: "bg-primary/5 border-primary/30",    dot: "bg-primary/60" },
  { status: "confirmed",  label: "Confirmed",  color: "bg-success/5 border-success/30", dot: "bg-success/50" },
  { status: "arrived",    label: "Arrived",    color: "bg-secondary border-border",   dot: "bg-secondary0" },
  { status: "in_session", label: "In Session", color: "bg-primary/5 border-violet-200", dot: "bg-primary/50" },
  { status: "converted",  label: "Completed",  color: "bg-green-50 border-green-200",   dot: "bg-success" },
];

const SERVICE_OPTIONS = [
  "Consultation",
  "Acne Clearance Program",
  "Carbon Laser Peel",
  "Chemical Peel",
  "Laser Hair Reduction",
  "Microneedling for Scars",
  "Q-Switch Laser Toning",
];

type Action =
  | { type: "confirm"; appointmentId: number }
  | { type: "schedule" };

type PatientEntry = {
  key: string;
  name: string;
  phone: string;
  branch_name: string;
  context: string[];
  meta?: string;
  action: Action;
};

type Group = {
  key: string;
  label: string;
  description: string;
  script: string;
  icon: React.ElementType;
  borderCls: string;
  tileCls: string;
  badgeCls: string;
  countCls: string;
  entries: PatientEntry[];
};

function formatTime(ts: string) {
  return ts.slice(11, 16);
}

function buildGroups(
  confirmQueue: ConfirmationQueueRow[],
  pendingPatients: PendingSessionPatient[],
  followUp: CohortRow[],
  missedSession: CohortRow[],
  gapCloser: CohortRow[],
  alpha: CohortRow[],
  beta: CohortRow[],
): Group[] {
  return [
    {
      key: "confirmation",
      label: "Confirmation",
      description: "Today's booked appointments needing a confirmation call",
      script: "Script: \"Hi [name], calling from Kaya to confirm your [service] appointment at [time] today. Will you be able to make it?\"",
      icon: CalendarCheck2,
      borderCls: "border-blue-300",
      tileCls: "bg-primary/5 hover:bg-primary/10/80",
      badgeCls: "bg-blue-200 text-blue-800",
      countCls: "text-primary",
      entries: confirmQueue.map(r => ({
        key: `confirm-${r.id}`,
        name: r.patient_name,
        phone: r.phone,
        branch_name: r.branch_name,
        context: [
          `${r.service_type} at ${formatTime(r.appointment_ts)}${r.doctor_name ? ` · ${r.doctor_name.startsWith("Dr") ? r.doctor_name : "Dr. " + r.doctor_name}` : ""}`,
          r.pending_sessions > 0
            ? `Has ${r.pending_sessions} unused session${r.pending_sessions > 1 ? "s" : ""} — opportunity to upsell or reschedule`
            : "",
          r.referred_by ? `Referred by ${r.referred_by}` : "",
        ].filter(Boolean),
        meta: formatTime(r.appointment_ts) + " · " + r.service_type,
        action: { type: "confirm", appointmentId: r.id },
      })),
    },
    {
      key: "followup",
      label: "Follow Up",
      description: "Treated 2–10 days ago — check skin response",
      script: "Script: \"Hi [name], this is Kaya following up on your recent [service]. How is your skin feeling? Any redness or concerns?\"",
      icon: MessageCircle,
      borderCls: "border-success/40",
      tileCls: "bg-success/5 hover:bg-success/10/80",
      badgeCls: "bg-success/20 text-success",
      countCls: "text-success",
      entries: followUp.map(r => ({
        key: `followup-${r.patient_id}`,
        name: r.patient_name,
        phone: r.phone,
        branch_name: r.branch_name,
        context: [r.reason],
        meta: r.context.service_name ?? undefined,
        action: { type: "schedule" },
      })),
    },
    {
      key: "call_queue",
      label: "Call Queue",
      description: "Unused sessions, no upcoming appointment",
      script: "Script: \"Hi [name], you have [N] sessions remaining on your [service] package. Would you like to schedule your next visit this week?\"",
      icon: Phone,
      borderCls: "border-violet-300",
      tileCls: "bg-primary/5 hover:bg-primary/10/80",
      badgeCls: "bg-violet-200 text-violet-800",
      countCls: "text-primary",
      entries: pendingPatients.map(p => ({
        key: `queue-${p.id}`,
        name: p.name,
        phone: p.phone,
        branch_name: p.branch_name,
        context: [
          `${p.pending_sessions} pending session${p.pending_sessions > 1 ? "s" : ""} — no upcoming appointment`,
          p.service_names ? `Package: ${p.service_names}` : "",
          p.days_since_visit !== null
            ? `Last visit: ${p.days_since_visit < 1 ? "today" : p.days_since_visit < 30 ? `${p.days_since_visit} days ago` : `${Math.round(p.days_since_visit / 30)} months ago`}`
            : "",
        ].filter(Boolean),
        meta: `${p.pending_sessions} sessions pending`,
        action: { type: "schedule" },
      })),
    },
    {
      key: "missed",
      label: "Missed Session",
      description: "Active packages, last visit 14–120 days ago",
      script: "Script: \"Hi [name], we noticed you haven't visited in a while — you still have sessions remaining on your [service] package. Want to book a slot this week?\"",
      icon: AlertCircle,
      borderCls: "border-border",
      tileCls: "bg-secondary hover:bg-secondary/80",
      badgeCls: "bg-amber-200 text-amber-800",
      countCls: "text-muted-foreground",
      entries: missedSession.map(r => ({
        key: `missed-${r.patient_id}`,
        name: r.patient_name,
        phone: r.phone,
        branch_name: r.branch_name,
        context: [r.reason],
        meta: r.context.service_name ?? undefined,
        action: { type: "schedule" },
      })),
    },
    {
      key: "gap",
      label: "Gap Closer",
      description: "6+ months inactive with paid balance in unused sessions",
      script: "Script: \"Hi [name], you have [N] sessions worth ₹[X] on your [service] package. We'd hate for them to go unused — shall we get you booked in soon?\"",
      icon: TrendingUp,
      borderCls: "border-orange-300",
      tileCls: "bg-orange-50 hover:bg-orange-100/80",
      badgeCls: "bg-orange-200 text-orange-800",
      countCls: "text-orange-700",
      entries: gapCloser.map(r => ({
        key: `gap-${r.patient_id}`,
        name: r.patient_name,
        phone: r.phone,
        branch_name: r.branch_name,
        context: [r.reason],
        meta: r.context.service_name ?? undefined,
        action: { type: "schedule" },
      })),
    },
    {
      key: "alpha",
      label: "Scar Upsell",
      description: "Acne-cleared, doctor-flagged ready for scar treatment",
      script: "Script: \"Hi [name], great news — your acne has cleared well. Dr. [name] has recommended microneedling for your scarring. We have a 20% offer this month — want to hear more?\"",
      icon: Target,
      borderCls: "border-teal-300",
      tileCls: "bg-teal-50 hover:bg-teal-100/80",
      badgeCls: "bg-teal-200 text-teal-800",
      countCls: "text-teal-700",
      entries: alpha.map(r => ({
        key: `alpha-${r.patient_id}`,
        name: r.patient_name,
        phone: r.phone,
        branch_name: r.branch_name,
        context: [r.reason],
        meta: r.context.next_recommended_service ?? "Microneedling for Scars",
        action: { type: "schedule" },
      })),
    },
    {
      key: "beta",
      label: "Q-Switch Upsell",
      description: "Melasma patients, doctor-flagged laser-ready",
      script: "Script: \"Hi [name], Dr. [name] has flagged you as a great candidate for Q-Switch Laser Toning for your pigmentation. We have a 15% offer — interested in learning more?\"",
      icon: Zap,
      borderCls: "border-indigo-300",
      tileCls: "bg-indigo-50 hover:bg-indigo-100/80",
      badgeCls: "bg-indigo-200 text-indigo-800",
      countCls: "text-indigo-700",
      entries: beta.map(r => ({
        key: `beta-${r.patient_id}`,
        name: r.patient_name,
        phone: r.phone,
        branch_name: r.branch_name,
        context: [r.reason],
        meta: r.context.next_recommended_service ?? "Q-Switch Laser Toning",
        action: { type: "schedule" },
      })),
    },
  ];
}

export function TodayClient({
  pipelineCounts,
  totalToday,
  noShows,
  confirmQueue,
  pendingPatients,
  followUp,
  missedSession,
  gapCloser,
  alpha,
  beta,
  arrivedToday,
}: {
  pipelineCounts: Record<string, number>;
  totalToday: number;
  noShows: number;
  confirmQueue: ConfirmationQueueRow[];
  pendingPatients: PendingSessionPatient[];
  followUp: CohortRow[];
  missedSession: CohortRow[];
  gapCloser: CohortRow[];
  alpha: CohortRow[];
  beta: CohortRow[];
  arrivedToday: ArrivedPatient[];
}) {
  const groups = buildGroups(confirmQueue, pendingPatients, followUp, missedSession, gapCloser, alpha, beta);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const selectedGroup = selectedKey ? groups.find(g => g.key === selectedKey) ?? null : null;

  return (
    <div className="space-y-6">
      {/* Pipeline summary — always visible */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Today&apos;s Pipeline
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {PIPELINE.map(p => (
            <div key={p.status} className={`rounded-xl border p-4 ${p.color}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`h-2.5 w-2.5 rounded-full ${p.dot}`} />
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  {p.label}
                </span>
              </div>
              <div className="text-3xl font-bold tabular-nums">{pipelineCounts[p.status] ?? 0}</div>
            </div>
          ))}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="h-2.5 w-2.5 rounded-full bg-gray-400" />
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">No Show</span>
            </div>
            <div className="text-3xl font-bold tabular-nums text-muted-foreground">{noShows}</div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span>{totalToday} total appointments today</span>
          </div>
          <Link href="/manager/appointments" className="flex items-center gap-1.5 text-xs text-accent hover:underline font-medium">
            Open schedule board <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </section>

      {/* In Clinic Now */}
      <InClinicSection arrivedToday={arrivedToday} />

      {/* Call queue — tiles or detail view */}
      {selectedGroup ? (
        <GroupDetailView group={selectedGroup} onBack={() => setSelectedKey(null)} />
      ) : (
        <CallQueueGrid groups={groups} onSelect={setSelectedKey} />
      )}

      {/* Who to Call — all groups, full priority list */}
      <WhoToCallAccordion groups={groups} />
    </div>
  );
}

/* ── Grid of group tiles ──────────────────────────────────────────────────── */

function CallQueueGrid({ groups, onSelect }: { groups: Group[]; onSelect: (key: string) => void }) {
  const totalCallable = groups.reduce((sum, g) => sum + g.entries.length, 0);
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Call Queue</h2>
        <span className="text-xs text-muted-foreground">{totalCallable} patients across {groups.length} groups</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {groups.map(group => (
          <GroupTile key={group.key} group={group} onClick={() => onSelect(group.key)} />
        ))}
      </div>
    </section>
  );
}

function GroupTile({ group, onClick }: { group: Group; onClick: () => void }) {
  const Icon = group.icon;
  const hasPatients = group.entries.length > 0;
  return (
    <button
      onClick={onClick}
      className={[
        "rounded-xl border text-left p-4 transition-all",
        group.tileCls,
        group.borderCls,
        hasPatients
          ? "cursor-pointer hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
          : "cursor-pointer opacity-75",
      ].join(" ")}
    >
      <div className="flex items-center justify-between mb-3">
        <Icon className="h-4 w-4 text-muted-foreground" />
        {!hasPatients && <CheckCircle2 className="h-3.5 w-3.5 text-success0" />}
      </div>
      <div className={`text-3xl font-bold tabular-nums mb-1 ${group.countCls}`}>
        {group.entries.length}
      </div>
      <div className="font-semibold text-sm leading-tight">{group.label}</div>
      <div className="text-[10px] text-muted-foreground mt-1 leading-snug line-clamp-2">
        {group.description}
      </div>
    </button>
  );
}

/* ── Group detail view ────────────────────────────────────────────────────── */

function GroupDetailView({ group, onBack }: { group: Group; onBack: () => void }) {
  const Icon = group.icon;
  return (
    <section className="space-y-4">
      {/* Back nav */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Call Queue
      </button>

      {/* Group header */}
      <div className={`rounded-xl border p-4 ${group.tileCls} ${group.borderCls}`}>
        <div className="flex items-start gap-3">
          <Icon className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-base">{group.label}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${group.badgeCls}`}>
                {group.entries.length}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">{group.description}</div>
          </div>
        </div>
      </div>

      {/* Call script hint */}
      <div className="rounded-lg bg-secondary border border-border px-4 py-3">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">Call Script</div>
        <p className="text-xs text-amber-800 italic leading-relaxed">{group.script}</p>
      </div>

      {/* When-to-act timing banner */}
      {(() => {
        const timingHints: Record<string, string> = {
          confirmation: "⏰ Call before 10 AM — patients need time to plan their day",
          followup:     "📞 Best time: 11 AM – 1 PM — 2–10 days post-treatment",
          call_queue:   "📅 Call between 11 AM – 6 PM — avoid early morning",
          missed:       "🔔 Re-engage gently — last contact was 14+ days ago",
          gap:          "💰 High-value patients with unused sessions — prioritise",
          alpha:        "⭐ Doctor-flagged — high conversion potential",
          beta:         "⭐ Doctor-flagged — high conversion potential",
        };
        const hint = timingHints[group.key];
        if (!hint) return null;
        return (
          <div className="rounded-lg bg-teal-50 border border-teal-200 px-4 py-2.5 flex items-center gap-2">
            <p className="text-xs text-teal-800 font-medium leading-relaxed">{hint}</p>
          </div>
        );
      })()}

      {/* Patient cards */}
      {group.entries.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-12 text-center text-sm text-muted-foreground">
          <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-success0" />
          No patients in this group right now.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {group.entries.map(entry => (
            <PatientCard key={entry.key} entry={entry} />
          ))}
        </div>
      )}
    </section>
  );
}

/* ── Patient card ─────────────────────────────────────────────────────────── */

function PatientCard({ entry }: { entry: PatientEntry }) {
  const [bookOpen, setBookOpen] = useState(false);
  const [callState, setCallState] = useState<"idle" | "called" | "done">("idle");

  const isTimeMeta = !!entry.meta && /^\d/.test(entry.meta);

  return (
    <div className={[
      "rounded-lg border border-border bg-card flex flex-col overflow-hidden relative",
      callState === "done" ? "opacity-50 pointer-events-none" : "",
    ].join(" ")}>
      <div className="p-3 flex-1 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="font-semibold text-sm leading-tight">{entry.name}</div>
            <div className="text-[10px] text-muted-foreground">{entry.branch_name}</div>
          </div>
          {callState === "done" ? (
            <span className="text-[10px] bg-success/10 text-success rounded-full px-2 py-0.5 font-bold shrink-0 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Done ✓
            </span>
          ) : entry.meta && (
            <span className={[
              "rounded-full px-2 py-0.5 shrink-0",
              isTimeMeta
                ? "text-[11px] font-mono font-bold bg-secondary/80 text-foreground"
                : "text-[10px] bg-secondary text-muted-foreground font-medium",
            ].join(" ")}>
              {entry.meta}
            </span>
          )}
        </div>

        <div className="space-y-0.5">
          {entry.context.map((line, i) => (
            <div key={i} className="text-xs text-foreground/75 flex items-start gap-1.5">
              <span className="text-muted-foreground shrink-0 mt-px">·</span>
              <span className="leading-snug">{line}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="border-t border-border/60 px-3 py-2 flex items-center gap-2 bg-secondary/20">
        <a
          href={`tel:${entry.phone}`}
          onClick={() => { if (callState === "idle") setCallState("called"); }}
          className="flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-2.5 py-1.5 text-xs font-semibold hover:bg-primary/90 transition-colors flex-1 justify-center"
        >
          <Phone className="h-3 w-3" />
          {entry.phone}
        </a>
        {entry.action.type === "confirm" ? (
          <ConfirmButton appointmentId={entry.action.appointmentId} />
        ) : (
          <button
            onClick={() => setBookOpen(v => !v)}
            className={[
              "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap",
              bookOpen
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border bg-card hover:bg-secondary",
            ].join(" ")}
          >
            <CalendarPlus className="h-3 w-3" />
            Book
          </button>
        )}
      </div>

      {/* "Mark as done" — shown after the phone link has been tapped */}
      {callState === "called" && (
        <div className="border-t border-border/60 px-3 py-2 bg-success/5">
          <button
            onClick={() => setCallState("done")}
            className="w-full flex items-center justify-center gap-1.5 rounded-md bg-success text-white px-2.5 py-1.5 text-xs font-semibold hover:bg-emerald-700 transition-colors"
          >
            <CheckCircle2 className="h-3 w-3" />
            Mark as done ✓
          </button>
        </div>
      )}

      {bookOpen && (
        <QuickBookPanel
          phone={entry.phone}
          patientName={entry.name}
          onClose={() => setBookOpen(false)}
        />
      )}
    </div>
  );
}

/* ── Confirm button ───────────────────────────────────────────────────────── */

function ConfirmButton({ appointmentId }: { appointmentId: number }) {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const router = useRouter();

  async function confirm() {
    setState("loading");
    try {
      await fetch(`/api/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "confirmed" }),
      });
      setState("done");
      router.refresh();
    } catch {
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <span className="flex items-center gap-1 text-xs text-success font-medium px-2 py-1.5 whitespace-nowrap">
        <CheckCircle2 className="h-3 w-3" /> Confirmed
      </span>
    );
  }

  return (
    <button
      onClick={confirm}
      disabled={state === "loading"}
      className="flex items-center gap-1.5 rounded-md bg-success text-white px-2.5 py-1.5 text-xs font-semibold hover:bg-emerald-700 disabled:opacity-60 transition-colors whitespace-nowrap"
    >
      {state === "loading"
        ? <Loader2 className="h-3 w-3 animate-spin" />
        : <CalendarCheck2 className="h-3 w-3" />
      }
      Confirm
    </button>
  );
}

/* ── Conflict types ───────────────────────────────────────────────────────── */

type ConflictRow = {
  id: number;
  appointment_ts: string;
  service_type: string;
  status: string;
  doctor_name: string | null;
  branch_name: string | null;
  duration_minutes: number;
};

async function fetchConflicts(phone: string, appointment_ts: string): Promise<ConflictRow[]> {
  const res = await fetch(
    `/api/appointments?phone=${encodeURIComponent(phone)}&appointment_ts=${encodeURIComponent(appointment_ts)}`
  );
  if (!res.ok) return [];
  const { conflicts } = await res.json();
  return conflicts ?? [];
}

const STATUS_LABEL: Record<string, string> = {
  booked: "Booked", confirmed: "Confirmed",
  arrived: "Arrived", in_session: "In Session",
};

/* ── Conflict modal ───────────────────────────────────────────────────────── */

function ConflictModal({
  conflicts,
  patientName,
  requestedTs,
  service,
  loading,
  onBookAnyway,
  onCancel,
}: {
  conflicts: ConflictRow[];
  patientName: string;
  requestedTs: string;
  service: string;
  loading: boolean;
  onBookAnyway: () => void;
  onCancel: () => void;
}) {
  const [acknowledged, setAcknowledged] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-in fade-in duration-150">
      <div className="bg-card rounded-2xl border-2 border-red-400 shadow-2xl max-w-sm w-full overflow-hidden">

        {/* Red header */}
        <div className="bg-red-600 px-5 py-4 flex items-start gap-3">
          <TriangleAlert className="h-6 w-6 text-white shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="text-white font-bold text-base tracking-tight">Double Booking Alert</div>
            <div className="text-red-100 text-xs mt-0.5 leading-snug">
              {patientName} already has {conflicts.length} active appointment{conflicts.length > 1 ? "s" : ""} within 60 min of {requestedTs.slice(11, 16)}
            </div>
          </div>
          <button onClick={onCancel} className="text-red-200 hover:text-white shrink-0 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Conflict list */}
        <div className="px-5 pt-4 pb-2 space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-widest text-destructive">
            Conflicting Appointments
          </div>
          {conflicts.map(c => (
            <div key={c.id} className="rounded-lg border-2 border-destructive/30 bg-destructive/5 px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-sm text-red-900">{c.service_type}</span>
                <span className="text-[10px] rounded-full bg-red-200 text-red-900 px-2 py-0.5 font-bold uppercase tracking-wide">
                  {STATUS_LABEL[c.status] ?? c.status}
                </span>
              </div>
              <div className="text-xs text-red-700 mt-1 flex flex-wrap gap-2">
                <span className="font-semibold">
                  {c.appointment_ts.replace("T", " ").slice(0, 16)}
                </span>
                {c.doctor_name && <span>· {c.doctor_name.startsWith("Dr") ? c.doctor_name : `Dr. ${c.doctor_name}`}</span>}
                {c.branch_name && <span>· {c.branch_name}</span>}
                <span>· {c.duration_minutes} min slot</span>
              </div>
            </div>
          ))}
        </div>

        {/* New booking summary */}
        <div className="px-5 py-3">
          <div className="rounded-lg bg-secondary border border-border px-3 py-2 text-xs">
            <span className="text-muted-foreground">Booking request:</span>{" "}
            <span className="font-semibold">{service}</span>
            {" · "}{patientName}{" · "}{requestedTs.slice(0, 10)} at {requestedTs.slice(11, 16)}
          </div>
        </div>

        {/* Acknowledge checkbox */}
        <div className="px-5 pb-3">
          <label className="flex items-start gap-2.5 cursor-pointer group">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={e => setAcknowledged(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-red-300 accent-red-600 cursor-pointer"
            />
            <span className="text-xs text-muted-foreground leading-snug group-hover:text-foreground transition-colors">
              I understand this will create a duplicate booking for <span className="font-semibold">{patientName}</span>
            </span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            Change Time
          </button>
          <button
            onClick={onBookAnyway}
            disabled={!acknowledged || loading}
            className="flex-1 rounded-lg bg-red-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {loading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <TriangleAlert className="h-4 w-4" />
            }
            Book Anyway
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Day-appointment type ─────────────────────────────────────────────────── */

type DayAppt = {
  id: number;
  appointment_ts: string;
  service_type: string;
  status: string;
  duration_minutes: number;
  doctor_name: string | null;
};

// Clinic hours: 9 AM – 8 PM in 30-min slots
const SLOT_HOURS = Array.from({ length: 11 }, (_, i) => i + 9); // 9..19

function slotLabel(h: number) {
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

function getSlotOccupant(h: number, m: number, appts: DayAppt[]): DayAppt | null {
  const slotMins = h * 60 + m;
  for (const a of appts) {
    const t = a.appointment_ts.replace("T", " ");
    const [ah, am] = t.slice(11, 16).split(":").map(Number);
    const apptMins = ah * 60 + am;
    if (apptMins < slotMins + 30 && apptMins + a.duration_minutes > slotMins) return a;
  }
  return null;
}

/* ── Quick book panel ─────────────────────────────────────────────────────── */

function QuickBookPanel({
  phone,
  patientName,
  onClose,
}: {
  phone: string;
  patientName: string;
  onClose: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);

  // If it's past 6 PM there are no more slots today — default to tomorrow
  function smartDefaultDate() {
    const now = new Date();
    if (now.getHours() >= 18) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().slice(0, 10);
    }
    return today;
  }

  const [date, setDate] = useState(smartDefaultDate);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [service, setService] = useState(SERVICE_OPTIONS[0]);
  const [phase, setPhase] = useState<"idle" | "checking" | "loading" | "done">("idle");
  const [bookedTs, setBookedTs] = useState("");
  const [dayAppts, setDayAppts] = useState<DayAppt[]>([]);
  const [loadingDay, setLoadingDay] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalConflicts, setModalConflicts] = useState<ConflictRow[]>([]);

  // Fetch patient's schedule whenever date changes
  useEffect(() => {
    setLoadingDay(true);
    setSelectedTime(null);
    fetch(`/api/appointments?phone=${encodeURIComponent(phone)}&date=${date}`)
      .then(r => r.json())
      .then(d => setDayAppts(d.appointments ?? []))
      .catch(() => setDayAppts([]))
      .finally(() => setLoadingDay(false));
  }, [date, phone]);

  async function handleSubmit() {
    if (!selectedTime) return;
    const appointment_ts = `${date}T${selectedTime}:00`;
    setPhase("checking");
    const found = await fetchConflicts(phone, appointment_ts);
    if (found.length > 0) {
      setModalConflicts(found);
      setShowModal(true);
      setPhase("idle");
    } else {
      await doBook(appointment_ts);
    }
  }

  async function doBook(appointment_ts: string) {
    setPhase("loading");
    setShowModal(false);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, service_type: service, appointment_ts }),
      });
      if (!res.ok) throw new Error();
      setBookedTs(appointment_ts);
      setPhase("done");
    } catch {
      setPhase("idle");
    }
  }

  if (phase === "done") {
    return (
      <div className="border-t border-border bg-success/5 px-3 py-3 space-y-2">
        <div className="flex items-center gap-2 text-success text-xs font-semibold">
          <CheckCircle2 className="h-4 w-4" />
          Booked — {service} on {bookedTs.slice(0, 10)} at {bookedTs.slice(11, 16)}
        </div>
        <Link
          href={`/manager/appointments?date=${bookedTs.slice(0, 10)}`}
          className="flex items-center gap-1.5 text-xs text-accent hover:underline font-medium"
        >
          View on schedule board <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    );
  }

  const now = new Date();
  const isToday = date === today;
  const nowMins = isToday ? now.getHours() * 60 + now.getMinutes() : -1;
  const busy = phase === "checking" || phase === "loading";
  const freeSlotCount = SLOT_HOURS.reduce((n, h) =>
    n + [0, 30].filter(m => !getSlotOccupant(h, m, dayAppts) && !(isToday && h * 60 + m < nowMins)).length
  , 0);

  return (
    <>
      {showModal && (
        <ConflictModal
          conflicts={modalConflicts}
          patientName={patientName}
          requestedTs={`${date}T${selectedTime ?? "00:00"}:00`}
          service={service}
          loading={phase === "loading"}
          onBookAnyway={() => doBook(`${date}T${selectedTime ?? "00:00"}:00`)}
          onCancel={() => setShowModal(false)}
        />
      )}

      <div className="border-t border-border bg-card px-3 py-3 space-y-3">

        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
            Quick Book — {patientName}
          </span>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Date picker */}
        <div>
          <label className="text-[10px] text-muted-foreground block mb-1">Date</label>
          <input
            type="date"
            value={date}
            min={today}
            onChange={e => setDate(e.target.value)}
            className="w-full rounded-md border border-border bg-card px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Time slot grid */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Available Slots
            </span>
            {loadingDay ? (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading…
              </span>
            ) : (
              <span className="text-[10px] text-muted-foreground">
                {freeSlotCount} free · {dayAppts.length} booked
              </span>
            )}
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            {loadingDay ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                <Loader2 className="h-5 w-5 mx-auto mb-1.5 animate-spin" />
                Checking schedule…
              </div>
            ) : freeSlotCount === 0 && !loadingDay ? (
              <div className="py-6 px-4 text-center space-y-3">
                <div className="text-2xl">😴</div>
                <div className="text-sm font-semibold text-foreground">
                  {isToday ? "No slots left today" : "No free slots on this date"}
                </div>
                <div className="text-xs text-muted-foreground leading-relaxed">
                  {isToday
                    ? `All clinic slots for today (9 AM – 7:30 PM) have passed or are booked.`
                    : `All ${dayAppts.length} slot${dayAppts.length !== 1 ? "s" : ""} on this date are already booked.`}
                </div>
                <button
                  onClick={() => {
                    const next = new Date(date + "T00:00:00");
                    next.setDate(next.getDate() + 1);
                    setDate(next.toISOString().slice(0, 10));
                  }}
                  className="mx-auto flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-xs font-semibold hover:bg-primary/90 transition-colors"
                >
                  <CalendarPlus className="h-3.5 w-3.5" />
                  Try next day →
                </button>
              </div>
            ) : (
              <div className="divide-y divide-border/60 max-h-52 overflow-y-auto">
                {SLOT_HOURS.map(h => (
                  <div key={h} className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-secondary/20">
                    {/* Hour label */}
                    <span className="text-[10px] text-muted-foreground w-9 shrink-0 text-right tabular-nums">
                      {slotLabel(h)}
                    </span>

                    {/* Two half-hour slots */}
                    <div className="flex gap-1.5 flex-1">
                      {[0, 30].map(m => {
                        const slotTime = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
                        const occupant = getSlotOccupant(h, m, dayAppts);
                        const isPast  = isToday && h * 60 + m < nowMins;
                        const isSelected = selectedTime === slotTime;

                        if (occupant) {
                          // Booked slot — red, not clickable
                          return (
                            <div
                              key={slotTime}
                              title={`${occupant.service_type}${occupant.doctor_name ? ` · ${occupant.doctor_name.startsWith("Dr") ? occupant.doctor_name : "Dr. " + occupant.doctor_name}` : ""} (${STATUS_LABEL[occupant.status] ?? occupant.status})`}
                              className="flex-1 rounded-md bg-destructive/5 border border-destructive/30 px-1.5 py-1 cursor-not-allowed min-h-[40px] flex flex-col justify-center"
                            >
                              <div className="text-[10px] font-semibold text-destructive">{slotTime}</div>
                              <div className="text-[9px] text-red-400 truncate leading-tight mt-0.5">
                                {occupant.service_type.split(" ").slice(0, 2).join(" ")}
                              </div>
                            </div>
                          );
                        }

                        if (isPast) {
                          // Past slot — grayed out
                          return (
                            <div
                              key={slotTime}
                              className="flex-1 rounded-md bg-secondary/30 border border-border px-1.5 py-1 cursor-not-allowed min-h-[40px] flex items-center justify-center opacity-40"
                            >
                              <span className="text-[10px] text-muted-foreground">{slotTime}</span>
                            </div>
                          );
                        }

                        if (isSelected) {
                          // Selected slot — primary
                          return (
                            <button
                              key={slotTime}
                              onClick={() => setSelectedTime(null)}
                              className="flex-1 rounded-md bg-primary border border-primary text-primary-foreground px-1.5 py-1 min-h-[40px] flex flex-col items-center justify-center transition-colors"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 mb-0.5" />
                              <span className="text-[10px] font-bold">{slotTime}</span>
                            </button>
                          );
                        }

                        // Free slot — green, clickable
                        return (
                          <button
                            key={slotTime}
                            onClick={() => setSelectedTime(slotTime)}
                            className="flex-1 rounded-md bg-success/5 border border-success/30 text-success px-1.5 py-1 min-h-[40px] flex items-center justify-center hover:bg-success/10 hover:border-success/40 transition-colors group"
                          >
                            <span className="text-[10px] font-medium group-hover:font-semibold">{slotTime}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Legend — only shown when there are slots to explain */}
            {freeSlotCount > 0 && <div className="flex items-center gap-3 px-3 py-2 bg-secondary/20 border-t border-border/60">
              <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
                <span className="h-2 w-2 rounded-sm bg-success/10 border border-success/40 inline-block" />
                Free
              </span>
              <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
                <span className="h-2 w-2 rounded-sm bg-destructive/10 border border-red-300 inline-block" />
                Booked
              </span>
              <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
                <span className="h-2 w-2 rounded-sm bg-primary inline-block" />
                Selected
              </span>
              <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
                <span className="h-2 w-2 rounded-sm bg-secondary border border-border inline-block opacity-40" />
                Past
              </span>
            </div>}
          </div>
        </div>

        {/* Selected slot summary */}
        {selectedTime && (
          <div className="rounded-lg bg-primary/5 border border-primary/20 px-3 py-2 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
            <div className="flex-1 text-xs">
              <span className="font-semibold text-primary">{selectedTime}</span>
              <span className="text-muted-foreground"> on {new Date(date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}</span>
            </div>
          </div>
        )}

        {/* Service picker */}
        <div>
          <label className="text-[10px] text-muted-foreground block mb-1">Service</label>
          <select
            value={service}
            onChange={e => setService(e.target.value)}
            className="w-full rounded-md border border-border bg-card px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {SERVICE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Submit */}
        <div className="flex gap-2">
          <button
            onClick={handleSubmit}
            disabled={!selectedTime || busy}
            className="flex items-center gap-1.5 flex-1 justify-center rounded-md bg-primary text-primary-foreground px-3 py-2 text-xs font-semibold hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {busy
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <CalendarPlus className="h-3 w-3" />
            }
            {!selectedTime ? "Select a slot above" : busy ? "Checking…" : "Confirm Booking"}
          </button>
          <button
            onClick={onClose}
            disabled={busy}
            className="rounded-md border border-border px-3 py-2 text-xs font-medium hover:bg-secondary transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}

/* ── Who to Call — flat sequential queue ─────────────────────────────────── */

function WhoToCallAccordion({ groups }: { groups: Group[] }) {
  const [open, setOpen] = useState(true);
  const [calledKeys, setCalledKeys] = useState<Set<string>>(new Set());

  // Flatten all groups into one ordered list: confirmation first, then the rest
  const allEntries = groups.flatMap(g =>
    g.entries.map(e => ({ ...e, groupKey: g.key, groupLabel: g.label, groupBadgeCls: g.badgeCls }))
  );

  const pending = allEntries.filter(e => !calledKeys.has(e.key));
  const done    = allEntries.filter(e => calledKeys.has(e.key));

  if (allEntries.length === 0) return null;

  return (
    <section>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-border bg-card hover:bg-secondary/20 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm font-semibold">Who to Call</span>
          {pending.length > 0 && (
            <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-bold">
              {pending.length} remaining
            </span>
          )}
          {done.length > 0 && (
            <span className="rounded-full bg-success/10 text-success px-2 py-0.5 text-[10px] font-semibold">
              {done.length} done
            </span>
          )}
        </div>
        <span className="text-muted-foreground text-xs">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="mt-2 rounded-xl border border-border overflow-hidden">

          {pending.length === 0 && (
            <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground justify-center">
              <CheckCircle2 className="h-4 w-4 text-success" />
              All calls done for now.
            </div>
          )}

          {pending.map((entry, i) => (
            <div
              key={entry.key}
              className="flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-b-0 hover:bg-secondary/20 transition-colors"
            >
              {/* Step number */}
              <div className={[
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                i === 0 ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground border border-border",
              ].join(" ")}>
                {i + 1}
              </div>

              {/* Name + reason */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">{entry.name}</span>
                  <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${entry.groupBadgeCls}`}>
                    {entry.groupLabel}
                  </span>
                  {entry.meta && (
                    <span className="font-mono text-[10px] text-muted-foreground">{entry.meta}</span>
                  )}
                </div>
                {/* First context line only — enough to know why you're calling */}
                {entry.context[0] && (
                  <div className="text-xs text-muted-foreground mt-0.5 truncate">{entry.context[0]}</div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={`tel:${entry.phone}`}
                  onClick={() => setCalledKeys(prev => new Set([...prev, entry.key]))}
                  className="flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold hover:bg-primary/90 transition-colors whitespace-nowrap"
                >
                  <Phone className="h-3 w-3" />
                  <span className="hidden sm:inline">{entry.phone}</span>
                  <span className="sm:hidden">Call</span>
                </a>
                {entry.action.type === "confirm" ? (
                  <ConfirmButton appointmentId={entry.action.appointmentId} />
                ) : (
                  <button
                    onClick={() => setCalledKeys(prev => new Set([...prev, entry.key]))}
                    className={[
                      "rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap",
                      ["missed","gap","call_queue","alpha","beta"].includes(entry.groupKey)
                        ? "border-primary/30 bg-primary/5 text-primary hover:bg-primary/10"
                        : "border-border bg-card text-foreground hover:bg-secondary",
                    ].join(" ")}
                  >
                    {["missed","gap","call_queue","alpha","beta"].includes(entry.groupKey) ? "Book →" : "Done ✓"}
                  </button>
                )}
              </div>
            </div>
          ))}

        </div>
      )}
    </section>
  );
}

/* ── In Clinic Now section ────────────────────────────────────────────────── */

function InClinicSection({ arrivedToday }: { arrivedToday: ArrivedPatient[] }) {
  const [checkoutId, setCheckoutId] = useState<number | null>(null);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          In Clinic Now
        </h2>
        <span className="text-xs text-muted-foreground">
          {arrivedToday.length} patient{arrivedToday.length !== 1 ? "s" : ""}
        </span>
      </div>

      {arrivedToday.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-secondary/30 py-8 text-center text-sm text-muted-foreground">
          No patients checked in yet today.
        </div>
      ) : (
        <div className="space-y-2">
          {arrivedToday.map(p => {
            const isOpen = checkoutId === p.appointment_id;
            const statusDot: Record<string, string> = {
              arrived: "bg-secondary0",
              in_session: "bg-primary/50",
            };
            const statusLabel: Record<string, string> = {
              arrived: "Arrived",
              in_session: "In Session",
            };
            return (
              <div key={p.appointment_id} className="rounded-xl border border-border bg-card overflow-hidden">
                {/* Patient header row */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${statusDot[p.appt_status] ?? "bg-gray-400"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{p.patient_name}</span>
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${serviceTypeBadgeCls(p.service_type)}`}>
                        {p.service_type}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {statusLabel[p.appt_status] ?? p.appt_status} · {p.appointment_ts.slice(11, 16)}
                      {p.doctor_name ? ` · ${p.doctor_name.startsWith("Dr") ? p.doctor_name : "Dr. " + p.doctor_name}` : ""}
                      {" · "}{p.branch_name}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setCheckoutId(isOpen ? null : p.appointment_id)}
                      className={[
                        "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors",
                        isOpen
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border bg-card hover:bg-success/5 hover:border-emerald-400 hover:text-success",
                      ].join(" ")}
                    >
                      <ShoppingBag className="h-3.5 w-3.5" />
                      {isOpen ? "Close" : "Checkout →"}
                    </button>
                  </div>
                </div>

                {/* Checkout panel */}
                {isOpen && (
                  <div className="border-t border-border bg-secondary/20 px-4 py-4">
                    <CheckoutFlow
                      appointmentId={p.appointment_id}
                      patientId={p.patient_id}
                      patientName={p.patient_name}
                      serviceType={p.service_type}
                      onClose={() => setCheckoutId(null)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

