"use client";

import { useEffect, useMemo, useState, useTransition, useRef } from "react";
import Image from "next/image";
import { Loader2, Send, UserRound, Mic, MicOff, Sparkles } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { inr, formatLabel } from "@/lib/utils";
import type { Patient, PatientPortfolio, CheckIn, RawNote } from "@/lib/types";

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
  const [activeTab, setActiveTab] = useState("history");
  const [summaryKey, setSummaryKey] = useState(0);

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
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="timeline">Visual timeline</TabsTrigger>
          <TabsTrigger value="tags">Clinical tags</TabsTrigger>
          <TabsTrigger value="consult">Post-consult capture</TabsTrigger>
          <TabsTrigger value="rx">Prescriptions</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>

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
          <PrescriptionsPane portfolio={portfolio} onSaved={onTagSaved} />
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
  if (photos.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          No photos on file yet.
        </CardContent>
      </Card>
    );
  }
  const first = photos[0];
  const last = photos[photos.length - 1];

  return (
    <div className="space-y-6">
      {photos.length >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Before &amp; After</CardTitle>
            <CardDescription>
              {first.visit_date} → {last.visit_date}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <PhotoTile photo={first} label={`Before · ${first.visit_date}`} />
              <PhotoTile photo={last} label={`After · ${last.visit_date}`} />
            </div>
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
            {photos.map((p) => (
              <PhotoTile key={p.id} photo={p} label={`${p.visit_date} · ${p.region}`} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PhotoTile({ photo, label }: { photo: { image_path: string }; label: string }) {
  return (
    <div className="rounded-md border border-border overflow-hidden bg-card">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/${photo.image_path}`} alt={label} className="w-full aspect-square object-cover" />
      <div className="px-3 py-2 text-xs text-muted-foreground border-t border-border">{label}</div>
    </div>
  );
}

// ---- Tags -----------------------------------------------------------------

function TagsPane({ portfolio }: { portfolio: PatientPortfolio }) {
  if (portfolio.tags.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          No tags yet. Capture a note in the Post-consult capture tab.
        </CardContent>
      </Card>
    );
  }

  // Match each tag entry to the closest raw note by session_id, then by created_at proximity
  const noteForTag = (tagSessionId: number | null, tagCreatedAt: string): RawNote | null => {
    const notes = portfolio.notes ?? [];
    if (tagSessionId) {
      const match = notes.find((n) => n.session_id === tagSessionId);
      if (match) return match;
    }
    // Fall back to closest by timestamp (within 60 seconds)
    const tagMs = new Date(tagCreatedAt).getTime();
    return (
      notes.find((n) => Math.abs(new Date(n.created_at).getTime() - tagMs) < 60_000) ?? null
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Clinical tag history</CardTitle>
        <CardDescription>
          Each entry shows the original doctor note and the structured tags extracted from it. Tags drive the Cohort Engine.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {portfolio.tags.map((t) => {
          let free: Record<string, any> = {};
          try {
            free = t.free_tags_json ? JSON.parse(t.free_tags_json) : {};
          } catch {}
          const note = noteForTag(t.session_id, t.created_at);
          return (
            <div key={t.id} className="rounded-md border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-secondary/40 border-b border-border">
                <span className="text-xs font-medium text-muted-foreground">{t.created_at}</span>
                {t.session_id && (
                  <span className="text-[10px] font-mono text-muted-foreground">session #{t.session_id}</span>
                )}
              </div>
              {note && (
                <details className="border-b border-border">
                  <summary className="cursor-pointer px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground select-none">
                    Doctor note — click to expand
                  </summary>
                  <div className="px-4 py-3 text-sm whitespace-pre-wrap bg-secondary/20 text-foreground/90 leading-relaxed">
                    {note.raw_text}
                  </div>
                </details>
              )}
              <div className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <TagField label="Primary concern" value={formatLabel(t.primary_concern)} />
                  <TagField label="Barrier" value={formatLabel(t.barrier_status)} />
                  <TagField label="Acne" value={formatLabel(t.active_acne_status)} />
                  <TagField label="Scar candidate" value={t.scar_treatment_candidate ? "Yes" : "No"} />
                  <TagField label="Adherence" value={t.product_adherence_score != null ? `${t.product_adherence_score}/10` : null} />
                  <TagField label="Ready for" value={formatLabel(t.treatment_ready_for)} />
                  <TagField label="Next recommended" value={formatLabel(t.next_recommended_service)} />
                </div>
                {Object.keys(free).length > 0 && (
                  <details className="mt-3 text-xs">
                    <summary className="cursor-pointer text-muted-foreground">Free tags</summary>
                    <pre className="mt-2 rounded bg-secondary/60 p-2 overflow-auto">{JSON.stringify(free, null, 2)}</pre>
                  </details>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function TagField({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div>
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-medium">{value ?? "—"}</div>
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

type RxItem = { name: string; instructions: string; duration_days: number };

function PrescriptionsPane({
  portfolio,
  onSaved,
}: {
  portfolio: PatientPortfolio;
  onSaved: () => void;
}) {
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant={showAdd ? "secondary" : "outline"} size="sm" onClick={() => setShowAdd((v) => !v)}>
          {showAdd ? "Cancel" : "+ Add Prescription"}
        </Button>
      </div>

      {showAdd && (
        <AddPrescriptionForm
          patientId={portfolio.patient.id}
          onSaved={() => { setShowAdd(false); onSaved(); }}
        />
      )}

      {portfolio.prescriptions.length === 0 && !showAdd ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No prescriptions on file.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {portfolio.prescriptions.map((rx: any) => (
            <Card key={rx.id}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{rx.created_at}</span>
                    {rx.source_type && rx.source_type !== "text" && (
                      <Badge variant="outline" className="capitalize">{rx.source_type}</Badge>
                    )}
                  </div>
                  {rx.doctor_name && <Badge variant="outline">{rx.doctor_name}</Badge>}
                </div>
                {rx.regimen_notes && (
                  <div className="text-sm mb-3 italic text-muted-foreground">{rx.regimen_notes}</div>
                )}
                {rx.image_path && (
                  <div className="mb-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/${rx.image_path}`}
                      alt="Prescription scan"
                      className="max-h-64 rounded-md border border-border object-contain"
                    />
                  </div>
                )}
                {rx.items?.length > 0 && (
                  <Table>
                    <THead>
                      <TR>
                        <TH>Item</TH>
                        <TH>Instructions</TH>
                        <TH>Days</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {rx.items.map((it: any, i: number) => (
                        <TR key={i}>
                          <TD className="font-medium">{it.name}</TD>
                          <TD className="text-muted-foreground">{it.instructions}</TD>
                          <TD>{it.duration_days}</TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                )}
              </CardContent>
            </Card>
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

type AddMode = "type" | "voice" | "scan";
type VoicePhase = "record" | "parsing" | "review";

function AddPrescriptionForm({ patientId, onSaved }: { patientId: number; onSaved: () => void }) {
  const [mode, setMode] = useState<AddMode>("voice");
  // shared items (used by Type mode and Voice review phase)
  const [items, setItems] = useState<RxItem[]>([{ name: "", instructions: "", duration_days: 0 }]);
  const [regimenNotes, setRegimenNotes] = useState("");
  // voice-specific
  const [voicePhase, setVoicePhase] = useState<VoicePhase>("record");
  const [voiceText, setVoiceText] = useState("");
  const [interimText, setInterimText] = useState("");
  const [recording, setRecording] = useState(false);
  // scan
  const [scanFile, setScanFile] = useState<File | null>(null);
  const [scanPreview, setScanPreview] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [parsing, startParse] = useTransition();
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const switchMode = (m: AddMode) => {
    setMode(m);
    setVoicePhase("record");
    setVoiceText("");
    setInterimText("");
    setRecording(false);
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setItems([{ name: "", instructions: "", duration_days: 0 }]);
  };

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SR) { alert("Speech recognition not supported in this browser. Use Chrome or Safari."); return; }
      const rec = new SR();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-IN";
      rec.onresult = (e: any) => {
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) {
            setVoiceText(t => t + (t ? " " : "") + e.results[i][0].transcript);
            setInterimText("");
          } else {
            interim += e.results[i][0].transcript;
          }
        }
        setInterimText(interim);
      };
      rec.onend = () => { setRecording(false); setInterimText(""); };
      recognitionRef.current = rec;
    }
    if (recording) {
      recognitionRef.current.stop();
      setRecording(false);
    } else {
      recognitionRef.current.start();
      setRecording(true);
    }
  };

  const parseWithAI = () => {
    if (!voiceText.trim()) return;
    recognitionRef.current?.stop();
    setRecording(false);
    startParse(async () => {
      setVoicePhase("parsing");
      const res = await fetch("/api/prescriptions/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voice_text: voiceText }),
      });
      const data = await res.json();
      const parsed: RxItem[] = Array.isArray(data.items) && data.items.length > 0
        ? data.items
        : [{ name: "", instructions: "", duration_days: 0 }];
      setItems(parsed);
      setVoicePhase("review");
    });
  };

  const addItem = () => setItems(prev => [...prev, { name: "", instructions: "", duration_days: 0 }]);
  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof RxItem, val: string | number) =>
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: val } : it));

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setScanFile(f);
    setScanPreview(f ? URL.createObjectURL(f) : null);
  };

  const submit = () => {
    start(async () => {
      if (mode === "scan" && scanFile) {
        const fd = new FormData();
        fd.append("file", scanFile);
        fd.append("regimen_notes", regimenNotes);
        await fetch(`/api/patients/${patientId}/prescriptions`, { method: "POST", body: fd });
      } else {
        await fetch(`/api/patients/${patientId}/prescriptions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: items.filter(it => it.name),
            regimen_notes: regimenNotes || null,
            source_type: mode,
          }),
        });
      }
      onSaved();
    });
  };

  const canSubmit = mode === "scan"
    ? !!scanFile
    : items.some(it => it.name.trim());

  // Shared item editor grid (Type mode + Voice review phase)
  // NOTE: rendered as JSX variable, NOT a component, to preserve input focus across re-renders
  const itemEditorJSX = (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_1fr_72px_28px] gap-2 px-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Item / Medicine</span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Instructions</span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Days</span>
        <span />
      </div>
      {items.map((it, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_72px_28px] gap-2 items-center">
          <input
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            placeholder="e.g. Tretinoin 0.025%"
            value={it.name}
            onChange={e => updateItem(i, "name", e.target.value)}
          />
          <input
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            placeholder="e.g. Apply at night"
            value={it.instructions}
            onChange={e => updateItem(i, "instructions", e.target.value)}
          />
          <input
            type="number"
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            placeholder="30"
            value={it.duration_days || ""}
            onChange={e => updateItem(i, "duration_days", Number(e.target.value))}
          />
          <button onClick={() => removeItem(i)} className="text-muted-foreground hover:text-destructive text-lg leading-none text-center">×</button>
        </div>
      ))}
      <Button variant="secondary" size="sm" onClick={addItem}>+ Add item</Button>
    </div>
  );

  return (
    <Card className="border-accent/30">
      <CardHeader>
        <CardTitle className="text-base">New Prescription</CardTitle>
        <div className="flex gap-2 mt-2">
          {(["voice", "type", "scan"] as AddMode[]).map(m => (
            <button key={m} onClick={() => switchMode(m)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                mode === m ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}>
              {m === "voice" ? "🎙 Voice" : m === "type" ? "⌨ Type" : "📷 Scan"}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* ── VOICE MODE ── */}
        {mode === "voice" && voicePhase === "record" && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Tap the microphone and dictate the prescription naturally.<br />
              e.g. <em>"Tretinoin 0.025 cream, apply once at night, 30 days. Clindamycin gel, apply twice daily, 14 days."</em>
            </p>

            {/* Big mic button */}
            <div className="flex flex-col items-center gap-3 py-4">
              <button
                onClick={toggleRecording}
                className={`flex h-16 w-16 items-center justify-center rounded-full text-white shadow-lg transition-all ${
                  recording
                    ? "bg-destructive scale-110 animate-pulse"
                    : "bg-primary hover:bg-primary/90"
                }`}
              >
                {recording ? <MicOff className="h-7 w-7" /> : <Mic className="h-7 w-7" />}
              </button>
              <span className="text-xs text-muted-foreground">
                {recording ? "Recording… tap to stop" : "Tap to start recording"}
              </span>
            </div>

            {/* Live transcript */}
            {(voiceText || interimText) && (
              <div className="rounded-lg border border-border bg-secondary/30 p-3 text-sm leading-relaxed min-h-[60px]">
                <span>{voiceText}</span>
                {interimText && <span className="text-muted-foreground italic"> {interimText}</span>}
              </div>
            )}
            {voiceText && (
              <div className="flex gap-2">
                <Button onClick={parseWithAI} disabled={parsing} className="flex-1">
                  {parsing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Parse with AI →
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setVoiceText(""); setInterimText(""); }}>
                  Clear
                </Button>
              </div>
            )}
          </div>
        )}

        {mode === "voice" && voicePhase === "parsing" && (
          <div className="flex flex-col items-center gap-3 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
            Parsing prescription with AI…
          </div>
        )}

        {mode === "voice" && voicePhase === "review" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">Review &amp; edit parsed items</p>
              <button
                onClick={() => { setVoicePhase("record"); setVoiceText(""); }}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                ← Re-dictate
              </button>
            </div>
            {/* Transcript reference */}
            <details className="rounded-md border border-border">
              <summary className="cursor-pointer px-3 py-2 text-xs text-muted-foreground select-none">Original transcript</summary>
              <div className="px-3 py-2 text-xs text-foreground/80 bg-secondary/20">{voiceText}</div>
            </details>
            itemEditorJSX
          </div>
        )}

        {/* ── TYPE MODE ── */}
        {mode === "type" && itemEditorJSX}

        {/* ── SCAN MODE ── */}
        {mode === "scan" && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Upload a photo or scan of a paper prescription.</p>
            <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={onFileChange} />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-secondary/30 py-8 text-sm text-muted-foreground hover:border-accent hover:bg-accent/5 transition-colors cursor-pointer"
            >
              <span className="text-2xl">📷</span>
              {scanFile ? scanFile.name : "Tap to choose photo or PDF"}
            </button>
            {scanPreview && (
              <img src={scanPreview} alt="Preview" className="max-h-56 rounded-md border border-border object-contain w-full" />
            )}
            {scanFile && (
              <p className="text-xs text-muted-foreground">{scanFile.name} · {(scanFile.size / 1024).toFixed(1)} KB</p>
            )}
          </div>
        )}

        {/* Regimen notes — all modes */}
        {(mode !== "voice" || voicePhase === "review") && (
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1.5">
              Regimen notes (optional)
            </label>
            <Textarea
              value={regimenNotes}
              onChange={e => setRegimenNotes(e.target.value)}
              placeholder="e.g. Apply sunscreen every morning, retinol only at night"
              rows={2}
            />
          </div>
        )}

        {/* Save button — shown when there's something to save */}
        {(mode !== "voice" || voicePhase === "review") && (
          <Button onClick={submit} disabled={pending || !canSubmit}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Save prescription
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
