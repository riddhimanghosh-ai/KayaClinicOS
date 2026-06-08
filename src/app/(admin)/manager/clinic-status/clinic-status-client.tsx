"use client";

import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Trash2,
  Plus,
  CalendarDays,
  Stethoscope,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { ClinicStatus, ClinicAppliance } from "@/lib/types";

type DoctorLite = { id: number; name: string; specialty: string; branch_id: number; branch_name: string };

type DoctorBlock = {
  id: string;
  doctorId: number;
  date: string;       // YYYY-MM-DD
  startTime: string;  // HH:MM
  endTime: string;    // HH:MM
  reason: string;
};

type ApplianceBlock = {
  id: string;
  applianceId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  reason: string;
};

// ---- helpers ----------------------------------------------------------------

function toYMD(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function isoToLocal(ymd: string): Date {
  const [y, m, day] = ymd.split("-").map(Number);
  return new Date(y, m - 1, day);
}

/** All calendar days for a month grid (fills to full 6-week grid) */
function calendarDays(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const days: Date[] = [];
  // pad before
  for (let i = first.getDay(); i > 0; i--) days.push(addDays(first, -i));
  // month days
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d));
  // pad after to complete last week
  while (days.length % 7 !== 0) days.push(addDays(last, days.length - (last.getDate() + first.getDay())));
  return days;
}

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAYS_SHORT = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

// ---- mini calendar ----------------------------------------------------------

function MiniCalendar({
  year,
  month,
  onNav,
  dayContent,
}: {
  year: number;
  month: number;
  onNav: (delta: -1 | 1) => void;
  dayContent: (d: Date) => React.ReactNode;
}) {
  const days = calendarDays(year, month);
  const today = toYMD(new Date());

  return (
    <div>
      {/* header */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => onNav(-1)}
          className="p-1 hover:bg-secondary rounded"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold">
          {MONTHS[month]} {year}
        </span>
        <button
          type="button"
          onClick={() => onNav(1)}
          className="p-1 hover:bg-secondary rounded"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      {/* day-of-week labels */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS_SHORT.map((d) => (
          <div key={d} className="text-center text-[10px] font-mono uppercase text-muted-foreground py-1">
            {d}
          </div>
        ))}
      </div>
      {/* day cells */}
      <div className="grid grid-cols-7 gap-px">
        {days.map((d, i) => {
          const ymd = toYMD(d);
          const inMonth = d.getMonth() === month;
          const isToday = ymd === today;
          return (
            <div
              key={i}
              className={`min-h-[56px] border border-border p-1 text-xs ${
                inMonth ? "bg-card" : "bg-secondary/40"
              } ${isToday ? "ring-1 ring-primary ring-inset" : ""}`}
            >
              <div
                className={`text-[10px] font-mono mb-0.5 ${
                  inMonth ? "text-foreground" : "text-muted-foreground"
                }`}
              >
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

// ---- Section A: Doctor Availability -----------------------------------------

function DoctorSection({ doctors }: { doctors: DoctorLite[] }) {
  const [selectedDoctorId, setSelectedDoctorId] = useState<number>(
    doctors[0]?.id ?? 0
  );
  const [blocks, setBlocks] = useState<DoctorBlock[]>([]);
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());

  // form state
  const [formDate, setFormDate] = useState("");
  const [formStart, setFormStart] = useState("09:00");
  const [formEnd, setFormEnd] = useState("17:00");
  const [formReason, setFormReason] = useState("");

  function navMonth(delta: -1 | 1) {
    setCalMonth((m) => {
      const nm = m + delta;
      if (nm < 0) { setCalYear((y) => y - 1); return 11; }
      if (nm > 11) { setCalYear((y) => y + 1); return 0; }
      return nm;
    });
  }

  function addBlock() {
    if (!formDate || !formStart || !formEnd || !selectedDoctorId) return;
    setBlocks((prev) => [
      ...prev,
      { id: uid(), doctorId: selectedDoctorId, date: formDate, startTime: formStart, endTime: formEnd, reason: formReason },
    ]);
    setFormDate("");
    setFormReason("");
  }

  function removeBlock(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }

  const DOC_COLORS = [
    "bg-red-100 text-red-700 border-red-200",
    "bg-blue-100 text-blue-700 border-blue-200",
    "bg-violet-100 text-violet-700 border-violet-200",
    "bg-emerald-100 text-emerald-700 border-emerald-200",
    "bg-amber-100 text-amber-700 border-amber-200",
    "bg-rose-100 text-rose-700 border-rose-200",
  ];

  // next 30 days upcoming — ALL doctors
  const today = new Date();
  const in30 = addDays(today, 30);
  const upcoming = blocks
    .filter((b) => { const d = isoToLocal(b.date); return d >= today && d <= in30; })
    .sort((a, b) => a.date.localeCompare(b.date));

  // Combined calendar: show ALL doctors' blocks
  function dayContent(d: Date) {
    const ymd = toYMD(d);
    const dayBlocks = blocks.filter((b) => b.date === ymd);
    if (!dayBlocks.length) return null;
    return (
      <div className="flex flex-col gap-0.5">
        {dayBlocks.map((b) => {
          const docIdx = doctors.findIndex(doc => doc.id === b.doctorId);
          const cls = DOC_COLORS[docIdx % DOC_COLORS.length] ?? DOC_COLORS[0];
          const lastName = doctors.find(doc => doc.id === b.doctorId)?.name.split(" ").pop() ?? "Dr";
          return (
            <span key={b.id} className={`block truncate rounded px-1 py-px text-[9px] border ${cls}`}
              title={`${lastName} · ${b.startTime}–${b.endTime}${b.reason ? ` · ${b.reason}` : ""}`}>
              {lastName} {b.startTime}–{b.endTime}
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Stethoscope className="h-4 w-4 text-primary" />
          Doctor Availability Calendar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Doctor selector */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide font-mono">
            Select Doctor
          </label>
          <select
            value={selectedDoctorId}
            onChange={(e) => setSelectedDoctorId(Number(e.target.value))}
            className="w-full rounded border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} · {d.specialty} ({d.branch_name})
              </option>
            ))}
          </select>
        </div>

        {/* Calendar */}
        <MiniCalendar
          year={calYear}
          month={calMonth}
          onNav={navMonth}
          dayContent={dayContent}
        />

        {/* Add block form */}
        <div className="border border-border rounded p-3 space-y-3 bg-secondary/30">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground font-mono">
            Add Unavailability Block
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] font-mono text-muted-foreground uppercase">Date</label>
              <Input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="mt-0.5"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono text-muted-foreground uppercase">Start Time</label>
              <Input
                type="time"
                value={formStart}
                onChange={(e) => setFormStart(e.target.value)}
                className="mt-0.5"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono text-muted-foreground uppercase">End Time</label>
              <Input
                type="time"
                value={formEnd}
                onChange={(e) => setFormEnd(e.target.value)}
                className="mt-0.5"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-mono text-muted-foreground uppercase">Reason (optional)</label>
            <Input
              placeholder="e.g. Out of clinic, Conference, Leave"
              value={formReason}
              onChange={(e) => setFormReason(e.target.value)}
              className="mt-0.5"
            />
          </div>
          <Button size="sm" onClick={addBlock} disabled={!formDate || !formStart || !formEnd}>
            <Plus className="h-4 w-4" /> Add Block
          </Button>
        </div>

        {/* Legend */}
        {doctors.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {doctors.map((doc, i) => (
              <span key={doc.id} className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium border ${DOC_COLORS[i % DOC_COLORS.length]}`}>
                {doc.name}
              </span>
            ))}
          </div>
        )}

        {/* Upcoming blocks — all doctors */}
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground font-mono mb-2">
            All upcoming blocks (next 30 days)
          </div>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">No blocks scheduled.</p>
          ) : (
            <ul className="space-y-2">
              {upcoming.map((b) => {
                const docName = doctors.find(doc => doc.id === b.doctorId)?.name ?? "Doctor";
                const docIdx = doctors.findIndex(doc => doc.id === b.doctorId);
                const cls = DOC_COLORS[docIdx % DOC_COLORS.length] ?? DOC_COLORS[0];
                return (
                  <li key={b.id} className="flex items-center justify-between gap-3 rounded border border-border px-3 py-2 bg-card">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold border shrink-0 ${cls}`}>{b.date}</span>
                      <span className="text-sm font-medium text-foreground truncate">{docName}</span>
                      <span className="text-xs text-muted-foreground">{b.startTime}–{b.endTime}</span>
                      {b.reason && <span className="truncate text-xs text-muted-foreground">· {b.reason}</span>}
                    </div>
                    <button type="button" onClick={() => removeBlock(b.id)}
                      className="text-muted-foreground hover:text-destructive p-1 shrink-0">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---- Section B: Appliances & Facilities -------------------------------------

// Build a stable list of appliances from all branch statuses
function collectAppliances(statuses: ClinicStatus[]): Array<{ id: string; name: string }> {
  const seen = new Set<string>();
  const result: Array<{ id: string; name: string }> = [];
  for (const s of statuses) {
    for (const a of s.appliances) {
      if (a.name && !seen.has(a.name.toLowerCase())) {
        seen.add(a.name.toLowerCase());
        result.push({ id: a.name.toLowerCase().replace(/\s+/g, "-"), name: a.name });
      }
    }
  }
  // default fallbacks if no appliances in DB
  if (!result.length) {
    for (const n of ["Laser Machine", "IPL Device", "Hydrafacial Unit", "Consultation Room A"]) {
      result.push({ id: n.toLowerCase().replace(/\s+/g, "-"), name: n });
    }
  }
  return result;
}

function ApplianceSection({ statuses }: { statuses: ClinicStatus[] }) {
  const appliances = collectAppliances(statuses);

  const [selectedApplianceId, setSelectedApplianceId] = useState<string>(
    appliances[0]?.id ?? ""
  );
  const [blocks, setBlocks] = useState<ApplianceBlock[]>([]);
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());

  const [formStart, setFormStart] = useState("");
  const [formEnd, setFormEnd] = useState("");
  const [formReason, setFormReason] = useState("");

  function navMonth(delta: -1 | 1) {
    setCalMonth((m) => {
      const nm = m + delta;
      if (nm < 0) { setCalYear((y) => y - 1); return 11; }
      if (nm > 11) { setCalYear((y) => y + 1); return 0; }
      return nm;
    });
  }

  function addBlock() {
    if (!formStart || !formEnd || !selectedApplianceId) return;
    if (formEnd < formStart) return;
    setBlocks((prev) => [
      ...prev,
      { id: uid(), applianceId: selectedApplianceId, startDate: formStart, endDate: formEnd, reason: formReason },
    ]);
    setFormStart("");
    setFormEnd("");
    setFormReason("");
  }

  function removeBlock(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }

  const APP_COLORS = [
    "bg-amber-100 text-amber-700 border-amber-200",
    "bg-red-100 text-red-700 border-red-200",
    "bg-blue-100 text-blue-700 border-blue-200",
    "bg-violet-100 text-violet-700 border-violet-200",
    "bg-teal-100 text-teal-700 border-teal-200",
    "bg-orange-100 text-orange-700 border-orange-200",
  ];

  const today = new Date();
  const in30 = addDays(today, 30);
  // Upcoming — ALL appliances
  const upcoming = blocks
    .filter((b) => isoToLocal(b.endDate) >= today && isoToLocal(b.startDate) <= in30)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  // Combined calendar: show ALL appliance blocks per day
  function dayContent(d: Date) {
    const ymd = toYMD(d);
    const dayBlocks = blocks.filter((b) => b.startDate <= ymd && b.endDate >= ymd);
    if (!dayBlocks.length) return null;
    return (
      <div className="flex flex-col gap-0.5">
        {dayBlocks.map((b) => {
          const appIdx = appliances.findIndex(a => a.id === b.applianceId);
          const cls = APP_COLORS[appIdx % APP_COLORS.length] ?? APP_COLORS[0];
          const shortName = appliances.find(a => a.id === b.applianceId)?.name.split(" ")[0] ?? "Unit";
          return (
            <span key={b.id} className={`block truncate rounded px-1 py-px text-[9px] border ${cls}`}
              title={`${shortName}${b.reason ? ` · ${b.reason}` : " · Blocked"}`}>
              {shortName}
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarDays className="h-4 w-4 text-amber-500" />
          Appliances &amp; Facilities Calendar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Appliance selector */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide font-mono">
            Select Appliance / Facility
          </label>
          <select
            value={selectedApplianceId}
            onChange={(e) => setSelectedApplianceId(e.target.value)}
            className="w-full rounded border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {appliances.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        {/* Calendar */}
        <MiniCalendar
          year={calYear}
          month={calMonth}
          onNav={navMonth}
          dayContent={dayContent}
        />

        {/* Add block form */}
        <div className="border border-border rounded p-3 space-y-3 bg-secondary/30">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground font-mono">
            Block a Date Range
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-mono text-muted-foreground uppercase">Start Date</label>
              <Input
                type="date"
                value={formStart}
                onChange={(e) => setFormStart(e.target.value)}
                className="mt-0.5"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono text-muted-foreground uppercase">End Date</label>
              <Input
                type="date"
                value={formEnd}
                onChange={(e) => setFormEnd(e.target.value)}
                className="mt-0.5"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-mono text-muted-foreground uppercase">Reason</label>
            <Input
              placeholder="e.g. Maintenance, Repair, Out of service"
              value={formReason}
              onChange={(e) => setFormReason(e.target.value)}
              className="mt-0.5"
            />
          </div>
          <Button
            size="sm"
            onClick={addBlock}
            disabled={!formStart || !formEnd || formEnd < formStart}
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            <Plus className="h-4 w-4" /> Add Block
          </Button>
        </div>

        {/* Upcoming blocks */}
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground font-mono mb-2">
            Upcoming blocks (next 30 days)
          </div>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">No blocks scheduled.</p>
          ) : (
            <ul className="space-y-2">
              {upcoming.map((b) => {
                const appIdx = appliances.findIndex(a => a.id === b.applianceId);
                const cls = APP_COLORS[appIdx % APP_COLORS.length] ?? APP_COLORS[0];
                const appName = appliances.find(a => a.id === b.applianceId)?.name ?? b.applianceId;
                return (
                  <li key={b.id} className="flex items-center justify-between gap-3 rounded border border-border px-3 py-2 bg-card">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold border shrink-0 ${cls}`}>
                        {b.startDate === b.endDate ? b.startDate : `${b.startDate} → ${b.endDate}`}
                      </span>
                      <span className="text-sm font-medium text-foreground truncate">{appName}</span>
                      {b.reason && <span className="truncate text-xs text-muted-foreground">· {b.reason}</span>}
                    </div>
                    <button type="button" onClick={() => removeBlock(b.id)}
                      className="text-muted-foreground hover:text-destructive p-1 shrink-0">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Legend */}
        {appliances.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {appliances.map((a, i) => (
              <span key={a.id} className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium border ${APP_COLORS[i % APP_COLORS.length]}`}>
                {a.name}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---- Root export ------------------------------------------------------------

export function ClinicStatusClient({
  statuses,
  doctors,
}: {
  statuses: ClinicStatus[];
  doctors: DoctorLite[];
}) {
  const [activeTab, setActiveTab] = useState<"doctors" | "appliances">("doctors");

  return (
    <div className="space-y-0">
      {/* Tab bar */}
      <div className="flex border-b border-border mb-6">
        {([
          { key: "doctors",    label: "Doctor Availability Calendar",       icon: <Stethoscope className="h-4 w-4" /> },
          { key: "appliances", label: "Appliances & Facilities Calendar",   icon: <CalendarDays className="h-4 w-4" /> },
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
