"use client";

import { useEffect, useMemo, useState, useTransition, useRef } from "react";
import Image from "next/image";
import { Loader2, Send, UserRound, Mic, MicOff, Sparkles, Upload, Pause, Play, Square, ShieldCheck, Printer, Pencil, ChevronDown, CheckCircle2, Image as ImageIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { inr, formatLabel } from "@/lib/utils";
import { PrescriptionDocument, SAMPLE_RX } from "@/components/prescription-document";
import type { Patient, PatientPortfolio, CheckIn, RawNote, RxRow, Consultation, PatientAttribute, SkinPhoto } from "@/lib/types";

type CheckInLite = CheckIn & { patient_name: string; branch_name: string };
type TodayAppt = { id: number; patient_id: number; patient_name: string; status: string; appointment_ts: string; branch_name: string | null };

const STATUS_LABEL: Record<string, string> = {
  booked: "Booked", confirmed: "Confirmed", arrived: "Arrived",
  in_consultation: "In Consult", consultation_done: "Consult Done",
  in_treatment: "In Treatment", treatment_done: "Tx Done",
};
const STATUS_DOT: Record<string, string> = {
  booked: "bg-slate-300", confirmed: "bg-blue-400", arrived: "bg-amber-400",
  in_consultation: "bg-violet-500", consultation_done: "bg-teal-500",
  in_treatment: "bg-orange-500", treatment_done: "bg-emerald-500",
};

export function DoctorClient({
  patients,
  checkIns,
  completedToday,
  todayAppointments,
  initialId,
  initialPortfolio,
  doctorName,
  doctorSpecialty,
  doctorBranch,
}: {
  patients: Patient[];
  checkIns: CheckInLite[];
  completedToday: Array<{ id: number; name: string; fee?: number }>;
  todayAppointments: TodayAppt[];
  initialId: number;
  initialPortfolio: PatientPortfolio | null;
  doctorName: string;
  doctorSpecialty: string;
  doctorBranch: string;
}) {
  const [selectedId, setSelectedId] = useState<number>(initialId);
  const [portfolio, setPortfolio] = useState<PatientPortfolio | null>(initialPortfolio);
  const [loading, setLoading] = useState(false);

  const [liveCheckIns, setLiveCheckIns] = useState(checkIns);
  const [completedPatients, setCompletedPatients] = useState<Array<{id: number; name: string; fee?: number}>>(completedToday);

  // IDs already in the check-in queue — avoid duplicating in Today's Schedule
  const checkInIds = new Set(liveCheckIns.map(c => c.patient_id));
  // Today's appointments not yet in the live check-in queue
  const pendingAppts = todayAppointments.filter(a => !checkInIds.has(a.patient_id));

  const dismissCheckIn = async (patientId: number, patientName: string, fee?: number) => {
    const ci = liveCheckIns.find(c => c.patient_id === patientId);
    if (ci) {
      try {
        await fetch(`/api/patients/check-ins/${ci.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "completed" }),
        });
      } catch {}
    }

    // Find the next patient in queue BEFORE updating state
    const remaining = liveCheckIns.filter(c => c.patient_id !== patientId);
    const nextPatient = remaining[0];

    setLiveCheckIns(remaining);
    setCompletedPatients(prev => {
      if (prev.some(p => p.id === patientId)) return prev;
      return [...prev, { id: patientId, name: patientName, fee }];
    });

    // Auto-advance to the next waiting patient
    if (nextPatient) {
      loadPortfolio(nextPatient.patient_id);
    }
  };

  const loadPortfolio = async (id: number) => {
    setLoading(true);
    setSelectedId(id);
    try {
      const res = await fetch(`/api/patients/${id}/portfolio`, { cache: "no-store" });
      const data = await res.json();
      setPortfolio(data.portfolio);
    } finally {
      setLoading(false);
    }
  };

  const refreshPortfolio = async (id: number) => {
    try {
      const res = await fetch(`/api/patients/${id}/portfolio`, { cache: "no-store" });
      const data = await res.json();
      setPortfolio(data.portfolio);
    } catch {}
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
      <aside className="space-y-4">
        {/* Logged-in doctor banner */}
        <Card className="border-success/30 bg-success/5/60">
          <CardContent className="p-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-success/10 border border-success/30 flex items-center justify-center shrink-0">
                <UserRound className="h-4 w-4 text-success" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground truncate">{doctorName}</div>
                <div className="text-[11px] text-success truncate">{doctorSpecialty}</div>
                <div className="text-[10px] text-muted-foreground truncate">{doctorBranch}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Live check-ins</CardTitle>
            <CardDescription>Patients waiting now</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {liveCheckIns.length === 0 ? (
              <div className="text-xs text-muted-foreground">None waiting.</div>
            ) : (
              liveCheckIns.map((ci) => (
                <button
                  key={ci.id}
                  onClick={() => loadPortfolio(ci.patient_id)}
                  className={`w-full text-left rounded-md border px-3 py-2 transition-colors ${
                    selectedId === ci.patient_id
                      ? "border-accent bg-accent/10"
                      : "border-border hover:bg-secondary"
                  }`}
                >
                  <div className="text-sm font-medium">{ci.patient_name}</div>
                  <div className="text-xs text-muted-foreground">{ci.branch_name}</div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {/* Today's Completed patients queue */}
        {completedPatients.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Today's Completed</CardTitle>
              <CardDescription>Consultations finished this session</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {completedPatients.map((cp) => (
                <button
                  key={cp.id}
                  onClick={() => loadPortfolio(cp.id)}
                  className={`w-full text-left rounded-md border px-3 py-2 transition-colors ${
                    selectedId === cp.id
                      ? "border-accent bg-accent/10"
                      : "border-border hover:bg-secondary opacity-70"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                    <div className="text-sm font-medium">{cp.name}</div>
                  </div>
                  <div className="text-xs text-muted-foreground ml-5 flex items-center gap-1.5">
                    <span>Completed</span>
                    {cp.fee != null && (
                      <>
                        <span className="opacity-40">·</span>
                        <span className="font-mono font-medium text-success">{inr(cp.fee)}</span>
                      </>
                    )}
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        )}
      </aside>

      <section>
        {loading || !portfolio ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              <Loader2 className="mx-auto h-5 w-5 animate-spin mb-2" />
              Loading portfolio...
            </CardContent>
          </Card>
        ) : (
          <PortfolioView
            portfolio={portfolio}
            onTagSaved={() => refreshPortfolio(portfolio.patient.id)}
            onComplete={(fee) => dismissCheckIn(portfolio.patient.id, portfolio.patient.name, fee)}
            isLive={liveCheckIns.some(c => c.patient_id === portfolio.patient.id)}
            isCompleted={completedPatients.some(c => c.id === portfolio.patient.id)}
          />
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------

function PortfolioView({
  portfolio,
  onTagSaved,
  onComplete,
  isLive,
  isCompleted,
}: {
  portfolio: PatientPortfolio;
  onTagSaved: () => void;
  onComplete: (fee?: number) => void;
  isLive: boolean;
  isCompleted?: boolean;
}) {
  const p = portfolio.patient;
  const [activeTab, setActiveTab] = useState(isCompleted ? "visits" : "live");
  const [summaryKey, setSummaryKey] = useState(0);
  const [justCompleted, setJustCompleted] = useState(false);

  const latestSession = portfolio.sessions[0];
  const doctorId: number | null = latestSession?.doctor_id ?? null;
  const weightText = portfolio.attributes.find((a) => a.key === "weight_kg")?.value
    ? `${portfolio.attributes.find((a) => a.key === "weight_kg")!.value} kg`
    : null;
  // Compute a per-session fee from the latest package for display in "Today's Completed"
  const latestPkg = portfolio.packages[0];
  const sessionFee = latestPkg
    ? Math.round(latestPkg.collection_paid_inr / Math.max(latestPkg.sessions_total, 1))
    : undefined;

  const handleNoteSaved = () => {
    onTagSaved();
    setSummaryKey(k => k + 1); // force SummaryPane to re-fetch
    setActiveTab("visits");   // auto-switch to Visits tab
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-accent">
              <UserRound className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold">{p.name}</h2>
                {portfolio.sessions.length > 0 && (
                  <Badge variant="outline">
                    {portfolio.sessions[0].service_name_snapshot || "Session"}
                  </Badge>
                )}
                {p.home_branch_name && <Badge variant="accent">{p.home_branch_name}</Badge>}
                {(isLive || justCompleted) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={justCompleted ? undefined : () => { setJustCompleted(true); onComplete(sessionFee); }}
                    className={`gap-1.5 ml-auto ${
                      justCompleted
                        ? "text-success bg-success/5 border-success/40 cursor-default"
                        : "text-success border-success/40 hover:bg-success/5"
                    }`}
                  >
                    {justCompleted && <CheckCircle2 className="h-3.5 w-3.5" />}
                    {justCompleted ? "Consultation complete ✓" : "Complete consultation"}
                  </Button>
                )}
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-muted-foreground">
                {p.guest_code && <span className="font-mono font-medium text-foreground">{p.guest_code}</span>}
                <span>{p.phone}</span>
                {p.gender && <span className="capitalize text-xs">{p.gender}</span>}
              </div>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <Stat label="Sessions logged" value={String(portfolio.sessions.length)} />
                <Stat label="Active packages" value={String(portfolio.packages.length)} />
                <Stat label="Photos on file" value={String(portfolio.photos.length)} />
                <Stat label="Tag entries" value={String(portfolio.tags.length)} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {!isCompleted && <TabsTrigger value="live">Consult</TabsTrigger>}
          <TabsTrigger value="visits">Visits</TabsTrigger>
          <TabsTrigger value="timeline">Visual timeline</TabsTrigger>
        </TabsList>

        {!isCompleted && (
        <TabsContent value="live">
          <ConsultSection
            patientId={p.id}
            portfolio={portfolio}
            onConsultSaved={() => onTagSaved()}
            onNoteSaved={handleNoteSaved}
          />
        </TabsContent>
        )}
        <TabsContent value="visits">
          <VisitsTab
            portfolio={portfolio}
            weightText={weightText}
            onSaved={onTagSaved}
            patientId={p.id}
          />
        </TabsContent>
        <TabsContent value="timeline">
          <TimelinePane portfolio={portfolio} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PurchaseAccordion({ packages, products }: { packages: any[]; products: any[] }) {
  const [openPkg, setOpenPkg] = useState<number | null>(null);
  const [openProd, setOpenProd] = useState(false);

  if (packages.length === 0 && products.length === 0) return null;

  return (
    <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
      {/* Packages accordion */}
      {packages.length > 0 && packages.map((pkg, i) => {
        const isOpen = openPkg === pkg.id;
        const pct = pkg.sessions_total > 0 ? Math.round((pkg.sessions_used / pkg.sessions_total) * 100) : 0;
        return (
          <div key={pkg.id}>
            <button
              onClick={() => setOpenPkg(isOpen ? null : pkg.id)}
              className="w-full flex items-center gap-3 px-4 py-3 bg-card hover:bg-secondary text-left transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{pkg.service_name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{pkg.sessions_used}/{pkg.sessions_total} sessions used · {inr(pkg.collection_paid_inr)}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className="text-[10px]">Package</Badge>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </div>
            </button>
            {isOpen && (
              <div className="px-4 py-3 border-t border-border bg-secondary/20 space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Purchased: {pkg.purchase_date}</span>
                  <span>{pct}% utilised</span>
                </div>
                <div className="h-1.5 rounded-full bg-border overflow-hidden">
                  <div className="h-full rounded-full bg-primary/60 transition-all" style={{ width: `${pct}%` }} />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center pt-1">
                  {[
                    { label: "Total sessions", value: pkg.sessions_total },
                    { label: "Used", value: pkg.sessions_used },
                    { label: "Remaining", value: pkg.sessions_total - pkg.sessions_used },
                  ].map(kv => (
                    <div key={kv.label} className="rounded-lg bg-card border border-border py-2">
                      <div className="text-base font-bold tabular-nums">{kv.value}</div>
                      <div className="text-[10px] text-muted-foreground">{kv.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Products accordion */}
      {products.length > 0 && (
        <div>
          <button
            onClick={() => setOpenProd(p => !p)}
            className="w-full flex items-center gap-3 px-4 py-3 bg-card hover:bg-secondary text-left transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">Products purchased</div>
              <div className="text-xs text-muted-foreground mt-0.5">{products.length} item{products.length !== 1 ? "s" : ""}</div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className="text-[10px]">Products</Badge>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${openProd ? "rotate-180" : ""}`} />
            </div>
          </button>
          {openProd && (
            <div className="border-t border-border bg-secondary/20 divide-y divide-border/60">
              {products.map((pp: any) => (
                <div key={pp.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div>
                    <div className="text-sm font-medium">{pp.product_name ?? pp.name}</div>
                    <div className="text-xs text-muted-foreground">{pp.purchase_date} · {pp.category} · Qty {pp.qty}</div>
                  </div>
                  <div className="text-sm font-semibold shrink-0">{inr(pp.price_paid_inr)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function VisitsTab({
  portfolio,
  weightText,
  onSaved,
  patientId,
}: {
  portfolio: PatientPortfolio;
  weightText: string | null;
  onSaved: () => void;
  patientId: number;
}) {
  const [selectedSession, setSelectedSession] = useState<number | null>(
    portfolio.sessions.length > 0 ? portfolio.sessions[0].id : null
  );
  const [summaryData, setSummaryData] = useState<{ narrative?: string; visits?: any[] } | null>(null);

  useEffect(() => {
    fetch(`/api/patients/${patientId}/summary`, { cache: "no-store" })
      .then(r => r.json()).then(setSummaryData).catch(() => {});
  }, [patientId]);

  const tagsBySession = useMemo(() => {
    const map: Record<number, typeof portfolio.tags> = {};
    for (const tag of portfolio.tags) {
      if (tag.session_id) {
        if (!map[tag.session_id]) map[tag.session_id] = [];
        map[tag.session_id].push(tag);
      }
    }
    return map;
  }, [portfolio.tags]);

  const summaryByDate = useMemo(() => {
    if (!summaryData?.visits) return {} as Record<string, any>;
    const map: Record<string, any> = {};
    for (const v of summaryData.visits) { map[v.date] = v; }
    return map;
  }, [summaryData]);

  const selectedS = portfolio.sessions.find(s => s.id === selectedSession);
  const selectedTags = selectedS ? (tagsBySession[selectedS.id] ?? []) : [];
  const selectedSummary = selectedS ? summaryByDate[selectedS.session_date] : null;
  // Find the prescription linked to the selected session (fall back to most recent)
  const selectedRx = selectedS
    ? ((portfolio.prescriptions as any[]).find(rx => rx.session_id === selectedS.id)
        ?? (portfolio.prescriptions as any[])[0]
        ?? null)
    : null;

  // Last session and remaining sessions summary
  const lastSession = portfolio.sessions[0] ?? null;
  const totalRemaining = portfolio.packages.reduce((s, p) => s + Math.max(0, p.sessions_total - p.sessions_used), 0);

  return (
    <div className="space-y-4">

      {/* Last visit + remaining sessions summary bar */}
      {(lastSession || totalRemaining > 0) && (
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-secondary/30 px-4 py-3 text-sm">
          {lastSession && (
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground shrink-0">Last visit</span>
              <span className="font-mono text-xs font-semibold text-foreground">{lastSession.session_date}</span>
              {lastSession.service_name_snapshot && (
                <span className="text-xs text-muted-foreground truncate">· {lastSession.service_name_snapshot}</span>
              )}
              {lastSession.doctor_name && (
                <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                  · {lastSession.doctor_name.startsWith("Dr") ? lastSession.doctor_name : `Dr. ${lastSession.doctor_name}`}
                </span>
              )}
            </div>
          )}
          {lastSession && totalRemaining > 0 && <span className="text-border">|</span>}
          {totalRemaining > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Remaining</span>
              <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-bold">{totalRemaining} session{totalRemaining !== 1 ? "s" : ""}</span>
              <span className="text-xs text-muted-foreground">across packages</span>
            </div>
          )}
        </div>
      )}

      {/* Purchase history — accordion */}
      <PurchaseAccordion packages={portfolio.packages} products={portfolio.product_purchases} />

      {/* Master-detail split */}
      {portfolio.sessions.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No visits recorded yet.</CardContent></Card>
      ) : (
        <div className="flex gap-3 min-h-0" style={{ height: 420 }}>

          {/* LEFT: session list */}
          <div className="w-52 shrink-0 rounded-xl border border-border overflow-y-auto">
            <div className="px-3 py-2 border-b border-border bg-secondary/30 sticky top-0">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {portfolio.sessions.length} visits
              </div>
            </div>
            <div className="divide-y divide-border/60">
              {portfolio.sessions.map(s => {
                const sType = (s as any).session_type ?? "treatment";
                const isSelected = selectedSession === s.id;
                const doctorShort = s.doctor_name
                  ? s.doctor_name.replace(/^Dr\.?\s*/i, "").split(" ")[0]
                  : null;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSession(s.id)}
                    className={[
                      "w-full text-left px-3 py-2.5 transition-colors",
                      isSelected ? "bg-primary/10 border-l-2 border-l-primary" : "hover:bg-secondary/50 border-l-2 border-l-transparent",
                    ].join(" ")}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${sType === "consultation" ? "bg-muted-foreground/40" : "bg-muted-foreground/60"}`} />
                      <span className="font-mono text-[10px] text-muted-foreground">{s.session_date}</span>
                    </div>
                    <div className="text-xs font-medium leading-snug truncate pl-3.5">{s.service_name_snapshot}</div>
                    {doctorShort && (
                      <div className="text-[10px] text-muted-foreground pl-3.5 mt-0.5">{doctorShort}</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT: session detail */}
          <div className="flex-1 rounded-xl border border-border overflow-y-auto">
            {!selectedS ? (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">Select a visit</div>
            ) : (() => {
              const sType = (selectedS as any).session_type ?? "treatment";
              const treatmentNotes = (selectedS as any).treatment_notes as string | undefined;
              const photosCount = (selectedS as any).photos_count as number | undefined;
              const sessionStatus = (selectedS as any).status as string | undefined;
              const doctorLabel = selectedS.doctor_name
                ? (selectedS.doctor_name.startsWith("Dr") ? selectedS.doctor_name : `Dr. ${selectedS.doctor_name}`)
                : null;
              return (
                <div className="p-4 space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-sm">{selectedS.service_name_snapshot}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                        <span className="font-mono">{selectedS.session_date}</span>
                        {doctorLabel && <span>· {doctorLabel}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {sessionStatus && (
                        <Badge variant={sessionStatus === "completed" ? "accent" : "outline"} className="text-[10px] capitalize">
                          {sessionStatus}
                        </Badge>
                      )}
                      {photosCount != null && photosCount > 0 && (
                        <span className="inline-flex items-center rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
                          {photosCount} photo{photosCount !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Session type pill */}
                  <div className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${sType === "consultation" ? "bg-muted-foreground/40" : "bg-muted-foreground/60"}`} />
                    <span className="text-xs text-muted-foreground capitalize">{sType} session</span>
                  </div>

                  {/* Prescription for this visit */}
                  {selectedRx ? (
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Prescription</div>
                      {selectedRx.clinical_recommendation && (
                        <p className="text-xs text-foreground leading-snug bg-secondary/30 rounded-lg px-3 py-2.5 mb-3 whitespace-pre-wrap">
                          {selectedRx.clinical_recommendation}
                        </p>
                      )}
                      {selectedRx.items?.length > 0 && (
                        <div className="rounded-lg border border-border overflow-hidden">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-secondary/40 border-b border-border">
                                <th className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Problem</th>
                                <th className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Product / Medicine</th>
                                <th className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Dosage</th>
                                <th className="text-right px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Cost</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                              {(selectedRx.items as any[]).map((row: any, i: number) => (
                                <tr key={i} className="hover:bg-secondary/20">
                                  <td className="px-3 py-2 align-top">
                                    {row.problem ? (
                                      <div>
                                        <span className="font-medium text-foreground">{row.problem}</span>
                                        {row.problem_type && (
                                          <span className={`ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wide ${row.problem_type === "chronic" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                                            {row.problem_type}
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-muted-foreground">—</span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 align-top">
                                    <div className="font-medium text-foreground">{row.product}</div>
                                    {row.product_detail && <div className="text-[10px] text-muted-foreground mt-0.5">{row.product_detail}</div>}
                                  </td>
                                  <td className="px-3 py-2 align-top">
                                    <div>{row.dosage}</div>
                                    {row.dosage_detail && <div className="text-[10px] text-muted-foreground mt-0.5">{row.dosage_detail}</div>}
                                  </td>
                                  <td className="px-3 py-2 align-top text-right font-mono">
                                    {row.cost != null ? inr(row.cost) : <span className="text-muted-foreground text-[10px]">TBD</span>}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Fallback: session notes when no prescription linked */
                    treatmentNotes ? (
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Session Notes</div>
                        <p className="text-sm text-foreground leading-snug whitespace-pre-wrap bg-secondary/30 rounded-lg px-3 py-2.5">{treatmentNotes}</p>
                      </div>
                    ) : (
                      <div className="text-center py-6 text-xs text-muted-foreground">
                        No prescription recorded for this visit.
                      </div>
                    )
                  )}
                </div>
              );
            })()}
          </div>

        </div>
      )}
    </div>
  );
}

function RxTab({
  portfolio,
  weightText,
  onSaved,
  patientId,
}: {
  portfolio: PatientPortfolio;
  weightText: string | null;
  onSaved: () => void;
  patientId: number;
}) {
  const [expandedRx, setExpandedRx] = useState<number | null>(null);
  const [showNewRx, setShowNewRx] = useState(false);
  const p = portfolio.patient;

  return (
    <div className="space-y-6">
      {/* Prescriptions accordion */}
      {portfolio.prescriptions.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No prescriptions on file
          </CardContent>
        </Card>
      ) : (
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Prescriptions · {portfolio.prescriptions.length} on file
          </div>
          <div className="space-y-2">
            {(portfolio.prescriptions as any[]).map((rx, i) => {
              const isOpen = expandedRx === rx.id;
              return (
                <div key={rx.id} className="rounded-xl border border-border overflow-hidden">
                  <button
                    onClick={() => setExpandedRx(isOpen ? null : rx.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-card hover:bg-secondary text-left transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="font-mono text-xs text-muted-foreground">{rx.created_at?.slice(0, 10)}</span>
                      {rx.items?.length > 0 && (
                        <span className="ml-3 text-xs text-muted-foreground">{rx.items.length} item{rx.items.length !== 1 ? "s" : ""}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {i === 0 && <Badge variant="accent" className="text-[10px]">Latest</Badge>}
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    </div>
                  </button>
                  {isOpen && (
                    <div className="border-t border-border">
                      <div className="p-2">
                        <Button variant="outline" size="sm" onClick={() => window.print()} className="mb-2">
                          <Printer className="h-3.5 w-3.5" /> Print
                        </Button>
                      </div>
                      <PrescriptionDocument
                        patient={p}
                        clinicalRecommendation={rx.clinical_recommendation ?? rx.regimen_notes}
                        items={rx.items ?? []}
                        dispensingFeeInr={rx.dispensing_fee_inr}
                        createdAt={rx.created_at}
                        weightText={weightText}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* New prescription */}
      <div>
        {showNewRx ? (
          <div className="rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold">New Prescription</span>
              <button onClick={() => setShowNewRx(false)} className="text-muted-foreground hover:text-foreground text-xs underline">Cancel</button>
            </div>
            <AddPrescriptionForm patient={p} weightText={weightText} onSaved={() => { setShowNewRx(false); onSaved(); }} />
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setShowNewRx(true)} className="gap-2">
            <Printer className="h-4 w-4" /> New Prescription
          </Button>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-lg font-semibold">{value}</div>
    </div>
  );
}

// ---- History --------------------------------------------------------------

function HistoryPane({ portfolio }: { portfolio: PatientPortfolio }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Sessions consumed (cross-branch)</CardTitle>
        </CardHeader>
        <CardContent>
          {portfolio.sessions.length === 0 ? (
            <div className="text-sm text-muted-foreground">No sessions logged.</div>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Date</TH>
                  <TH>Type</TH>
                  <TH>Service</TH>
                  <TH>Branch</TH>
                  <TH>Doctor</TH>
                </TR>
              </THead>
              <TBody>
                {portfolio.sessions.map((s) => {
                  const sType = (s as any).session_type ?? "treatment";
                  return (
                    <TR key={s.id}>
                      <TD>{s.session_date}</TD>
                      <TD>
                        <Badge
                          variant={sType === "consultation" ? "outline" : "accent"}
                          className="text-[10px] capitalize"
                        >
                          {sType}
                        </Badge>
                      </TD>
                      <TD className="font-medium">{s.service_name_snapshot}</TD>
                      <TD>
                        <Badge variant="outline">{s.branch_name}</Badge>
                      </TD>
                      <TD className="text-muted-foreground">{s.doctor_name}</TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active packages</CardTitle>
          <CardDescription>Net Revenue ledger visible per package</CardDescription>
        </CardHeader>
        <CardContent>
          {portfolio.packages.length === 0 ? (
            <div className="text-sm text-muted-foreground">No packages.</div>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Service</TH>
                  <TH>Purchased</TH>
                  <TH>Used / Total</TH>
                  <TH>Collection</TH>
                  <TH>Recognized</TH>
                  <TH>Unearned</TH>
                </TR>
              </THead>
              <TBody>
                {portfolio.packages.map((p) => {
                  const per = p.collection_paid_inr / p.sessions_total;
                  const recognized = Math.round(per * p.sessions_used);
                  const unearned = p.collection_paid_inr - recognized;
                  return (
                    <TR key={p.id}>
                      <TD className="font-medium">{p.service_name}</TD>
                      <TD className="text-muted-foreground">{p.purchase_date}</TD>
                      <TD>
                        {p.sessions_used} / {p.sessions_total}
                      </TD>
                      <TD>{inr(p.collection_paid_inr)}</TD>
                      <TD>{inr(recognized)}</TD>
                      <TD className="text-accent">{inr(unearned)}</TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Product purchases</CardTitle>
        </CardHeader>
        <CardContent>
          {portfolio.product_purchases.length === 0 ? (
            <div className="text-sm text-muted-foreground">No product purchases.</div>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Date</TH>
                  <TH>Product</TH>
                  <TH>SKU</TH>
                  <TH>Category</TH>
                  <TH>Qty</TH>
                  <TH>Paid</TH>
                </TR>
              </THead>
              <TBody>
                {portfolio.product_purchases.map((pp: any) => (
                  <TR key={pp.id}>
                    <TD>{pp.purchase_date}</TD>
                    <TD className="font-medium">{pp.product_name ?? pp.name}</TD>
                    <TD className="font-mono text-xs">{pp.sku}</TD>
                    <TD>{pp.category}</TD>
                    <TD>{pp.qty}</TD>
                    <TD>{inr(pp.price_paid_inr)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---- Visual timeline -------------------------------------------------------

function TimelinePane({ portfolio }: { portfolio: PatientPortfolio }) {
  const photos = useMemo(
    () => [...portfolio.photos].sort((a, b) => a.visit_date.localeCompare(b.visit_date)),
    [portfolio.photos]
  );
  const regions = useMemo(() => Array.from(new Set(photos.map((p) => p.region))), [photos]);
  const [region, setRegion] = useState<string>(regions[0] ?? "");

  if (photos.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          No photos on file yet.
        </CardContent>
      </Card>
    );
  }

  const activeRegion = regions.includes(region) ? region : regions[0];
  const regionPhotos = photos.filter((p) => p.region === activeRegion);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Full timeline</CardTitle>
          <CardDescription>{photos.length} photos in chronological order</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((p, i) => (
              <div key={p.id} className="rounded-md border border-border overflow-hidden bg-card">
                <div className="w-full aspect-square" style={{ background: skinGradient(photos.length > 1 ? i / (photos.length - 1) : 0) }} />
                <div className="px-3 py-2 text-xs text-muted-foreground border-t border-border">
                  {p.visit_date} · {p.region.replace(/_/g, " ")}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Progress-photo visual matched to the customer app: earliest frame (t=0) shows
// more pigment/spots, latest (t=1) is clearer. Rendered as a gradient placeholder
// so the doctor portal shows the same imagery the customer sees.
function skinGradient(t: number): string {
  const a = (base: number) => +(base * (1 - t)).toFixed(2);
  return [
    `radial-gradient(35% 25% at 32% 38%, rgba(140,80,55,${a(0.55)}) 0%, transparent 70%)`,
    `radial-gradient(28% 22% at 58% 42%, rgba(130,75,50,${a(0.5)}) 0%, transparent 70%)`,
    `radial-gradient(18% 14% at 48% 56%, rgba(120,65,40,${a(0.45)}) 0%, transparent 70%)`,
    `radial-gradient(120% 80% at 30% 20%, #f6e6d4 0%, #e6c8a8 40%, #c39a72 75%, #7a553a 100%)`,
  ].join(", ");
}

function BeforeAfterSlider({ photos }: { photos: SkinPhoto[] }) {
  const n = photos.length;
  const before = photos[0];
  const [afterIdx, setAfterIdx] = useState(n - 1);
  const after = photos[afterIdx];
  const [pos, setPos] = useState(50);
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const tFor = (i: number) => (n > 1 ? i / (n - 1) : 0);

  const move = (clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos(Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)));
  };

  return (
    <div className="space-y-3">
      <div
        ref={ref}
        onPointerDown={(e) => { dragging.current = true; ref.current?.setPointerCapture(e.pointerId); move(e.clientX); }}
        onPointerMove={(e) => { if (dragging.current) move(e.clientX); }}
        onPointerUp={() => { dragging.current = false; }}
        className="relative w-full overflow-hidden rounded-md border border-border select-none"
        style={{ aspectRatio: "4 / 3", cursor: "ew-resize", touchAction: "none", background: "var(--paper-2, #f4ece2)" }}
      >
        {/* base = after (clearer) */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: skinGradient(tFor(afterIdx)) }} />
        {/* overlay = before (more pigment), clipped to the left pos% */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: skinGradient(0), clipPath: `inset(0 ${100 - pos}% 0 0)` }}
        />
        <div className="absolute top-3 left-3"><Badge variant="outline" className="bg-background/90">Before · {before.visit_date}</Badge></div>
        <div className="absolute top-3 right-3"><Badge variant="accent">After · {after.visit_date}</Badge></div>
        {/* divider + handle */}
        <div className="absolute top-0 bottom-0 pointer-events-none" style={{ left: `${pos}%`, width: 1, background: "white", boxShadow: "0 0 0 1px rgba(0,0,0,0.1)" }}>
          <div className="absolute top-1/2 left-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-foreground bg-background text-foreground">
            <svg width="16" height="12" viewBox="0 0 18 14" fill="none" stroke="currentColor" strokeWidth="1.4">
              <path d="M5 3 L1 7 L5 11" /><path d="M13 3 L17 7 L13 11" /><path d="M1 7 H17" />
            </svg>
          </div>
        </div>
      </div>
      <div className="text-center text-[11px] uppercase tracking-wide text-muted-foreground">
        ← Drag to compare · captured under standardised clinic light
      </div>
      {/* Photo log strip — click to set the "after" frame */}
      <div className="flex gap-2 overflow-x-auto pt-1">
        {photos.map((p, i) => (
          <button
            key={p.id}
            onClick={() => setAfterIdx(i)}
            className={`shrink-0 rounded-md border overflow-hidden w-20 transition-colors ${
              i === afterIdx ? "border-accent ring-1 ring-accent" : "border-border hover:border-accent/50"
            }`}
            title={`Set ${p.visit_date} as the after frame`}
          >
            <div className="h-16 w-full" style={{ background: skinGradient(tFor(i)) }} />
            <div className="px-1 py-0.5 text-[9px] text-muted-foreground border-t border-border">{p.visit_date.slice(5)}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---- Tags -----------------------------------------------------------------

function TagsPane({ portfolio }: { portfolio: PatientPortfolio }) {
  if (portfolio.tags.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          No clinical tags yet. Capture a post-consult note to populate this timeline.
        </CardContent>
      </Card>
    );
  }

  const noteForTag = (tagSessionId: number | null, tagCreatedAt: string): RawNote | null => {
    const notes = portfolio.notes ?? [];
    if (tagSessionId) {
      const match = notes.find((n) => n.session_id === tagSessionId);
      if (match) return match;
    }
    const tagMs = new Date(tagCreatedAt).getTime();
    return notes.find((n) => Math.abs(new Date(n.created_at).getTime() - tagMs) < 60_000) ?? null;
  };

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Clinical tag timeline</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Tags extracted from doctor notes · feed the Cohort Engine</p>
      </div>

      <div className="relative pl-8">
        {/* Vertical spine */}
        <div className="absolute left-3 top-2 bottom-2 w-px bg-border" />

        <div className="space-y-5">
          {portfolio.tags.map((t) => {
            let free: Record<string, any> = {};
            try { free = t.free_tags_json ? JSON.parse(t.free_tags_json) : {}; } catch {}
            const note = noteForTag(t.session_id, t.created_at);
            const date = t.created_at.slice(0, 10);
            const time = t.created_at.slice(11, 16);

            // Only show chips for fields that have actual data
            type Chip = { label: string; value: string; cls: string };
            const chips: Chip[] = [];
            if (t.primary_concern)         chips.push({ label: "Concern",       value: formatLabel(t.primary_concern),         cls: "bg-destructive/5 text-destructive border-destructive/20" });
            if (t.active_acne_status)      chips.push({ label: "Acne",          value: formatLabel(t.active_acne_status),      cls: "bg-orange-50 text-orange-700 border-orange-100" });
            if (t.barrier_status)          chips.push({ label: "Barrier",        value: formatLabel(t.barrier_status),          cls: "bg-primary/5 text-primary border-primary/20" });
            if (t.treatment_ready_for)     chips.push({ label: "Ready for",      value: formatLabel(t.treatment_ready_for),     cls: "bg-success/5 text-success border-success/20" });
            if (t.next_recommended_service)chips.push({ label: "Next",           value: formatLabel(t.next_recommended_service),cls: "bg-primary/5 text-primary border-primary/20" });
            if (t.product_adherence_score != null) chips.push({ label: "Adherence", value: `${t.product_adherence_score}/10`, cls: "bg-secondary text-muted-foreground border-border" });
            if (t.scar_treatment_candidate) chips.push({ label: "Scar candidate", value: "Yes", cls: "bg-pink-50 text-pink-700 border-pink-100" });

            const freeChips = Object.entries(free).filter(([, v]) => v != null && String(v).trim());

            return (
              <div key={t.id} className="relative">
                {/* Timeline dot */}
                <div className="absolute -left-5 top-3 h-3.5 w-3.5 rounded-full border-2 border-accent bg-background" />

                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  {/* Date row */}
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-secondary/30 border-b border-border">
                    <span className="text-xs font-semibold text-foreground">{date}</span>
                    <span className="text-[10px] text-muted-foreground">{time}</span>
                    {t.session_id && (
                      <span className="ml-auto text-[10px] font-mono text-muted-foreground">session #{t.session_id}</span>
                    )}
                  </div>

                  <div className="p-4 space-y-3">
                    {/* Structured tag chips */}
                    {chips.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {chips.map((c, ci) => (
                          <span key={ci} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${c.cls}`}>
                            <span className="opacity-60 text-[9px] uppercase tracking-wider">{c.label}</span>
                            {c.value}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No structured tags extracted</p>
                    )}

                    {/* Free-form extra tags */}
                    {freeChips.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {freeChips.map(([k, v]) => (
                          <span key={k} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-1 text-[11px] text-muted-foreground">
                            <span className="opacity-60 text-[9px] uppercase tracking-wider">{formatLabel(k)}</span>
                            {String(v)}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Original note — collapsed by default */}
                    {note && (
                      <details>
                        <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground select-none transition-colors">
                          View doctor note ↓
                        </summary>
                        <div className="mt-2 rounded-lg bg-secondary/40 px-3.5 py-3 text-sm whitespace-pre-wrap leading-relaxed text-foreground/80 border border-border">
                          {note.raw_text}
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---- Live consultation recording ------------------------------------------

function fmtClock(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function LiveConsultPane({
  patientId,
  doctorId,
  portfolio,
  onSaved,
  onWriteRx,
}: {
  patientId: number;
  doctorId: number | null;
  portfolio: PatientPortfolio;
  onSaved: () => void;
  onWriteRx: () => void;
}) {
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ masked: string; attributes: Record<string, string> } | null>(null);
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [showRxRecorder, setShowRxRecorder] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };
  useEffect(() => () => stopTimer(), []);

  const postAudio = async (blob: Blob, durationSec: number | null) => {
    setProcessing(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("audio", blob, "consultation.webm");
      fd.append("patient_id", String(patientId));
      if (doctorId) fd.append("doctor_id", String(doctorId));
      if (durationSec) fd.append("duration_sec", String(durationSec));
      const res = await fetch("/api/consultations", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);
      setResult({ masked: data.masked, attributes: data.attributes ?? {} });
      onSaved();
    } catch (err: any) {
      setError(err?.message ?? "Failed to process consultation");
    } finally {
      setProcessing(false);
    }
  };

  // ── Demo mode: skip microphone, show dummy data immediately ──────────────────
  const startRecording = () => {
    setError(null);
    setResult(null);
    setRecording(true);
    setPaused(false);
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
  };

  const pauseRecording = () => { setPaused(true); stopTimer(); };
  const resumeRecording = () => {
    setPaused(false);
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
  };
  const endRecording = () => {
    stopTimer();
    setRecording(false);
    setPaused(false);
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      setResult({
        masked: `So [person], looking at your scalp today — I can clearly see the miniaturisation pattern along the frontal and crown zone, which is very typical of androgenic alopecia. You mentioned the shedding started about six months ago, and yes, the family history on your father's side does make this a classic presentation.\n\nI want to start you on a GFC therapy series — that's Growth Factor Concentrate — four sessions, once every three weeks. It's a great option for your stage because we're using your own platelets to stimulate the follicles before they go completely dormant. Alongside that, I'm putting you on Minoxidil 5% solution — one millilitre to the scalp, twice daily, morning and night. You leave it on, don't rinse it off. That's important.\n\nFor your diet, I'm a bit concerned — your iron and protein levels look borderline from the last report. I'd like you to consciously add more lentils, eggs, and spinach. This will complement the treatment significantly.\n\nWe'll do a trichoscopy review in three months to compare follicle density and decide whether to continue the GFC series. If you're consistent with the home protocol, I'm optimistic we'll see meaningful improvement.`,
        attributes: {
          condition: "Androgenic Alopecia",
          hair_loss_duration: "6 months",
          treatment_plan: "PRP × 4 sessions",
          home_protocol: "Minoxidil 5% + Biotin",
          follow_up: "3 months",
        },
      });
      onSaved();
    }, 1200);
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setResult(null); postAudio(f, null); }
    e.target.value = "";
  };

  const submitPaste = async () => {
    if (!pasteText.trim()) return;
    setProcessing(true);
    setError(null);
    try {
      const res = await fetch("/api/consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient_id: patientId, doctor_id: doctorId, transcript: pasteText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);
      setResult({ masked: data.masked, attributes: data.attributes ?? {} });
      setPasteText("");
      setShowPaste(false);
      onSaved();
    } catch (err: any) {
      setError(err?.message ?? "Failed to process transcript");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Consultation recording
            <Badge variant="outline" className="gap-1 text-[10px]">
              <ShieldCheck className="h-3 w-3" /> PII encrypted
            </Badge>
          </CardTitle>
          <CardDescription>
            Record the live doctor–patient conversation. The transcript is generated afterward with
            personal details masked ([person], [phone]…); the original is stored encrypted.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* ── Two circle buttons ── */}
          <div className="flex items-end justify-between gap-4 py-2">

            {/* BIG circle — consultation recording */}
            <div className="flex flex-col items-center gap-2">
              {recording ? (
                /* Active recording state */
                <button
                  onClick={endRecording}
                  className="relative h-20 w-20 rounded-full bg-destructive text-white flex items-center justify-center shadow-lg ring-4 ring-destructive/25 transition-all"
                  title="End recording"
                >
                  <span className={`absolute inset-0 rounded-full bg-destructive/30 ${paused ? "" : "animate-ping"}`} />
                  <Square className="h-7 w-7 relative z-10" />
                </button>
              ) : (
                <button
                  onClick={startRecording}
                  disabled={processing}
                  className={[
                    "h-20 w-20 rounded-full flex items-center justify-center shadow-md transition-all",
                    result
                      ? "bg-muted/40 text-muted-foreground/50 cursor-default"
                      : processing
                      ? "bg-muted/40 text-muted-foreground/50 cursor-default"
                      : "bg-foreground text-background hover:bg-foreground/80 active:scale-95",
                  ].join(" ")}
                  title="Start consultation recording"
                >
                  {processing
                    ? <Loader2 className="h-7 w-7 animate-spin" />
                    : <Mic className="h-7 w-7" />}
                </button>
              )}
              <span className={[
                "text-[11px] font-medium text-center leading-tight max-w-[88px]",
                result ? "text-muted-foreground/50" : "text-muted-foreground",
              ].join(" ")}>
                {recording
                  ? <>{paused ? "Paused" : "Recording"} · {fmtClock(elapsed)}</>
                  : processing
                  ? "Transcribing…"
                  : result
                  ? "Recording done"
                  : "Start recording"}
              </span>
              {/* Pause / resume inline — only when recording */}
              {recording && (
                <button
                  onClick={paused ? resumeRecording : pauseRecording}
                  className="text-[10px] text-muted-foreground underline hover:text-foreground transition-colors"
                >
                  {paused ? "Resume" : "Pause"}
                </button>
              )}
            </div>

            {/* SMALL circle — start prescription */}
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => setShowRxRecorder(v => !v)}
                className={[
                  "h-12 w-12 rounded-full flex items-center justify-center shadow-sm transition-all border",
                  (recording || (!result && !showRxRecorder))
                    ? "bg-muted/20 text-muted-foreground/40 border-border/40 backdrop-blur-sm cursor-default"
                    : showRxRecorder
                    ? "bg-foreground text-background border-transparent hover:bg-foreground/80 active:scale-95"
                    : "bg-foreground text-background border-transparent hover:bg-foreground/80 active:scale-95",
                ].join(" ")}
                title={showRxRecorder ? "Close prescription" : "Start prescription"}
              >
                <Pencil className="h-4 w-4" />
              </button>
              <span className={[
                "text-[11px] font-medium",
                (recording || (!result && !showRxRecorder)) ? "text-muted-foreground/40" : "text-muted-foreground",
              ].join(" ")}>
                {showRxRecorder ? "Close Rx" : "Prescription"}
              </span>
            </div>
          </div>

          {/* Processing indicator */}
          {processing && (
            <div className="flex items-center gap-2 rounded-md border border-accent/30 bg-accent/10 px-4 py-3 text-sm font-medium text-accent">
              <Loader2 className="h-4 w-4 animate-spin" /> Transcribing &amp; extracting data points…
            </div>
          )}

          {/* Demo paste input */}
          {showPaste && !recording && !processing && (
            <div className="space-y-2">
              <Textarea
                rows={4}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="Paste a consultation transcript here (for demos)…"
              />
              <Button size="sm" onClick={submitPaste} disabled={!pasteText.trim()}>
                <Send className="h-4 w-4" /> Process transcript
              </Button>
            </div>
          )}

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Extracted data points */}
          {result && (
            <div className="space-y-4">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                  Data points extracted for cohorts
                </div>
                {Object.keys(result.attributes).length === 0 ? (
                  <div className="text-xs text-muted-foreground">No structured data points detected.</div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(result.attributes).map(([k, v]) => (
                      <Badge key={k} variant="accent" className="text-[11px]">
                        {formatLabel(k)}: {v}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                  Masked transcript
                </div>
                <div className="max-h-64 overflow-auto rounded-md border border-border bg-secondary/20 p-3 text-sm leading-relaxed whitespace-pre-wrap">
                  {result.masked}
                </div>
              </div>
            </div>
          )}

          {/* Prescription form */}
          {showRxRecorder && (
            <div className="border-t border-border pt-3">
              <AddPrescriptionForm
                patient={portfolio.patient}
                weightText={
                  portfolio.attributes.find(a => a.key === "weight_kg")?.value
                    ? `${portfolio.attributes.find(a => a.key === "weight_kg")!.value} kg`
                    : null
                }
                onSaved={() => { setShowRxRecorder(false); onSaved(); }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Known data points + past consultations */}
      {portfolio.attributes.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Known data points</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {portfolio.attributes.map((a) => (
                <Badge key={a.id} variant="outline" className="text-[11px]">
                  {formatLabel(a.key)}: {a.value}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}

// ---- Post-consult chat -----------------------------------------------------

function ConsultPane({ patientId, onSaved }: { patientId: number; onSaved: () => void }) {
  const [history, setHistory] = useState<Array<{ role: "doctor" | "system"; content: any }>>([]);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const generateSampleNote = async () => {
    setGenerating(true);
    try {
      await fetch(`/api/patients/${patientId}/generate-sample-note`, { method: "POST" });
      onSaved();
    } finally {
      setGenerating(false);
    }
  };

  const toggleRecording = async () => {
    if (recording) {
      mediaRecorderRef.current?.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      // Pick a supported mime type
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "";
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (audioChunksRef.current.length === 0) {
          alert("No audio was captured. Please allow microphone access and try again.");
          setTranscribing(false);
          return;
        }
        const blob = new Blob(audioChunksRef.current, { type: mr.mimeType || "audio/webm" });
        setTranscribing(true);
        try {
          const fd = new FormData();
          fd.append("audio", blob, "recording.webm");
          const res = await fetch("/api/transcribe", { method: "POST", body: fd });
          if (!res.ok) throw new Error(`Server error: ${res.status}`);
          const data = await res.json();
          if (data.error) throw new Error(data.error);
          if (data.transcript) setNote(n => n + (n ? " " : "") + data.transcript);
        } catch (err: any) {
          alert("Transcription failed: " + (err?.message ?? "unknown error"));
        } finally {
          setTranscribing(false);
        }
      };
      mediaRecorderRef.current = mr;
      mr.start(500); // collect chunks every 500ms
      setRecording(true);
    } catch {
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const send = () => {
    if (!note.trim()) return;
    const text = note.trim();
    setNote("");
    setHistory((h) => [...h, { role: "doctor", content: text }]);
    start(async () => {
      const res = await fetch("/api/tags/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient_id: patientId, note: text }),
      });
      const data = await res.json();
      setHistory((h) => [...h, { role: "system", content: data.saved }]);
      onSaved();
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Post-consultation capture (optional)</CardTitle>
        <CardDescription>
          Dump observations in your own words — barrier, acne status, recommended next steps, product
          adherence, anything off. The system extracts structured tags and only persists the compressed
          JSON downstream. The chat itself is ephemeral.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-3">
          {history.length === 0 ? (
            <div className="rounded-md border border-dashed border-border bg-secondary/40 p-6 text-center text-sm text-muted-foreground">
              Try: "Acne cleared, mild boxcar scars on left cheek, barrier intact, ready for microneedling. Using sunscreen daily."
            </div>
          ) : (
            history.map((msg, i) => (
              <div
                key={i}
                className={`rounded-md p-3 ${
                  msg.role === "doctor"
                    ? "bg-secondary text-foreground ml-8"
                    : "bg-accent/5 border border-accent/30 mr-8"
                }`}
              >
                {msg.role === "doctor" ? (
                  <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                ) : (
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wide text-accent mb-2">
                      Extracted tags — flowing into Cohort Engine
                    </div>
                    <pre className="text-xs whitespace-pre-wrap leading-relaxed">
                      {JSON.stringify(stripIds(msg.content), null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Recording / transcribing status bar */}
        {(recording || transcribing) && (
          <div className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${recording ? "bg-destructive/10 text-destructive border border-destructive/30" : "bg-accent/10 text-accent border border-accent/30"}`}>
            {recording ? (
              <>
                <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                Recording… speak clearly, then click the mic button to stop &amp; transcribe.
              </>
            ) : (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Transcribing…
              </>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Type or paste a note — or hit the mic button to record your voice"
            rows={3}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
            }}
          />
          <div className="flex flex-col gap-2">
            <Button
              onClick={toggleRecording}
              variant={recording ? "destructive" : "outline"}
              size="sm"
              title={recording ? "Stop & transcribe" : transcribing ? "Transcribing…" : "Record voice"}
              disabled={transcribing}
              className={recording ? "animate-pulse" : ""}
            >
              {transcribing ? <Loader2 className="h-4 w-4 animate-spin" /> : recording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Button onClick={send} disabled={pending || !note.trim() || transcribing || recording}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Extract
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-[11px] text-muted-foreground">Mic → speak → mic again → auto-transcribed. Or type and hit ⌘Enter.</div>
          <button
            onClick={generateSampleNote}
            disabled={generating}
            className="flex items-center gap-1.5 text-xs text-accent hover:text-accent/80 border border-accent/30 rounded-md px-2.5 py-1.5 bg-accent/5 hover:bg-accent/10 transition-colors disabled:opacity-50"
          >
            {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            Generate sample note
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

// ---- Unified consult section (new layout) -----------------------------------

function ConsultSection({
  patientId,
  portfolio,
  onConsultSaved,
  onNoteSaved,
}: {
  patientId: number;
  portfolio: PatientPortfolio;
  onConsultSaved: () => void;
  onNoteSaved: () => void;
}) {
  // ── Consultation recording state ──────────────────────────────────────────
  const [recording, setRecording]   = useState(false);
  const [paused, setPaused]         = useState(false);
  const [elapsed, setElapsed]       = useState(0);
  const [processing, setProcessing] = useState(false);
  const [consultResult, setConsultResult] = useState<{ masked: string; attributes: Record<string,string> } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  useEffect(() => () => stopTimer(), []);

  const startRecording = () => {
    setConsultResult(null);
    setRecording(true); setPaused(false); setElapsed(0);
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
  };
  const pauseRecording  = () => { setPaused(true);  stopTimer(); };
  const resumeRecording = () => { setPaused(false); timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000); };
  const endRecording    = () => {
    stopTimer(); setRecording(false); setPaused(false); setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      setConsultResult({
        masked: `So [person], looking at your scalp today — I can clearly see the miniaturisation pattern along the frontal and crown zone, which is very typical of androgenic alopecia. You mentioned the shedding started about six months ago, and yes, the family history on your father's side does make this a classic presentation.\n\nI want to start you on a GFC therapy series — that's Growth Factor Concentrate — four sessions, once every three weeks. It's a great option for your stage because we're using your own platelets to stimulate the follicles before they go completely dormant. Alongside that, I'm putting you on Minoxidil 5% solution — one millilitre to the scalp, twice daily, morning and night. You leave it on, don't rinse it off. That's important.\n\nFor your diet, I'm a bit concerned — your iron and protein levels look borderline from the last report. I'd like you to consciously add more lentils, eggs, and spinach. This will complement the treatment significantly.\n\nWe'll do a trichoscopy review in three months to compare follicle density and decide whether to continue the GFC series. If you're consistent with the home protocol, I'm optimistic we'll see meaningful improvement.`,
        attributes: { condition: "Androgenic Alopecia", hair_loss_duration: "6 months", treatment_plan: "PRP × 4 sessions", home_protocol: "Minoxidil 5% + Biotin", follow_up: "3 months" },
      });
      onConsultSaved();
    }, 1200);
  };

  // ── Post-consult recording state (mirrors consultation recording) ───────────
  const [noteRecording, setNoteRecording]     = useState(false);
  const [notePaused, setNotePaused]           = useState(false);
  const [noteElapsed, setNoteElapsed]         = useState(0);
  const [noteProcessing, setNoteProcessing]   = useState(false);
  const [noteResult, setNoteResult]           = useState<Record<string,string> | null>(null);
  const noteTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopNoteTimer = () => { if (noteTimerRef.current) { clearInterval(noteTimerRef.current); noteTimerRef.current = null; } };
  useEffect(() => () => stopNoteTimer(), []);

  const startNoteRecording = () => {
    setNoteResult(null);
    setNoteRecording(true); setNotePaused(false); setNoteElapsed(0);
    noteTimerRef.current = setInterval(() => setNoteElapsed(e => e + 1), 1000);
  };
  const pauseNoteRecording  = () => { setNotePaused(true);  stopNoteTimer(); };
  const resumeNoteRecording = () => { setNotePaused(false); noteTimerRef.current = setInterval(() => setNoteElapsed(e => e + 1), 1000); };
  const endNoteRecording    = () => {
    stopNoteTimer(); setNoteRecording(false); setNotePaused(false); setNoteProcessing(true);
    setTimeout(() => {
      setNoteProcessing(false);
      setNoteResult({
        acne_status:         "mild hormonal — jawline, reducing",
        barrier_status:      "intact post-peel, no sensitivity",
        pigmentation_score:  "down ~14% from baseline",
        treatment_response:  "positive — phase 2 tolerated well",
        next_recommendation: "microneedling for residual scarring",
        sun_protection:      "compliant — SPF 50 daily",
        lifestyle_notes:     "diet improved, stress elevated",
      });
      onNoteSaved();
    }, 900);
  };

  // ── Prescription state ────────────────────────────────────────────────────
  const [showRx, setShowRx] = useState(false);
  const rxActive = consultResult !== null || showRx;

  const weightText = portfolio.attributes.find(a => a.key === "weight_kg")?.value
    ? `${portfolio.attributes.find(a => a.key === "weight_kg")!.value} kg` : null;

  return (
    <Card>
      <CardContent className="pt-6 space-y-6">

        {/* ── 1. BIG CIRCLE — consultation recording, centered ── */}
        <div className="flex flex-col items-center gap-2 py-4">
          {recording ? (
            <button onClick={endRecording}
              className="relative h-24 w-24 rounded-full bg-destructive text-white flex items-center justify-center shadow-lg ring-4 ring-destructive/25">
              <span className={`absolute inset-0 rounded-full bg-destructive/30 ${paused ? "" : "animate-ping"}`} />
              <Square className="h-8 w-8 relative z-10" />
            </button>
          ) : (
            <button onClick={startRecording} disabled={processing}
              className={["h-24 w-24 rounded-full flex items-center justify-center shadow-md transition-all",
                consultResult ? "bg-muted/40 text-muted-foreground/50 cursor-default"
                : processing  ? "bg-muted/40 text-muted-foreground/50 cursor-default"
                : "bg-foreground text-background hover:bg-foreground/80 active:scale-95"].join(" ")}>
              {processing ? <Loader2 className="h-8 w-8 animate-spin" /> : <Mic className="h-8 w-8" />}
            </button>
          )}
          <span className={["text-xs font-medium", consultResult ? "text-muted-foreground/50" : "text-muted-foreground"].join(" ")}>
            {recording ? <>{paused ? "Paused" : "Recording"} · {fmtClock(elapsed)}</> : processing ? "Transcribing…" : consultResult ? "Recording done" : "Start consultation recording"}
          </span>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="gap-1 text-[10px]">
              <ShieldCheck className="h-3 w-3" /> PII encrypted
            </Badge>
            {recording && (
              <button onClick={paused ? resumeRecording : pauseRecording}
                className="text-[10px] text-muted-foreground underline hover:text-foreground">
                {paused ? "Resume" : "Pause"}
              </button>
            )}
          </div>
        </div>

        {/* ── 2. TWO SMALL CIRCLES ── */}
        <div className="flex items-start justify-between border-t border-b border-border py-5 px-6">

          {/* LEFT: Post-consultation recording */}
          <div className="flex flex-col items-center gap-2.5">
            {noteRecording ? (
              <button onClick={endNoteRecording}
                className="relative h-16 w-16 rounded-full bg-destructive text-white flex items-center justify-center shadow-md">
                <span className={`absolute inset-0 rounded-full bg-destructive/30 ${notePaused ? "" : "animate-ping"}`} />
                <Square className="h-5 w-5 relative z-10" />
              </button>
            ) : (
              <button onClick={startNoteRecording} disabled={noteProcessing}
                className={["h-16 w-16 rounded-full flex items-center justify-center shadow-md transition-all",
                  noteResult  ? "bg-zinc-400 text-white cursor-default"
                  : noteProcessing ? "bg-zinc-400 text-white cursor-default"
                  : "bg-zinc-700 text-white hover:bg-zinc-600 active:scale-95"].join(" ")}>
                {noteProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <MicOff className="h-5 w-5" />}
              </button>
            )}
            <span className="text-xs font-medium text-foreground">
              {noteRecording ? <>{notePaused ? "Paused" : "Recording"} · {fmtClock(noteElapsed)}</>
                : noteProcessing ? "Processing…"
                : noteResult ? "Capture done"
                : "Post-consult"}
            </span>
            {noteRecording && (
              <button onClick={notePaused ? resumeNoteRecording : pauseNoteRecording}
                className="text-[10px] text-muted-foreground underline hover:text-foreground">
                {notePaused ? "Resume" : "Pause"}
              </button>
            )}
          </div>

          {/* RIGHT: Prescription */}
          <div className="flex flex-col items-center gap-2.5">
            <button
              onClick={() => setShowRx(v => !v)}
              className={["h-16 w-16 rounded-full flex items-center justify-center shadow-md transition-all",
                !rxActive
                  ? "bg-zinc-300 text-zinc-500 cursor-default"
                  : showRx
                  ? "bg-foreground text-background hover:bg-foreground/80 active:scale-95"
                  : "bg-zinc-700 text-white hover:bg-zinc-600 active:scale-95",
              ].join(" ")}
            >
              <Pencil className="h-5 w-5" />
            </button>
            <span className={["text-xs font-medium", !rxActive ? "text-zinc-400" : "text-foreground"].join(" ")}>
              {showRx ? "Close Rx" : "Prescription"}
            </span>
          </div>
        </div>

        {/* ── 3. Consultation results — collapsed in accordion ── */}
        {processing && (
          <div className="flex items-center gap-2 rounded-md border border-accent/30 bg-accent/10 px-4 py-3 text-sm font-medium text-accent">
            <Loader2 className="h-4 w-4 animate-spin" /> Transcribing &amp; extracting data points…
          </div>
        )}
        {consultResult && (
          <details className="rounded-lg border border-border overflow-hidden">
            <summary className="flex items-center justify-between px-4 py-3 cursor-pointer bg-secondary/20 hover:bg-secondary/40 transition-colors select-none list-none">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Consultation data points &amp; transcript
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </summary>
            <div className="px-4 py-4 space-y-4">
              {Object.keys(consultResult.attributes).length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Data points extracted for cohorts</div>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(consultResult.attributes).map(([k, v]) => (
                      <Badge key={k} variant="accent" className="text-[11px]">{formatLabel(k)}: {v}</Badge>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Masked transcript</div>
                <div className="max-h-40 overflow-auto rounded-md border border-border bg-secondary/20 p-3 text-sm leading-relaxed whitespace-pre-wrap">
                  {consultResult.masked}
                </div>
              </div>
            </div>
          </details>
        )}

        {/* ── 4. Post-consult results — collapsed in accordion ── */}
        {noteProcessing && (
          <div className="flex items-center gap-2 rounded-md border border-accent/30 bg-accent/10 px-4 py-3 text-sm font-medium text-accent">
            <Loader2 className="h-4 w-4 animate-spin" /> Extracting structured tags…
          </div>
        )}
        {noteResult && (
          <details className="rounded-lg border border-border overflow-hidden">
            <summary className="flex items-center justify-between px-4 py-3 cursor-pointer bg-secondary/20 hover:bg-secondary/40 transition-colors select-none list-none">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Post-consult tags
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </summary>
            <div className="px-4 py-4 flex flex-wrap gap-1.5">
              {Object.entries(noteResult).map(([k, v]) => (
                <Badge key={k} variant="accent" className="text-[11px]">
                  {formatLabel(k)}: {v}
                </Badge>
              ))}
            </div>
          </details>
        )}

        {/* ── 5. Prescription form ── */}
        {showRx && (
          <div className="border-t border-border pt-4">
            <AddPrescriptionForm patient={portfolio.patient} weightText={weightText}
              onSaved={() => { setShowRx(false); onNoteSaved(); }} />
          </div>
        )}

      </CardContent>
    </Card>
  );
}

function stripIds(obj: any) {
  if (!obj || typeof obj !== "object") return obj;
  const { id, patient_id, session_id, ...rest } = obj;
  return rest;
}

// ---- Prescriptions ---------------------------------------------------------

const emptyRow = (): RxRow => ({
  problem: "",
  problem_type: null,
  product: "",
  product_detail: null,
  dosage: "",
  dosage_detail: null,
  cost: null,
});

function PrescriptionsPane({
  portfolio,
  weightText,
  onSaved,
}: {
  portfolio: PatientPortfolio;
  weightText: string | null;
  onSaved: () => void;
}) {
  const [showCustom, setShowCustom] = useState(false);
  const [generating, startGenerate] = useTransition();
  const patient = portfolio.patient;
  const past = portfolio.prescriptions;

  const generate = () => {
    startGenerate(async () => {
      await fetch(`/api/patients/${patient.id}/prescriptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: SAMPLE_RX.items,
          clinical_recommendation: SAMPLE_RX.clinical_recommendation,
          dispensing_fee_inr: SAMPLE_RX.dispensing_fee_inr,
          source_type: "text",
        }),
      });
      onSaved();
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button variant={showCustom ? "secondary" : "ghost"} size="sm" onClick={() => setShowCustom((v) => !v)}>
          {showCustom ? "Cancel" : "Custom"}
        </Button>
        <Button size="sm" onClick={generate} disabled={generating}>
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
          Generate prescription
        </Button>
      </div>

      {showCustom && (
        <AddPrescriptionForm
          patient={patient}
          weightText={weightText}
          onSaved={() => { setShowCustom(false); onSaved(); }}
        />
      )}

      {past.length === 0 ? (
        // No saved prescriptions yet — always show the prescription document.
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Prescription</span>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Print
            </Button>
          </div>
          <PrescriptionDocument patient={patient} items={[]} weightText={weightText} />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="text-sm font-semibold">Past prescriptions ({past.length})</div>
          {past.map((rx: any) => (
            <div key={rx.id} className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{rx.created_at}</span>
                {rx.source_type && rx.source_type !== "text" && (
                  <Badge variant="outline" className="capitalize">{rx.source_type}</Badge>
                )}
              </div>
              {rx.image_path ? (
                <Card>
                  <CardContent className="p-5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/${rx.image_path}`}
                      alt="Prescription scan"
                      className="max-h-64 rounded-md border border-border object-contain"
                    />
                    {rx.regimen_notes && (
                      <div className="mt-3 text-sm italic text-muted-foreground">{rx.regimen_notes}</div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <PrescriptionDocument
                  patient={patient}
                  clinicalRecommendation={rx.clinical_recommendation ?? rx.regimen_notes}
                  items={rx.items ?? []}
                  dispensingFeeInr={rx.dispensing_fee_inr}
                  createdAt={rx.created_at}
                  weightText={weightText}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Summary ---------------------------------------------------------------

type VisitSummary = {
  date: string; service: string; doctor: string | null;
  sessionType: string; bullets: string[];
  prescription: string | null; tagLine: string | null;
};

function SummaryPane({ patientId }: { patientId: number }) {
  const [data, setData] = useState<{ narrative: string; visits: VisitSummary[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/patients/${patientId}/summary`, { cache: "no-store" });
      const d = await res.json();
      setData(d);
    } finally {
      setLoading(false);
    }
  };

  const generateSampleNote = async () => {
    setGenerating(true);
    try {
      await fetch(`/api/patients/${patientId}/generate-sample-note`, { method: "POST" });
      await load();
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => { load(); }, [patientId]);

  if (loading) {
    return (
      <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />Generating visit summaries…
      </CardContent></Card>
    );
  }
  if (!data) return null;

  return (
    <div className="space-y-4">
      {/* Overall narrative */}
      {data.narrative && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" />Clinical narrative
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-foreground">{data.narrative}</p>
          </CardContent>
        </Card>
      )}

      {/* Per-visit cards */}
      {data.visits.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No visit history found.</CardContent></Card>
      ) : (
        data.visits.map((v, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">{v.date}</span>
                <Badge variant={v.sessionType === "consultation" ? "outline" : "accent"} className="text-[10px] capitalize">
                  {v.sessionType}
                </Badge>
                <span className="text-sm font-semibold text-foreground">{v.service}</span>
              </div>
              {v.doctor && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {v.doctor.startsWith("Dr") ? v.doctor : `Dr. ${v.doctor}`}
                </p>
              )}
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {/* Clinical tags */}
              {v.tagLine && (
                <div className="rounded-md bg-destructive/5 border border-destructive/20 px-3 py-1.5 text-[11px] text-destructive">
                  {v.tagLine}
                </div>
              )}
              {/* Prescription */}
              {v.prescription && (
                <div className="rounded-md bg-secondary border border-border px-3 py-1.5 text-[11px] text-muted-foreground">
                  Rx: {v.prescription}
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}

      <div className="flex items-center justify-between">
        <button
          onClick={generateSampleNote}
          disabled={generating}
          className="flex items-center gap-1.5 text-xs text-accent hover:text-accent/80 border border-accent/30 rounded-md px-2.5 py-1.5 bg-accent/5 hover:bg-accent/10 transition-colors disabled:opacity-50"
        >
          {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          Generate sample post-consult note
        </button>
        <button onClick={load} className="text-xs text-muted-foreground hover:text-foreground underline">Refresh</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Prescription form — recording-first, identical feel to consultation recorder
// ---------------------------------------------------------------------------

type RxPhase = "idle" | "recording" | "paused" | "parsing" | "review" | "saved";

function AddPrescriptionForm({
  patient,
  weightText,
  onSaved,
}: {
  patient: Patient & { home_branch_name?: string };
  weightText: string | null;
  onSaved: () => void;
}) {
  const [phase, setPhase] = useState<RxPhase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [items, setItems] = useState<RxRow[]>([emptyRow()]);
  const [clinicalRec, setClinicalRec] = useState("");
  const [rxError, setRxError] = useState<string | null>(null);
  const [savedRx, setSavedRx] = useState<any | null>(null);
  const [typeMode, setTypeMode] = useState(false);
  const [pending, start] = useTransition();
  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  // ── Demo mode: skip microphone + API, show dummy Rx immediately ──────────────
  const startRecording = () => {
    setRxError(null);
    setTypeMode(false);
    setElapsed(0);
    setPhase("recording");
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    setTimeout(() => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      setPhase("parsing");
      setTimeout(() => {
        setTranscript(`Alright [person], so based on today's consultation, here is what I am prescribing. First — GFC therapy, Growth Factor Concentrate, four sessions, one every three weeks. This is the in-clinic treatment we discussed, scalp injection, done here at Kaya.\n\nFor the home protocol — Minoxidil 5% solution, apply one millilitre directly to the scalp twice daily, morning and night. Do not rinse it off for at least four hours. This is very important, don't skip it. Next — Biotin 5000 mcg, one tablet every night at bedtime with your dinner. And the Anti Hair-Fall Serum — ten drops massaged into the scalp every morning, before you step out.\n\nI also want you on SPF 50 sunscreen every single morning — not optional, it protects the scalp during the treatment phase.\n\nPlease come back in six weeks and we'll do a quick density check to see how the follicles are responding. Any questions before you go?`);
        setItems([
          { problem: "Androgenic Alopecia", problem_type: "chronic", product: "GFC Therapy (Growth Factor Concentrate)", product_detail: "In-clinic procedure · scalp injection", dosage: "1 session every 3 weeks · 4 sessions", dosage_detail: "Platelet-rich growth factors — standard scalp protocol", cost: null },
          { problem: "Androgenic Alopecia", problem_type: "chronic", product: "Minoxidil 5% Solution", product_detail: "60 ml · topical", dosage: "Apply 1 ml to scalp twice daily", dosage_detail: "Morning and night; leave on, do not rinse", cost: null },
          { problem: "Hair thinning & follicle support", problem_type: "chronic", product: "Biotin 5000 mcg", product_detail: "30 tablets", dosage: "One tablet daily at bedtime", dosage_detail: "Take with water after dinner", cost: null },
          { problem: "Scalp nourishment", problem_type: null, product: "Anti Hair-Fall Serum", product_detail: "50 ml", dosage: "10 drops to scalp, massage gently", dosage_detail: "Morning only; no rinse required", cost: null },
          { problem: "Sun protection", problem_type: null, product: "Kaya Daily Shield SPF 50", product_detail: "50 ml", dosage: "Apply generously every morning", dosage_detail: "Reapply every 2 hours outdoors", cost: null },
        ]);
        setClinicalRec("Starting GFC therapy series of 4 sessions alongside home protocol. Consistent Minoxidil application is critical — do not skip doses. Biotin supports follicle health over 3–6 months. Avoid heat styling and tight hairstyles. Use a sulphate-free shampoo. Follow up in 6 weeks to assess hair density.");
        setPhase("review");
      }, 800);
    }, 1500);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so the same file can be re-selected if needed
    e.target.value = "";
    setRxError(null);
    setPhase("parsing");
    try {
      const fd = new FormData();
      fd.append("audio", file, file.name);
      const txRes = await fetch("/api/transcribe", { method: "POST", body: fd });
      const txData = await txRes.json();
      const text: string = txData.transcript ?? "";
      setTranscript(text);
      if (!text.trim()) { setRxError("No speech detected in the file — try again."); setPhase("idle"); return; }
      const parseRes = await fetch("/api/prescriptions/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voice_text: text }),
      });
      const parseData = await parseRes.json();
      setItems(Array.isArray(parseData.items) && parseData.items.length > 0 ? parseData.items : [emptyRow()]);
      if (parseData.clinical_recommendation) setClinicalRec(parseData.clinical_recommendation);
      setPhase("review");
    } catch (err: any) {
      setRxError(err?.message ?? "File processing failed — please try again.");
      setPhase("idle");
    }
  };

  const pauseRecording = () => {
    mrRef.current?.pause();
    setPhase("paused");
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };
  const resumeRecording = () => {
    mrRef.current?.resume();
    setPhase("recording");
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
  };
  const endRecording = () => { mrRef.current?.stop(); };

  const updateItem = (i: number, field: keyof RxRow, val: any) =>
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: val } : it));

  const save = () => {
    start(async () => {
      const res = await fetch(`/api/patients/${patient.id}/prescriptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.filter(it => it.product.trim()),
          clinical_recommendation: clinicalRec || null,
          source_type: "voice",
        }),
      });
      const data = await res.json();
      setSavedRx(data.prescription);
      setPhase("saved");
    });
  };

  const cellCls = "rounded-md border border-input bg-background px-2.5 py-1.5 text-sm w-full";

  // ── Saved ──────────────────────────────────────────────────────────────────
  if (phase === "saved" && savedRx) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-success">
            <span className="h-2 w-2 rounded-full bg-success/50 inline-block" /> Prescription saved
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => {
              setItems(savedRx.items?.length ? savedRx.items : [emptyRow()]);
              setClinicalRec(savedRx.clinical_recommendation ?? "");
              setPhase("review");
            }}>
              <Pencil className="h-4 w-4" /> Edit
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Print
            </Button>
            <Button size="sm" onClick={onSaved}>Done</Button>
          </div>
        </div>
        <PrescriptionDocument
          patient={patient}
          clinicalRecommendation={savedRx.clinical_recommendation}
          items={savedRx.items ?? []}
          dispensingFeeInr={savedRx.dispensing_fee_inr}
          createdAt={savedRx.created_at}
          weightText={weightText}
        />
      </div>
    );
  }

  // ── Item editor (shared between review + type mode) ────────────────────────
  const itemEditor = (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="rounded-md border border-border p-3 space-y-2 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Medicine {i + 1}</span>
            <button onClick={() => setItems(prev => prev.filter((_, idx) => idx !== i))}
              className="text-muted-foreground hover:text-destructive text-lg leading-none px-1">×</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input className={cellCls} placeholder="Problem / Condition" value={it.problem ?? ""}
              onChange={e => updateItem(i, "problem", e.target.value)} />
            <input className={cellCls} placeholder="Medicine / Product name" value={it.product}
              onChange={e => updateItem(i, "product", e.target.value)} />
            <input className={cellCls} placeholder="Dosage (e.g. Apply nightly)" value={it.dosage}
              onChange={e => updateItem(i, "dosage", e.target.value)} />
            <input type="number" className={cellCls} placeholder="Cost ₹ (optional)" value={it.cost ?? ""}
              onChange={e => updateItem(i, "cost", e.target.value === "" ? null : Number(e.target.value))} />
          </div>
        </div>
      ))}
      <Button variant="secondary" size="sm" onClick={() => setItems(prev => [...prev, emptyRow()])}>
        + Add medicine
      </Button>
    </div>
  );

  return (
    <div className="space-y-4">

      {/* ── Idle: entry options ── */}
      {phase === "idle" && !typeMode && (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-secondary/20 py-8 px-4">
          <p className="text-xs text-muted-foreground text-center max-w-xs">
            Speak the prescription naturally — problem, medicine name, dosage, and lifestyle advice.<br />
            <span className="text-foreground/50 not-italic">
              e.g. "Melasma — Hydroquinone 4% cream, thin layer every night. SPF 50 daily."
            </span>
          </p>
          {/* Primary action: record */}
          <Button size="lg" onClick={startRecording} className="gap-2 px-10 text-base h-12">
            <Mic className="h-5 w-5" /> Record Prescription
          </Button>
          {rxError && <p className="text-sm text-destructive text-center">{rxError}</p>}
          {/* Secondary options */}
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <button
              onClick={() => setTypeMode(true)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-2 bg-background hover:bg-secondary transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" /> Type prescription
            </button>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-2 bg-background hover:bg-secondary transition-colors cursor-pointer">
              <Upload className="h-3.5 w-3.5" /> Upload image
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  e.target.value = "";
                  setRxError(null);
                  setPhase("parsing");
                  try {
                    const fd = new FormData();
                    fd.append("image", file, file.name);
                    const res = await fetch(`/api/patients/${patient.id}/prescriptions/image`, { method: "POST", body: fd });
                    if (res.ok) {
                      const data = await res.json();
                      setSavedRx(data.prescription);
                      setPhase("saved");
                    } else {
                      // Fallback: show image preview in type mode
                      const reader = new FileReader();
                      reader.onload = () => {
                        setClinicalRec(`[Image uploaded: ${file.name}]`);
                        setTypeMode(true);
                        setPhase("idle");
                      };
                      reader.readAsDataURL(file);
                    }
                  } catch {
                    setRxError("Image upload failed — try again or type the prescription.");
                    setPhase("idle");
                  }
                }}
              />
            </label>
          </div>
        </div>
      )}

      {/* ── Active recording / paused ── */}
      {(phase === "recording" || phase === "paused") && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3">
          <span className={`h-3 w-3 rounded-full bg-destructive shrink-0 ${phase === "recording" ? "animate-pulse" : ""}`} />
          <span className="text-sm font-medium text-destructive flex-1">
            {phase === "paused" ? "Paused" : "Recording prescription"} · {fmtClock(elapsed)}
          </span>
          <div className="flex gap-2">
            {phase === "paused" ? (
              <Button size="sm" variant="outline" onClick={resumeRecording}>
                <Play className="h-4 w-4" /> Resume
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={pauseRecording}>
                <Pause className="h-4 w-4" /> Pause
              </Button>
            )}
            <Button size="sm" variant="destructive" onClick={endRecording}>
              <Square className="h-4 w-4" /> End
            </Button>
          </div>
        </div>
      )}

      {/* ── Parsing / transcribing ── */}
      {phase === "parsing" && (
        <div className="flex items-center gap-3 rounded-md border border-accent/30 bg-accent/10 px-4 py-3 text-sm font-medium text-accent">
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
          Transcribing &amp; generating prescription…
        </div>
      )}

      {/* ── Type mode ── */}
      {typeMode && phase === "idle" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Type prescription</span>
            <button onClick={() => setTypeMode(false)}
              className="text-xs text-muted-foreground underline hover:text-foreground">
              ← Use recording instead
            </button>
          </div>
          {itemEditor}
          <Button onClick={save} disabled={pending || !items.some(it => it.product.trim())} className="w-full justify-center">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Save &amp; generate prescription
          </Button>
        </div>
      )}

      {/* ── Review parsed rows ── */}
      {phase === "review" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">Review &amp; confirm</span>
            <button onClick={() => { setPhase("idle"); setItems([emptyRow()]); setClinicalRec(""); }}
              className="text-xs text-muted-foreground underline hover:text-foreground">
              ← Re-record
            </button>
          </div>
          {transcript && (
            <details className="rounded-md border border-border">
              <summary className="cursor-pointer px-3 py-2 text-xs text-muted-foreground select-none">
                Show transcript
              </summary>
              <div className="px-3 py-2 text-xs text-foreground/70 bg-secondary/20 whitespace-pre-wrap">{transcript}</div>
            </details>
          )}
          {itemEditor}
          {clinicalRec && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Clinical recommendation
              </div>
              <Textarea value={clinicalRec} onChange={e => setClinicalRec(e.target.value)} rows={2} />
            </div>
          )}
          <Button onClick={save} disabled={pending || !items.some(it => it.product.trim())} className="w-full justify-center">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Save &amp; generate prescription
          </Button>
        </div>
      )}

    </div>
  );
}
