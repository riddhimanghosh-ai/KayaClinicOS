"use client";

import { useState, useTransition } from "react";
import { Activity, Check, X, Plus, Trash2, Loader2, Stethoscope, Tag, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import type { ClinicStatus, ClinicAppliance, ClinicOffer } from "@/lib/types";

type DoctorLite = { id: number; name: string; specialty: string; branch_id: number; branch_name: string };

function Toggle({
  value,
  onChange,
  onLabel,
  offLabel,
  good = "on",
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  onLabel: string;
  offLabel: string;
  good?: "on" | "off";
}) {
  const onIsGood = good === "on";
  return (
    <div className="inline-flex rounded-md border border-border overflow-hidden text-xs font-medium">
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`px-3 py-1.5 transition-colors ${
          value
            ? onIsGood ? "bg-emerald-600 text-white" : "bg-destructive text-white"
            : "bg-background text-muted-foreground hover:bg-secondary"
        }`}
      >
        {onLabel}
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`px-3 py-1.5 transition-colors ${
          !value
            ? onIsGood ? "bg-destructive text-white" : "bg-emerald-600 text-white"
            : "bg-background text-muted-foreground hover:bg-secondary"
        }`}
      >
        {offLabel}
      </button>
    </div>
  );
}

export function ClinicStatusClient({
  statuses: initial,
  doctors,
}: {
  statuses: ClinicStatus[];
  doctors: DoctorLite[];
}) {
  const [statuses, setStatuses] = useState<ClinicStatus[]>(initial);
  const [selectedId, setSelectedId] = useState<number>(initial[0]?.branch_id ?? 0);
  const [saving, startSave] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const idx = statuses.findIndex((s) => s.branch_id === selectedId);
  const s = statuses[idx];
  if (!s) return <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No branches found.</CardContent></Card>;

  const patch = (partial: Partial<ClinicStatus>) =>
    setStatuses((prev) => prev.map((x, i) => (i === idx ? { ...x, ...partial } : x)));

  const patchAppliance = (i: number, partial: Partial<ClinicAppliance>) =>
    patch({ appliances: s.appliances.map((a, j) => (j === i ? { ...a, ...partial } : a)) });
  const addAppliance = () => patch({ appliances: [...s.appliances, { name: "", working: true, note: "" }] });
  const removeAppliance = (i: number) => patch({ appliances: s.appliances.filter((_, j) => j !== i) });

  const patchOffer = (i: number, partial: Partial<ClinicOffer>) =>
    patch({ offers: s.offers.map((o, j) => (j === i ? { ...o, ...partial } : o)) });
  const addOffer = () => patch({ offers: [...s.offers, { title: "", detail: "", discount_pct: null, valid_till: null, active: true }] });
  const removeOffer = (i: number) => patch({ offers: s.offers.filter((_, j) => j !== i) });

  const save = () => {
    startSave(async () => {
      const res = await fetch("/api/manager/clinic-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branch_id: s.branch_id,
          is_open: !!s.is_open,
          status_note: s.status_note,
          on_duty_doctor_id: s.on_duty_doctor_id,
          doctor_on_leave: !!s.doctor_on_leave,
          doctor_leave_note: s.doctor_leave_note,
          appliances: s.appliances.filter((a) => a.name.trim()),
          offers: s.offers.filter((o) => o.title.trim()),
        }),
      });
      const data = await res.json();
      if (data.status) {
        setStatuses((prev) => prev.map((x, i) => (i === idx ? data.status : x)));
        setSavedAt(Date.now());
      }
    });
  };

  const appliancesDown = s.appliances.filter((a) => !a.working).length;
  const activeOffers = s.offers.filter((o) => o.active).length;

  return (
    <div className="space-y-6">
      {/* Branch selector */}
      <div className="flex flex-wrap gap-2">
        {statuses.map((b) => {
          const issue = !b.is_open || b.doctor_on_leave || b.appliances.some((a) => !a.working);
          return (
            <button
              key={b.branch_id}
              onClick={() => setSelectedId(b.branch_id)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                b.branch_id === selectedId
                  ? "border-blue-600 bg-blue-50 text-blue-700 font-medium"
                  : "border-border hover:bg-secondary"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${b.is_open ? (issue ? "bg-amber-500" : "bg-emerald-500") : "bg-destructive"}`} />
              {b.branch_name}
            </button>
          );
        })}
      </div>

      {/* Snapshot */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SnapStat label="Clinic" value={s.is_open ? "Open" : "Closed"} tone={s.is_open ? "good" : "bad"} />
        <SnapStat label="Doctor" value={s.doctor_on_leave ? "On leave" : (s.on_duty_doctor_name ?? "Not set")} tone={s.doctor_on_leave || !s.on_duty_doctor_name ? "bad" : "good"} />
        <SnapStat label="Appliances down" value={String(appliancesDown)} tone={appliancesDown ? "bad" : "good"} />
        <SnapStat label="Active offers" value={String(activeOffers)} tone="neutral" />
      </div>

      {/* Clinic open + doctor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Activity className="h-4 w-4 text-blue-600" /> {s.branch_name} · {s.city}</CardTitle>
          <CardDescription>Manager: {s.manager_name ?? "—"}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium">Clinic open today?</div>
              <div className="text-xs text-muted-foreground">Call center won&apos;t book if marked closed.</div>
            </div>
            <Toggle value={!!s.is_open} onChange={(v) => patch({ is_open: v ? 1 : 0 })} onLabel="Open" offLabel="Closed" good="on" />
          </div>
          <Input
            placeholder="Status note (e.g. open till 6 PM today, closed Sunday for maintenance)"
            value={s.status_note ?? ""}
            onChange={(e) => patch({ status_note: e.target.value })}
          />

          <div className="border-t border-border pt-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-medium"><Stethoscope className="h-4 w-4 text-emerald-600" /> Doctor on duty</div>
              <Toggle value={!s.doctor_on_leave} onChange={(v) => patch({ doctor_on_leave: v ? 0 : 1 })} onLabel="Available" offLabel="On leave" good="on" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                value={s.on_duty_doctor_id ?? ""}
                onChange={(e) => patch({ on_duty_doctor_id: e.target.value ? Number(e.target.value) : null })}
              >
                <option value="">— Select doctor —</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} · {d.specialty}{d.branch_id !== s.branch_id ? ` (${d.branch_name})` : ""}
                  </option>
                ))}
              </Select>
              {!!s.doctor_on_leave && (
                <Input
                  placeholder="Leave note (e.g. back Mon 14 Jul)"
                  value={s.doctor_leave_note ?? ""}
                  onChange={(e) => patch({ doctor_leave_note: e.target.value })}
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appliances */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appliances &amp; facilities</CardTitle>
          <CardDescription>Mark any machine that is down so the call center doesn&apos;t promise that treatment.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {s.appliances.map((a, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 rounded-md border border-border p-2">
              <Input
                className="flex-1 min-w-[160px]"
                placeholder="Appliance name"
                value={a.name}
                onChange={(e) => patchAppliance(i, { name: e.target.value })}
              />
              <Toggle value={a.working} onChange={(v) => patchAppliance(i, { working: v })} onLabel="Working" offLabel="Down" good="on" />
              <Input
                className="flex-1 min-w-[140px]"
                placeholder={a.working ? "Note (optional)" : "What's wrong / ETA?"}
                value={a.note ?? ""}
                onChange={(e) => patchAppliance(i, { note: e.target.value })}
              />
              <button onClick={() => removeAppliance(i)} className="text-muted-foreground hover:text-destructive p-1" title="Remove">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <Button variant="secondary" size="sm" onClick={addAppliance}><Plus className="h-4 w-4" /> Add appliance</Button>
        </CardContent>
      </Card>

      {/* Offers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Tag className="h-4 w-4 text-rose-500" /> Active offers</CardTitle>
          <CardDescription>What promotions the call center can quote right now.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {s.offers.length === 0 && (
            <div className="text-sm text-muted-foreground">No offers published.</div>
          )}
          {s.offers.map((o, i) => (
            <div key={i} className="rounded-md border border-border p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Input className="flex-1" placeholder="Offer title (e.g. Free consultation this week)" value={o.title} onChange={(e) => patchOffer(i, { title: e.target.value })} />
                <Toggle value={o.active} onChange={(v) => patchOffer(i, { active: v })} onLabel="Active" offLabel="Paused" good="on" />
                <button onClick={() => removeOffer(i)} className="text-muted-foreground hover:text-destructive p-1" title="Remove">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <Input placeholder="Detail (e.g. 20% off above ₹5,999)" value={o.detail ?? ""} onChange={(e) => patchOffer(i, { detail: e.target.value })} />
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" placeholder="Discount %" value={o.discount_pct ?? ""} onChange={(e) => patchOffer(i, { discount_pct: e.target.value === "" ? null : Number(e.target.value) })} />
                <Input type="date" placeholder="Valid till" value={o.valid_till ?? ""} onChange={(e) => patchOffer(i, { valid_till: e.target.value || null })} />
              </div>
            </div>
          ))}
          <Button variant="secondary" size="sm" onClick={addOffer}><Plus className="h-4 w-4" /> Add offer</Button>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Publish status
        </Button>
        {savedAt && <span className="flex items-center gap-1 text-xs text-emerald-600"><Check className="h-3 w-3" /> Published — call center updated</span>}
        {s.updated_at && !savedAt && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" /> Last updated {s.updated_at}</span>
        )}
      </div>
    </div>
  );
}

function SnapStat({ label, value, tone }: { label: string; value: string; tone: "good" | "bad" | "neutral" }) {
  const color = tone === "good" ? "text-emerald-600" : tone === "bad" ? "text-destructive" : "text-foreground";
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-lg font-semibold ${color}`}>{value}</div>
    </div>
  );
}
