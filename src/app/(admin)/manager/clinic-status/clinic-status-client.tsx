"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Trash2, Plus, CalendarDays, Stethoscope, CheckCircle2, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ClinicStatus } from "@/lib/types";

type DoctorLite = { id: number; name: string; specialty: string; branch_id: number; branch_name: string };
type DoctorBlock  = { id: string; doctorId: number; startDate: string; endDate: string; startTime: string; endTime: string; reason: string };

const LS_KEY = "kaya_doctor_blocks";
function loadBlocks(): DoctorBlock[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? "[]"); } catch { return []; }
}
function saveBlocks(blocks: DoctorBlock[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEY, JSON.stringify(blocks));
}
type ApplianceBlock = { id: string; applianceId: string; startDate: string; endDate: string; reason: string };

// ── helpers ──────────────────────────────────────────────────────────────────

function toYMD(d: Date) { return d.toISOString().slice(0, 10); }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function isoToLocal(ymd: string) { const [y,m,day] = ymd.split("-").map(Number); return new Date(y, m-1, day); }
function uid() { return Math.random().toString(36).slice(2, 9); }

function calendarDays(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const last  = new Date(year, month + 1, 0);
  const days: Date[] = [];
  for (let i = first.getDay(); i > 0; i--) days.push(addDays(first, -i));
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d));
  while (days.length % 7 !== 0) days.push(addDays(last, days.length - (last.getDate() + first.getDay())));
  return days;
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

// ── Seed data ────────────────────────────────────────────────────────────────

function seedDoctorBlocks(doctors: DoctorLite[]): DoctorBlock[] {
  // Prefer persisted blocks
  const persisted = loadBlocks();
  if (persisted.length) return persisted;
  if (!doctors.length) return [];
  const d = (n: number) => toYMD(addDays(new Date(), n));
  const seed = [
    { i: 0, sd: d(2),  ed: d(2),  start: "14:00", end: "18:00", reason: "CME Conference" },
    { i: 0, sd: d(9),  ed: d(10), start: "09:00", end: "13:00", reason: "Half-day leave" },
    { i: 1, sd: d(4),  ed: d(6),  start: "09:00", end: "17:00", reason: "Annual leave" },
    { i: 2, sd: d(7),  ed: d(7),  start: "13:00", end: "17:00", reason: "External clinic duty" },
    { i: 0, sd: d(14), ed: d(14), start: "09:00", end: "17:00", reason: "Workshop — laser certification" },
  ]
    .filter(s => s.i < doctors.length)
    .map(s => ({ id: uid(), doctorId: doctors[s.i].id, startDate: s.sd, endDate: s.ed, startTime: s.start, endTime: s.end, reason: s.reason }));
  saveBlocks(seed);
  return seed;
}

function seedApplianceBlocks(appliances: Array<{ id: string; name: string }>): ApplianceBlock[] {
  if (!appliances.length) return [];
  const d = (n: number) => toYMD(addDays(new Date(), n));
  return [
    { i: 0, start: d(1),  end: d(2),  reason: "Scheduled maintenance" },
    { i: 1, start: d(5),  end: d(5),  reason: "Filter replacement" },
    { i: 2, start: d(3),  end: d(3),  reason: "Deep clean & calibration" },
    { i: 0, start: d(15), end: d(16), reason: "Annual servicing" },
    { i: 3, start: d(8),  end: d(10), reason: "Under repair — cooling unit" },
  ]
    .filter(s => s.i < appliances.length)
    .map(s => ({ id: uid(), applianceId: appliances[s.i].id, startDate: s.start, endDate: s.end, reason: s.reason }));
}

function collectAppliances(statuses: ClinicStatus[]): Array<{ id: string; name: string }> {
  const seen = new Set<string>();
  const result: Array<{ id: string; name: string }> = [];
  for (const s of statuses)
    for (const a of s.appliances)
      if (a.name && !seen.has(a.name.toLowerCase())) {
        seen.add(a.name.toLowerCase());
        result.push({ id: a.name.toLowerCase().replace(/\s+/g, "-"), name: a.name });
      }
  if (!result.length)
    for (const n of ["Laser Machine", "IPL Device", "Hydrafacial Unit", "Consultation Room A"])
      result.push({ id: n.toLowerCase().replace(/\s+/g, "-"), name: n });
  return result;
}

// ── Colors ───────────────────────────────────────────────────────────────────

const DOC_COLORS = [
  { bg: "bg-blue-500",   soft: "bg-blue-50 text-blue-700 border-blue-200",   dot: "bg-blue-500" },
  { bg: "bg-violet-500", soft: "bg-violet-50 text-violet-700 border-violet-200", dot: "bg-violet-500" },
  { bg: "bg-emerald-500",soft: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  { bg: "bg-rose-500",   soft: "bg-rose-50 text-rose-700 border-rose-200",   dot: "bg-rose-500" },
  { bg: "bg-amber-500",  soft: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
];

const APP_COLORS = [
  { bg: "bg-amber-500",  soft: "bg-amber-50 text-amber-700 border-amber-200" },
  { bg: "bg-red-500",    soft: "bg-red-50 text-red-700 border-red-200" },
  { bg: "bg-blue-500",   soft: "bg-blue-50 text-blue-700 border-blue-200" },
  { bg: "bg-violet-500", soft: "bg-violet-50 text-violet-700 border-violet-200" },
  { bg: "bg-teal-500",   soft: "bg-teal-50 text-teal-700 border-teal-200" },
];

// ── Calendar component ────────────────────────────────────────────────────────

function Calendar({
  year, month, onNav, dayContent, onDayClick,
}: {
  year: number;
  month: number;
  onNav: (d: -1 | 1) => void;
  dayContent: (d: Date) => React.ReactNode;
  onDayClick?: (ymd: string) => void;
}) {
  const days  = calendarDays(year, month);
  const today = toYMD(new Date());

  return (
    <div>
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button type="button" onClick={() => onNav(-1)} className="h-8 w-8 flex items-center justify-center rounded-lg border border-border hover:bg-secondary transition-colors">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-base font-semibold">{MONTHS[month]} {year}</span>
        <button type="button" onClick={() => onNav(1)} className="h-8 w-8 flex items-center justify-center rounded-lg border border-border hover:bg-secondary transition-colors">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map(d => (
          <div key={d} className="text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground py-1.5">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-px bg-border rounded-xl overflow-hidden border border-border">
        {days.map((d, i) => {
          const ymd = toYMD(d);
          const inMonth = d.getMonth() === month;
          const isToday = ymd === today;
          const isWeekend = d.getDay() === 0 || d.getDay() === 6;
          return (
            <div
              key={i}
              onClick={() => inMonth && onDayClick?.(ymd)}
              className={[
                "min-h-[80px] p-1.5 text-xs transition-colors",
                inMonth ? (onDayClick ? "cursor-pointer hover:bg-primary/5" : "cursor-default") : "cursor-default",
                !inMonth ? "bg-secondary/30" : isWeekend ? "bg-secondary/20" : "bg-card",
                isToday ? "ring-2 ring-primary ring-inset" : "",
              ].join(" ")}
            >
              <div className={[
                "text-[11px] font-semibold mb-1 w-5 h-5 flex items-center justify-center rounded-full",
                isToday ? "bg-primary text-primary-foreground" : "",
                !inMonth ? "text-muted-foreground/40" : "text-foreground",
              ].join(" ")}>
                {d.getDate()}
              </div>
              {inMonth && dayContent(d)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Doctor Section ────────────────────────────────────────────────────────────

function DoctorSection({ doctors }: { doctors: DoctorLite[] }) {
  const [blocks, setBlocksRaw] = useState<DoctorBlock[]>(() => seedDoctorBlocks(doctors));
  function setBlocks(fn: (prev: DoctorBlock[]) => DoctorBlock[]) {
    setBlocksRaw(prev => { const next = fn(prev); saveBlocks(next); return next; });
  }
  const [calYear, setCalYear]   = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const [formDoctorId, setFormDoctorId] = useState<number>(doctors[0]?.id ?? 0);
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate]     = useState("");
  const [formStart, setFormStart] = useState("09:00");
  const [formEnd, setFormEnd]     = useState("17:00");
  const [formReason, setFormReason] = useState("");
  const [highlightId, setHighlightId] = useState<number | null>(null);

  function navMonth(delta: -1 | 1) {
    setCalMonth(m => {
      const nm = m + delta;
      if (nm < 0)  { setCalYear(y => y - 1); return 11; }
      if (nm > 11) { setCalYear(y => y + 1); return 0; }
      return nm;
    });
  }

  function addBlock() {
    if (!formStartDate || !formStart || !formEnd || !formDoctorId) return;
    const end = formEndDate && formEndDate >= formStartDate ? formEndDate : formStartDate;
    setBlocks(prev => [...prev, { id: uid(), doctorId: formDoctorId, startDate: formStartDate, endDate: end, startTime: formStart, endTime: formEnd, reason: formReason }]);
    setFormStartDate(""); setFormEndDate(""); setFormReason("");
  }

  const todayYmd = toYMD(new Date());
  const today = new Date();
  const in30  = addDays(today, 30);

  const upcoming = blocks
    .filter(b => isoToLocal(b.endDate) >= today && isoToLocal(b.startDate) <= in30)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  function dayContent(d: Date) {
    const ymd = toYMD(d);
    const dayBlocks = blocks.filter(b => b.startDate <= ymd && b.endDate >= ymd && (highlightId === null || b.doctorId === highlightId));
    if (!dayBlocks.length) return null;
    return (
      <div className="flex flex-col gap-0.5">
        {dayBlocks.map(b => {
          const idx = doctors.findIndex(doc => doc.id === b.doctorId);
          const col = DOC_COLORS[idx % DOC_COLORS.length];
          const last = doctors.find(doc => doc.id === b.doctorId)?.name.split(" ").pop() ?? "Dr";
          return (
            <span key={b.id} className={`block truncate rounded-sm px-1 py-px text-[9px] font-medium border ${col.soft}`}
              title={`${last} · ${b.startTime}–${b.endTime}${b.reason ? ` · ${b.reason}` : ""}`}>
              {last} {b.startTime}–{b.endTime}
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* Today's availability strip */}
      <div className="flex flex-wrap gap-2">
        {doctors.map((doc, i) => {
          const col     = DOC_COLORS[i % DOC_COLORS.length];
          const blocked = blocks.some(b => b.doctorId === doc.id && b.startDate <= todayYmd && b.endDate >= todayYmd);
          return (
            <button
              key={doc.id}
              onClick={() => setHighlightId(prev => prev === doc.id ? null : doc.id)}
              className={[
                "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-all",
                highlightId === doc.id ? `${col.soft} ring-2 ring-offset-1 ring-current` : "bg-card border-border hover:border-foreground/30",
              ].join(" ")}
            >
              <span className={`h-2 w-2 rounded-full shrink-0 ${blocked ? "bg-red-500" : "bg-emerald-500"}`} />
              <div className="text-left">
                <div className="font-semibold leading-tight text-foreground">{doc.name}</div>
                <div className="text-[10px] text-muted-foreground">{doc.specialty} · {doc.branch_name}</div>
              </div>
              <span className={`ml-1 text-[9px] font-bold rounded-full px-2 py-0.5 ${blocked ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                {blocked ? "Blocked today" : "Available"}
              </span>
            </button>
          );
        })}
        {highlightId !== null && (
          <button onClick={() => setHighlightId(null)} className="flex items-center gap-1 rounded-xl border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground">
            <X className="h-3 w-3" /> Clear filter
          </button>
        )}
      </div>

      {/* Two-column: calendar + sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">

        {/* Calendar */}
        <div className="rounded-xl border border-border bg-card p-5">
          <Calendar year={calYear} month={calMonth} onNav={navMonth} dayContent={dayContent}
            onDayClick={ymd => { if (!formStartDate) setFormStartDate(ymd); else setFormEndDate(ymd); }} />
          {/* Color legend */}
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
            {doctors.map((doc, i) => {
              const col = DOC_COLORS[i % DOC_COLORS.length];
              return (
                <span key={doc.id} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${col.soft}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${col.dot}`} />
                  {doc.name}
                </span>
              );
            })}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">

          {/* Add block form */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Add Unavailability Block</div>

            <div>
              <label className="text-[10px] font-mono text-muted-foreground uppercase mb-1 block">Doctor</label>
              <select value={formDoctorId} onChange={e => setFormDoctorId(Number(e.target.value))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-mono text-muted-foreground uppercase mb-1 block">
                  Start Date <span className="normal-case text-primary">(click 1st day)</span>
                </label>
                <Input type="date" value={formStartDate} onChange={e => setFormStartDate(e.target.value)} />
              </div>
              <div>
                <label className="text-[10px] font-mono text-muted-foreground uppercase mb-1 block">
                  End Date <span className="normal-case text-muted-foreground">(optional)</span>
                </label>
                <Input type="date" value={formEndDate} min={formStartDate} onChange={e => setFormEndDate(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-mono text-muted-foreground uppercase mb-1 block">From time</label>
                <Input type="time" value={formStart} onChange={e => setFormStart(e.target.value)} />
              </div>
              <div>
                <label className="text-[10px] font-mono text-muted-foreground uppercase mb-1 block">To time</label>
                <Input type="time" value={formEnd} onChange={e => setFormEnd(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-mono text-muted-foreground uppercase mb-1 block">Reason</label>
              <Input placeholder="e.g. Conference, Leave" value={formReason} onChange={e => setFormReason(e.target.value)} />
            </div>

            <Button className="w-full" size="sm" onClick={addBlock} disabled={!formStartDate || !formStart || !formEnd}>
              <Plus className="h-4 w-4" /> Add Block
            </Button>
          </div>

          {/* Upcoming list */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Upcoming · next 30 days
              <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold">{upcoming.length}</span>
            </div>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No blocks scheduled.</p>
            ) : (
              <div className="space-y-1.5 max-h-80 overflow-y-auto">
                {upcoming.map(b => {
                  const idx  = doctors.findIndex(doc => doc.id === b.doctorId);
                  const col  = DOC_COLORS[idx % DOC_COLORS.length];
                  const name = doctors.find(doc => doc.id === b.doctorId)?.name.split(" ").pop() ?? "Dr";
                  return (
                    <div key={b.id} className={`flex items-start justify-between gap-2 rounded-lg border px-3 py-2 ${col.soft}`}>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold font-mono">
                            {b.startDate === b.endDate ? b.startDate : `${b.startDate} → ${b.endDate}`}
                          </span>
                          <span className="text-xs font-semibold truncate">{name}</span>
                          <span className="text-[10px] opacity-70">{b.startTime}–{b.endTime}</span>
                        </div>
                        {b.reason && <div className="text-[10px] opacity-70 mt-0.5 truncate">{b.reason}</div>}
                      </div>
                      <button onClick={() => setBlocks(p => p.filter(x => x.id !== b.id))}
                        className="opacity-50 hover:opacity-100 shrink-0 mt-0.5">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Appliance Section ─────────────────────────────────────────────────────────

function ApplianceSection({ statuses }: { statuses: ClinicStatus[] }) {
  const appliances = collectAppliances(statuses);
  const [blocks, setBlocks]         = useState<ApplianceBlock[]>(() => seedApplianceBlocks(appliances));
  const [calYear, setCalYear]        = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth]      = useState(() => new Date().getMonth());
  const [formAppId, setFormAppId]    = useState(appliances[0]?.id ?? "");
  const [formStart, setFormStart]    = useState("");
  const [formEnd, setFormEnd]        = useState("");
  const [formReason, setFormReason]  = useState("");
  const [highlightId, setHighlightId] = useState<string | null>(null);

  function navMonth(delta: -1 | 1) {
    setCalMonth(m => {
      const nm = m + delta;
      if (nm < 0)  { setCalYear(y => y - 1); return 11; }
      if (nm > 11) { setCalYear(y => y + 1); return 0; }
      return nm;
    });
  }

  function addBlock() {
    if (!formStart || !formEnd || !formAppId || formEnd < formStart) return;
    setBlocks(prev => [...prev, { id: uid(), applianceId: formAppId, startDate: formStart, endDate: formEnd, reason: formReason }]);
    setFormStart(""); setFormEnd(""); setFormReason("");
  }

  const todayYmd = toYMD(new Date());
  const today = new Date();
  const in30  = addDays(today, 30);

  const upcoming = blocks
    .filter(b => isoToLocal(b.endDate) >= today && isoToLocal(b.startDate) <= in30)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  function dayContent(d: Date) {
    const ymd = toYMD(d);
    const dayBlocks = blocks.filter(b => b.startDate <= ymd && b.endDate >= ymd && (highlightId === null || b.applianceId === highlightId));
    if (!dayBlocks.length) return null;
    return (
      <div className="flex flex-col gap-0.5">
        {dayBlocks.map(b => {
          const idx  = appliances.findIndex(a => a.id === b.applianceId);
          const col  = APP_COLORS[idx % APP_COLORS.length];
          const name = appliances.find(a => a.id === b.applianceId)?.name.split(" ")[0] ?? "Unit";
          return (
            <span key={b.id} className={`block truncate rounded-sm px-1 py-px text-[9px] font-medium border ${col.soft}`}
              title={`${name}${b.reason ? ` · ${b.reason}` : " · Down"}`}>
              {name}
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* Current status grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {appliances.map((app, i) => {
          const col     = APP_COLORS[i % APP_COLORS.length];
          const blocked = blocks.some(b => b.applianceId === app.id && b.startDate <= todayYmd && b.endDate >= todayYmd);
          const nextBlock = blocks
            .filter(b => b.applianceId === app.id && b.startDate > todayYmd)
            .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
          return (
            <button
              key={app.id}
              onClick={() => setHighlightId(prev => prev === app.id ? null : app.id)}
              className={[
                "rounded-xl border p-3 text-left transition-all",
                highlightId === app.id ? `${col.soft} ring-2 ring-offset-1 ring-current` : "bg-card border-border hover:border-foreground/30",
              ].join(" ")}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`h-2.5 w-2.5 rounded-full ${blocked ? "bg-red-500" : "bg-emerald-500"}`} />
                {blocked
                  ? <span className="text-[9px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">Down</span>
                  : <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">Operational</span>}
              </div>
              <div className="text-sm font-semibold text-foreground leading-tight">{app.name}</div>
              {nextBlock && !blocked && (
                <div className="text-[10px] text-muted-foreground mt-1">Next down: {nextBlock.startDate}</div>
              )}
              {blocked && blocks.find(b => b.applianceId === app.id && b.startDate <= todayYmd && b.endDate >= todayYmd)?.reason && (
                <div className="text-[10px] text-red-600/70 mt-1 truncate">
                  {blocks.find(b => b.applianceId === app.id && b.startDate <= todayYmd && b.endDate >= todayYmd)?.reason}
                </div>
              )}
            </button>
          );
        })}
        {highlightId !== null && (
          <button onClick={() => setHighlightId(null)} className="flex items-center justify-center gap-1 rounded-xl border border-dashed border-border px-3 py-3 text-xs text-muted-foreground hover:text-foreground">
            <X className="h-3 w-3" /> Clear filter
          </button>
        )}
      </div>

      {/* Two-column: calendar + sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">

        {/* Calendar */}
        <div className="rounded-xl border border-border bg-card p-5">
          <Calendar year={calYear} month={calMonth} onNav={navMonth} dayContent={dayContent}
            onDayClick={ymd => { setFormStart(ymd); setFormEnd(ymd); }} />
          {/* Legend */}
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
            {appliances.map((a, i) => {
              const col = APP_COLORS[i % APP_COLORS.length];
              return (
                <span key={a.id} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${col.soft}`}>
                  {a.name}
                </span>
              );
            })}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">

          {/* Add block form */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Block Appliance / Facility</div>

            <div>
              <label className="text-[10px] font-mono text-muted-foreground uppercase mb-1 block">Appliance</label>
              <select value={formAppId} onChange={e => setFormAppId(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                {appliances.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-mono text-muted-foreground uppercase mb-1 block">From <span className="normal-case text-primary">(click day)</span></label>
                <Input type="date" value={formStart} onChange={e => setFormStart(e.target.value)} />
              </div>
              <div>
                <label className="text-[10px] font-mono text-muted-foreground uppercase mb-1 block">To</label>
                <Input type="date" value={formEnd} onChange={e => setFormEnd(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-mono text-muted-foreground uppercase mb-1 block">Reason</label>
              <Input placeholder="e.g. Maintenance, Repair" value={formReason} onChange={e => setFormReason(e.target.value)} />
            </div>

            <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white border-0" size="sm"
              onClick={addBlock} disabled={!formStart || !formEnd || formEnd < formStart}>
              <Plus className="h-4 w-4" /> Add Block
            </Button>
          </div>

          {/* Upcoming list */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Upcoming · next 30 days
              <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold">{upcoming.length}</span>
            </div>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No blocks scheduled.</p>
            ) : (
              <div className="space-y-1.5 max-h-80 overflow-y-auto">
                {upcoming.map(b => {
                  const idx  = appliances.findIndex(a => a.id === b.applianceId);
                  const col  = APP_COLORS[idx % APP_COLORS.length];
                  const name = appliances.find(a => a.id === b.applianceId)?.name ?? b.applianceId;
                  return (
                    <div key={b.id} className={`flex items-start justify-between gap-2 rounded-lg border px-3 py-2 ${col.soft}`}>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold font-mono">
                            {b.startDate === b.endDate ? b.startDate : `${b.startDate} → ${b.endDate}`}
                          </span>
                          <span className="text-xs font-semibold truncate">{name}</span>
                        </div>
                        {b.reason && <div className="text-[10px] opacity-70 mt-0.5 truncate">{b.reason}</div>}
                      </div>
                      <button onClick={() => setBlocks(p => p.filter(x => x.id !== b.id))}
                        className="opacity-50 hover:opacity-100 shrink-0 mt-0.5">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Root export ───────────────────────────────────────────────────────────────

export function ClinicStatusClient({
  statuses,
  doctors,
}: {
  statuses: ClinicStatus[];
  doctors: DoctorLite[];
}) {
  const [activeTab, setActiveTab] = useState<"doctors" | "appliances">("doctors");

  return (
    <div>
      {/* Tab bar */}
      <div className="flex border-b border-border mb-6">
        {([
          { key: "doctors",    label: "Doctor Availability", icon: <Stethoscope className="h-4 w-4" /> },
          { key: "appliances", label: "Appliances & Facilities", icon: <CalendarDays className="h-4 w-4" /> },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={[
              "flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {activeTab === "doctors"    && <DoctorSection doctors={doctors} />}
      {activeTab === "appliances" && <ApplianceSection statuses={statuses} />}
    </div>
  );
}
