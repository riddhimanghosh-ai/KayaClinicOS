"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { Send, Loader2, Sparkles, ChevronLeft, ChevronRight, MapPin, User, Phone, Calendar, Package, Activity, MessageCircle, Camera, Clock, FileText, Pill } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { inr, formatLabel } from "@/lib/utils";
import type { Patient, PatientPortfolio } from "@/lib/types";
import type { PackageBalance } from "@/lib/db";

export function PatientClient({
  patients,
  initialId,
  initialPortfolio,
  initialBalances,
}: {
  patients: Patient[];
  initialId: number;
  initialPortfolio: PatientPortfolio | null;
  initialBalances: PackageBalance[];
}) {
  const [pid, setPid] = useState<number>(initialId);
  const [portfolio, setPortfolio] = useState<PatientPortfolio | null>(initialPortfolio);
  const [balances, setBalances] = useState<PackageBalance[]>(initialBalances);
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<"home" | "sessions" | "timeline" | "summary" | "prescriptions" | "chat">("home");

  const load = async (id: number) => {
    setLoading(true);
    setPid(id);
    setActiveSection("home");
    try {
      const res = await fetch(`/api/patients/${id}/portfolio`, { cache: "no-store" });
      const data = await res.json();
      setPortfolio(data.portfolio);
      setBalances(data.balances);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="h-12 w-12 rounded-full bg-accent/15 flex items-center justify-center animate-pulse">
          <Sparkles className="h-6 w-6 text-accent" />
        </div>
        <div className="text-sm text-muted-foreground">Loading your profile…</div>
      </div>
    );
  }

  if (!portfolio) {
    return <div className="py-20 text-center text-muted-foreground text-sm">No patient selected.</div>;
  }

  const p = portfolio.patient;
  const customerId = `KYA-${String(p.id).padStart(5, "0")}`;
  const firstName = p.name.split(/\s+/)[0];

  return (
    <div className="max-w-lg mx-auto space-y-0 pb-24">

      {/* ── Profile hero ── */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary to-accent p-5 text-white mb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-2xl font-bold">
              {firstName[0]}
            </div>
            <div>
              <div className="text-lg font-bold leading-tight">{p.name}</div>
              <div className="text-white/70 text-xs mt-0.5">{customerId}</div>
              <Badge className="mt-1.5 bg-white/20 text-white border-white/30 text-[10px]">
                {p.premium_tier?.toUpperCase() ?? "STANDARD"}
              </Badge>
            </div>
          </div>
          {/* Patient switcher */}
          <select
            className="text-xs bg-white/20 text-white border border-white/30 rounded-lg px-2 py-1 max-w-[120px] truncate"
            value={pid}
            onChange={e => load(Number(e.target.value))}
          >
            {patients.map(pt => <option key={pt.id} value={pt.id} className="text-foreground bg-background">{pt.name}</option>)}
          </select>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {p.phone && (
            <div className="flex items-center gap-1.5 text-[11px] text-white/80">
              <Phone className="h-3 w-3 shrink-0" />{p.phone}
            </div>
          )}
          {p.home_branch_name && (
            <div className="flex items-center gap-1.5 text-[11px] text-white/80">
              <MapPin className="h-3 w-3 shrink-0" />{p.home_branch_name}
            </div>
          )}
          {p.city && (
            <div className="flex items-center gap-1.5 text-[11px] text-white/80">
              <User className="h-3 w-3 shrink-0" />{p.city}
            </div>
          )}
        </div>

        {/* Quick stats */}
        <div className="mt-4 grid grid-cols-4 gap-2">
          {[
            { label: "Sessions", value: portfolio.sessions.length, icon: Activity },
            { label: "Packages", value: balances.length, icon: Package },
            { label: "Photos", value: portfolio.photos.length, icon: Camera },
            { label: "Clinics", value: new Set(portfolio.sessions.map(s => s.branch_name)).size, icon: MapPin },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-xl bg-white/10 backdrop-blur p-2 text-center">
              <Icon className="h-3.5 w-3.5 mx-auto mb-1 text-white/70" />
              <div className="text-base font-bold">{value}</div>
              <div className="text-[10px] text-white/60">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Bottom nav ── */}
      <div className="sticky top-14 md:top-0 z-20 bg-background/95 backdrop-blur border-b border-border mb-4 -mx-4 px-4">
        <div className="flex overflow-x-auto gap-1 py-2 no-scrollbar">
          {[
            { id: "home", label: "Overview", icon: Sparkles },
            { id: "sessions", label: "Sessions", icon: Activity },
            { id: "timeline", label: "Timeline", icon: Camera },
            { id: "summary", label: "Summary", icon: FileText },
            { id: "prescriptions", label: "Rx", icon: Pill },
            { id: "chat", label: "Ask Kaya", icon: MessageCircle },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id as any)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
                activeSection === id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />{label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Sections ── */}
      {activeSection === "home" && (
        <HomeSection firstName={firstName} balances={balances} portfolio={portfolio} onNavigate={setActiveSection} />
      )}
      {activeSection === "sessions" && (
        <SessionsSection portfolio={portfolio} />
      )}
      {activeSection === "timeline" && (
        <TimelineSection portfolio={portfolio} />
      )}
      {activeSection === "summary" && (
        <PatientSummarySection patientId={pid} />
      )}
      {activeSection === "prescriptions" && (
        <PrescriptionsSection portfolio={portfolio} />
      )}
      {activeSection === "chat" && (
        <ChatSection portfolio={portfolio} balances={balances} firstName={firstName} />
      )}
    </div>
  );
}

// ── Home / Overview ──────────────────────────────────────────────────────────

function HomeSection({
  firstName, balances, portfolio, onNavigate,
}: {
  firstName: string;
  balances: PackageBalance[];
  portfolio: PatientPortfolio;
  onNavigate: (s: "sessions" | "timeline" | "chat") => void;
}) {
  const totalPaid = balances.reduce((a, b) => a + b.collection_paid_inr, 0);
  const totalUnearned = balances.reduce((a, b) => a + b.unearned_balance_inr, 0);

  return (
    <div className="space-y-4">
      <div className="text-lg font-bold">Hi {firstName} 👋</div>

      {/* Balance banner */}
      {balances.length > 0 && (
        <div className="rounded-2xl border border-accent/30 bg-gradient-to-r from-accent/10 to-primary/5 p-4">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Your balance at a glance</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-2xl font-bold text-accent">{inr(totalUnearned)}</div>
              <div className="text-xs text-muted-foreground">Prepaid balance remaining</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{inr(totalPaid)}</div>
              <div className="text-xs text-muted-foreground">Total invested</div>
            </div>
          </div>
        </div>
      )}

      {/* Package cards */}
      {balances.map(b => {
        const pct = Math.round((b.sessions_used / b.sessions_total) * 100);
        return (
          <Card key={b.id} className="kaya-card overflow-hidden">
            <div className="h-1.5 bg-secondary">
              <div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} />
            </div>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <div className="font-semibold text-sm">{b.service_name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">PKG-{String(b.id).padStart(6,"0")}</div>
                </div>
                <Badge variant={b.sessions_remaining > 0 ? "accent" : "outline"} className="shrink-0">
                  {b.sessions_remaining} left
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-secondary/50 p-2">
                  <div className="text-base font-bold">{b.sessions_used}</div>
                  <div className="text-[10px] text-muted-foreground">Used</div>
                </div>
                <div className="rounded-lg bg-secondary/50 p-2">
                  <div className="text-base font-bold">{b.sessions_total}</div>
                  <div className="text-[10px] text-muted-foreground">Total</div>
                </div>
                <div className="rounded-lg bg-accent/10 p-2">
                  <div className="text-base font-bold text-accent">{inr(b.unearned_balance_inr)}</div>
                  <div className="text-[10px] text-muted-foreground">Balance</div>
                </div>
              </div>
              {b.expiry_date && (
                <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />Expires {b.expiry_date}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Session history", icon: Activity, action: () => onNavigate("sessions") },
          { label: "Skin timeline", icon: Camera, action: () => onNavigate("timeline") },
          { label: "Ask Kaya AI", icon: MessageCircle, action: () => onNavigate("chat") },
        ].map(({ label, icon: Icon, action }) => (
          <button
            key={label}
            onClick={action}
            className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-3 text-center hover:border-accent/40 hover:bg-accent/5 transition-all kaya-card"
          >
            <div className="h-9 w-9 rounded-xl bg-accent/10 flex items-center justify-center">
              <Icon className="h-4 w-4 text-accent" />
            </div>
            <span className="text-[11px] font-medium text-muted-foreground leading-tight">{label}</span>
          </button>
        ))}
      </div>

      {/* Latest doctor note */}
      {portfolio.tags.length > 0 && (() => {
        const t = portfolio.tags[0];
        return (
          <Card className="kaya-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Your latest clinical notes</CardTitle>
              <CardDescription className="text-xs">{t.created_at?.slice(0, 10)}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {t.primary_concern && (
                  <Chip label="Concern" value={formatLabel(t.primary_concern)} />
                )}
                {t.barrier_status && (
                  <Chip label="Barrier" value={formatLabel(t.barrier_status)} />
                )}
                {t.next_recommended_service && (
                  <Chip label="Next step" value={t.next_recommended_service} accent />
                )}
                {t.active_acne_status && (
                  <Chip label="Acne" value={formatLabel(t.active_acne_status)} />
                )}
              </div>
            </CardContent>
          </Card>
        );
      })()}
    </div>
  );
}

function Chip({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl p-2.5 ${accent ? "bg-accent/10 border border-accent/20" : "bg-secondary/60"}`}>
      <div className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-xs font-semibold mt-0.5 ${accent ? "text-accent" : ""}`}>{value}</div>
    </div>
  );
}

// ── Sessions ─────────────────────────────────────────────────────────────────

function SessionsSection({ portfolio }: { portfolio: PatientPortfolio }) {
  const sessions = useMemo(
    () => [...portfolio.sessions].sort((a, b) => b.session_date.localeCompare(a.session_date)),
    [portfolio.sessions]
  );

  const clinics = [...new Set(sessions.map(s => s.branch_name))];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-base font-bold">{sessions.length} sessions across {clinics.length} clinic{clinics.length !== 1 ? "s" : ""}</div>
      </div>

      {/* Clinic breakdown */}
      <div className="flex gap-2 flex-wrap">
        {clinics.map(c => (
          <Badge key={c} variant="outline" className="gap-1.5">
            <MapPin className="h-3 w-3" />{c}
          </Badge>
        ))}
      </div>

      <div className="space-y-2">
        {sessions.map((s, i) => (
          <div key={s.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 kaya-card">
            <div className="h-9 w-9 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
              <Activity className="h-4 w-4 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{s.service_name_snapshot}</div>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />{s.session_date}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />{s.branch_name}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <User className="h-3 w-3" />{s.doctor_name}
                </span>
              </div>
            </div>
            <div className="text-[10px] font-mono text-muted-foreground shrink-0">#{s.id}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Timeline / Before-After ───────────────────────────────────────────────────

function TimelineSection({ portfolio }: { portfolio: PatientPortfolio }) {
  const photos = useMemo(
    () => [...portfolio.photos].sort((a, b) => a.visit_date.localeCompare(b.visit_date)),
    [portfolio.photos]
  );
  const [beforeAfterIdx, setBeforeAfterIdx] = useState(0);

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <div className="h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center">
          <Camera className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="text-sm font-medium">No photos yet</div>
        <div className="text-xs text-muted-foreground max-w-xs">The clinic will start your skin timeline at your next visit.</div>
      </div>
    );
  }

  const first = photos[0];
  const last = photos[photos.length - 1];

  const groupedByDate = useMemo(() => {
    const groups: Record<string, typeof photos> = {};
    photos.forEach(p => { if (!groups[p.visit_date]) groups[p.visit_date] = []; groups[p.visit_date].push(p); });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [photos]);

  return (
    <div className="space-y-5">
      {/* Before & After swipe */}
      {photos.length >= 2 && (
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Before &amp; After</CardTitle>
            <CardDescription className="text-xs">{first.visit_date} → {last.visit_date}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-2 gap-0">
              <div className="relative">
                <img src={`/${first.image_path}`} alt="Before" className="w-full aspect-square object-cover" />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 px-3 py-2">
                  <div className="text-white text-[10px] font-semibold">BEFORE</div>
                  <div className="text-white/70 text-[10px]">{first.visit_date}</div>
                </div>
              </div>
              <div className="relative">
                <img src={`/${last.image_path}`} alt="After" className="w-full aspect-square object-cover" />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 px-3 py-2">
                  <div className="text-white text-[10px] font-semibold">AFTER</div>
                  <div className="text-white/70 text-[10px]">{last.visit_date}</div>
                </div>
              </div>
            </div>
            <div className="px-4 py-3 bg-accent/5 border-t border-accent/20 text-xs text-center text-accent font-medium">
              {groupedByDate.length} visits · {photos.length} photos on file
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chronological timeline */}
      <div>
        <div className="text-sm font-bold mb-3">Your skin journey</div>
        {groupedByDate.map(([visitDate, photosOnDate], gi) => (
          <div key={visitDate} className="relative pl-8 pb-6">
            {/* Timeline spine */}
            {gi < groupedByDate.length - 1 && (
              <div className="absolute left-3.5 top-8 bottom-0 w-px bg-border" />
            )}
            <div className="absolute left-0 top-1 h-7 w-7 rounded-full bg-accent flex items-center justify-center text-white text-[10px] font-bold">
              {gi + 1}
            </div>
            <div className="mb-2">
              <div className="text-sm font-semibold">{visitDate}</div>
              <div className="text-xs text-muted-foreground">{photosOnDate.length} photo{photosOnDate.length !== 1 ? "s" : ""}</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {photosOnDate.map(p => (
                <div key={p.id} className="rounded-xl overflow-hidden border border-border">
                  <img src={`/${p.image_path}`} alt={p.region} className="w-full aspect-square object-cover" />
                  <div className="px-2 py-1.5 text-[10px] text-muted-foreground capitalize">{p.region.replace(/_/g, " ")}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Chat ─────────────────────────────────────────────────────────────────────

type ChatTurn = { role: "user" | "assistant"; content: string };

function ChatSection({ portfolio, balances, firstName }: { portfolio: PatientPortfolio; balances: PackageBalance[]; firstName: string }) {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const send = async () => {
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput("");
    setTurns(t => [...t, { role: "user", content: text }]);
    setLoading(true);
    try {
      const reply = await routeQuery(text, portfolio, balances, turns);
      setTurns(t => [...t, { role: "assistant", content: reply }]);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } finally {
      setLoading(false);
    }
  };

  const SUGGESTIONS = [
    "How many sessions do I have left?",
    "What does my doctor recommend next?",
    "What's my skin concern?",
    "Price of brightening serum?",
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="text-base font-bold">Ask Kaya AI</div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {/* Messages */}
        <div className="min-h-[300px] max-h-[420px] overflow-y-auto p-4 space-y-3">
          {turns.length === 0 ? (
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center shrink-0">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div className="rounded-2xl rounded-tl-sm bg-secondary px-4 py-3 text-sm max-w-[85%]">
                  Hi {firstName}! I'm your Kaya skin assistant. Ask me anything about your treatments, balance, or recommendations.
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pl-11">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => { setInput(s); }}
                    className="text-xs rounded-full border border-border px-3 py-1.5 text-muted-foreground hover:border-accent hover:text-accent hover:bg-accent/5 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            turns.map((t, i) => (
              <div key={i} className={`flex items-end gap-2 ${t.role === "user" ? "flex-row-reverse" : ""}`}>
                {t.role === "assistant" && (
                  <div className="h-7 w-7 rounded-full bg-accent flex items-center justify-center shrink-0 mb-0.5">
                    <Sparkles className="h-3.5 w-3.5 text-white" />
                  </div>
                )}
                <div className={`rounded-2xl px-4 py-3 text-sm max-w-[80%] whitespace-pre-wrap leading-relaxed ${
                  t.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-secondary text-foreground rounded-bl-sm"
                }`}>
                  {t.content}
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex items-end gap-2">
              <div className="h-7 w-7 rounded-full bg-accent flex items-center justify-center shrink-0">
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </div>
              <div className="rounded-2xl rounded-bl-sm bg-secondary px-4 py-3">
                <div className="flex gap-1 items-center h-5">
                  {[0,1,2].map(i => (
                    <div key={i} className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-border p-3 flex gap-2">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") send(); }}
            placeholder="Ask about your skin, balance, prices…"
            disabled={loading}
            className="rounded-full text-sm"
          />
          <Button onClick={send} disabled={loading || !input.trim()} size="sm" className="rounded-full aspect-square p-0 h-9 w-9 shrink-0">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── AI Visit Summary ─────────────────────────────────────────────────────────

type VisitSummary = {
  date: string; service: string; doctor: string | null;
  sessionType: string; bullets: string[];
  prescription: string | null; tagLine: string | null;
};

function PatientSummarySection({ patientId }: { patientId: number }) {
  const [data, setData] = useState<{ narrative: string; visits: VisitSummary[] } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/patients/${patientId}/summary`, { cache: "no-store" })
      .then(r => r.json())
      .then(d => setData(d))
      .finally(() => setLoading(false));
  }, [patientId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
        <div className="text-sm text-muted-foreground">Generating visit summaries…</div>
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="text-base font-bold">Your clinical journey</div>

      {data.narrative && (
        <div className="rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/5 to-primary/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <span className="text-xs font-semibold uppercase tracking-wide text-accent">AI clinical narrative</span>
          </div>
          <p className="text-sm leading-relaxed text-foreground">{data.narrative}</p>
        </div>
      )}

      {data.visits.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground">No visit history yet.</div>
      ) : (
        data.visits.map((v, i) => (
          <Card key={i} className="kaya-card">
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">{v.date}</span>
                <Badge variant={v.sessionType === "consultation" ? "outline" : "accent"} className="text-[10px] capitalize">
                  {v.sessionType}
                </Badge>
                <span className="text-sm font-semibold">{v.service}</span>
              </div>
              {v.doctor && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {v.doctor.startsWith("Dr") ? v.doctor : `Dr. ${v.doctor}`}
                </p>
              )}
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <ul className="space-y-2">
                {v.bullets.map((b, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                    <span className="leading-snug">{b}</span>
                  </li>
                ))}
              </ul>
              {v.tagLine && (
                <div className="rounded-xl bg-rose-50 border border-rose-100 px-3 py-2 text-xs text-rose-700">
                  {v.tagLine}
                </div>
              )}
              {v.prescription && (
                <div className="rounded-xl bg-purple-50 border border-purple-100 px-3 py-2 text-xs text-purple-700">
                  <span className="font-semibold">Rx: </span>{v.prescription}
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

// ── Prescriptions ─────────────────────────────────────────────────────────────

function PrescriptionsSection({ portfolio }: { portfolio: PatientPortfolio }) {
  const rxs = portfolio.prescriptions;

  if (rxs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <div className="h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center">
          <Pill className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="text-sm font-medium">No prescriptions yet</div>
        <div className="text-xs text-muted-foreground max-w-xs">Your doctor will add prescriptions after your consultations.</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-base font-bold">{rxs.length} prescription{rxs.length !== 1 ? "s" : ""} on file</div>
      {rxs.map((rx: any) => (
        <Card key={rx.id} className="kaya-card">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-sm">Prescription</CardTitle>
                <CardDescription className="text-xs">{rx.created_at?.slice(0, 10)}{rx.doctor_name && ` · ${rx.doctor_name.startsWith("Dr") ? rx.doctor_name : `Dr. ${rx.doctor_name}`}`}</CardDescription>
              </div>
              <Badge variant="outline" className="text-[10px] shrink-0">RX-{String(rx.id).padStart(4, "0")}</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {rx.items?.length > 0 && (
              <div className="space-y-2">
                {rx.items.map((item: any, i: number) => (
                  <div key={i} className="rounded-xl bg-purple-50 border border-purple-100 p-3">
                    {item.problem && <div className="text-[10px] font-medium uppercase tracking-wide text-purple-400">{item.problem}</div>}
                    <div className="text-sm font-semibold text-purple-900">{item.product ?? item.name}</div>
                    {(item.product_detail || item.duration_days) && (
                      <div className="text-[10px] text-purple-500 mt-0.5">{item.product_detail ?? `${item.duration_days} days`}</div>
                    )}
                    {(item.dosage || item.instructions) && <div className="text-xs text-purple-700 mt-0.5">{item.dosage ?? item.instructions}</div>}
                    {item.dosage_detail && <div className="text-[10px] text-purple-500 mt-0.5">{item.dosage_detail}</div>}
                  </div>
                ))}
              </div>
            )}
            {rx.regimen_notes && (
              <div className="rounded-xl bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Regimen: </span>{rx.regimen_notes}
              </div>
            )}
            {rx.image_path && (
              <div className="rounded-xl overflow-hidden border border-border">
                <img src={`/${rx.image_path}`} alt="Prescription scan" className="w-full object-cover" />
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

async function routeQuery(
  q: string,
  portfolio: PatientPortfolio,
  balances: PackageBalance[],
  history: { role: string; content: string }[] = []
): Promise<string> {
  const lower = q.toLowerCase();
  const firstName = portfolio.patient.name.split(/\s+/)[0];
  const patientId = portfolio.patient.id;

  // Fast local lookups — no LLM needed
  if (/(session|balance|remaining|left|package|unearned)/.test(lower)) {
    if (!balances.length) return `${firstName}, you don't have any active prepaid packages right now. Visit a clinic to purchase a new package.`;
    const lines = balances.map(b => `• **${b.service_name}** — ${b.sessions_remaining} of ${b.sessions_total} sessions remaining. ${inr(b.unearned_balance_inr)} balance in your favour.`);
    return `Here's your package balance, ${firstName}:\n\n${lines.join("\n")}`;
  }

  if (/(price|cost|how much|₹|rupee)/.test(lower)) {
    const tokens = q.split(/\s+/).filter(w => w.length > 3 && !["price","cost","rupees"].includes(w.toLowerCase()));
    const searchQ = tokens.length ? tokens.join(" ") : q;
    const res = await fetch(`/api/catalog/search?q=${encodeURIComponent(searchQ)}`);
    const data = await res.json();
    if (!data.products?.length && !data.services?.length) return "I couldn't find a matching product or service. Could you try a different word?";
    const parts: string[] = [];
    for (const p of (data.products ?? []).slice(0, 4)) parts.push(`• **${p.name}** — ${inr(p.price_inr)}`);
    for (const s of (data.services ?? []).slice(0, 4)) parts.push(`• **${s.name}** (service) — ${inr(s.price_inr)}`);
    return `Here's what I found:\n\n${parts.join("\n")}`;
  }

  // Everything else → Groq AI with full clinical context
  try {
    const res = await fetch(`/api/patients/${patientId}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: q, history }),
    });
    const data = await res.json();
    if (data.reply) return data.reply;
  } catch {}

  return "I'm having trouble connecting right now. Please try again or ask the clinic directly.";
}
