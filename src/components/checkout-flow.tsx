"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Stethoscope, Receipt, KeyRound, Printer, CheckCircle2, Loader2, Pencil, Tag, X, Plus, MessageSquare,
} from "lucide-react";
import { inr } from "@/lib/utils";

export function serviceTypeBadgeCls(serviceType: string): string {
  const s = serviceType.toLowerCase();
  if (s.includes("laser") || s.includes("q-switch") || s.includes("carbon")) return "bg-primary/10 text-primary border-primary/20";
  if (s.includes("peel") || s.includes("peeling")) return "bg-secondary text-muted-foreground border-border";
  if (s.includes("microneedling")) return "bg-blue-100 text-blue-700 border-blue-200";
  if (s.includes("acne")) return "bg-orange-100 text-orange-700 border-orange-200";
  if (s.includes("prp") || s.includes("gfc") || s.includes("hair")) return "bg-destructive/10 text-destructive border-destructive/20";
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

type CheckoutPhase = "items" | "consultation" | "treatment_otp" | "receipt";
type ReceiptItem = { name: string; cost: number | null };

// ── Line item with editable price + discount ─────────────────────────────────
type LineItem = {
  id: number;
  product: string;
  product_detail: string;
  basePrice: number;        // fetched from catalog or entered by manager
  discountPct: number;      // 0-100
  priceOverride: boolean;   // true if manager manually set the price
  isTreatment: boolean;     // true if an in-clinic procedure
  isExtra: boolean;         // true if added manually (not from Rx)
};

// Clinic's standard promo discount (applied with one tap)
const PROMO_DISCOUNT_PCT = 10;

// Fallback prices for common product categories when catalog has no match
const FALLBACK_PRICES: [RegExp, number][] = [
  [/serum/i,        1800],
  [/cream/i,         950],
  [/shampoo/i,       750],
  [/tablet|capsule/i,650],
  [/sunscreen|spf/i, 950],
  [/gel/i,           750],
  [/wash|cleanser/i, 750],
  [/powder/i,       1500],
  [/solution/i,      850],
];

function fallbackPrice(name: string): number {
  for (const [re, price] of FALLBACK_PRICES) {
    if (re.test(name)) return price;
  }
  return 999; // generic product default
}

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
  productsOnly = false,
}: {
  appointmentId: number;
  patientId: number;
  patientName: string;
  serviceType: string;
  onClose: () => void;
  onStartTreatment?: () => void;
  productsOnly?: boolean;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<CheckoutPhase>("items");
  const [rxLoading, setRxLoading] = useState(true);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [selected, setSelected] = useState<boolean[]>([]);
  const [discountOpen, setDiscountOpen] = useState<boolean[]>([]);
  const [editingPrice, setEditingPrice] = useState<boolean[]>([]);
  const [otp] = useState(() => Math.floor(100000 + Math.random() * 900000).toString());
  const [otpConfirmed, setOtpConfirmed] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [receiptData, setReceiptData] = useState<{ items: ReceiptItem[]; total: number; type: string } | null>(null);

  // ── Extra product add-on ─────────────────────────────────────────────────────
  const [extraProductName, setExtraProductName] = useState("");

  // ── Load ALL prescription items (treatments + products) on mount ─────────────
  const loadRx = async () => {
    setRxLoading(true);
    try {
      const res = await fetch(`/api/patients/${patientId}/portfolio`);
      const data = await res.json();
      const latest = data.portfolio?.prescriptions?.[0];
      let raw: any[] = latest?.items ?? [];

      // Include ALL Rx items — treatments AND take-home products
      if (raw.length === 0) {
        raw = [{ product: serviceType, product_detail: "Appointment service fee", cost: null }];
      }

      // Fetch catalog prices for each item
      const priceResults = await Promise.all(
        raw.map(it =>
          fetch(`/api/catalog/price?name=${encodeURIComponent(it.product ?? it.name ?? "")}`)
            .then(r => r.json())
            .then(j => j.price as number | null)
            .catch(() => null)
        )
      );

      const items: LineItem[] = raw.map((it, i) => {
        const catalogPrice = priceResults[i];
        const existingCost = it.cost != null ? Number(it.cost) : null;
        const productName  = it.product ?? it.name ?? "";
        const basePrice = existingCost ?? catalogPrice ?? fallbackPrice(productName);
        return {
          id: i,
          product: productName,
          product_detail: it.product_detail ?? "",
          basePrice,
          discountPct: 0,
          priceOverride: existingCost != null,
          isTreatment: isClinicProcedure(it),
          isExtra: false,
        };
      });

      // In productsOnly mode (Rx tab), strip in-clinic procedures — patient is buying take-home products
      const filtered = productsOnly ? items.filter(it => !it.isTreatment) : items;
      setLineItems(filtered);
      setSelected(filtered.map(() => true));
      setDiscountOpen(filtered.map(() => false));
      setEditingPrice(filtered.map(() => false));
    } catch (e) {
      console.error(e);
      const fallback: LineItem[] = [{
        id: 0, product: serviceType, product_detail: "Appointment service fee",
        basePrice: fallbackPrice(serviceType), discountPct: 0, priceOverride: false,
        isTreatment: false, isExtra: false,
      }];
      setLineItems(fallback);
      setSelected([true]);
      setDiscountOpen([false]);
      setEditingPrice([false]);
    }
    setRxLoading(false);
  };

  // Auto-load on mount
  useEffect(() => { loadRx(); }, []);

  // ── Derived values ────────────────────────────────────────────────────────────
  const selectedItems = lineItems.filter((_, i) => selected[i]);
  const selectedProducts = selectedItems.filter(it => !it.isTreatment);
  const selectedTreatments = selectedItems.filter(it => it.isTreatment);
  const total = selectedProducts.reduce((s, it) => s + lineTotal(it), 0);
  const hasSelectedTreatment = selectedTreatments.length > 0;

  const updateItem = (id: number, patch: Partial<LineItem>) => {
    setLineItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it));
  };

  const addExtraProduct = () => {
    const name = extraProductName.trim();
    if (!name) return;
    const newId = Date.now(); // unique id
    const basePrice = fallbackPrice(name);
    setLineItems(prev => [...prev, {
      id: newId, product: name, product_detail: "",
      basePrice, discountPct: 0, priceOverride: false,
      isTreatment: false, isExtra: true,
    }]);
    setSelected(prev => [...prev, true]);
    setDiscountOpen(prev => [...prev, false]);
    setEditingPrice(prev => [...prev, false]);
    setExtraProductName("");
  };

  const handleCollect = () => {
    if (!productsOnly && hasSelectedTreatment) {
      setPhase("treatment_otp");
    } else {
      const items: ReceiptItem[] = selectedProducts.map(it => ({ name: it.product, cost: lineTotal(it) }));
      setReceiptData({ items, total, type: "products" });
      setPhase("receipt");
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────

  if (phase === "items") {
    if (rxLoading) return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground justify-center">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading prescription &amp; prices…
      </div>
    );

    const treatments = lineItems.filter(it => it.isTreatment);
    const products = lineItems.filter(it => !it.isTreatment);

    const renderItem = (it: LineItem, i: number) => {
      const globalIndex = lineItems.indexOf(it);
      const final = lineTotal(it);
      const hasDiscount = it.discountPct > 0;
      return (
        <div
          key={it.id}
          className={[
            "rounded-xl border transition-colors",
            selected[globalIndex]
              ? (it.isTreatment ? "border-primary/30 bg-primary/5" : "border-success/30 bg-success/5")
              : "border-border bg-card opacity-55",
          ].join(" ")}
        >
          {/* Main row */}
          <div className="flex items-start gap-3 px-3 pt-3 pb-2.5">
            <input
              type="checkbox"
              checked={selected[globalIndex]}
              onChange={() => setSelected(s => s.map((v, idx) => idx === globalIndex ? !v : v))}
              className={`h-4 w-4 rounded mt-1 shrink-0 cursor-pointer ${it.isTreatment ? "accent-violet-600" : "accent-emerald-600"}`}
            />
            {/* Name + detail */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold leading-tight">{it.product}</span>
                {it.isTreatment && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide bg-primary/10 text-primary border border-primary/20 rounded px-1.5 py-0.5">
                    Treatment
                  </span>
                )}
                {it.isExtra && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide bg-blue-100 text-blue-700 border border-blue-200 rounded px-1.5 py-0.5">
                    Add-on
                  </span>
                )}
              </div>
              {it.product_detail && (
                <div className="text-xs text-muted-foreground mt-0.5">{it.product_detail}</div>
              )}
            </div>
            {/* Price badge */}
            <div className="shrink-0 text-right">
              {it.isTreatment ? (
                <span className="text-xs text-muted-foreground">via package</span>
              ) : hasDiscount ? (
                <div className="flex flex-col items-end">
                  <span className="text-xs line-through text-muted-foreground tabular-nums">{inr(it.basePrice)}</span>
                  <span className="text-base font-bold text-emerald-700 tabular-nums leading-tight">{inr(final)}</span>
                </div>
              ) : (
                <span className="text-base font-bold tabular-nums text-emerald-700">{inr(it.basePrice)}</span>
              )}
            </div>
          </div>

          {/* Action row — only when selected and not a treatment */}
          {selected[globalIndex] && !it.isTreatment && (
            <div className="flex items-center gap-2 px-3 pb-2.5 border-t border-emerald-200/60 pt-2 flex-wrap">
              {editingPrice[globalIndex] ? (
                <div className="flex items-center gap-1 rounded-lg border border-border bg-white px-2 py-1">
                  <span className="text-[11px] text-muted-foreground">₹</span>
                  <input
                    type="number"
                    min={0}
                    autoFocus
                    value={it.basePrice === 0 ? "" : it.basePrice}
                    placeholder="0"
                    onChange={e => updateItem(it.id, { basePrice: Number(e.target.value) || 0, priceOverride: true })}
                    onBlur={() => setEditingPrice(p => p.map((v, j) => j === globalIndex ? false : v))}
                    className="w-20 text-xs font-semibold text-right focus:outline-none bg-transparent tabular-nums"
                  />
                  <button
                    onClick={() => setEditingPrice(p => p.map((v, j) => j === globalIndex ? false : v))}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditingPrice(p => p.map((v, j) => j === globalIndex ? true : v))}
                  className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground border border-border rounded-lg px-2 py-1 bg-white hover:bg-secondary transition-colors"
                >
                  <Pencil className="h-3 w-3" />
                  {it.basePrice === 0 ? "Enter price" : "Edit price"}
                </button>
              )}

              {it.discountPct > 0 ? (
                <div className="flex items-center gap-1.5 rounded-lg border border-success/30 bg-success/5 px-2 py-1">
                  <Tag className="h-3 w-3 text-emerald-600 shrink-0" />
                  <span className="text-[11px] text-emerald-700 font-semibold">{PROMO_DISCOUNT_PCT}% offer → {inr(final)}</span>
                  <button
                    onClick={() => updateItem(it.id, { discountPct: 0 })}
                    className="text-emerald-500 hover:text-emerald-700 ml-0.5"
                    title="Remove discount"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => updateItem(it.id, { discountPct: PROMO_DISCOUNT_PCT })}
                  className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 border border-primary/30 rounded-lg px-2 py-1 bg-white hover:bg-primary/5 transition-colors font-medium"
                >
                  <Tag className="h-3 w-3" />
                  Apply clinic offer
                </button>
              )}
            </div>
          )}
        </div>
      );
    };

    return (
      <div className="space-y-3">
        <div className="text-xs text-muted-foreground">
          Select what <span className="font-semibold text-foreground">{patientName}</span> is taking today
        </div>

        {/* Treatments section */}
        {treatments.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-violet-600 flex items-center gap-1.5">
              <Stethoscope className="h-3 w-3" /> In-Clinic Treatments
            </div>
            {treatments.map((it) => renderItem(it, lineItems.indexOf(it)))}
          </div>
        )}

        {/* Products section */}
        {products.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
              Take-Home Products
            </div>
            {products.map((it) => renderItem(it, lineItems.indexOf(it)))}
          </div>
        )}

        {/* Add extra product */}
        <div className="flex gap-2 pt-1">
          <input
            type="text"
            placeholder="Add extra product (not in Rx)…"
            value={extraProductName}
            onChange={e => setExtraProductName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addExtraProduct()}
            className="flex-1 rounded-lg border border-dashed border-border bg-card px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
          />
          <button
            onClick={addExtraProduct}
            disabled={!extraProductName.trim()}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary hover:bg-secondary/80 disabled:opacity-40 px-3 py-2 text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>

        {/* Footer bar */}
        <div className="flex items-center justify-between pt-2 border-t border-border gap-3 flex-wrap">
          <div className="text-sm">
            {selectedItems.length > 0 ? (
              <>
                <span className="text-muted-foreground">{selectedItems.length} selected · </span>
                {hasSelectedTreatment && (
                  <span className="text-violet-700 font-semibold mr-2">{selectedTreatments.length} treatment{selectedTreatments.length !== 1 ? "s" : ""}</span>
                )}
                {selectedProducts.length > 0 && (
                  <span className="font-bold text-base">{inr(total)}</span>
                )}
              </>
            ) : (
              <span className="text-muted-foreground text-xs">Nothing selected</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPhase("consultation")}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card hover:bg-secondary px-3 py-2 text-xs font-medium text-muted-foreground transition-colors"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Consultation only
            </button>
            <button
              onClick={handleCollect}
              disabled={selectedItems.length === 0}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 text-white ${
                hasSelectedTreatment
                  ? "bg-primary hover:bg-primary/90"
                  : "bg-success hover:bg-success/90"
              }`}
            >
              {hasSelectedTreatment ? (
                <><Stethoscope className="h-4 w-4" />Confirm treatment →</>
              ) : (
                <><Receipt className="h-4 w-4" />Collect {inr(total)} →</>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "consultation") return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">Consultation only — no purchase</span>
        <button onClick={() => setPhase("items")} className="text-xs text-muted-foreground underline hover:text-foreground">← Back</button>
      </div>
      <div className="rounded-xl border border-border bg-secondary px-5 py-4 text-center space-y-1">
        <div className="text-3xl font-bold tabular-nums">₹0</div>
        <div className="text-xs text-muted-foreground">Consultation — no products or treatment taken</div>
      </div>
      <button
        onClick={() => { setReceiptData({ items: [], total: 0, type: "consultation" }); setPhase("receipt"); }}
        className="w-full flex items-center justify-center gap-2 rounded-lg bg-foreground hover:bg-foreground/80 text-white px-4 py-2.5 text-sm font-semibold transition-colors"
      >
        <Receipt className="h-4 w-4" />Close &amp; print receipt →
      </button>
    </div>
  );

  if (phase === "treatment_otp") return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">Treatment confirmation</span>
        <button onClick={() => setPhase("items")} className="text-xs text-muted-foreground underline hover:text-foreground">← Back</button>
      </div>
      <div className="rounded-xl border border-primary/20 bg-primary/5 px-6 py-5 text-center space-y-2">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-violet-600 mb-3"><KeyRound className="h-4 w-4 inline mr-1.5" />Patient OTP</div>
        <div className="text-5xl font-bold tracking-[0.2em] font-mono text-violet-900">{otp.slice(0, 3)}-{otp.slice(3)}</div>
        <div className="text-xs text-violet-700 mt-2">Share this code with the patient for confirmation</div>
      </div>
      <div className="space-y-2">
        <div className="text-xs text-center text-violet-600 font-medium">Patient enters the code below to confirm:</div>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          value={otpInput}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, "").slice(0, 6);
            setOtpInput(val);
            if (val === otp) setOtpConfirmed(true);
          }}
          placeholder="— — — — — —"
          className="w-full text-center text-3xl font-mono tracking-[0.4em] rounded-xl border border-primary/30 py-3 px-4 focus:outline-none focus:border-primary bg-white placeholder:text-muted-foreground/40"
        />
        {otpInput.length === 6 && !otpConfirmed && (
          <div className="text-xs text-red-600 text-center font-medium">Incorrect code — please try again</div>
        )}
      </div>
      {otpConfirmed && (
        <div className="space-y-2">
          <button
            onClick={() => {
              // Also collect any selected products
              const items: ReceiptItem[] = [
                ...selectedTreatments.map(it => ({ name: it.product, cost: null })),
                ...selectedProducts.map(it => ({ name: it.product, cost: lineTotal(it) })),
              ];
              const prodTotal = selectedProducts.reduce((s, it) => s + lineTotal(it), 0);
              setReceiptData({ items, total: prodTotal, type: "treatment" });
              setPhase("receipt");
            }}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary hover:bg-primary/90 text-white px-4 py-2.5 text-sm font-semibold transition-colors"
          >
            <Receipt className="h-4 w-4" />Confirm &amp; generate receipt
          </button>
          <button
            onClick={() => onStartTreatment ? onStartTreatment() : router.push(`/manager/appointments?open=${appointmentId}`)}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-violet-400 bg-white hover:bg-violet-50 text-violet-700 px-4 py-2.5 text-sm font-semibold transition-colors"
          >
            <Stethoscope className="h-4 w-4" />Start treatment → Consent · Photos · Session
          </button>
        </div>
      )}
    </div>
  );

  if (phase === "receipt" && receiptData) return (
    <ReceiptView patientName={patientName} serviceType={serviceType} data={receiptData} onClose={() => { setPhase("items"); onClose(); }} />
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
      <div className="rounded-xl border border-border bg-white overflow-hidden">
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
