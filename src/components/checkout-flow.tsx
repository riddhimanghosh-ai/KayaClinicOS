"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShoppingBag, MessageSquare, Stethoscope, Receipt, KeyRound, Printer, CheckCircle2, Loader2,
} from "lucide-react";
import { inr } from "@/lib/utils";

export function serviceTypeBadgeCls(serviceType: string): string {
  const s = serviceType.toLowerCase();
  if (s.includes("laser") || s.includes("q-switch") || s.includes("carbon")) return "bg-violet-100 text-violet-700 border-violet-200";
  if (s.includes("peel") || s.includes("peeling")) return "bg-amber-100 text-amber-700 border-amber-200";
  if (s.includes("microneedling")) return "bg-blue-100 text-blue-700 border-blue-200";
  if (s.includes("acne")) return "bg-orange-100 text-orange-700 border-orange-200";
  if (s.includes("prp") || s.includes("gfc") || s.includes("hair")) return "bg-rose-100 text-rose-700 border-rose-200";
  if (s.includes("consultation")) return "bg-slate-100 text-slate-600 border-slate-200";
  return "bg-secondary text-muted-foreground border-border";
}

type CheckoutPhase = "choose" | "products" | "consultation" | "treatment_otp" | "receipt";
type ReceiptItem = { name: string; cost: number | null };

export function CheckoutFlow({
  appointmentId,
  patientId,
  patientName,
  serviceType,
  onClose,
  onStartTreatment,
}: {
  appointmentId: number;
  patientId: number;
  patientName: string;
  serviceType: string;
  onClose: () => void;
  onStartTreatment?: () => void;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<CheckoutPhase>("choose");
  const [rxLoading, setRxLoading] = useState(false);
  const [rxItems, setRxItems] = useState<any[]>([]);
  const [selected, setSelected] = useState<boolean[]>([]);
  const [otp] = useState(() => Math.floor(100000 + Math.random() * 900000).toString());
  const [otpConfirmed, setOtpConfirmed] = useState(false);
  const [receiptData, setReceiptData] = useState<{ items: ReceiptItem[]; total: number; type: string } | null>(null);

  const loadRx = async () => {
    setRxLoading(true);
    try {
      const res = await fetch(`/api/patients/${patientId}/portfolio`);
      const data = await res.json();
      const latest = data.portfolio?.prescriptions?.[0];
      const items: any[] = latest?.items ?? [];
      setRxItems(items);
      setSelected(items.map(() => true));
    } catch {}
    setRxLoading(false);
  };

  const goProducts = async () => { await loadRx(); setPhase("products"); };
  const selectedRxItems = rxItems.filter((_, i) => selected[i]);
  const total = selectedRxItems.reduce((s, it) => s + (Number(it.cost) || 0), 0);

  const collectAndReceipt = (type: "products" | "consultation") => {
    const items: ReceiptItem[] = type === "products"
      ? selectedRxItems.map(it => ({ name: it.product ?? it.name ?? "", cost: it.cost ?? null }))
      : [];
    setReceiptData({ items, total: type === "products" ? total : 0, type });
    setPhase("receipt");
  };

  if (phase === "choose") return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground">
        What is <span className="font-semibold text-foreground">{patientName}</span> purchasing today?
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <button onClick={goProducts} className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50 hover:bg-emerald-100 px-4 py-5 text-emerald-800 transition-colors text-center">
          <ShoppingBag className="h-6 w-6 text-emerald-600" />
          <span className="font-semibold text-sm">Products only</span>
          <span className="text-[11px] text-emerald-700 leading-snug">Buy items from prescription</span>
        </button>
        <button onClick={() => setPhase("consultation")} className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 px-4 py-5 text-slate-700 transition-colors text-center">
          <MessageSquare className="h-6 w-6 text-slate-500" />
          <span className="font-semibold text-sm">Consultation only</span>
          <span className="text-[11px] text-slate-600 leading-snug">Close with ₹0 receipt</span>
        </button>
        <button onClick={() => setPhase("treatment_otp")} className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-violet-300 bg-violet-50 hover:bg-violet-100 px-4 py-5 text-violet-800 transition-colors text-center">
          <Stethoscope className="h-6 w-6 text-violet-600" />
          <span className="font-semibold text-sm">Treatment</span>
          <span className="text-[11px] text-violet-700 leading-snug">Confirm with OTP — then start session</span>
        </button>
      </div>
    </div>
  );

  if (phase === "products") {
    if (rxLoading) return <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading prescription…</div>;
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Select items patient is purchasing</span>
          <button onClick={() => setPhase("choose")} className="text-xs text-muted-foreground underline hover:text-foreground">← Back</button>
        </div>
        {rxItems.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-6 text-center text-xs text-muted-foreground">No prescription found. Ask the doctor to generate one first.</div>
        ) : (
          <div className="space-y-1.5">
            {rxItems.map((it, i) => (
              <label key={i} className={["flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors", selected[i] ? "border-emerald-300 bg-emerald-50" : "border-border bg-card opacity-60"].join(" ")}>
                <input type="checkbox" checked={selected[i]} onChange={() => setSelected(s => s.map((v, idx) => idx === i ? !v : v))} className="h-4 w-4 rounded accent-emerald-600" />
                <span className="flex-1 text-sm font-medium">{it.product ?? it.name}</span>
                {it.product_detail && <span className="text-xs text-muted-foreground">{it.product_detail}</span>}
                <span className="text-sm font-semibold tabular-nums">{it.cost != null ? inr(it.cost) : <span className="text-muted-foreground">—</span>}</span>
              </label>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between pt-1 border-t border-border">
          <div className="text-sm"><span className="text-muted-foreground">{selectedRxItems.length} items · </span><span className="font-bold text-base">{inr(total)}</span></div>
          <button onClick={() => collectAndReceipt("products")} disabled={selectedRxItems.length === 0} className="flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 text-sm font-semibold transition-colors">
            <Receipt className="h-4 w-4" />Collect {inr(total)} →
          </button>
        </div>
      </div>
    );
  }

  if (phase === "consultation") return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">Consultation only — no purchase</span>
        <button onClick={() => setPhase("choose")} className="text-xs text-muted-foreground underline hover:text-foreground">← Back</button>
      </div>
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 text-center space-y-1">
        <div className="text-3xl font-bold tabular-nums">₹0</div>
        <div className="text-xs text-muted-foreground">Consultation — no products or treatment taken</div>
      </div>
      <button onClick={() => collectAndReceipt("consultation")} className="w-full flex items-center justify-center gap-2 rounded-lg bg-slate-700 hover:bg-slate-800 text-white px-4 py-2.5 text-sm font-semibold transition-colors">
        <Receipt className="h-4 w-4" />Close &amp; print receipt →
      </button>
    </div>
  );

  if (phase === "treatment_otp") return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">Treatment confirmation</span>
        <button onClick={() => setPhase("choose")} className="text-xs text-muted-foreground underline hover:text-foreground">← Back</button>
      </div>
      <div className="rounded-xl border-2 border-violet-200 bg-violet-50 px-6 py-5 text-center space-y-2">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-violet-600 mb-3"><KeyRound className="h-4 w-4 inline mr-1.5" />Patient OTP</div>
        <div className="text-5xl font-bold tracking-[0.2em] font-mono text-violet-900">{otp.slice(0, 3)}-{otp.slice(3)}</div>
        <div className="text-xs text-violet-700 mt-2">Read this code to the patient and ask them to confirm it</div>
      </div>
      {!otpConfirmed ? (
        <button onClick={() => setOtpConfirmed(true)} className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-violet-400 bg-white hover:bg-violet-50 text-violet-800 px-4 py-2.5 text-sm font-semibold transition-colors">
          <CheckCircle2 className="h-4 w-4" />Patient confirmed OTP ✓
        </button>
      ) : (
        <button
          onClick={() => onStartTreatment ? onStartTreatment() : router.push(`/manager/appointments?open=${appointmentId}`)}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 text-sm font-semibold transition-colors"
        >
          <Stethoscope className="h-4 w-4" />Start treatment → Consent · Photos · Session
        </button>
      )}
    </div>
  );

  if (phase === "receipt" && receiptData) return (
    <ReceiptView patientName={patientName} serviceType={serviceType} data={receiptData} onClose={() => { setPhase("choose"); onClose(); }} />
  );

  return null;
}

export function ReceiptView({
  patientName, serviceType, data, onClose,
}: {
  patientName: string;
  serviceType: string;
  data: { items: ReceiptItem[]; total: number; type: string };
  onClose: () => void;
}) {
  const dateStr = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  const timeStr = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-emerald-700 flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4" /> Payment collected
        </span>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="flex items-center gap-1.5 rounded-lg border border-border bg-card hover:bg-secondary px-3 py-1.5 text-xs font-medium transition-colors">
            <Printer className="h-3.5 w-3.5" /> Print
          </button>
          <button onClick={onClose} className="flex items-center gap-1.5 rounded-lg border border-border bg-card hover:bg-secondary px-3 py-1.5 text-xs font-medium transition-colors">
            Close
          </button>
        </div>
      </div>

      {/* Receipt card */}
      <div className="rounded-xl border border-border bg-white overflow-hidden shadow-sm">
        <div className="h-1.5 w-full bg-[#1f7a5a]" />
        <div className="px-5 py-4 space-y-4">
          {/* Header */}
          <div>
            <div className="text-2xl font-bold tracking-tight lowercase">kaya</div>
            <div className="text-[9px] font-semibold tracking-[0.18em] text-[#6b7280]">SKIN · HAIR · BODY</div>
          </div>
          {/* Patient + service band */}
          <div className="grid grid-cols-2 gap-3 border-y border-[#e5e7eb] py-3 text-xs">
            <div><div className="text-[9px] uppercase tracking-wide text-[#9ca3af] font-semibold">Patient</div><div className="font-semibold mt-0.5">{patientName}</div></div>
            <div><div className="text-[9px] uppercase tracking-wide text-[#9ca3af] font-semibold">Service</div><div className="font-semibold mt-0.5">{serviceType}</div></div>
            <div><div className="text-[9px] uppercase tracking-wide text-[#9ca3af] font-semibold">Date</div><div className="font-semibold mt-0.5">{dateStr}</div></div>
            <div><div className="text-[9px] uppercase tracking-wide text-[#9ca3af] font-semibold">Time</div><div className="font-semibold mt-0.5">{timeStr}</div></div>
          </div>
          {/* Items */}
          {data.items.length > 0 && (
            <div className="space-y-1">
              {data.items.map((it, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-[#374151]">{it.name}</span>
                  <span className="font-medium tabular-nums">{it.cost != null ? inr(it.cost) : "—"}</span>
                </div>
              ))}
            </div>
          )}
          {/* Total */}
          <div className="border-t border-[#e5e7eb] pt-3 flex justify-between items-center">
            <span className="text-sm font-bold">Total</span>
            <span className="text-xl font-bold text-[#1f7a5a] tabular-nums">{inr(data.total)}</span>
          </div>
          {/* PAID stamp */}
          <div className="flex justify-end">
            <div className="rotate-[-2deg] rounded border-4 border-emerald-600 px-4 py-1.5 text-emerald-600 font-black text-xl tracking-widest opacity-90 select-none">
              PAID
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
