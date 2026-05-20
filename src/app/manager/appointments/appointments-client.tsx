"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, X, Clock, User, Phone, Mail, MapPin, Stethoscope, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { AppointmentRow } from "@/lib/db";

// ── Layout constants ──────────────────────────────────────────────────────────
const LABEL_W = 220;         // px, left column
const PX_PER_HOUR = 150;     // px per hour on the timeline
const HOUR_START = 8;
const HOUR_END = 20;
const TOTAL_HOURS = HOUR_END - HOUR_START;
const TIMELINE_W = TOTAL_HOURS * PX_PER_HOUR; // 1800px
const ROW_H = 110;           // px per room row
const HEADER_H = 36;
const CARD_MIN_W = 160;      // minimum card width so text is readable

const PX_PER_MIN = PX_PER_HOUR / 60;

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

// ── Status styles ─────────────────────────────────────────────────────────────
const STATUS_BG: Record<string, string> = {
  booked:    "border-blue-300 bg-blue-50 text-blue-900",
  confirmed: "border-emerald-300 bg-emerald-50 text-emerald-900",
  converted: "border-green-300 bg-green-100/60 text-green-900 opacity-70",
  no_show:   "border-border bg-secondary/40 text-muted-foreground opacity-40",
};
const STATUS_DOT: Record<string, string> = {
  booked: "bg-blue-400", confirmed: "bg-emerald-500", converted: "bg-green-600", no_show: "bg-gray-400",
};
const STATUS_LABEL: Record<string, string> = {
  booked: "Booked", confirmed: "Confirmed", converted: "In clinic ✓", no_show: "No Show",
};

// ── Main component ────────────────────────────────────────────────────────────
export function AppointmentsClient({
  initialAppointments,
  initialDate,
}: {
  initialAppointments: AppointmentRow[];
  initialDate: string;
}) {
  const [date, setDate] = useState(initialDate);
  const [appts, setAppts] = useState<AppointmentRow[]>(initialAppointments);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<AppointmentRow | null>(null);

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

  const pending = appts.filter(a => a.status === "booked" || a.status === "confirmed").length;

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
          {pending > 0 && <Badge variant="accent" className="text-[10px]">{pending} pending</Badge>}
        </div>
        <input
          type="date" value={date}
          onChange={e => e.target.value && fetchDate(e.target.value)}
          className="h-8 rounded-md border border-border bg-secondary text-sm px-3 focus:outline-none"
        />
        <Button variant="secondary" size="sm" onClick={() => navigate(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
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
                const roomAppts = appts.filter(a => getRoom(a.service_type) === room.key);
                const bookedMinutes = roomAppts
                  .filter(a => a.status !== "no_show")
                  .reduce((acc, a) => acc + getDuration(a), 0);
                const bookedHours = (bookedMinutes / 60).toFixed(1);
                const pct = Math.round((bookedMinutes / (TOTAL_HOURS * 60)) * 100);

                return (
                  <div key={room.key} className="flex border-b last:border-b-0">
                    {/* Room label */}
                    <div
                      className="shrink-0 border-r border-border bg-card px-4 py-3 sticky left-0 z-10 flex flex-col justify-between"
                      style={{ width: LABEL_W, minHeight: ROW_H }}
                    >
                      <div>
                        <div className="text-sm font-semibold text-foreground leading-tight">{room.label}</div>
                        {room.subtitle && (
                          <div className="text-[10px] text-amber-600 font-medium mt-0.5">{room.subtitle}</div>
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
                    <div className="relative bg-card" style={{ width: TIMELINE_W, height: ROW_H }}>
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
                        const clash = hasClash(a, appts);
                        const doctorShort = a.doctor_name
                          ? (a.doctor_name.startsWith("Dr") ? a.doctor_name : `Dr. ${a.doctor_name}`)
                          : null;

                        return (
                          <button
                            key={a.id}
                            onClick={() => setSelected(a)}
                            className={`absolute top-2 rounded-lg border text-left shadow-sm hover:shadow-md transition-all cursor-pointer ${STATUS_BG[a.status] ?? "border-border bg-card"} ${clash ? "ring-2 ring-red-400 ring-offset-1" : ""}`}
                            style={{ left, width, bottom: 8, overflow: "hidden", zIndex: 1 }}
                          >
                            <div className="px-2.5 py-2 h-full flex flex-col justify-between gap-0.5">
                              {/* Row 1: dot + name + clash icon */}
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className={`h-2 w-2 rounded-full shrink-0 ${STATUS_DOT[a.status] ?? "bg-gray-400"}`} />
                                <span className="font-semibold text-[12px] leading-tight truncate flex-1">{a.patient_name}</span>
                                {clash && <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />}
                              </div>
                              {/* Row 2: service */}
                              <div className="text-[10px] text-muted-foreground truncate pl-3.5">{a.service_type}</div>
                              {/* Row 3: doctor + time + modify */}
                              <div className="flex items-center justify-between gap-1 pl-3.5">
                                {doctorShort && (
                                  <span className="text-[10px] font-medium text-muted-foreground truncate">{doctorShort}</span>
                                )}
                                <span className="text-[9px] text-muted-foreground/70 shrink-0 ml-auto">
                                  {a.appointment_ts.slice(11, 16)}
                                </span>
                              </div>
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
            {(["booked", "confirmed", "converted", "no_show"] as const).map(s => (
              <span key={s} className="flex items-center gap-1">
                <span className={`h-2 w-2 rounded-full ${STATUS_DOT[s]}`} />
                {STATUS_LABEL[s]} ({appts.filter(a => a.status === s).length})
              </span>
            ))}
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
  const [modifyMode, setModifyMode] = useState(false);
  const [newTime, setNewTime] = useState(appt.appointment_ts.slice(11, 16));

  const clash = hasClash(appt, allAppts);
  const dur = getDuration(appt);
  const location = [appt.city, appt.state].filter(Boolean).join(", ");

  const saveTime = () => {
    const newTs = `${date} ${newTime}:00`;
    onTimeChange(appt.id, newTs);
    setModifyMode(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-black/40" />
      <div
        className="relative w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-border">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className={`h-2 w-2 rounded-full shrink-0 ${STATUS_DOT[appt.status] ?? "bg-gray-400"}`} />
              <h3 className="text-base font-bold text-foreground">{appt.patient_name}</h3>
              <Badge variant="outline" className="text-[10px]">{STATUS_LABEL[appt.status] ?? appt.status}</Badge>
              {appt.guest_code && (
                <span className="font-mono text-[10px] text-muted-foreground">GDRC{String(appt.patient_id + 10000)}</span>
              )}
            </div>
            {clash && (
              <div className="flex items-center gap-1.5 text-xs text-red-600 font-medium">
                <AlertTriangle className="h-3.5 w-3.5" />
                Doctor schedule clash — check timing
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground mt-0.5">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3">
          {/* Time row */}
          <div className="flex items-start gap-3">
            <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="flex-1">
              {modifyMode ? (
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={newTime}
                    onChange={e => setNewTime(e.target.value)}
                    className="h-8 rounded-md border border-border bg-secondary text-sm px-2 focus:outline-none"
                  />
                  <Button size="sm" onClick={saveTime}>Save</Button>
                  <button onClick={() => setModifyMode(false)} className="text-xs text-muted-foreground hover:text-foreground underline">Cancel</button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{appt.appointment_ts.slice(11, 16)}</span>
                  <span className="text-xs text-muted-foreground">· {dur} min</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setModifyMode(true)}
                    className="ml-1"
                  >
                    ✏️ Modify
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Service */}
          <div className="flex items-start gap-3">
            <Stethoscope className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <div className="text-sm font-medium">{appt.service_type}</div>
              <div className="text-xs text-muted-foreground">{appt.branch_name}</div>
            </div>
          </div>

          {/* Doctor */}
          {appt.doctor_name && (
            <div className="flex items-start gap-3">
              <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <div className="text-sm font-medium">{appt.doctor_name?.startsWith("Dr") ? appt.doctor_name : `Dr. ${appt.doctor_name}`}</div>
                {clash && <div className="text-xs text-red-600">Timing conflict with another appointment</div>}
              </div>
            </div>
          )}

          {/* Contact */}
          <div className="flex items-start gap-3">
            <Phone className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="text-sm">{appt.phone}</div>
          </div>

          {appt.email && (
            <div className="flex items-start gap-3">
              <Mail className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="text-sm">{appt.email}</div>
            </div>
          )}

          {/* Location */}
          {location && (
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="text-sm">{location}</div>
            </div>
          )}

          {/* Referred by */}
          {appt.referred_by && (
            <div className="flex items-start gap-3">
              <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Referred by</div>
                <div className="text-sm">{appt.referred_by}</div>
              </div>
            </div>
          )}

          {/* Booking ref */}
          {appt.contact_booking_number && (
            <div className="text-xs text-muted-foreground font-mono">
              Booking ref: {appt.contact_booking_number}
            </div>
          )}

          {appt.notes && (
            <div className="rounded-lg bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
              {appt.notes}
            </div>
          )}
        </div>

        {/* Actions */}
        {appt.status !== "converted" && appt.status !== "no_show" && (
          <div className="flex gap-2 flex-wrap px-5 pb-5">
            {appt.status === "booked" && (
              <Button size="sm" variant="secondary" onClick={() => onStatusChange(appt.id, "confirmed")}>
                ✓ Called & Confirmed
              </Button>
            )}
            <Button size="sm" onClick={() => onConvert(appt.id)}>
              Patient Arrived →
            </Button>
            <Button size="sm" variant="secondary" onClick={() => onStatusChange(appt.id, "no_show")} className="text-muted-foreground">
              No Show
            </Button>
          </div>
        )}
        {appt.status === "converted" && (
          <div className="px-5 pb-5 text-sm text-green-700 font-medium">Patient is in clinic — added to live check-ins.</div>
        )}
      </div>
    </div>
  );
}
