"use client";

import { useEffect, useMemo, useState, useTransition, useRef } from "react";
import Image from "next/image";
import { Loader2, Send, UserRound, Mic, MicOff, Sparkles, Upload, Pause, Play, Square, ShieldCheck, Printer } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { inr, formatLabel } from "@/lib/utils";
import { PrescriptionDocument, SAMPLE_RX } from "@/components/prescription-document";
import type { Patient, PatientPortfolio, CheckIn, RawNote, RxRow, Consultation, PatientAttribute, SkinPhoto } from "@/lib/types";

type CheckInLite = CheckIn & { patient_name: string; branch_name: string };

export function DoctorClient({
  patients,
  checkIns,
  initialId,
  initialPortfolio,
}: {
  patients: Patient[];
  checkIns: CheckInLite[];
  initialId: number;
  initialPortfolio: PatientPortfolio | null;
}) {
  const [selectedId, setSelectedId] = useState<number>(initialId);
  const [portfolio, setPortfolio] = useState<PatientPortfolio | null>(initialPortfolio);
  const [loading, setLoading] = useState(false);

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
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Live check-ins</CardTitle>
            <CardDescription>Patients waiting now</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {checkIns.length === 0 ? (
              <div className="text-xs text-muted-foreground">None waiting.</div>
            ) : (
              checkIns.map((ci) => (
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

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">All patients</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Select value={selectedId} onChange={(e) => loadPortfolio(Number(e.target.value))}>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
            <div className="text-xs text-muted-foreground">
              {patients.length} patients across all branches.
            </div>
          </CardContent>
        </Card>
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
          <PortfolioView portfolio={portfolio} onTagSaved={() => refreshPortfolio(portfolio.patient.id)} />
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------

function PortfolioView({
  portfolio,
  onTagSaved,
}: {
  portfolio: PatientPortfolio;
  onTagSaved: () => void;
}) {
  const p = portfolio.patient;
  const [activeTab, setActiveTab] = useState("live");
  const [summaryKey, setSummaryKey] = useState(0);

  const latestSession = portfolio.sessions[0];
  const doctorId: number | null = latestSession?.doctor_id ?? null;
  const weightText = portfolio.attributes.find((a) => a.key === "weight_kg")?.value
    ? `${portfolio.attributes.find((a) => a.key === "weight_kg")!.value} kg`
    : null;

  const handleNoteSaved = () => {
    onTagSaved();
    setSummaryKey(k => k + 1); // force SummaryPane to re-fetch
    setActiveTab("summary");   // auto-switch to Summary tab
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
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-muted-foreground">
                {p.guest_code && <span className="font-mono font-medium text-foreground">{p.guest_code}</span>}
                <span>{p.phone}</span>
                {p.email && <span>{p.email}</span>}
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                {p.gender && <span className="capitalize">{p.gender}</span>}
                {p.marital_status && <span className="capitalize">{p.marital_status}</span>}
                {(p.city || p.state) && <span>{[p.city, p.state].filter(Boolean).join(", ")}</span>}
                {p.dob && <span>DOB {p.dob}</span>}
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
          <TabsTrigger value="live">Consultation</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="timeline">Visual timeline</TabsTrigger>
          <TabsTrigger value="tags">Clinical tags</TabsTrigger>
          <TabsTrigger value="consult">Post-consult capture</TabsTrigger>
          <TabsTrigger value="rx">Prescriptions</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="live">
          <LiveConsultPane
            patientId={p.id}
            doctorId={doctorId}
            portfolio={portfolio}
            onSaved={() => onTagSaved()}
            onWriteRx={() => setActiveTab("rx")}
          />
        </TabsContent>
        <TabsContent value="history">
          <HistoryPane portfolio={portfolio} />
        </TabsContent>
        <TabsContent value="timeline">
          <TimelinePane portfolio={portfolio} />
        </TabsContent>
        <TabsContent value="tags">
          <TagsPane portfolio={portfolio} />
        </TabsContent>
        <TabsContent value="consult">
          <ConsultPane patientId={p.id} onSaved={handleNoteSaved} />
        </TabsContent>
        <TabsContent value="rx">
          <PrescriptionsPane
            portfolio={portfolio}
            weightText={weightText}
            onSaved={onTagSaved}
          />
        </TabsContent>
        <TabsContent value="summary">
          <SummaryPane key={summaryKey} patientId={portfolio.patient.id} />
        </TabsContent>
      </Tabs>
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
      {regionPhotos.length >= 2 && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle>Before &amp; After</CardTitle>
                <CardDescription>
                  {regionPhotos[0].visit_date} → {regionPhotos[regionPhotos.length - 1].visit_date} · drag to compare
                </CardDescription>
              </div>
              {regions.length > 1 && (
                <div className="flex flex-wrap gap-1.5">
                  {regions.map((r) => (
                    <button
                      key={r}
                      onClick={() => setRegion(r)}
                      className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
                        r === activeRegion
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {r.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <BeforeAfterSlider photos={regionPhotos} />
          </CardContent>
        </Card>
      )}

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
            if (t.primary_concern)         chips.push({ label: "Concern",       value: formatLabel(t.primary_concern),         cls: "bg-rose-50 text-rose-700 border-rose-100" });
            if (t.active_acne_status)      chips.push({ label: "Acne",          value: formatLabel(t.active_acne_status),      cls: "bg-orange-50 text-orange-700 border-orange-100" });
            if (t.barrier_status)          chips.push({ label: "Barrier",        value: formatLabel(t.barrier_status),          cls: "bg-blue-50 text-blue-700 border-blue-100" });
            if (t.treatment_ready_for)     chips.push({ label: "Ready for",      value: formatLabel(t.treatment_ready_for),     cls: "bg-emerald-50 text-emerald-700 border-emerald-100" });
            if (t.next_recommended_service)chips.push({ label: "Next",           value: formatLabel(t.next_recommended_service),cls: "bg-violet-50 text-violet-700 border-violet-100" });
            if (t.product_adherence_score != null) chips.push({ label: "Adherence", value: `${t.product_adherence_score}/10`, cls: "bg-amber-50 text-amber-700 border-amber-100" });
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
                          <span key={k} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-600">
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

  const startRecording = async () => {
    setError(null);
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "";
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stopTimer();
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        const dur = elapsed;
        if (chunksRef.current.length === 0) { setError("No audio captured."); return; }
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        await postAudio(blob, dur);
      };
      mediaRecorderRef.current = mr;
      mr.start(1000);
      setElapsed(0);
      setRecording(true);
      setPaused(false);
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } catch {
      setError("Could not access microphone. Check browser permissions, or upload an audio file instead.");
    }
  };

  const pauseRecording = () => {
    mediaRecorderRef.current?.pause();
    setPaused(true);
    stopTimer();
  };
  const resumeRecording = () => {
    mediaRecorderRef.current?.resume();
    setPaused(false);
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
  };
  const endRecording = () => {
    setRecording(false);
    setPaused(false);
    mediaRecorderRef.current?.stop();
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
          {/* Recording status / controls */}
          {recording ? (
            <div className="flex flex-wrap items-center gap-3 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3">
              <span className={`h-3 w-3 rounded-full bg-destructive ${paused ? "" : "animate-pulse"}`} />
              <span className="text-sm font-medium text-destructive">
                {paused ? "Paused" : "Recording"} · {fmtClock(elapsed)}
              </span>
              <div className="ml-auto flex gap-2">
                {paused ? (
                  <Button size="sm" variant="outline" onClick={resumeRecording}>
                    <Play className="h-4 w-4" /> Resume
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={pauseRecording}>
                    <Pause className="h-4 w-4" /> Pause
                  </Button>
                )}
                <Button size="sm" variant="destructive" onClick={endRecording}>
                  <Square className="h-4 w-4" /> End &amp; transcribe
                </Button>
              </div>
            </div>
          ) : processing ? (
            <div className="flex items-center gap-2 rounded-md border border-accent/30 bg-accent/10 px-4 py-3 text-sm font-medium text-accent">
              <Loader2 className="h-4 w-4 animate-spin" /> Transcribing &amp; extracting data points…
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button onClick={startRecording}>
                <Mic className="h-4 w-4" /> Start consultation recording
              </Button>
              <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={onFile} />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4" /> Upload audio file
              </Button>
              <Button variant="ghost" onClick={() => setShowPaste((v) => !v)}>
                Paste transcript
              </Button>
            </div>
          )}

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

          {/* Prescription shortcuts — visible as soon as not actively recording */}
          {!recording && (
            <div className="flex flex-wrap gap-2 border-t border-border pt-3">
              <Button size="sm" onClick={() => setShowRxRecorder(v => !v)}>
                <Mic className="h-4 w-4" />
                {showRxRecorder ? "Close prescription" : "Start prescription"}
              </Button>
              <Button variant="ghost" size="sm" onClick={onWriteRx}>
                Open Rx tab →
              </Button>
            </div>
          )}

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

      {portfolio.consultations.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Past consultations</CardTitle>
            <CardDescription>{portfolio.consultations.length} on file · transcripts masked</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {portfolio.consultations.map((c) => (
              <details key={c.id} className="rounded-md border border-border">
                <summary className="cursor-pointer px-3 py-2 text-xs text-muted-foreground select-none">
                  {c.created_at}{c.duration_sec ? ` · ${fmtClock(c.duration_sec)}` : ""}
                </summary>
                <div className="px-3 py-2 text-sm whitespace-pre-wrap bg-secondary/20 leading-relaxed">
                  {c.transcript_masked}
                </div>
              </details>
            ))}
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
        <CardTitle>Async post-consultation capture</CardTitle>
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
                Transcribing with Groq Whisper…
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
              title={recording ? "Stop & transcribe" : transcribing ? "Transcribing…" : "Record voice (Groq Whisper)"}
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
              {/* AI bullet points */}
              <ul className="space-y-1.5">
                {v.bullets.map((b, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                    <span className="text-foreground leading-snug">{b}</span>
                  </li>
                ))}
              </ul>
              {/* Clinical tags */}
              {v.tagLine && (
                <div className="rounded-md bg-rose-50 border border-rose-100 px-3 py-1.5 text-[11px] text-rose-700">
                  {v.tagLine}
                </div>
              )}
              {/* Prescription */}
              {v.prescription && (
                <div className="rounded-md bg-purple-50 border border-purple-100 px-3 py-1.5 text-[11px] text-purple-700">
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

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const startRecording = async () => {
    setRxError(null);
    setTypeMode(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        stream.getTracks().forEach(t => t.stop());
        if (!chunksRef.current.length) { setRxError("No audio captured — try again."); setPhase("idle"); return; }
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        setPhase("parsing");
        try {
          const fd = new FormData();
          fd.append("audio", blob, "rx.webm");
          const txRes = await fetch("/api/transcribe", { method: "POST", body: fd });
          const txData = await txRes.json();
          const text: string = txData.transcript ?? "";
          setTranscript(text);
          if (!text.trim()) { setRxError("No speech detected — try again."); setPhase("idle"); return; }
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
          setRxError(err?.message ?? "Processing failed — please try again.");
          setPhase("idle");
        }
      };
      mrRef.current = mr;
      mr.start(1000);
      setElapsed(0);
      setPhase("recording");
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } catch {
      setRxError("Could not access microphone — check browser permissions.");
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
          <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
            <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" /> Prescription saved
          </span>
          <div className="flex gap-2">
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

      {/* ── Idle: big record button ── */}
      {phase === "idle" && !typeMode && (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-secondary/20 py-8 px-4">
          <p className="text-xs text-muted-foreground text-center max-w-xs">
            Speak the prescription naturally — problem, medicine name, dosage, and any lifestyle advice.<br />
            <span className="text-foreground/50 not-italic">
              e.g. "Melasma — Hydroquinone 4% cream, thin layer every night. SPF 50 daily."
            </span>
          </p>
          <Button size="lg" onClick={startRecording} className="gap-2 px-10 text-base h-12">
            <Mic className="h-5 w-5" /> Start recording
          </Button>
          {rxError && <p className="text-sm text-destructive text-center">{rxError}</p>}
          <button onClick={() => setTypeMode(true)}
            className="text-xs text-muted-foreground underline hover:text-foreground transition-colors">
            Type manually instead
          </button>
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
