"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShoppingBag, MessageSquare, Stethoscope, Receipt, KeyRound, Printer, CheckCircle2, Loader2, Pencil, Tag, ChevronDown, X,
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

// ── Is this item an in-clinic procedure (not a take-home product)? ──────────
function isClinicProcedure(item: { product?: string; name?: string; product_detail?: string }): boolean {
  const name = (item.product ?? item.name ?? "").toLowerCase();
  const detail = (item.product_detail ?? "").toLowerCase();
  const combined = `${name} ${detail}`;

  const PROCEDURE_KEYWORDS = [
    "laser", "q-switch", "q switch", "carbon peel", "peel", "microneedling", "dermafrac",
    "subcision", "prp", "gfc", "rf therapy", "thermage", "gentle touch", "hydrafacial",
    "hydra facial", "led therapy", "led session", "botox", "filler", "injection",
    "treatment session", "in-clinic", "in clinic", "appointment service", "session",
    "therapy", "procedure", "peeling",
  ];
  return PROCEDURE_KEYWORDS.some(kw => combined.includes(kw));
}

type CheckoutPhase = "choose" | "products" | "consultation" | "treatment_otp" | "receipt";
type ReceiptItem = { name: string; cost: number | null };

// ── Line item with editable price + discount ─────────────────────────────────
type LineItem = {
  id: number;
  product: string;
  product_detail: string;
  basePrice: number;        // fetched from catalog or entered by manager
  discountPct: number;      // 0-100
  priceOverride: boolean;   // true if manager manually set the price
};

function lineTotal(item: LineItem): number {
  return Math.round(item.basePrice * (1 - item.discountPct / 100));
}

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
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [selected, setSelected] = useState<boolean[]>([]);
  const [discountOpen, setDiscountOpen] = useState<boolean[]>([]);
  const [editingPrice, setEditingPrice] = useState<boolean[]>([]);
  const [otp] = useState(() => Math.floor(100000 + Math.random() * 900000).toString());
  const [otpConfirmed, setOtpConfirmed] = useState(false);
  const [receiptData, setReceiptData] = useState<{ items: ReceiptItem[]; total: number; type: string } | null>(null);

  // ── Load prescription items, filter procedures, fetch prices ────────────────
  const loadRx = async () => {
    setRxLoading(true);
    try {
      const res = await fetch(`/api/patients/${patientId}/portfolio`);
      const data = await res.json();
      const latest = data.portfolio?.prescriptions?.[0];
      let raw: any[] = latest?.items ?? [];

      // Only keep take-home products; if none found fall back to the appointment service
      let productItems = raw.filter(it => !isClinicProcedure(it));
      if (productItems.length === 0) {
        // Fallback: charge for the appointment service itself
        productItems = [{ product: serviceType, product_detail: "Appointment service fee", cost: null }];
      }

      // Fetch catalog prices for each item
      const priceResults = await Promise.all(
        productItems.map(it =>
          fetch(`/api/catalog/price?name=${encodeURIComponent(it.product ?? it.name ?? "")}`)
            .then(r => r.json())
            .then(j => j.price as number | null)
            .catch(() => null)
        )
      );

      const items: LineItem[] = productItems.map((it, i) => {
        const catalogPrice = priceResults[i];
        const existingCost = it.cost != null ? Number(it.cost) : null;
        // Priority: existing saved cost → catalog price → 0 (manager must enter)
        const basePrice = existingCost ?? catalogPrice ?? 0;
        return {
          id: i,
          product: it.product ?? it.name ?? "",
          product_detail: it.product_detail ?? "",
          basePrice,
          discountPct: 0,
          priceOverride: existingCost != null,
        };
      });

      setLineItems(items);
      setSelected(items.map(() => true));
      setDiscountOpen(items.map(() => false));
      setEditingPrice(items.map(() => false));
    } catch (e) {
      console.error(e);
      // Even on error, show the service type as a fallback item
      const fallback = [{ id: 0, product: serviceType, product_detail: "Appointment service fee", basePrice: 0, discountPct: 0, priceOverride: false }];
      setLineItems(fallback);
      setSelected([true]);
      setDiscountOpen([false]);
      setEditingPrice([false]);
    }
    setRxLoading(false);
  };

  const goProducts = async () => { await loadRx(); setPhase("products"); };

  const selectedItems = lineItems.filter((_, i) => selected[i]);
  const total = selectedItems.reduce((s, it) => s + lineTotal(it), 0);

  const updateItem = (id: number, patch: Partial<LineItem>) => {
    setLineItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it));
  };

  const collectAndReceipt = (type: "products" | "consultation") => {
    const items: ReceiptItem[] = type === "products"
      ? selectedItems.map(it => ({ name: it.product, cost: lineTotal(it) }))
      : [];
    setReceiptData({ items, total: type === "products" ? total : 0, type });
    setPhase("receipt");
  };

  // ─────────────────────────────────────────────────────────────────────────────

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
    if (rxLoading) return (
      <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading prescription &amp; prices…
      </div>
    );

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Prescription items</span>
          <button onClick={() => setPhase("choose")} className="text-xs text-muted-foreground underline hover:text-foreground">← Back</button>
        </div>

        <div className="space-y-2">
          {lineItems.map((it, i) => {
            const final = lineTotal(it);
            const hasDiscount = it.discountPct > 0;
            return (
              <div
                key={it.id}
                className={[
                  "rounded-xl border transition-colors",
                  selected[i] ? "border-emerald-300 bg-emerald-50" : "border-border bg-card opacity-55",
                ].join(" ")}
              >
                {/* Main row */}
                <div className="flex items-start gap-3 px-3 pt-3 pb-2.5">
                  <input
                    type="checkbox"
                    checked={selected[i]}
                    onChange={() => setSelected(s => s.map((v, idx) => idx === i ? !v : v))}
                    className="h-4 w-4 rounded accent-emerald-600 mt-1 shrink-0 cursor-pointer"
                  />
                  {/* Name + detail */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold leading-tight">{it.product}</div>
                    {it.product_detail && (
                      <div className="text-xs text-muted-foreground mt-0.5">{it.product_detail}</div>
                    )}
                  </div>
                  {/* Price badge */}
                  <div className="shrink-0 text-right">
                    {hasDiscount ? (
                      <div className="flex flex-col items-end">
                        <span className="text-xs line-through text-muted-foreground tabular-nums">{inr(it.basePrice)}</span>
                        <span className="text-base font-bold text-emerald-700 tabular-nums leading-tight">{inr(final)}</span>
                      </div>
                    ) : (
                      <span className={`text-base font-bold tabular-nums ${it.basePrice === 0 ? "text-amber-500" : "text-emerald-700"}`}>
                        {it.basePrice === 0 ? "₹—" : inr(final)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action row — only when selected */}
                {selected[i] && (
                  <div className="flex items-center gap-2 px-3 pb-2.5 border-t border-emerald-200/60 pt-2 flex-wrap">
                    {/* Edit price toggle */}
                    {editingPrice[i] ? (
                      <div className="flex items-center gap-1 rounded-lg border border-border bg-white px-2 py-1">
                        <span className="text-[11px] text-muted-foreground">₹</span>
                        <input
                          type="number"
                          min={0}
                          autoFocus
                          value={it.basePrice === 0 ? "" : it.basePrice}
                          placeholder="0"
                          onChange={e => updateItem(it.id, { basePrice: Number(e.target.value) || 0, priceOverride: true })}
                          onBlur={() => setEditingPrice(p => p.map((v, j) => j === i ? false : v))}
                          className="w-20 text-xs font-semibold text-right focus:outline-none bg-transparent tabular-nums"
                        />
                        <button
                          onClick={() => setEditingPrice(p => p.map((v, j) => j === i ? false : v))}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingPrice(p => p.map((v, j) => j === i ? true : v))}
                        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground border border-border rounded-lg px-2 py-1 bg-white hover:bg-secondary transition-colors"
                      >
                        <Pencil className="h-3 w-3" />
                        {it.basePrice === 0 ? "Enter price" : "Edit price"}
                      </button>
                    )}

                    {/* Apply discount toggle */}
                    {!discountOpen[i] ? (
                      <button
                        onClick={() => setDiscountOpen(p => p.map((v, j) => j === i ? true : v))}
                        className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 border border-primary/30 rounded-lg px-2 py-1 bg-white hover:bg-primary/5 transition-colors font-medium"
                      >
                        <Tag className="h-3 w-3" />
                        Apply discount offer
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 rounded-lg border border-primary/30 bg-white px-2 py-1">
                        <Tag className="h-3 w-3 text-primary shrink-0" />
                        <input
                          type="number"
                          min={0}
                          max={100}
                          autoFocus
                          value={it.discountPct || ""}
                          placeholder="0"
                          onChange={e => updateItem(it.id, { discountPct: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })}
                          className="w-8 text-xs font-bold text-center focus:outline-none bg-transparent tabular-nums text-primary"
                        />
                        <span className="text-[11px] text-muted-foreground">% off</span>
                        {it.discountPct > 0 && (
                          <span className="text-[10px] text-emerald-600 font-semibold">→ {inr(final)}</span>
                        )}
                        <button
                          onClick={() => { updateItem(it.id, { discountPct: 0 }); setDiscountOpen(p => p.map((v, j) => j === i ? false : v)); }}
                          className="text-muted-foreground hover:text-foreground ml-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    )}

                    {it.basePrice === 0 && !editingPrice[i] && (
                      <span className="text-[11px] text-amber-600 font-medium ml-auto">⚠ Enter price to collect</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-border">
          <div className="text-sm">
            <span className="text-muted-foreground">{selectedItems.length} item{selectedItems.length !== 1 ? "s" : ""} · </span>
            <span className="font-bold text-base">{inr(total)}</span>
            {selectedItems.some(it => it.discountPct > 0) && (
              <span className="ml-1.5 text-xs text-emerald-600 font-medium">
                (discount applied)
              </span>
            )}
          </div>
          <button
            onClick={() => collectAndReceipt("products")}
            disabled={selectedItems.length === 0}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 text-sm font-semibold transition-colors"
          >
            <Receipt className="h-4 w-4" />Collect {inr(total)} →
          </button>
        </div>
        {selectedItems.some(it => it.basePrice === 0) && (
          <p className="text-xs text-amber-600 text-right">⚠ Some items need a price — tap "Enter price" above.</p>
        )}
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
