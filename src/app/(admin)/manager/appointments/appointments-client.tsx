"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, X, Clock, User, Phone, Mail, MapPin, Stethoscope, AlertTriangle, Tag, Camera, ClipboardList, FileText, CheckCircle2, Package, AlertCircle, Save, ShoppingBag, Plus, Loader2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { AppointmentRow } from "@/lib/db";
import { CheckoutFlow } from "@/components/checkout-flow";

// ── Layout constants ──────────────────────────────────────────────────────────
const LABEL_W = 220;         // px, left column
const PX_PER_HOUR = 150;     // px per hour on the timeline
const HOUR_START = 8;
const HOUR_END = 20;
const TOTAL_HOURS = HOUR_END - HOUR_START;
const TIMELINE_W = TOTAL_HOURS * PX_PER_HOUR; // 1800px
const LANE_H = 86;           // px per lane (card height + gap)
const LANE_PAD = 8;          // top padding inside row
const HEADER_H = 36;
const CARD_MIN_W = 160;      // minimum card width so text is readable

const PX_PER_MIN = PX_PER_HOUR / 60;

// ── Lane assignment ───────────────────────────────────────────────────────────
// Returns a map from appointment id → lane index (0-based)
function assignLanes(appts: AppointmentRow[]): Map<number, number> {
  const sorted = [...appts].sort((a, b) => {
    const aM = minutesFromStart(a.appointment_ts);
    const bM = minutesFromStart(b.appointment_ts);
    return aM - bM;
  });
  // laneEnds[i] = end pixel of the last card in lane i
  const laneEnds: number[] = [];
  const result = new Map<number, number>();
  for (const a of sorted) {
    const startPx = minutesFromStart(a.appointment_ts) * PX_PER_MIN;
    const naturalW = getDuration(a) * PX_PER_MIN - 4;
    const cardW = Math.max(naturalW, CARD_MIN_W);
    const endPx = startPx + cardW;
    // find first lane where this card doesn't overlap
    let lane = laneEnds.findIndex(e => e <= startPx + 4); // 4px tolerance
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(endPx);
    } else {
      laneEnds[lane] = endPx;
    }
    result.set(a.id, lane);
  }
  return result;
}

// ── Room definitions ──────────────────────────────────────────────────────────
type RoomKey = "consultation" | "facial" | "peel" | "laser";

const ROOMS: { key: RoomKey; label: string; subtitle: string }[] = [
  { key: "consultation", label: "Consultation",            subtitle: "" },
  { key: "facial",       label: "Facial Room GDRC",        subtitle: "" },
  { key: "peel",         label: "Facial / Peel / Dr-Led GDRC", subtitle: "" },
  { key: "laser",        label: "PainFree GDRC",           subtitle: "Waitlist room" },
];

function getRoom(serviceType: string): RoomKey {
  const s = serviceType.toLowerCase();
  if (s.includes("consultation")) return "consultation";
  if (s.includes("facial") || s.includes("hydra") || s.includes("glow")) return "facial";
  if (s.includes("peel") || s.includes("carbon laser peel")) return "peel";
  return "laser";
}

function getDuration(appt: AppointmentRow): number {
  if (appt.duration_minutes && appt.duration_minutes > 0) return appt.duration_minutes;
  const s = appt.service_type.toLowerCase();
  if (s.includes("consultation")) return 30;
  if (s.includes("facial")) return 60;
  if (s.includes("microneedling")) return 75;
  return 45;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function minutesFromStart(ts: string): number {
  const time = ts.slice(11, 16);
  const [h, m] = time.split(":").map(Number);
  return (h - HOUR_START) * 60 + m;
}

function formatHour(h: number) {
  if (h === 12) return "12 PM";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

function formatDisplayDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function hasClash(appt: AppointmentRow, all: AppointmentRow[]): boolean {
  if (!appt.doctor_id) return false;
  if (appt.status === "no_show" || appt.status === "converted") return false;
  const aStart = minutesFromStart(appt.appointment_ts);
  const aEnd = aStart + getDuration(appt);
  return all.some(b => {
    if (b.id === appt.id || b.doctor_id !== appt.doctor_id) return false;
    if (b.status === "no_show" || b.status === "converted") return false;
    const bStart = minutesFromStart(b.appointment_ts);
    const bEnd = bStart + getDuration(b);
    return aStart < bEnd && bStart < aEnd;
  });
}

// ── Lead type styles ──────────────────────────────────────────────────────────
const LEAD_TYPE_STYLE: Record<string, { label: string; cls: string }> = {
  website_form: { label: "Website Form",  cls: "bg-primary/10 text-primary border-primary/30" },
  chatbot:      { label: "AI Chatbot",    cls: "bg-primary/10 text-primary border-violet-200" },
  call:         { label: "Phone Call",    cls: "bg-success/10 text-success border-success/30" },
  referral:     { label: "Referral",      cls: "bg-secondary text-muted-foreground border-border" },
  campaign:     { label: "Campaign",      cls: "bg-destructive/10 text-destructive border-destructive/30" },
  walk_in:      { label: "Walk-in",       cls: "bg-gray-100 text-gray-700 border-gray-200" },
};

// ── Status styles ─────────────────────────────────────────────────────────────
const STATUS_BG: Record<string, string> = {
  booked:            "border-blue-300 bg-primary/5 text-blue-900",
  confirmed:         "border-success/40 bg-success/5 text-foreground",
  arrived:           "border-border bg-secondary text-amber-900",
  in_session:        "border-violet-300 bg-primary/5 text-violet-900",
  in_consultation:   "border-violet-200 bg-violet-50 text-violet-900",
  consultation_done: "border-teal-200 bg-teal-50 text-teal-900",
  in_treatment:      "border-orange-200 bg-orange-50 text-orange-900",
  treatment_done:    "border-emerald-200 bg-emerald-50 text-emerald-900",
  done:              "border-success/30 bg-success/5 text-foreground",
  converted:         "border-green-300 bg-green-100/60 text-green-900 opacity-70",
  rescheduled:       "border-orange-300 bg-orange-50 text-orange-900 opacity-80",
  no_show:           "border-border bg-secondary/40 text-muted-foreground opacity-40",
};
const STATUS_DOT: Record<string, string> = {
  booked:            "bg-primary/60",
  confirmed:         "bg-success/50",
  arrived:           "bg-secondary0",
  in_session:        "bg-primary/50",
  in_consultation:   "bg-violet-500",
  consultation_done: "bg-teal-500",
  in_treatment:      "bg-orange-500",
  treatment_done:    "bg-emerald-500",
  done:              "bg-success",
  converted:         "bg-success",
  rescheduled:       "bg-orange-400",
  no_show:           "bg-gray-400",
};
const STATUS_LABEL: Record<string, string> = {
  booked:            "Booked",
  confirmed:         "Confirmed",
  arrived:           "Arrived",
  in_session:        "In Session",
  in_consultation:   "In Consultation",
  consultation_done: "Consultation Done",
  in_treatment:      "In Treatment",
  treatment_done:    "Treatment Done",
  done:              "Done ✓",
  converted:         "Completed ✓",
  rescheduled:       "Rescheduled",
  no_show:           "No Show",
};

// ── Main component ────────────────────────────────────────────────────────────
export function AppointmentsClient({
  initialAppointments,
  initialDate,
  initialOpenId,
}: {
  initialAppointments: AppointmentRow[];
  initialDate: string;
  initialOpenId?: number;
}) {
  const [date, setDate] = useState(initialDate);
  const [appts, setAppts] = useState<AppointmentRow[]>(initialAppointments);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<AppointmentRow | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);

  useEffect(() => {
    if (initialOpenId) {
      const found = appts.find(a => a.id === initialOpenId);
      if (found) setSelected(found);
    }
  }, [initialOpenId]); // run once on mount

  const fetchDate = async (iso: string) => {
    setDate(iso);
    setLoading(true);
    try {
      const res = await fetch(`/api/appointments?date=${iso}`);
      const data = await res.json();
      setAppts(data.rows);
    } finally {
      setLoading(false);
    }
  };

  const navigate = (delta: number) => {
    const d = new Date(date + "T00:00:00");
    d.setDate(d.getDate() + delta);
    fetchDate(d.toISOString().slice(0, 10));
  };

  const updateStatus = async (id: number, status: string) => {
    await fetch(`/api/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const updated = appts.map(a => a.id === id ? { ...a, status } : a);
    setAppts(updated);
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : null);
  };

  const updateTime = async (id: number, newTs: string) => {
    await fetch(`/api/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appointment_ts: newTs }),
    });
    const updated = appts.map(a => a.id === id ? { ...a, appointment_ts: newTs } : a);
    setAppts(updated);
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, appointment_ts: newTs } : null);
  };

  const convert = async (id: number) => {
    await fetch(`/api/appointments/${id}/convert`, { method: "POST" });
    const updated = appts.map(a => a.id === id ? { ...a, status: "converted" } : a);
    setAppts(updated);
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status: "converted" } : null);
  };

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const FILTERS = [
    { key: "all",              label: "All",                  count: appts.length },
    { key: "booked",           label: "Needs Confirmation",   count: appts.filter(a => a.status === "booked").length,            hint: "Call to confirm they're coming" },
    { key: "confirmed",        label: "Confirmed",            count: appts.filter(a => a.status === "confirmed").length,          hint: "Waiting to arrive" },
    { key: "checkout_pending", label: "Checkout Pending",     count: appts.filter(a => a.status === "arrived").length,            hint: "Patient here — collect payment", dot: STATUS_DOT["arrived"] },
    { key: "in_consultation",  label: "In Consultation",      count: appts.filter(a => a.status === "in_consultation").length,    hint: "Currently with doctor" },
    { key: "in_session",       label: "In Treatment",         count: appts.filter(a => ["in_session","in_treatment"].includes(a.status)).length, hint: "Session underway" },
    { key: "treatment_done",   label: "Treatment Done",       count: appts.filter(a => a.status === "treatment_done").length,     hint: "Needs inventory entry", dot: "bg-emerald-500" },
    { key: "inventory_pending",label: "Inventory Pending",    count: appts.filter(a => a.status === "converted").length,          hint: "Session done — log materials used", dot: "bg-orange-400" },
    { key: "rescheduled",      label: "Rescheduled",          count: appts.filter(a => a.status === "rescheduled").length },
    { key: "no_show",          label: "No Show",              count: appts.filter(a => a.status === "no_show").length },
  ].filter(f => f.key === "all" || f.count > 0);

  const statusForFilter = (key: string) => {
    if (key === "checkout_pending") return "arrived";
    if (key === "inventory_pending") return "converted";
    if (key === "in_session") return "in_session"; // handled below with multi-status
    return key;
  };

  const searchLower = search.toLowerCase().trim();
  const visibleAppts = appts
    .filter(a => {
      if (statusFilter === "all") return true;
      if (statusFilter === "in_session") return ["in_session","in_treatment"].includes(a.status);
      return a.status === statusForFilter(statusFilter);
    })
    .filter(a => !searchLower || a.patient_name.toLowerCase().includes(searchLower) ||
      a.service_type.toLowerCase().includes(searchLower) ||
      (a.doctor_name ?? "").toLowerCase().includes(searchLower) ||
      (a.phone ?? "").includes(search.trim()));

  return (
    <div className="space-y-4">
      {/* Date navigation */}
      <div className="flex items-center gap-3">
        <Button variant="secondary" size="sm" onClick={() => navigate(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2 flex-1">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">{formatDisplayDate(date)}</span>
        </div>
        <input
          type="date" value={date}
          onChange={e => e.target.value && fetchDate(e.target.value)}
          className="h-8 rounded-md border border-border bg-secondary text-sm px-3 focus:outline-none"
        />
        <Button variant="secondary" size="sm" onClick={() => navigate(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button size="sm" onClick={() => setShowBookingModal(true)} className="gap-1.5 shrink-0">
          <Plus className="h-4 w-4" /> Book Appointment
        </Button>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="Search by patient name, service, doctor, or phone…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full h-9 rounded-lg border border-border bg-card pl-9 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Booking modal */}
      {showBookingModal && (
        <BookingModal
          defaultDate={date}
          onClose={() => setShowBookingModal(false)}
          onBooked={(newAppt) => {
            if (newAppt.appointment_ts.slice(0, 10) === date) {
              setAppts(prev => [...prev, newAppt]);
            }
            setShowBookingModal(false);
          }}
        />
      )}

      {/* Status filter chips */}
      <div className="space-y-1.5">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              title={"hint" in f ? f.hint : undefined}
              className={[
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors border",
                statusFilter === f.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:border-foreground hover:text-foreground",
              ].join(" ")}
            >
              {f.key !== "all" && (
                <span className={`h-1.5 w-1.5 rounded-full ${"dot" in f && f.dot ? f.dot : STATUS_DOT[f.key] ?? "bg-gray-400"}`} />
              )}
              {f.label}
              <span className={[
                "rounded-full px-1.5 py-0 text-[10px] font-bold",
                statusFilter === f.key ? "bg-white/20 text-white" : "bg-secondary text-muted-foreground",
              ].join(" ")}>{f.count}</span>
            </button>
          ))}
        </div>
        {/* Active filter hint */}
        {statusFilter !== "all" && (() => {
          const active = FILTERS.find(f => f.key === statusFilter);
          return active && "hint" in active && active.hint ? (
            <p className="text-[11px] text-muted-foreground pl-1 italic">{active.hint}</p>
          ) : null;
        })()}
      </div>

      {/* Resource calendar */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div style={{ minWidth: LABEL_W + TIMELINE_W }}>

              {/* Time header row */}
              <div className="flex border-b bg-secondary/40" style={{ height: HEADER_H }}>
                <div className="shrink-0 border-r border-border bg-secondary/40" style={{ width: LABEL_W }} />
                <div className="relative flex-1" style={{ width: TIMELINE_W }}>
                  {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (
                    <div
                      key={i}
                      className="absolute top-0 bottom-0 flex items-center"
                      style={{ left: i * PX_PER_HOUR - (i === 0 ? 0 : 1) }}
                    >
                      {i < TOTAL_HOURS + 1 && (
                        <span className="text-[10px] font-medium text-muted-foreground pl-1.5">
                          {formatHour(HOUR_START + i)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Room rows */}
              {ROOMS.map(room => {
                const roomAppts = visibleAppts.filter(a => getRoom(a.service_type) === room.key);
                const bookedMinutes = roomAppts
                  .filter(a => a.status !== "no_show")
                  .reduce((acc, a) => acc + getDuration(a), 0);
                const bookedHours = (bookedMinutes / 60).toFixed(1);
                const pct = Math.round((bookedMinutes / (TOTAL_HOURS * 60)) * 100);

                // Lane assignment for this room
                const laneMap = assignLanes(roomAppts);
                const laneCount = Math.max(1, ...Array.from(laneMap.values()).map(v => v + 1));
                const rowH = LANE_PAD + laneCount * LANE_H;

                return (
                  <div key={room.key} className="flex border-b last:border-b-0">
                    {/* Room label */}
                    <div
                      className="shrink-0 border-r border-border bg-card px-4 py-3 sticky left-0 z-10 flex flex-col justify-between"
                      style={{ width: LABEL_W, minHeight: rowH }}
                    >
                      <div>
                        <div className="text-sm font-semibold text-foreground leading-tight">{room.label}</div>
                        {room.subtitle && (
                          <div className="text-[10px] text-muted-foreground font-medium mt-0.5">{room.subtitle}</div>
                        )}
                        {laneCount > 1 && (
                          <div className="text-[10px] text-primary font-medium mt-0.5">{laneCount} concurrent</div>
                        )}
                      </div>
                      <div className="mt-2">
                        <div className="text-[10px] text-muted-foreground">
                          {bookedHours}h booked · {pct}% utilised
                        </div>
                        <div className="mt-1 h-1 rounded-full bg-secondary overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary/60"
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Timeline area */}
                    <div className="relative bg-card" style={{ width: TIMELINE_W, height: rowH }}>
                      {/* Hour grid lines */}
                      {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (
                        <div
                          key={i}
                          className="absolute top-0 bottom-0 border-l border-border/30"
                          style={{ left: i * PX_PER_HOUR }}
                        />
                      ))}
                      {/* Half-hour lines */}
                      {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                        <div
                          key={`h${i}`}
                          className="absolute top-0 bottom-0 border-l border-border/15"
                          style={{ left: i * PX_PER_HOUR + PX_PER_HOUR / 2 }}
                        />
                      ))}
                      {/* Lane separator lines */}
                      {laneCount > 1 && Array.from({ length: laneCount - 1 }, (_, i) => (
                        <div
                          key={`lane${i}`}
                          className="absolute left-0 right-0 border-t border-dashed border-border/40"
                          style={{ top: LANE_PAD + (i + 1) * LANE_H }}
                        />
                      ))}

                      {loading && (
                        <div className="absolute inset-0 bg-background/50 z-20 flex items-center justify-center">
                          <span className="text-xs text-muted-foreground">Loading…</span>
                        </div>
                      )}

                      {/* Appointment cards */}
                      {roomAppts.map(a => {
                        const mins = minutesFromStart(a.appointment_ts);
                        const dur = getDuration(a);
                        const naturalW = dur * PX_PER_MIN - 4;
                        const width = Math.max(naturalW, CARD_MIN_W);
                        const left = mins * PX_PER_MIN;
                        const lane = laneMap.get(a.id) ?? 0;
                        const top = LANE_PAD + lane * LANE_H;
                        const cardH = LANE_H - 8;
                        const clash = hasClash(a, appts);
                        const doctorShort = a.doctor_name
                          ? (a.doctor_name.startsWith("Dr") ? a.doctor_name : `Dr. ${a.doctor_name}`)
                          : null;

                        return (
                          <button
                            key={a.id}
                            onClick={() => setSelected(a)}
                            className={`absolute rounded-lg border text-left hover:shadow-md transition-all cursor-pointer ${STATUS_BG[a.status] ?? "border-border bg-card"} ${clash ? "ring-2 ring-red-400 ring-offset-1" : ""}`}
                            style={{ left, top, width, height: cardH, overflow: "hidden", zIndex: 1 }}
                          >
                            <div className="px-2.5 py-2 h-full flex flex-col justify-between gap-0.5">
                              {/* Row 1: dot + name + clash icon */}
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className={`h-2 w-2 rounded-full shrink-0 ${STATUS_DOT[a.status] ?? "bg-gray-400"}`} />
                                <span className="font-semibold text-[12px] leading-tight truncate flex-1">{a.patient_name}</span>
                                {clash && <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />}
                              </div>
                              {/* Row 2: service */}
                              <div className="text-[10px] text-muted-foreground truncate pl-3.5">{a.service_type}</div>
                              {/* Row 3: doctor + time + status badge */}
                              <div className="flex items-center justify-between gap-1 pl-3.5">
                                {doctorShort && (
                                  <span className="text-[10px] font-medium text-muted-foreground truncate">{doctorShort}</span>
                                )}
                                <div className="flex items-center gap-1 ml-auto shrink-0">
                                  {a.status === "converted" && (
                                    <span className="text-[9px] bg-success/10 text-success px-1 rounded font-medium">Done ✓</span>
                                  )}
                                  <span className="text-[9px] text-muted-foreground/70">
                                    {a.appointment_ts.slice(11, 16)}
                                  </span>
                                </div>
                              </div>
                              {/* Checkout indicator for arrived patients */}
                              {(a.status === "arrived" || a.status === "in_session") && (
                                <div className="mt-0.5 pl-3.5">
                                  <span className="text-[9px] bg-success/10 text-success px-1.5 rounded-full font-semibold">Checkout →</span>
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 px-4 py-2.5 border-t bg-secondary/20 text-[10px] text-muted-foreground">
            {(["booked", "confirmed", "arrived", "in_session", "converted", "rescheduled", "no_show"] as const).map(s => {
              const cnt = appts.filter(a => a.status === s).length;
              if (cnt === 0 && s !== "booked" && s !== "confirmed") return null;
              return (
                <span key={s} className="flex items-center gap-1">
                  <span className={`h-2 w-2 rounded-full ${STATUS_DOT[s]}`} />
                  {STATUS_LABEL[s]} ({cnt})
                </span>
              );
            })}
            <span className="flex items-center gap-1 ml-2">
              <span className="inline-block h-3 w-3 rounded border-2 border-red-400" />
              Doctor clash
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Detail drawer */}
      {selected && (
        <DetailDrawer
          appt={selected}
          allAppts={appts}
          date={date}
          onClose={() => setSelected(null)}
          onStatusChange={updateStatus}
          onConvert={convert}
          onTimeChange={updateTime}
        />
      )}
    </div>
  );
}

// ── Service options ───────────────────────────────────────────────────────────
const BOOKING_SERVICES = [
  "Consultation",
  "Acne Clearance Program",
  "Carbon Laser Peel",
  "Chemical Peel",
  "Laser Hair Reduction",
  "Microneedling for Scars",
  "Q-Switch Laser Toning",
  "GFC Therapy",
  "PRP Therapy",
  "Hydrafacial",
];

const SLOT_TIMES = Array.from({ length: 22 }, (_, i) => {
  const h = 9 + Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
}).filter(t => parseInt(t) < 20); // up to 19:30

// ── Booking modal ─────────────────────────────────────────────────────────────
function BookingModal({
  defaultDate,
  onClose,
  onBooked,
}: {
  defaultDate: string;
  onClose: () => void;
  onBooked: (appt: AppointmentRow) => void;
}) {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState("10:00");
  const [service, setService] = useState(BOOKING_SERVICES[0]);
  const [phase, setPhase] = useState<"idle" | "submitting" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!phone.trim()) { setError("Patient phone is required"); return; }
    if (!name.trim()) { setError("Patient name is required"); return; }
    setError(null);
    setPhase("submitting");
    try {
      const appointment_ts = `${date}T${time}:00`;
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), patient_name: name.trim(), service_type: service, appointment_ts }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Booking failed");
      }
      const data = await res.json();
      setPhase("done");
      setTimeout(() => onBooked(data.appointment ?? data), 800);
    } catch (e: any) {
      setError(e.message ?? "Failed to book — please try again.");
      setPhase("idle");
    }
  };

  const today = new Date().toISOString().slice(0, 10);
  const fieldCls = "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-background rounded-2xl shadow-2xl border border-border overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Book Appointment</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1">
            <X className="h-4 w-4" />
          </button>
        </div>

        {phase === "done" ? (
          <div className="px-5 py-8 flex flex-col items-center gap-3 text-center">
            <CheckCircle2 className="h-10 w-10 text-success0" />
            <div className="font-semibold text-sm">Appointment booked!</div>
            <div className="text-xs text-muted-foreground">{service} — {date} at {time}</div>
          </div>
        ) : (
          <div className="px-5 py-4 space-y-3">
            {/* Patient info */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Patient Phone *</label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className={fieldCls}
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Patient Name *</label>
                <input
                  type="text"
                  placeholder="Full name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className={fieldCls}
                />
              </div>
            </div>

            {/* Service */}
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Service</label>
              <select value={service} onChange={e => setService(e.target.value)} className={fieldCls}>
                {BOOKING_SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Date + Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Date</label>
                <input
                  type="date"
                  value={date}
                  min={today}
                  onChange={e => setDate(e.target.value)}
                  className={fieldCls}
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Time</label>
                <select value={time} onChange={e => setTime(e.target.value)} className={fieldCls}>
                  {SLOT_TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={onClose} disabled={phase === "submitting"}>
                Cancel
              </Button>
              <Button className="flex-1 gap-2" onClick={handleSubmit} disabled={phase === "submitting"}>
                {phase === "submitting" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Book
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── BOM data for FnO ─────────────────────────────────────────────────────────
type BomItem = { id: string; name: string; category: string; unit: string; mandatory: boolean; est: number; actual: number };

const BOM: Record<string, BomItem[]> = {
  Laser:      [
    { id:"l1", name:"Disposable gloves",       category:"PPE",        unit:"pair",    mandatory:true,  est:2,  actual:2 },
    { id:"l2", name:"Laser protective goggles", category:"Safety",     unit:"pcs",     mandatory:true,  est:1,  actual:1 },
    { id:"l3", name:"Cooling gel",              category:"Consumable", unit:"ml",      mandatory:false, est:30, actual:30 },
    { id:"l4", name:"Gauze pads",               category:"Consumable", unit:"pcs",     mandatory:false, est:4,  actual:4 },
    { id:"l5", name:"Alcohol wipes",            category:"Consumable", unit:"pcs",     mandatory:true,  est:3,  actual:3 },
    { id:"l6", name:"Post-laser soothing cream",category:"Topical",    unit:"g",       mandatory:false, est:2,  actual:2 },
    { id:"l7", name:"Carbon lotion",            category:"Topical",    unit:"ml",      mandatory:false, est:5,  actual:0 },
  ],
  Peel:       [
    { id:"p1", name:"Disposable gloves",        category:"PPE",        unit:"pair",    mandatory:true,  est:2,  actual:2 },
    { id:"p2", name:"Acid solution",            category:"Chemical",   unit:"ml",      mandatory:true,  est:3,  actual:3 },
    { id:"p3", name:"Neutraliser",              category:"Chemical",   unit:"ml",      mandatory:true,  est:5,  actual:5 },
    { id:"p4", name:"Gauze pads",               category:"Consumable", unit:"pcs",     mandatory:false, est:6,  actual:6 },
    { id:"p5", name:"Post-peel barrier cream",  category:"Topical",    unit:"g",       mandatory:false, est:3,  actual:3 },
    { id:"p6", name:"Alcohol wipes",            category:"Consumable", unit:"pcs",     mandatory:true,  est:2,  actual:2 },
  ],
  Facial:     [
    { id:"f1", name:"Disposable gloves",        category:"PPE",        unit:"pair",    mandatory:true,  est:1,  actual:1 },
    { id:"f2", name:"Cleansing solution",       category:"Consumable", unit:"ml",      mandatory:true,  est:10, actual:10 },
    { id:"f3", name:"Exfoliant",                category:"Consumable", unit:"ml",      mandatory:false, est:5,  actual:5 },
    { id:"f4", name:"Serum cartridge",          category:"Cartridge",  unit:"pcs",     mandatory:true,  est:1,  actual:1 },
    { id:"f5", name:"Sheet mask",               category:"Consumable", unit:"pcs",     mandatory:false, est:1,  actual:0 },
    { id:"f6", name:"Moisturiser",              category:"Topical",    unit:"g",       mandatory:false, est:2,  actual:2 },
  ],
  Acne:       [
    { id:"a1", name:"Disposable gloves",        category:"PPE",        unit:"pair",    mandatory:true,  est:2,  actual:2 },
    { id:"a2", name:"LED mask session",         category:"Equipment",  unit:"session", mandatory:true,  est:1,  actual:1 },
    { id:"a3", name:"Extraction tool covers",   category:"Consumable", unit:"pcs",     mandatory:true,  est:2,  actual:2 },
    { id:"a4", name:"Anti-acne topical",        category:"Topical",    unit:"ml",      mandatory:false, est:2,  actual:2 },
    { id:"a5", name:"Gauze pads",               category:"Consumable", unit:"pcs",     mandatory:false, est:4,  actual:4 },
  ],
  Scar:       [
    { id:"s1", name:"Disposable gloves",        category:"PPE",        unit:"pair",    mandatory:true,  est:2,  actual:2 },
    { id:"s2", name:"Microneedling cartridge",  category:"Cartridge",  unit:"pcs",     mandatory:true,  est:1,  actual:1 },
    { id:"s3", name:"Numbing cream",            category:"Topical",    unit:"g",       mandatory:false, est:5,  actual:5 },
    { id:"s4", name:"Growth factor serum",      category:"Topical",    unit:"ml",      mandatory:false, est:3,  actual:3 },
    { id:"s5", name:"Gauze pads",               category:"Consumable", unit:"pcs",     mandatory:true,  est:6,  actual:6 },
    { id:"s6", name:"Alcohol wipes",            category:"Consumable", unit:"pcs",     mandatory:true,  est:3,  actual:3 },
  ],
  Injectable: [
    { id:"i1", name:"Disposable gloves",        category:"PPE",        unit:"pair",    mandatory:true,  est:1,  actual:1 },
    { id:"i2", name:"Syringes 1ml",             category:"Medical",    unit:"pcs",     mandatory:true,  est:3,  actual:3 },
    { id:"i3", name:"Needles 30G",              category:"Medical",    unit:"pcs",     mandatory:true,  est:5,  actual:5 },
    { id:"i4", name:"Alcohol swabs",            category:"Consumable", unit:"pcs",     mandatory:true,  est:6,  actual:6 },
    { id:"i5", name:"Ice pack",                 category:"Consumable", unit:"pcs",     mandatory:false, est:1,  actual:0 },
  ],
  RF:         [
    { id:"r1", name:"Disposable gloves",        category:"PPE",        unit:"pair",    mandatory:true,  est:1,  actual:1 },
    { id:"r2", name:"Conductive gel",           category:"Consumable", unit:"ml",      mandatory:true,  est:20, actual:20 },
    { id:"r3", name:"Coupling disk",            category:"Consumable", unit:"pcs",     mandatory:true,  est:1,  actual:1 },
    { id:"r4", name:"Soothing serum",           category:"Topical",    unit:"ml",      mandatory:false, est:3,  actual:3 },
  ],
};

function getBom(serviceType: string): BomItem[] {
  const s = serviceType.toLowerCase();
  const template =
    s.includes("laser") || s.includes("carbon") ? BOM.Laser :
    s.includes("peel") ? BOM.Peel :
    s.includes("facial") || s.includes("hydra") ? BOM.Facial :
    s.includes("acne") ? BOM.Acne :
    s.includes("scar") || s.includes("microneedling") || s.includes("dermafrac") || s.includes("subcision") ? BOM.Scar :
    s.includes("botox") || s.includes("filler") ? BOM.Injectable :
    s.includes("thermage") || s.includes("gentle touch") ? BOM.RF :
    [
      { id:"d1", name:"Disposable gloves", category:"PPE",        unit:"pair", mandatory:true,  est:1, actual:1 },
      { id:"d2", name:"Gauze pads",        category:"Consumable", unit:"pcs",  mandatory:false, est:4, actual:4 },
      { id:"d3", name:"Alcohol wipes",     category:"Consumable", unit:"pcs",  mandatory:true,  est:2, actual:2 },
    ];
  return template.map(i => ({ ...i }));
}

const BODY_TYPES = ["Type I — Very Fair","Type II — Fair","Type III — Medium","Type IV — Olive","Type V — Brown","Type VI — Dark"];
const LEAD_TYPE_OPTIONS = ["website_form","chatbot","call","referral","campaign","walk_in"];
const DISPOSITION_OPTIONS = ["New Consultation","Follow-up Visit","Treatment Session","Package Session","Product Purchase","Consultation + Treatment"];
const SUB_DISP_OPTIONS = ["New Patient","Existing Patient","Re-engagement","Referral Patient","VIP / Premium"];

type Tab = "booking" | "treatment" | "inventory" | "checkout" | "prescription";

// What the clinic manager needs to do at each status
const NEXT_STEP: Record<string, { msg: string; action?: string }> = {
  booked:     { msg: "Call the patient to confirm they're coming.", action: "Mark as Confirmed once called." },
  confirmed:  { msg: "Patient confirmed. Mark as Arrived when they walk in.", action: "Click 'Patient Arrived' below." },
  arrived:    { msg: "Patient is here. Go to the Treatment tab to start the session.", action: "Open Treatment tab →" },
  in_session: { msg: "Session in progress. Fill treatment notes, then complete.", action: "Complete in Treatment tab →" },
  converted:  { msg: "Session done. Record the materials used in the Inventory tab.", action: "Open Inventory tab →" },
  rescheduled:{ msg: "Appointment rescheduled. Update the time in Booking Details.", action: "" },
  no_show:    { msg: "Patient did not show up.", action: "" },
};

// ── Detail drawer ─────────────────────────────────────────────────────────────
function DetailDrawer({
  appt, allAppts, date, onClose, onStatusChange, onConvert, onTimeChange,
}: {
  appt: AppointmentRow;
  allAppts: AppointmentRow[];
  date: string;
  onClose: () => void;
  onStatusChange: (id: number, s: string) => void;
  onConvert: (id: number) => void;
  onTimeChange: (id: number, ts: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("booking");
  const [saving, setSaving] = useState(false);
  const [fnoSubmitted, setFnoSubmitted] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);

  // Booking form state
  const [fields, setFields] = useState({
    appointment_time: appt.appointment_ts.slice(11, 16),
    service_type:     appt.service_type,
    email:            appt.email ?? "",
    lead_type:        appt.lead_type ?? "call",
    campaign:         appt.campaign ?? "",
    disposition:      appt.disposition ?? "",
    sub_disposition:  appt.sub_disposition ?? "",
    referred_by:      appt.referred_by ?? "",
    notes:            appt.notes ?? "",
  });

  // Treatment state
  const [photos, setPhotos] = useState<{ angle: string; name: string }[]>([]);
  const [consentSigned, setConsentSigned] = useState(false);
  const [medHistory, setMedHistory] = useState("");
  const [bodyType, setBodyType] = useState("");
  const [treatmentNotes, setTreatmentNotes] = useState("");
  const [startedAt, setStartedAt] = useState<string | null>(null);

  // Inventory (FnO) state
  const [bom, setBom] = useState<BomItem[]>(() => getBom(appt.service_type));

  const clash = hasClash(appt, allAppts);
  const [saved, setSaved] = useState(false);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await panelRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  // Auto-switch tab when status advances
  useEffect(() => {
    if (["booked","confirmed","arrived","in_consultation","in_session"].includes(appt.status)) setTab("booking");
    else if (appt.status === "consultation_done") setTab("prescription");
    else if (appt.status === "in_treatment") setTab("treatment");
    else if (["treatment_done","done","converted"].includes(appt.status)) setTab("prescription");
  }, [appt.status]);

  // ── Save booking fields ────────────────────────────────────────────────────
  const saveBooking = async () => {
    setSaving(true);
    setSaved(false);
    const newTs = `${date} ${fields.appointment_time}:00`;
    try {
      const res = await fetch(`/api/appointments/${appt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointment_ts:  newTs,
          service_type:    fields.service_type,
          email:           fields.email,
          lead_type:       fields.lead_type,
          campaign:        fields.campaign,
          disposition:     fields.disposition,
          sub_disposition: fields.sub_disposition,
          referred_by:     fields.referred_by,
          notes:           fields.notes,
        }),
      });
      if (res.ok) {
        onTimeChange(appt.id, newTs);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } finally {
      setSaving(false);
    }
  };

  // ── Treatment actions ──────────────────────────────────────────────────────
  const savePractitioner = async (extra: Record<string, unknown> = {}) => {
    await fetch(`/api/manager/practitioner/${appt.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patient_id: appt.patient_id, photos, consent_signed: consentSigned,
        medical_history: medHistory, body_type: bodyType,
        treatment_notes: treatmentNotes, started_at: startedAt, ...extra,
      }),
    });
  };

  const handleStartSession = async () => {
    const now = new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit" }).format(new Date());
    setStartedAt(now);
    setSessionStarted(true);
    await savePractitioner({ started_at: now, status: "started" });
    onStatusChange(appt.id, "in_treatment");
  };

  const handleCompleteSession = async () => {
    setSaving(true);
    const now = new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit" }).format(new Date());
    await savePractitioner({ completed_at: now, status: "completed" });
    onConvert(appt.id);
    setSaving(false);
    setTab("inventory");
  };

  // ── FnO submit ─────────────────────────────────────────────────────────────
  const submitInventory = async () => {
    setSaving(true);
    await fetch(`/api/manager/fno/${appt.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patient_id: appt.patient_id, service_type: appt.service_type, bom_items: bom }),
    });
    setFnoSubmitted(true);
    setSaving(false);
  };

  // 5-node clustered pipeline: nodes 2 (Consultation) and 3 (Treatment) are dynamic clusters
  const PIPELINE_NODES = [
    { label: "Booked",      dot: "bg-slate-400" },
    { label: "Confirmed",   dot: "bg-blue-500" },
    { label: "Consultation",dot: "bg-amber-500" },  // cluster: arrived → in_consultation → consultation_done
    { label: "Treatment",   dot: "bg-orange-500" }, // cluster: in_treatment → treatment_done
    { label: "Done",        dot: "bg-success" },
  ];
  // Map each status to its node index
  const STATUS_TO_NODE: Record<string, number> = {
    booked:            0,
    confirmed:         1,
    arrived:           2, consultation_done: 2, in_consultation: 2, in_session: 2,
    in_treatment:      3, treatment_done: 3,
    done:              4, converted: 4,
  };
  // Dynamic dot & label inside active cluster node
  const CLUSTER_DOT: Record<string, string> = {
    arrived:           "bg-amber-500",
    in_consultation:   "bg-violet-500", in_session: "bg-violet-500",
    consultation_done: "bg-teal-500",
    in_treatment:      "bg-orange-500",
    treatment_done:    "bg-emerald-500",
  };
  const CLUSTER_SUBLABEL: Record<string, string> = {
    arrived:           "Arrived",
    in_consultation:   "In Consult", in_session: "In Consult",
    consultation_done: "Consult Done",
    in_treatment:      "In Treatment",
    treatment_done:    "Tx Done",
  };
  const pipeIdx = STATUS_TO_NODE[appt.status] ?? 0;

  // pipeIdx: 0=booked, 1=confirmed, 2=consultation cluster, 3=treatment cluster, 4=done
  const POST_CONSULT = ["consultation_done","in_treatment","treatment_done","done","converted"];
  const IN_TREATMENT  = ["in_treatment","treatment_done","done","converted"];
  // Checkout + Rx: only after consultation is marked done
  const checkoutLocked  = !POST_CONSULT.includes(appt.status);
  const rxLocked        = !POST_CONSULT.includes(appt.status);
  // Treatment: only after OTP submitted (in_treatment or later)
  const treatmentLocked = !IN_TREATMENT.includes(appt.status);
  const inventoryLocked = pipeIdx < 3; // unlocks from treatment cluster
  const checkoutDone    = pipeIdx >= 2 && !["arrived","in_consultation","in_session"].includes(appt.status);
  const treatmentDone   = pipeIdx >= 4 || appt.status === "treatment_done";

  const nextStep = NEXT_STEP[appt.status];
  const inventoryDone = fnoSubmitted;

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="fixed inset-0 bg-black/40" />
      <div
        ref={panelRef}
        className={`relative ml-auto flex h-full w-full ${isFullscreen ? "max-w-full" : "max-w-[560px]"} flex-col bg-card border-l border-border shadow-2xl overflow-hidden`}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-border shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${STATUS_DOT[appt.status] ?? "bg-gray-400"}`} />
              <h3 className="text-base font-bold">{appt.patient_name}</h3>
              <Badge variant="outline" className="text-[10px]">{STATUS_LABEL[appt.status] ?? appt.status}</Badge>
              {appt.contact_booking_number && (
                <span className="font-mono text-[10px] text-muted-foreground">#{appt.contact_booking_number}</span>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-1">{appt.service_type} · {appt.appointment_ts.slice(11,16)} · {appt.branch_name}</div>
            {clash && (
              <div className="flex items-center gap-1.5 text-xs text-destructive font-medium mt-1">
                <AlertTriangle className="h-3.5 w-3.5" />Doctor schedule clash
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              {isFullscreen ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/>
                  <path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/>
                  <path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>
                </svg>
              )}
            </button>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground mt-0.5 p-1">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ── Visual status pipeline ── */}
        <div className="px-5 py-3 border-b border-border bg-secondary/10 shrink-0 space-y-3">
          {/* 5-node clustered stepper */}
          <div className="flex items-center">
            {PIPELINE_NODES.map((node, i) => {
              const isDone   = pipeIdx > i;
              const isActive = pipeIdx === i;
              // Active cluster node: override dot color and label from current sub-state
              const activeDot   = isActive && CLUSTER_DOT[appt.status]      ? CLUSTER_DOT[appt.status]      : node.dot;
              const activeLabel = isActive && CLUSTER_SUBLABEL[appt.status]  ? CLUSTER_SUBLABEL[appt.status] : node.label;
              return (
                <div key={i} className="flex items-center flex-1 min-w-0">
                  <div className="flex flex-col items-center flex-1 min-w-0">
                    <div className={[
                      "flex h-6 w-6 items-center justify-center rounded-full text-white text-[9px] font-bold transition-all shrink-0",
                      isDone   ? "bg-success/70" : "",
                      isActive ? `${activeDot} ring-2 ring-offset-2 ring-current shadow-sm` : "",
                      !isDone && !isActive ? "bg-muted border border-border" : "",
                    ].join(" ")}>
                      {isDone ? "✓" : ""}
                    </div>
                    <div className={[
                      "text-[8px] mt-0.5 font-medium text-center leading-tight truncate w-full px-0.5",
                      isActive ? "text-foreground font-bold" : isDone ? "text-success/70" : "text-muted-foreground/40",
                    ].join(" ")}>{activeLabel}</div>
                  </div>
                  {i < PIPELINE_NODES.length - 1 && (
                    <div className={["h-0.5 flex-1 mx-1 shrink-0 transition-colors", isDone ? "bg-success/40" : "bg-border"].join(" ")} />
                  )}
                </div>
              );
            })}
          </div>

          {/* CTA block */}
          <div className="space-y-2">
            {appt.status === "booked" && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
                <div className="text-xs font-semibold text-blue-800 flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5" />Step 1 — Call to confirm
                </div>
                <a href={`tel:${appt.phone}`}
                  className="flex items-center gap-2 rounded-md bg-white border border-primary/30 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/5 transition-colors w-full justify-center">
                  📞 Call {appt.patient_name} · {appt.phone}
                </a>
                <Button className="w-full bg-success hover:bg-emerald-700 h-9"
                  onClick={() => onStatusChange(appt.id, "confirmed")}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />Mark as Called &amp; Confirmed
                </Button>
              </div>
            )}
            {appt.status === "confirmed" && (
              <div className="rounded-lg border border-border bg-secondary p-3 space-y-2">
                <div className="text-xs font-semibold text-amber-800">Step 2 — Mark arrived when patient walks in</div>
                <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white border-0 h-10"
                  onClick={() => onStatusChange(appt.id, "arrived")}>
                  Patient has Arrived →
                </Button>
              </div>
            )}
            {appt.status === "arrived" && (
              <div className="rounded-lg border border-violet-200 bg-violet-50 p-3 space-y-2">
                <div className="text-xs font-semibold text-violet-800">Patient is here — start the consultation</div>
                <Button className="w-full bg-violet-500 hover:bg-violet-600 text-white border-0 h-9"
                  onClick={() => onStatusChange(appt.id, "in_consultation")}>
                  Start Consultation →
                </Button>
              </div>
            )}
            {(appt.status === "in_consultation" || appt.status === "in_session") && (
              <div className="rounded-lg border border-violet-200 bg-violet-50 p-3 space-y-2">
                <div className="text-xs font-semibold text-violet-800">Consultation in progress</div>
                <Button className="w-full bg-teal-500 hover:bg-teal-600 text-white border-0 h-9"
                  onClick={() => onStatusChange(appt.id, "consultation_done")}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />Mark Consultation Done
                </Button>
              </div>
            )}
            {appt.status === "consultation_done" && (
              <div className="rounded-lg border border-teal-200 bg-teal-50 p-3 space-y-2">
                <div className="text-xs font-semibold text-teal-800">Consultation done ✓ — start treatment or mark done</div>
                <div className="flex gap-2">
                  <Button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white border-0 h-9"
                    onClick={() => onStatusChange(appt.id, "in_treatment")}>
                    Start Treatment →
                  </Button>
                  <Button className="flex-1 bg-success hover:bg-emerald-700 text-white border-0 h-9"
                    onClick={() => onStatusChange(appt.id, "done")}>
                    Mark Done ✓
                  </Button>
                </div>
              </div>
            )}
            {appt.status === "in_treatment" && (
              <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 space-y-2">
                <div className="text-xs font-semibold text-orange-800">Treatment in progress — fill notes in Treatment tab</div>
                <Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white border-0 h-9"
                  onClick={() => { onStatusChange(appt.id, "treatment_done"); setTab("prescription"); }}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />Mark Treatment Done
                </Button>
              </div>
            )}
            {appt.status === "treatment_done" && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 space-y-2">
                <div className="text-xs font-semibold text-emerald-800">Treatment done ✓ — record inventory then close</div>
                <div className="flex gap-2">
                  <Button className="flex-1 bg-success hover:bg-emerald-700 text-white border-0 h-9"
                    onClick={() => setTab("inventory")}>
                    Open Inventory →
                  </Button>
                  <Button className="flex-1 variant-outline h-9"
                    onClick={() => onStatusChange(appt.id, "done")}>
                    Mark Done ✓
                  </Button>
                </div>
              </div>
            )}
            {(appt.status === "done" || appt.status === "converted") && (
              <div className="rounded-lg border border-success/30 bg-success/5 p-3">
                <div className="text-xs font-semibold text-success flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />Session complete
                </div>
              </div>
            )}

            {/* Reschedule / no-show */}
            {!["done","converted","no_show","rescheduled"].includes(appt.status) && (
              <div className="flex gap-2 pt-1">
                {["booked","confirmed","arrived"].includes(appt.status) && (
                  <button className="flex-1 text-[11px] text-orange-600 border border-orange-200 rounded-md py-1.5 hover:bg-orange-50 transition-colors font-medium"
                    onClick={() => onStatusChange(appt.id, "rescheduled")}>Reschedule</button>
                )}
                <button className="flex-1 text-[11px] text-destructive border border-destructive/30 rounded-md py-1.5 hover:bg-destructive/5 transition-colors font-medium"
                  onClick={() => onStatusChange(appt.id, "no_show")}>No Show / Cancel</button>
              </div>
            )}
            {["no_show","rescheduled"].includes(appt.status) && (
              <div className="text-xs text-muted-foreground text-center py-1">
                {appt.status === "no_show" ? "Marked as no-show." : "Marked as rescheduled."}
                {" "}<button className="underline hover:text-foreground" onClick={() => onStatusChange(appt.id, "booked")}>Undo</button>
              </div>
            )}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex border-b border-border shrink-0 bg-card">
          {([
            { key: "booking",      label: "1. Booking",   icon: User,          locked: false,           done: false },
            { key: "checkout",     label: "2. Checkout",  icon: ShoppingBag,   locked: checkoutLocked,  done: checkoutDone },
            { key: "treatment",    label: "3. Treatment", icon: ClipboardList, locked: treatmentLocked, done: treatmentDone },
            { key: "prescription", label: "4. Rx",        icon: FileText,      locked: rxLocked,        done: false },
            { key: "inventory",    label: "5. Inventory", icon: Package,       locked: inventoryLocked, done: inventoryDone },
          ] as { key: Tab; label: string; icon: any; locked: boolean; done: boolean }[]).map(t => (
            <button
              key={t.key}
              onClick={() => !t.locked && setTab(t.key)}
              className={[
                "flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium border-b-2 transition-colors",
                tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground",
                t.locked ? "opacity-35 cursor-not-allowed" : "hover:text-foreground cursor-pointer",
              ].join(" ")}
            >
              <div className="flex items-center gap-1">
                {t.done
                  ? <CheckCircle2 className="h-3.5 w-3.5 text-success0" />
                  : <t.icon className="h-3.5 w-3.5" />}
                {t.label}
              </div>
              <div className="text-[9px] font-normal text-muted-foreground">
                {t.done ? "✓ Done" : t.locked ? "Locked" : "Pending"}
              </div>
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}
        <div className="flex-1 overflow-y-auto">

          {/* ══ TAB 1: BOOKING DETAILS ══ */}
          {tab === "booking" && (
            <div className="p-5 space-y-4">
              {/* Identity row — read only */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg bg-secondary/40 px-4 py-3 text-sm">
                {[
                  ["Patient", appt.patient_name],
                  ["Phone",   appt.phone],
                  ["Branch",  appt.branch_name],
                  ["Doctor",  appt.doctor_name ? (appt.doctor_name.startsWith("Dr") ? appt.doctor_name : "Dr. " + appt.doctor_name) : "—"],
                ].map(([l,v]) => (
                  <div key={l}>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{l}</div>
                    <div className="font-semibold mt-0.5 text-sm">{v}</div>
                  </div>
                ))}
              </div>

              {/* Editable fields */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Time">
                    <input type="time" value={fields.appointment_time}
                      onChange={e => setFields(p => ({ ...p, appointment_time: e.target.value }))}
                      className={INPUT_CLS} />
                  </Field>
                  <Field label="Email">
                    <input type="email" value={fields.email}
                      onChange={e => setFields(p => ({ ...p, email: e.target.value }))}
                      placeholder="patient@email.com" className={INPUT_CLS} />
                  </Field>
                </div>

                <Field label="Treatment / Service">
                  <input value={fields.service_type}
                    onChange={e => setFields(p => ({ ...p, service_type: e.target.value }))}
                    className={INPUT_CLS} />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Lead Source">
                    <select value={fields.lead_type}
                      onChange={e => setFields(p => ({ ...p, lead_type: e.target.value }))}
                      className={INPUT_CLS}>
                      {LEAD_TYPE_OPTIONS.map(o => (
                        <option key={o} value={o}>{LEAD_TYPE_STYLE[o]?.label ?? o}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label={fields.lead_type === "referral" ? "Referred By" : "Campaign / Source"}>
                    <input value={fields.lead_type === "referral" ? fields.referred_by : fields.campaign}
                      onChange={e => setFields(p => fields.lead_type === "referral"
                        ? ({ ...p, referred_by: e.target.value })
                        : ({ ...p, campaign: e.target.value })
                      )}
                      placeholder={fields.lead_type === "referral" ? "Referrer name" : "Campaign name"}
                      className={INPUT_CLS} />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Disposition">
                    <select value={fields.disposition}
                      onChange={e => setFields(p => ({ ...p, disposition: e.target.value }))}
                      className={INPUT_CLS}>
                      <option value="">Select…</option>
                      {DISPOSITION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </Field>
                  <Field label="Sub-disposition">
                    <select value={fields.sub_disposition}
                      onChange={e => setFields(p => ({ ...p, sub_disposition: e.target.value }))}
                      className={INPUT_CLS}>
                      <option value="">Select…</option>
                      {SUB_DISP_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </Field>
                </div>

                <Field label="Notes">
                  <textarea rows={2} value={fields.notes}
                    onChange={e => setFields(p => ({ ...p, notes: e.target.value }))}
                    placeholder="Any notes for this appointment…"
                    className={INPUT_CLS + " resize-none"} />
                </Field>
              </div>

              <Button className="w-full" onClick={saveBooking} disabled={saving}>
                {saving ? "Saving…" : saved
                  ? <><CheckCircle2 className="h-4 w-4 mr-2 text-emerald-400" />Saved!</>
                  : <><Save className="h-4 w-4 mr-2" />Save Changes</>}
              </Button>
            </div>
          )}

          {/* ══ TAB 2: CHECKOUT ══ */}
          {tab === "checkout" && (
            <div className="p-5">
              {checkoutLocked ? (
                <div className="rounded-lg border border-border bg-secondary/30 p-6 text-center space-y-1">
                  <ShoppingBag className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                  <div className="text-sm font-medium">Checkout unlocks after consultation</div>
                  <div className="text-xs text-muted-foreground">Complete the consultation first, then select items here.</div>
                </div>
              ) : (
                <CheckoutFlow
                  appointmentId={appt.id}
                  patientId={appt.patient_id}
                  patientName={appt.patient_name}
                  serviceType={appt.service_type}
                  onClose={() => setTab("booking")}
                  onStartTreatment={() => setTab("treatment")}
                />
              )}
            </div>
          )}

          {/* ══ TAB 3: TREATMENT ══ */}
          {tab === "treatment" && (
            <div className="p-5 space-y-4">
              {treatmentLocked ? (
                <div className="rounded-lg border border-border bg-secondary/30 p-6 text-center space-y-1">
                  <ClipboardList className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                  <div className="text-sm font-medium">Treatment unlocks after OTP verification</div>
                  <div className="text-xs text-muted-foreground">Patient must verify the OTP and start treatment first.</div>
                </div>
              ) : (
                <>
                  {/* Progress chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: `Photos (${photos.length}/4)`, done: photos.length > 0 },
                      { label: "Consent", done: consentSigned },
                      { label: "History", done: !!medHistory },
                      { label: "Started", done: !!startedAt },
                      { label: "Notes", done: !!treatmentNotes },
                    ].map(c => (
                      <span key={c.label} className={[
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold border",
                        c.done ? "bg-success/10 text-success border-success/30" : "bg-secondary text-muted-foreground border-border",
                      ].join(" ")}>
                        {c.done && <CheckCircle2 className="h-2.5 w-2.5" />}
                        {c.label}
                      </span>
                    ))}
                  </div>

                  {/* Photos + Consent */}
                  <div className="space-y-2">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Before Photos</div>
                    <div className="grid grid-cols-4 gap-2">
                      {["Front","Left","Right","Close-up"].map(angle => {
                        const captured = photos.find(p => p.angle === angle);
                        return (
                          <label key={angle} className={"flex flex-col items-center justify-center gap-1 rounded-lg border-2 cursor-pointer p-2 transition-colors " + (captured ? "border-success/60 bg-success/5" : "border-dashed border-border bg-secondary/20 hover:bg-secondary/60")}>
                            {captured ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Camera className="h-4 w-4 text-muted-foreground" />}
                            <span className="text-[10px] text-center">{angle}</span>
                            <input type="file" accept="image/*" className="sr-only"
                              onChange={e => {
                                if (e.target.files?.[0]) {
                                  const f = e.target.files[0];
                                  setPhotos(prev => [...prev.filter(p => p.angle !== angle), { angle, name: f.name }]);
                                }
                              }} />
                          </label>
                        );
                      })}
                    </div>
                    <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                      <input type="checkbox" checked={consentSigned} onChange={e => setConsentSigned(e.target.checked)} className="h-4 w-4 accent-primary" />
                      <span>Consent form signed &amp; uploaded</span>
                    </label>
                  </div>

                  {/* Medical history + skin type */}
                  <div className="space-y-2">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Medical History &amp; Contraindications</div>
                    <textarea rows={2} value={medHistory} onChange={e => setMedHistory(e.target.value)}
                      placeholder="Allergies, current medications, skin conditions…"
                      className={INPUT_CLS + " resize-none"} />
                    <div className="grid grid-cols-2 gap-1.5">
                      {BODY_TYPES.map(bt => (
                        <button key={bt} onClick={() => setBodyType(bt)}
                          className={"rounded border px-2 py-1.5 text-xs text-left transition-colors " + (bodyType === bt ? "border-primary bg-primary/10 text-primary font-semibold" : "border-border hover:bg-secondary")}>
                          {bt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Session start */}
                  {startedAt ? (
                    <div className="flex items-center gap-2 rounded-lg bg-success/5 border border-success/30 px-3 py-2.5 text-sm text-success font-medium">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />Session started at {startedAt}
                    </div>
                  ) : (
                    <Button className="w-full bg-primary hover:bg-primary/90" onClick={handleStartSession} disabled={saving}>
                      <Clock className="h-4 w-4 mr-2" />Start Session Now
                    </Button>
                  )}

                  {/* Treatment notes + complete (after session started) */}
                  {(appt.status === "in_session" || startedAt) && (
                    <div className="space-y-3">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Treatment Notes</div>
                      <textarea rows={4} value={treatmentNotes} onChange={e => setTreatmentNotes(e.target.value)}
                        placeholder="Parameters used, patient response, observations, next session plan…"
                        className={INPUT_CLS + " resize-none"} />
                      {treatmentDone ? (
                        <div className="flex items-center gap-2 rounded-lg bg-success/5 border border-success/30 px-3 py-2.5 text-sm text-success font-medium">
                          <CheckCircle2 className="h-4 w-4 shrink-0" />Complete — record inventory in Inventory tab.
                        </div>
                      ) : (
                        <Button className="w-full bg-success hover:bg-emerald-700" onClick={handleCompleteSession} disabled={saving}>
                          {saving ? "Saving…" : <><CheckCircle2 className="h-4 w-4 mr-2" />Mark Complete &amp; Open Inventory</>}
                        </Button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ══ TAB 4: INVENTORY (FnO) ══ */}
          {tab === "inventory" && (
            <div className="p-5 space-y-4">
              {inventoryLocked ? (
                <div className="rounded-lg border border-border bg-secondary/30 p-6 text-center space-y-1">
                  <Package className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                  <div className="text-sm font-medium">Inventory tab unlocks after session starts</div>
                  <div className="text-xs text-muted-foreground">Complete the Treatment tab first.</div>
                </div>
              ) : fnoSubmitted ? (
                <div className="rounded-lg bg-success/5 border border-success/30 p-6 text-center space-y-2">
                  <CheckCircle2 className="h-10 w-10 text-success0 mx-auto" />
                  <div className="font-semibold text-success">Inventory updated</div>
                  <div className="text-sm text-muted-foreground">All material quantities deducted from clinic stock.</div>
                </div>
              ) : (
                <>
                  <div>
                    <div className="text-sm font-semibold">Bill of Materials</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      For: <span className="font-medium text-foreground">{appt.service_type}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 rounded-lg bg-primary/5 border border-primary/20 px-3 py-2">
                      <strong>How to use:</strong> Mandatory items are pre-filled — just verify the number. For Optional items, enter the actual quantity you used. Then click Submit.
                    </div>
                  </div>

                  <div className="rounded-lg border border-border overflow-hidden">
                    {/* Header */}
                    <div className="grid grid-cols-[1fr_56px_70px_76px] bg-secondary/50 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground border-b">
                      <span>Item</span>
                      <span className="text-center">Est.</span>
                      <span className="text-center">Actual used</span>
                      <span className="text-center">Type</span>
                    </div>
                    {bom.map((item, idx) => (
                      <div key={item.id}
                        className={"grid grid-cols-[1fr_56px_70px_76px] items-center px-3 py-3 " +
                          (idx < bom.length - 1 ? "border-b border-border/50 " : "") +
                          (item.mandatory ? "bg-secondary/10" : "bg-card")}>
                        <div>
                          <div className="text-sm font-medium leading-tight">{item.name}</div>
                          <div className="text-[10px] text-muted-foreground">{item.category} · {item.unit}</div>
                        </div>
                        <div className="text-center text-sm text-muted-foreground tabular-nums">{item.est}</div>
                        <div className="flex justify-center">
                          <input
                            type="number" min="0" value={item.actual}
                            readOnly={item.mandatory}
                            onChange={e => !item.mandatory && setBom(prev =>
                              prev.map(i => i.id === item.id ? { ...i, actual: Math.max(0, Number(e.target.value)) } : i)
                            )}
                            className={"w-14 rounded border text-center text-sm px-1 py-1 focus:outline-none focus:ring-1 focus:ring-ring tabular-nums " +
                              (item.mandatory
                                ? "bg-secondary/60 border-border text-muted-foreground cursor-default"
                                : "bg-background border-border hover:border-primary")}
                          />
                        </div>
                        <div className="flex justify-center">
                          <span className={"inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold border " +
                            (item.mandatory
                              ? "bg-primary/5 text-primary border-primary/30"
                              : "bg-secondary text-muted-foreground border-border")}>
                            {item.mandatory ? "Auto-fill" : "Enter qty"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-start gap-2.5 rounded-lg bg-secondary border border-border px-3 py-2.5">
                    <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">Submitting will permanently deduct these quantities from clinic inventory. Double-check before submitting.</p>
                  </div>

                  <Button className="w-full bg-success hover:bg-emerald-700 h-11" onClick={submitInventory} disabled={saving}>
                    {saving ? "Submitting…" : <><CheckCircle2 className="h-4 w-4 mr-2" />Submit &amp; Update Clinic Inventory</>}
                  </Button>
                </>
              )}
            </div>
          )}

          {/* ══ TAB 5: RX / PRODUCTS ══ */}
          {tab === "prescription" && (
            <div className="p-5">
              {rxLocked ? (
                <div className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                  Prescription available after the consultation is marked done.
                </div>
              ) : (
                <>
                  <div className="text-xs text-muted-foreground mb-4">
                    Review prescription and select what the patient is taking today.
                  </div>
                  <CheckoutFlow
                    appointmentId={appt.id}
                    patientId={appt.patient_id}
                    patientName={appt.patient_name}
                    serviceType={appt.service_type}
                    onClose={() => setTab("booking")}
                  />
                </>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const INPUT_CLS = "w-full rounded-md border border-border bg-secondary/30 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
        dangerouslySetInnerHTML={{ __html: label }} />
      {children}
    </div>
  );
}

function StepBlock({ num, title, desc, done = false, children }: {
  num: number; title: string; desc: string; done?: boolean; children?: React.ReactNode;
}) {
  return (
    <div className={"rounded-lg border p-4 " + (done ? "border-success/30 bg-success/5/50" : "border-border bg-card")}>
      <div className="flex items-start gap-3">
        <div className={"flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold " +
          (done ? "bg-success/50 text-white" : "bg-primary text-primary-foreground")}>
          {done ? <CheckCircle2 className="h-4 w-4" /> : num}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold" dangerouslySetInnerHTML={{ __html: title }} />
          <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
          {children}
        </div>
      </div>
    </div>
  );
}

