"use client";

import { useState, useTransition } from "react";
import {
  Loader2, Search, Sparkles, Wand2,
  BarChart3, MessageSquare, Clock,
  AlertCircle, UserX, ChevronDown, ChevronUp, BookmarkCheck, Trash2,
  Send, Edit3, Calendar, Phone,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import type { QueuedMessage } from "@/lib/messaging";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { inr } from "@/lib/utils";
import type { CohortRow } from "@/lib/types";
import type { PendingSessionRow } from "@/app/api/pending-sessions/route";
import type { SavedCohort } from "@/lib/db";

type CohortBundle = {
  meta: { label: string; description: string; defaultDiscountPct: number };
  rows: CohortRow[];
};

const COHORT_EXAMPLES: Record<string, { who: string; scenario: string }> = {
  alpha: {
    who: "Priya S., 28 F · Bandra Branch",
    scenario:
      "Completed her 6-session Acne Peel course 3 weeks ago. Doctor tagged: acne resolved, skin barrier intact, scar treatment candidate. Next step: Microneedling for Scars — 20% off offer to close the upsell.",
  },
  beta: {
    who: "Anjali M., 35 F · CP Branch",
    scenario:
      "Bought Pigmentation Brightening serum 2 months ago. Doctor tagged: deep dermal melasma, ready for Q-Switch Laser Toning. Offer: laser session package at 15% off.",
  },
  missed: {
    who: "Sonal P., 26 F · Bandra Branch",
    scenario:
      "6-session Acne Treatment package — 4 used, 2 remaining. Last session was 22 days ago; ideal frequency is every 2–3 weeks. Reach out to rebook before momentum is lost.",
  },
  followup: {
    who: "Raj M., 38 M · CP Branch",
    scenario:
      "Had Q-Switch Laser Toning 5 days ago. Send a check-in: how is the skin responding? Any redness or irritation? Book next session while treatment is fresh in mind.",
  },
};

export function ManagerClient({
  cohorts,
  initialPending,
  initialSavedCohorts,
}: {
  cohorts: {
    alpha: CohortBundle;
    beta: CohortBundle;
    gap: CohortBundle;
    inactive: CohortBundle;
    missed: CohortBundle;
    followup: CohortBundle;
  };
  initialPending: PendingSessionRow[];
  initialSavedCohorts: SavedCohort[];
}) {
  const [tab, setTab] = useState("alpha");
  const [queuedMessages, setQueuedMessages] = useState<QueuedMessage[]>([]);
  const [queueSummary, setQueueSummary] = useState({ queued: 0, sent: 0 });
  const [queueLoading, setQueueLoading] = useState(false);

  const openWhatsAppQueue = async () => {
    setTab("whatsapp");
    setQueueLoading(true);
    try {
      const res = await fetch("/api/messages/queue", { cache: "no-store" });
      const data = await res.json();
      setQueuedMessages(data.messages ?? []);
      setQueueSummary(data.summary ?? { queued: 0, sent: 0 });
    } finally {
      setQueueLoading(false);
    }
  };
  const [pending, setPending] = useState<PendingSessionRow[]>(initialPending);
  const [showBuilder, setShowBuilder] = useState(false);
  const [customRows, setCustomRows] = useState<CohortRow[]>([]);
  const [savedCohorts, setSavedCohorts] = useState<SavedCohort[]>(initialSavedCohorts);

  const refreshSaved = async () => {
    const res = await fetch("/api/cohorts/saved", { cache: "no-store" });
    const data = await res.json();
    setSavedCohorts(data.cohorts);
  };

  const deleteSaved = async (id: number) => {
    await fetch(`/api/cohorts/saved?id=${id}`, { method: "DELETE" });
    setSavedCohorts(s => s.filter(c => c.id !== id));
  };

  // Dynamic cohort state
  const [gapRows, setGapRows] = useState<CohortRow[]>(cohorts.gap.rows);
  const [gapDays, setGapDays] = useState(60);
  const [inactiveRows, setInactiveRows] = useState<CohortRow[]>(cohorts.inactive.rows);
  const [inactiveDays, setInactiveDays] = useState(90);

  return (
    <div className="space-y-4">
      {/* WhatsApp Queue — floating action button above tabs */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Cohort Engine</div>
        <button
          onClick={openWhatsAppQueue}
          className={[
            "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors shadow-sm",
            tab === "whatsapp"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card border-border hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700",
          ].join(" ")}
        >
          <MessageSquare className="h-4 w-4" />
          WhatsApp Queue
          {queueSummary.queued > 0 && (
            <span className={[
              "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
              tab === "whatsapp" ? "bg-white text-primary" : "bg-primary text-white",
            ].join(" ")}>{queueSummary.queued}</span>
          )}
        </button>
      </div>

      <Tabs value={tab} onValueChange={v => { if (v === "whatsapp") openWhatsAppQueue(); else setTab(v); }}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="alpha" className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />Scar Upsell
            <Badge className="ml-1 h-4 px-1.5 text-[10px]" variant="outline">{cohorts.alpha.rows.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="beta" className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />Q-Switch Upsell
            <Badge className="ml-1 h-4 px-1.5 text-[10px]" variant="outline">{cohorts.beta.rows.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="gap" className="gap-1.5">
            <AlertCircle className="h-3.5 w-3.5" />Re-engage
            <Badge className="ml-1 h-4 px-1.5 text-[10px]" variant={gapRows.length > 0 ? "accent" : "outline"}>{gapRows.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="inactive" className="gap-1.5">
            <UserX className="h-3.5 w-3.5" />Inactive Users
            <Badge className="ml-1 h-4 px-1.5 text-[10px]" variant={inactiveRows.length > 0 ? "accent" : "outline"}>{inactiveRows.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="pending" className="gap-1.5">
            <Clock className="h-3.5 w-3.5" />Pending Sessions
            {pending.length > 0 && (
              <Badge className="ml-1 h-4 px-1.5 text-[10px]" variant="accent">
                {pending.reduce((a, r) => a + r.pending, 0)}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="missed" className="gap-1.5">
            <AlertCircle className="h-3.5 w-3.5" />Missed Session
            <Badge className="ml-1 h-4 px-1.5 text-[10px]" variant={cohorts.missed.rows.length > 0 ? "accent" : "outline"}>{cohorts.missed.rows.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="followup" className="gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />Follow Up
            <Badge className="ml-1 h-4 px-1.5 text-[10px]" variant="outline">{cohorts.followup.rows.length}</Badge>
          </TabsTrigger>
          {savedCohorts.map(sc => (
            <TabsTrigger key={`saved-${sc.id}`} value={`saved-${sc.id}`} className="gap-1.5">
              <BookmarkCheck className="h-3.5 w-3.5" />{sc.label}
              <Badge className="ml-1 h-4 px-1.5 text-[10px]" variant="accent">{sc.patient_count}</Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="alpha">
          <CohortPane bundle={cohorts.alpha} cohort="alpha" onQueued={openWhatsAppQueue} />
        </TabsContent>
        <TabsContent value="beta">
          <CohortPane bundle={cohorts.beta} cohort="beta" onQueued={openWhatsAppQueue} />
        </TabsContent>
        <TabsContent value="gap">
          <GapPane
            rows={gapRows} setRows={setGapRows}
            days={gapDays} setDays={setGapDays}
            meta={cohorts.gap.meta}
            onQueued={openWhatsAppQueue}
          />
        </TabsContent>
        <TabsContent value="inactive">
          <InactivePane
            rows={inactiveRows} setRows={setInactiveRows}
            days={inactiveDays} setDays={setInactiveDays}
            onQueued={openWhatsAppQueue}
          />
        </TabsContent>
        <TabsContent value="pending">
          <PendingSessionsPane rows={pending} onRefresh={async (cat, branchId) => {
            const params = new URLSearchParams();
            if (cat) params.set("category", cat);
            if (branchId) params.set("branch_id", String(branchId));
            const res = await fetch(`/api/pending-sessions?${params}`, { cache: "no-store" });
            const data = await res.json();
            setPending(data.rows);
          }} />
        </TabsContent>
        <TabsContent value="missed">
          <CohortPane bundle={cohorts.missed} cohort="missed" onQueued={openWhatsAppQueue} />
        </TabsContent>
        <TabsContent value="followup">
          <CohortPane bundle={cohorts.followup} cohort="followup" onQueued={openWhatsAppQueue} />
        </TabsContent>
        {savedCohorts.map(sc => (
          <TabsContent key={`saved-${sc.id}`} value={`saved-${sc.id}`}>
            <SavedCohortPane cohort={sc} onDelete={() => { deleteSaved(sc.id); setTab("alpha"); }} onQueued={openWhatsAppQueue} />
          </TabsContent>
        ))}
        <TabsContent value="whatsapp">
          <InlineWhatsAppQueue
            messages={queuedMessages}
            summary={queueSummary}
            loading={queueLoading}
            onRefresh={openWhatsAppQueue}
          />
        </TabsContent>
      </Tabs>

      {/* Custom Builder — full-width expandable section */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <button
          onClick={() => setShowBuilder(v => !v)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-secondary/40 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Wand2 className="h-5 w-5" />
            </div>
            <div className="text-left">
              <div className="text-sm font-semibold">Custom Cohort Builder</div>
              <div className="text-xs text-muted-foreground">Mix clinical tags, purchase history, and branch filters</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {customRows.length > 0 && (
              <Badge variant="accent" className="text-xs">{customRows.length} patients</Badge>
            )}
            {showBuilder ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </div>
        </button>
        {showBuilder && (
          <div className="border-t border-border">
            <CustomBuilder
              rows={customRows}
              setRows={setCustomRows}
              onQueued={openWhatsAppQueue}
              onSaved={async (label, filter, discountPct) => {
                await fetch("/api/cohorts/saved", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ label, filter, discount_pct: discountPct, patient_count: customRows.length }),
                });
                await refreshSaved();
                setShowBuilder(false);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CohortPane (Alpha / Beta)
// ---------------------------------------------------------------------------

function CohortPane({
  bundle, cohort, onQueued, showUnearned,
}: {
  bundle: CohortBundle; cohort: string; onQueued: () => void; showUnearned?: boolean;
}) {
  const [isPending, start] = useTransition();
  const [generated, setGenerated] = useState<Array<{ patient_name: string; message_body: string; discount_code: string }>>([]);

  const queue = () => {
    setGenerated([]);
    start(async () => {
      const res = await fetch("/api/messages/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: bundle.rows }),
      });
      const data = await res.json();
      setGenerated(data.queued.slice(0, 3));
      onQueued();
    });
  };

  const totalUnearned = bundle.rows.reduce((acc, r) => acc + (r.context.unearned_balance_inr ?? 0), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{bundle.meta.label}</CardTitle>
        <CardDescription>{bundle.meta.description}</CardDescription>
        {COHORT_EXAMPLES[cohort] && (
          <div className="mt-2 rounded-md border border-accent/20 bg-accent/5 px-3 py-2 text-xs">
            <span className="font-semibold text-accent">Example match · </span>
            <span className="font-medium">{COHORT_EXAMPLES[cohort].who}</span>
            <span className="text-muted-foreground"> — {COHORT_EXAMPLES[cohort].scenario}</span>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {showUnearned && bundle.rows.length > 0 && (
          <div className="rounded-lg border border-accent/30 bg-accent/5 px-4 py-3 text-sm flex items-center gap-3">
            <BarChart3 className="h-4 w-4 text-accent shrink-0" />
            <span><span className="font-semibold text-accent">{inr(totalUnearned)}</span> of Net Revenue locked in this cohort.</span>
          </div>
        )}
        {bundle.rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-secondary/40 px-4 py-10 text-center text-sm text-muted-foreground">
            No patients currently match this recipe.
          </div>
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Guest Code</TH>
                  <TH>Guest Name</TH>
                  <TH>Phone</TH>
                  <TH className="text-center">Used</TH>
                  <TH className="text-center">Balance</TH>
                  <TH>Last branch availed</TH>
                  <TH>Clinical reason</TH>
                  <TH className="text-right">Discount</TH>
                </TR>
              </THead>
              <TBody>
                {bundle.rows.map((r) => (
                  <TR key={r.patient_id}>
                    <TD className="font-mono text-xs text-muted-foreground">GDRC{String(r.patient_id + 10000)}</TD>
                    <TD className="font-medium">{r.patient_name}</TD>
                    <TD><PhoneCell phone={r.phone} /></TD>
                    <TD className="text-center text-sm text-muted-foreground">{r.context.sessions_used != null ? r.context.sessions_used : "—"}</TD>
                    <TD className="text-center text-sm text-muted-foreground">{r.context.sessions_remaining != null ? r.context.sessions_remaining : "—"}</TD>
                    <TD><Badge variant="outline">{r.branch_name}</Badge></TD>
                    <TD className="max-w-xs text-sm text-muted-foreground">{r.reason}</TD>
                    <TD className="text-right"><Badge variant="accent">{r.suggested_discount_pct}%</Badge></TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <div className="flex items-center gap-3">
              <Button onClick={queue} disabled={isPending}>
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Generate {bundle.rows.length} WhatsApp drafts
              </Button>
              <span className="text-xs text-muted-foreground">Drafts appear in WhatsApp Queue for editing before send.</span>
            </div>
            {generated.length > 0 && (
              <div className="space-y-3 rounded-lg border border-border bg-secondary/30 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Preview · first {generated.length} drafts</div>
                {generated.map((g, i) => (
                  <div key={i} className="rounded-md bg-card p-3 border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium">{g.patient_name}</div>
                      <Badge variant="outline" className="text-[10px] font-mono">{g.discount_code}</Badge>
                    </div>
                    <div className="whitespace-pre-wrap text-sm text-foreground">{g.message_body}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Re-engage pane with configurable days
// ---------------------------------------------------------------------------

function GapPane({
  rows, setRows, days, setDays, meta, onQueued,
}: {
  rows: CohortRow[];
  setRows: (r: CohortRow[]) => void;
  days: number;
  setDays: (d: number) => void;
  meta: CohortBundle["meta"];
  onQueued: () => void;
}) {
  const [isPending, start] = useTransition();
  const [queueing, startQueue] = useTransition();

  const refresh = (d: number) => {
    setDays(d);
    start(async () => {
      const res = await fetch(`/api/cohorts/gap?days=${d}`);
      const data = await res.json();
      setRows(data.rows);
    });
  };

  const queue = () => {
    if (!rows.length) return;
    startQueue(async () => {
      await fetch("/api/messages/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      onQueued();
    });
  };

  const totalUnearned = rows.reduce((acc, r) => acc + (r.context.unearned_balance_inr ?? 0), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{meta.label}</CardTitle>
        <CardDescription>{meta.description}</CardDescription>
        <div className="mt-2 rounded-md border border-accent/20 bg-accent/5 px-3 py-2 text-xs">
          <span className="font-semibold text-accent">Example match · </span>
          <span className="font-medium">Rahul K., 42 M · Bandra Branch</span>
          <span className="text-muted-foreground"> — Paid ₹15,000 for an 8-session Laser Hair Removal package, used only 3. Last visited 130 days ago. ₹7,500 of paid balance still unclaimed — re-engage before it lapses.</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Days filter */}
        <div className="flex flex-wrap items-end gap-4 rounded-lg border border-border bg-secondary/30 px-4 py-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Inactive for at least <span className="text-foreground">{days} days</span>
            </label>
            <input
              type="range" min={30} max={365} step={15} value={days}
              onChange={e => refresh(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>30 days</span><span>6 months</span><span>1 year</span>
            </div>
          </div>
          <div className="flex gap-2">
            {[60, 90, 120, 180].map(d => (
              <button
                key={d}
                onClick={() => refresh(d)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${days === d ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
              >
                {d}d
              </button>
            ))}
          </div>
          {isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>

        {rows.length > 0 && (
          <div className="rounded-lg border border-accent/30 bg-accent/5 px-4 py-3 text-sm flex items-center gap-3">
            <BarChart3 className="h-4 w-4 text-accent shrink-0" />
            <span><span className="font-semibold text-accent">{inr(totalUnearned)}</span> locked in {rows.length} accounts — unused sessions and paid balance.</span>
          </div>
        )}

        {rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-secondary/40 px-4 py-10 text-center text-sm text-muted-foreground">
            No patients inactive for {days}+ days with unused sessions.
          </div>
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Guest Code</TH>
                  <TH>Guest Name</TH>
                  <TH>Phone</TH>
                  <TH className="text-center">Used</TH>
                  <TH className="text-center">Balance</TH>
                  <TH>Last branch availed</TH>
                  <TH>Reason</TH>
                  <TH className="text-right">Unearned</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map(r => (
                  <TR key={`${r.patient_id}-${r.context.package_id}`}>
                    <TD className="font-mono text-xs text-muted-foreground">GDRC{String(r.patient_id + 10000)}</TD>
                    <TD className="font-medium">{r.patient_name}</TD>
                    <TD><PhoneCell phone={r.phone} /></TD>
                    <TD className="text-center text-sm">{r.context.sessions_used ?? "—"}</TD>
                    <TD className="text-center"><Badge variant={r.context.sessions_remaining > 0 ? "accent" : "outline"} className="text-[10px]">{r.context.sessions_remaining ?? "—"}</Badge></TD>
                    <TD><Badge variant="outline">{r.branch_name}</Badge></TD>
                    <TD className="max-w-xs text-sm text-muted-foreground">{r.reason}</TD>
                    <TD className="text-right font-medium text-sm">{inr(r.context.unearned_balance_inr ?? 0)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <div className="flex items-center gap-3">
              <Button onClick={queue} disabled={queueing}>
                {queueing ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                Generate {rows.length} WhatsApp drafts
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Inactive Users pane
// ---------------------------------------------------------------------------

function InactivePane({
  rows, setRows, days, setDays, onQueued,
}: {
  rows: CohortRow[];
  setRows: (r: CohortRow[]) => void;
  days: number;
  setDays: (d: number) => void;
  onQueued: () => void;
}) {
  const [isPending, start] = useTransition();
  const [queueing, startQueue] = useTransition();

  const refresh = (d: number) => {
    setDays(d);
    start(async () => {
      const res = await fetch(`/api/cohorts/inactive?days=${d}`);
      const data = await res.json();
      setRows(data.rows);
    });
  };

  const queue = () => {
    if (!rows.length) return;
    startQueue(async () => {
      await fetch("/api/messages/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      onQueued();
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inactive Users</CardTitle>
        <CardDescription>Patients who haven't visited the clinic in the selected period — regardless of session balance.</CardDescription>
        <div className="mt-2 rounded-md border border-accent/20 bg-accent/5 px-3 py-2 text-xs">
          <span className="font-semibold text-accent">Example match · </span>
          <span className="font-medium">Kavya R., 31 F · Mumbai Branch</span>
          <span className="text-muted-foreground"> — Visited 3× in 2024 for facials and chemical peels. Last seen 100 days ago. Spent ₹28,000 total. No active package, no upcoming appointment.</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Days filter */}
        <div className="flex flex-wrap items-end gap-4 rounded-lg border border-border bg-secondary/30 px-4 py-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              No visit in <span className="text-foreground">{days} days</span>
            </label>
            <input
              type="range" min={30} max={365} step={15} value={days}
              onChange={e => refresh(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>30 days</span><span>6 months</span><span>1 year</span>
            </div>
          </div>
          <div className="flex gap-2">
            {[60, 90, 120, 180].map(d => (
              <button
                key={d}
                onClick={() => refresh(d)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${days === d ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
              >
                {d}d
              </button>
            ))}
          </div>
          {isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>

        {rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-secondary/40 px-4 py-10 text-center text-sm text-muted-foreground">
            No patients inactive for {days}+ days.
          </div>
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Guest Code</TH>
                  <TH>Guest Name</TH>
                  <TH>Phone</TH>
                  <TH>Last branch availed</TH>
                  <TH>Last seen</TH>
                  <TH className="text-right">Total spent</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map(r => (
                  <TR key={r.patient_id}>
                    <TD className="font-mono text-xs text-muted-foreground">GDRC{String(r.patient_id + 10000)}</TD>
                    <TD className="font-medium">{r.patient_name}</TD>
                    <TD><PhoneCell phone={r.phone} /></TD>
                    <TD><Badge variant="outline">{r.branch_name}</Badge></TD>
                    <TD className="text-sm text-amber-600 font-medium">{r.context.days_since_last} days ago</TD>
                    <TD className="text-right font-medium text-sm">{inr(r.context.total_spent ?? 0)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <div className="flex items-center gap-3">
              <Button onClick={queue} disabled={queueing}>
                {queueing ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                Generate {rows.length} re-engagement drafts
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Pending Sessions
// ---------------------------------------------------------------------------

function PendingSessionsPane({
  rows, onRefresh,
}: {
  rows: PendingSessionRow[];
  onRefresh: (cat: string, branchId: number | null) => Promise<void>;
}) {
  const [category, setCategory] = useState("");
  const [branchId, setBranchId] = useState<number | null>(null);
  const [isPending, start] = useTransition();

  const run = () => start(async () => { await onRefresh(category, branchId); });
  const totalPending = rows.reduce((a, r) => a + r.pending, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Pending Sessions</CardTitle>
            <CardDescription>Purchased sessions not yet consumed — mirrors the Power BI Pending Session Report.</CardDescription>
          </div>
          {rows.length > 0 && (
            <div className="rounded-lg border border-accent/30 bg-accent/5 px-4 py-2 text-sm">
              <span className="font-semibold text-accent">{totalPending}</span> total pending sessions
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Service category">
            <Select value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">All</option>
              {["Laser","Peel","Acne","Scar","RF","Facial","IV","Injectable"].map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Branch">
            <Select value={branchId ?? ""} onChange={e => setBranchId(e.target.value === "" ? null : Number(e.target.value))}>
              <option value="">All branches</option>
              <option value={1}>Kaya Bandra (Mumbai)</option>
              <option value={2}>Kaya CP (Delhi)</option>
            </Select>
          </Field>
          <Button onClick={run} disabled={isPending} variant="secondary" size="sm">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}Filter
          </Button>
        </div>
        {rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-secondary/40 px-4 py-8 text-center text-sm text-muted-foreground">
            No pending sessions match the current filters.
          </div>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Guest Code</TH>
                <TH>Branch</TH>
                <TH>Guest Name</TH>
                <TH>Phone</TH>
                <TH>Order #</TH>
                <TH>Service</TH>
                <TH className="text-center">Total</TH>
                <TH className="text-center">Used</TH>
                <TH className="text-center">Pending</TH>
                <TH>Expiry</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map(r => (
                <TR key={`${r.patient_id}-${r.package_id}`}>
                  <TD className="font-mono text-xs text-muted-foreground">GDRC{String(r.patient_id + 10000)}</TD>
                  <TD><Badge variant="outline" className="text-xs">{r.branch_name}</Badge></TD>
                  <TD className="font-medium text-sm">{r.patient_name}</TD>
                  <TD className="text-muted-foreground text-sm">{String((r as any).phone ?? "")}</TD>
                  <TD className="font-mono text-xs text-muted-foreground">PKG-{String(r.package_id).padStart(6,"0")}</TD>
                  <TD className="text-sm">{r.service_name}</TD>
                  <TD className="text-center text-sm">{r.sessions_total}</TD>
                  <TD className="text-center text-sm">{r.sessions_used}</TD>
                  <TD className="text-center">
                    <Badge variant={r.pending > 0 ? "accent" : "outline"} className="text-[10px]">{r.pending}</Badge>
                  </TD>
                  <TD className={`text-sm ${r.expiry_date && r.expiry_date < new Date().toISOString().slice(0,10) ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                    {r.expiry_date ?? "—"}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Custom Builder
// ---------------------------------------------------------------------------

function CustomBuilder({
  rows, setRows, onQueued, onSaved,
}: { rows: CohortRow[]; setRows: (r: CohortRow[]) => void; onQueued: () => void; onSaved: (label: string, filter: Record<string, any>, discountPct: number) => Promise<void> }) {
  const [filter, setFilter] = useState<Record<string, any>>({});
  const [discount, setDiscount] = useState(15);
  const [isPending, start] = useTransition();
  const [queuing, startQueue] = useTransition();
  const [saving, setSaving] = useState(false);

  const setF = (k: string, v: any) => setFilter(p => ({ ...p, [k]: v }));

  const run = () => {
    const payload: Record<string, any> = {};
    for (const [k, v] of Object.entries(filter)) if (v !== "" && v != null) payload[k] = v;
    start(async () => {
      const res = await fetch("/api/cohorts/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filter: payload, discount_pct: discount, label: filter.cohort_label || "custom" }),
      });
      const data = await res.json();
      setRows(data.rows);
    });
  };

  const queue = () => {
    if (!rows.length) return;
    startQueue(async () => {
      await fetch("/api/messages/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      onQueued();
      setRows([]);
    });
  };

  return (
    <div className="p-5 space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <Field label="Primary concern">
          <Select value={filter.primary_concern ?? ""} onChange={e => setF("primary_concern", e.target.value)}>
            <option value="">Any</option>
            <option value="deep_dermal_melasma">Deep Dermal Melasma</option>
            <option value="active_inflammatory_acne">Active Inflammatory Acne</option>
            <option value="post_inflammatory_acne_scarring">Post Inflammatory Acne Scarring</option>
            <option value="periodic_maintenance">Periodic Maintenance</option>
            <option value="general_skin_health">General Skin Health</option>
          </Select>
        </Field>
        <Field label="Barrier status">
          <Select value={filter.barrier_status ?? ""} onChange={e => setF("barrier_status", e.target.value)}>
            <option value="">Any</option>
            <option value="intact">Intact</option>
            <option value="thin">Thin</option>
            <option value="compromised">Compromised</option>
          </Select>
        </Field>
        <Field label="Treatment ready for">
          <Select value={filter.treatment_ready_for ?? ""} onChange={e => setF("treatment_ready_for", e.target.value)}>
            <option value="">Any</option>
            <option value="Q_Switch_Laser">Q-Switch Laser</option>
            <option value="Microneedling">Microneedling</option>
            <option value="Subcision">Subcision</option>
            <option value="Thermage">Thermage</option>
          </Select>
        </Field>
        <Field label="Active acne status">
          <Select value={filter.active_acne_status ?? ""} onChange={e => setF("active_acne_status", e.target.value)}>
            <option value="">Any</option>
            <option value="active">Active</option>
            <option value="resolving">Resolving</option>
            <option value="resolved">Resolved</option>
          </Select>
        </Field>
        <Field label="Scar candidate">
          <Select value={filter.scar_treatment_candidate ?? ""} onChange={e => setF("scar_treatment_candidate", e.target.value === "" ? "" : Number(e.target.value))}>
            <option value="">Any</option>
            <option value={1}>Yes</option>
            <option value={0}>No</option>
          </Select>
        </Field>
        <Field label="Min adherence (0=none, 10=full)">
          <Input type="number" min={0} max={10} value={filter.min_adherence ?? ""} onChange={e => setF("min_adherence", e.target.value === "" ? "" : Number(e.target.value))} />
        </Field>
        <Field label="Bought product category">
          <Select value={filter.purchased_product_category ?? ""} onChange={e => setF("purchased_product_category", e.target.value)}>
            <option value="">Any</option>
            {["Pigmentation","Antioxidant","Sun Care","Acne","Barrier","Anti-Ageing","Exfoliant"].map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Field>
        <Field label="Bought service category">
          <Select value={filter.bought_service_category ?? ""} onChange={e => setF("bought_service_category", e.target.value)}>
            <option value="">Any</option>
            {["Laser","Peel","Acne","Scar","RF","Facial","IV","Injectable"].map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Field>
        <Field label="Branch">
          <Select value={filter.branch_id ?? ""} onChange={e => setF("branch_id", e.target.value === "" ? "" : Number(e.target.value))}>
            <option value="">All branches</option>
            <option value={1}>Kaya Bandra 2 (Mumbai)</option>
            <option value={2}>Kaya Bandra 1 (Mumbai)</option>
          </Select>
        </Field>
        <Field label="Min unearned balance (₹)">
          <Input type="number" min={0} value={filter.min_unearned_balance_inr ?? ""} onChange={e => setF("min_unearned_balance_inr", e.target.value === "" ? "" : Number(e.target.value))} />
        </Field>
        <Field label="Min total collection (₹)">
          <Input type="number" min={0} value={filter.min_total_collection_inr ?? ""} onChange={e => setF("min_total_collection_inr", e.target.value === "" ? "" : Number(e.target.value))} />
        </Field>
        <Field label="Min sessions used">
          <Input type="number" min={0} value={filter.min_sessions_used ?? ""} onChange={e => setF("min_sessions_used", e.target.value === "" ? "" : Number(e.target.value))} placeholder="e.g. 2" />
        </Field>
        <Field label="Max unused sessions">
          <Input type="number" min={0} value={filter.max_sessions_unused ?? ""} onChange={e => setF("max_sessions_unused", e.target.value === "" ? "" : Number(e.target.value))} placeholder="e.g. 3" />
        </Field>
        <Field label="Last visited after">
          <Input type="date" value={filter.last_visited_after ?? ""} onChange={e => setF("last_visited_after", e.target.value || "")} />
        </Field>
        <Field label="Package expiring before">
          <Input type="date" value={filter.expiry_before ?? ""} onChange={e => setF("expiry_before", e.target.value || "")} />
        </Field>
        <Field label="Cohort name (label)">
          <Input type="text" value={filter.cohort_label ?? ""} onChange={e => setF("cohort_label", e.target.value)} placeholder="e.g. VIP Re-engage" />
        </Field>
        <Field label="Upsell service / product">
          <Input type="text" value={filter.upsell_service ?? ""} onChange={e => setF("upsell_service", e.target.value)} placeholder="e.g. Q-Switch Laser Toning" />
        </Field>
        <Field label="Suggested discount %">
          <Input type="number" min={0} max={50} value={discount} onChange={e => setDiscount(Number(e.target.value))} />
        </Field>
      </div>
      <div className="flex items-center gap-3">
        <Button onClick={run} disabled={isPending}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}Run cohort query
        </Button>
        {rows.length > 0 && (
          <>
            <Button onClick={queue} variant="secondary" disabled={queuing}>
              {queuing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Queue {rows.length} drafts
            </Button>
            <Button
              variant="outline"
              disabled={saving || !filter.cohort_label}
              onClick={async () => {
                if (!filter.cohort_label) return;
                setSaving(true);
                try { await onSaved(filter.cohort_label, filter, discount); } finally { setSaving(false); }
              }}
              title={!filter.cohort_label ? "Set a cohort name to save" : "Save as named cohort tab"}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookmarkCheck className="h-4 w-4" />}
              Save cohort
            </Button>
          </>
        )}
      </div>
      {rows.length > 0 && (
        <Table>
          <THead>
            <TR>
              <TH>Guest Code</TH>
              <TH>Guest Name</TH>
              <TH>Phone</TH>
              <TH>Last branch availed</TH>
              <TH>Reason</TH>
              <TH className="text-right">Unearned</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map(r => (
              <TR key={r.patient_id}>
                <TD className="font-mono text-xs text-muted-foreground">GDRC{String(r.patient_id + 10000)}</TD>
                <TD className="font-medium">{r.patient_name}</TD>
                <TD className="text-muted-foreground text-sm">{r.phone}</TD>
                <TD>{r.branch_name}</TD>
                <TD className="text-sm text-muted-foreground max-w-xs">{r.reason}</TD>
                <TD className="text-right">{inr(r.context.unearned_balance_inr ?? 0)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Saved Cohort Pane
// ---------------------------------------------------------------------------

function SavedCohortPane({ cohort, onDelete, onQueued }: { cohort: SavedCohort; onDelete: () => void; onQueued: () => void }) {
  const [rows, setRows] = useState<CohortRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [queuing, startQueue] = useTransition();

  const run = async () => {
    setLoading(true);
    try {
      const filter = JSON.parse(cohort.filter_json);
      const res = await fetch("/api/cohorts/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filter, discount_pct: cohort.discount_pct, label: cohort.label }),
      });
      const data = await res.json();
      setRows(data.rows ?? []);
    } finally {
      setLoading(false);
    }
  };

  const queue = () => {
    if (!rows.length) return;
    startQueue(async () => {
      await fetch("/api/messages/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      onQueued();
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BookmarkCheck className="h-4 w-4 text-accent" />
              {cohort.label}
            </CardTitle>
            {cohort.description && <CardDescription className="mt-1">{cohort.description}</CardDescription>}
            <div className="mt-1 text-xs text-muted-foreground">
              Saved {new Date(cohort.created_at).toLocaleDateString()} · {cohort.patient_count} patients at save time · {cohort.discount_pct}% offer
            </div>
          </div>
          <button onClick={onDelete} className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded" title="Delete saved cohort">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3">
          <Button onClick={run} disabled={loading} size="sm">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            Re-run query
          </Button>
          {rows.length > 0 && (
            <Button onClick={queue} variant="secondary" size="sm" disabled={queuing}>
              {queuing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Queue {rows.length} drafts
            </Button>
          )}
        </div>
        {rows.length > 0 && (
          <Table>
            <THead><TR><TH>Guest Name</TH><TH>Phone</TH><TH>Branch</TH><TH>Reason</TH></TR></THead>
            <TBody>
              {rows.map(r => (
                <TR key={r.patient_id}>
                  <TD className="font-medium">{r.patient_name}</TD>
                  <TD className="text-muted-foreground text-sm">{r.phone}</TD>
                  <TD>{r.branch_name}</TD>
                  <TD className="text-sm text-muted-foreground max-w-xs">{r.reason}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
        {rows.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground">Click "Re-run query" to fetch current patients matching this cohort.</p>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Inline WhatsApp Queue (embedded in cohorts page)
// ---------------------------------------------------------------------------

function InlineWhatsAppQueue({
  messages, summary, loading, onRefresh,
}: {
  messages: QueuedMessage[];
  summary: { queued: number; sent: number };
  loading: boolean;
  onRefresh: () => void;
}) {
  const [filter, setFilter] = useState<"queued" | "sent" | "all">("queued");
  const [isPending, start] = useTransition();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editedBodies, setEditedBodies] = useState<Record<number, string>>({});
  const [scheduledAt, setScheduledAt] = useState<Record<number, string>>({});

  const filtered = filter === "all" ? messages : messages.filter(m => m.status === filter);

  const defaultScheduled = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0);
    return d.toISOString().slice(0, 16);
  };

  const sendOne = (id: number) => {
    start(async () => {
      await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id], edited_body: editedBodies[id], scheduled_at: scheduledAt[id] }),
      });
      setEditingId(null);
      onRefresh();
    });
  };

  const sendAll = () => {
    const ids = filtered.filter(m => m.status === "queued").map(m => m.id);
    if (!ids.length) return;
    start(async () => {
      await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      onRefresh();
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
          <div className="text-sm text-muted-foreground mt-2">Loading queue…</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-accent" />
              WhatsApp Campaign Queue
            </CardTitle>
            <CardDescription>Review, edit and send drafts generated from cohorts. Production connects to Make.com webhook.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="accent">Queued: {summary.queued}</Badge>
            <Badge variant="success">Sent: {summary.sent}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          {(["queued","sent","all"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
          {filter === "queued" && filtered.length > 0 && (
            <Button onClick={sendAll} disabled={isPending} className="ml-auto" size="sm">
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Send all {filtered.length}
            </Button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-secondary/40 px-4 py-10 text-center text-sm text-muted-foreground">
            {summary.queued === 0
              ? "No drafts yet — generate them from one of the cohort tabs above."
              : "Nothing in this view."}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(m => {
              const isEditing = editingId === m.id;
              const body = editedBodies[m.id] ?? m.message_body;
              const sched = scheduledAt[m.id] ?? defaultScheduled();
              return (
                <div key={m.id} className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-border bg-secondary/30">
                    <div>
                      <div className="text-sm font-semibold">{m.patient_name}</div>
                      <a href={`tel:${m.phone}`} className="text-xs text-emerald-600 hover:underline flex items-center gap-1"><Phone className="h-3 w-3" />{m.phone}</a>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="font-mono text-[10px]">{m.discount_code}</Badge>
                      <Badge variant="outline" className="text-[10px]">{m.cohort_name}</Badge>
                      <Badge variant={m.status === "sent" ? "success" : "accent"}>{m.status}</Badge>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    {isEditing ? (
                      <Textarea value={body} onChange={e => setEditedBodies(p => ({ ...p, [m.id]: e.target.value }))} rows={6} className="text-sm font-mono" />
                    ) : (
                      <div className="whitespace-pre-wrap text-sm text-foreground/90 leading-relaxed bg-secondary/20 rounded-lg p-3">{body}</div>
                    )}
                    {m.status === "queued" && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />Send at:
                        </div>
                        <input type="datetime-local" value={sched}
                          onChange={e => setScheduledAt(p => ({ ...p, [m.id]: e.target.value }))}
                          className="text-xs rounded-md border border-input bg-background px-2 py-1 text-foreground" />
                        <div className="flex items-center gap-2 ml-auto">
                          <Button size="sm" variant="outline" onClick={() => {
                            setEditingId(isEditing ? null : m.id);
                            if (!isEditing && !editedBodies[m.id]) setEditedBodies(p => ({ ...p, [m.id]: m.message_body }));
                          }}>
                            <Edit3 className="h-3.5 w-3.5 mr-1" />{isEditing ? "Done" : "Edit"}
                          </Button>
                          <Button size="sm" onClick={() => sendOne(m.id)} disabled={isPending}>
                            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                            {scheduledAt[m.id] ? "Schedule" : "Send now"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function PhoneCell({ phone }: { phone: string }) {
  return (
    <a
      href={`tel:${phone}`}
      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary/50 px-2 py-1 text-xs font-medium text-foreground hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-colors"
      onClick={e => e.stopPropagation()}
    >
      <Phone className="h-3 w-3" />
      {phone}
    </a>
  );
}
