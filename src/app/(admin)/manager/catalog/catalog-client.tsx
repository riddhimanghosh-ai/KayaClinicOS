"use client";

import { useState, useMemo } from "react";
import { Search, X, Tag, Sparkles, ShoppingBag, Beaker } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { inr } from "@/lib/utils";
import type { Service, Product } from "@/lib/types";

type CatalogItem = (Service | Product) & { _type: "service" | "product" };

// ── Stock badge ────────────────────────────────────────────────────────────────
function StockBadge({ qty }: { qty?: number | null }) {
  if (qty == null) return null;
  if (qty === 0) return (
    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-semibold bg-red-100 text-red-700">Out of stock</span>
  );
  if (qty <= 5) return (
    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-semibold bg-amber-100 text-amber-700">Low · {qty} left</span>
  );
  if (qty <= 15) return (
    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-semibold bg-blue-100 text-blue-700">{qty} in stock</span>
  );
  return (
    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-semibold bg-emerald-100 text-emerald-700">{qty} in stock</span>
  );
}

// ── Product card ───────────────────────────────────────────────────────────────
function CatalogCard({ item, onClick }: { item: CatalogItem; onClick: () => void }) {
  const hasDiscount = (item.discount_pct ?? 0) > 0;
  const discountedPrice = hasDiscount
    ? Math.round(item.price_inr * (1 - (item.discount_pct ?? 0) / 100))
    : null;
  const stock = item._type === "product" ? (item as Product).stock_qty : null;

  return (
    <button
      onClick={onClick}
      className="group text-left flex flex-col rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all p-4 space-y-2.5"
    >
      {/* Type icon band */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {item._type === "service" ? (
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-100">
              <Beaker className="h-3.5 w-3.5 text-violet-600" />
            </span>
          ) : (
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-100">
              <ShoppingBag className="h-3.5 w-3.5 text-amber-600" />
            </span>
          )}
          {!!item.is_new_launch && (
            <span className="rounded px-1.5 py-0.5 text-[9px] font-bold bg-emerald-500 text-white">NEW</span>
          )}
          {hasDiscount && (
            <span className="rounded px-1.5 py-0.5 text-[9px] font-bold bg-primary text-white">{item.discount_pct}% OFF</span>
          )}
        </div>
        {item.item_code && (
          <span className="font-mono text-[9px] text-muted-foreground shrink-0">{item.item_code}</span>
        )}
      </div>

      {/* Name */}
      <div className="text-sm font-semibold text-foreground leading-tight group-hover:text-primary transition-colors">
        {item.name}
      </div>

      {/* Description */}
      {item.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{item.description}</p>
      )}

      {/* Price + stock row */}
      <div className="flex items-end justify-between gap-2 pt-1 mt-auto">
        <div>
          {hasDiscount ? (
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-bold text-foreground">{inr(discountedPrice!)}</span>
              <span className="text-xs line-through text-muted-foreground">{inr(item.price_inr)}</span>
            </div>
          ) : (
            <span className="text-base font-bold text-foreground">{inr(item.price_inr)}</span>
          )}
        </div>
        <StockBadge qty={stock} />
      </div>
    </button>
  );
}

// ── Detail drawer ──────────────────────────────────────────────────────────────
function DetailDrawer({
  item,
  allItems,
  onClose,
}: {
  item: CatalogItem;
  allItems: CatalogItem[];
  onClose: () => void;
}) {
  const hasDiscount = (item.discount_pct ?? 0) > 0;
  const discountedPrice = hasDiscount
    ? Math.round(item.price_inr * (1 - (item.discount_pct ?? 0) / 100))
    : null;
  const stock = item._type === "product" ? (item as Product).stock_qty : null;

  // Alternatives: same category, same type, different item
  const alternatives = allItems.filter(
    a => a._type === item._type && a.category === item.category && a.id !== item.id
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-black/40" />
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-card border border-border shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={item._type === "service" ? "accent" : "outline"} className="text-[10px]">
                  {item._type === "service" ? "Service" : "Product"}
                </Badge>
                {item.category && (
                  <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{item.category}</span>
                )}
                {!!item.is_new_launch && (
                  <span className="rounded px-1.5 py-0.5 text-[9px] font-bold bg-emerald-500 text-white">NEW</span>
                )}
                {hasDiscount && (
                  <span className="rounded px-1.5 py-0.5 text-[9px] font-bold bg-primary text-white">{item.discount_pct}% OFF</span>
                )}
              </div>
              <h3 className="text-lg font-bold text-foreground leading-tight">{item.name}</h3>
              {item.item_code && (
                <span className="font-mono text-xs text-muted-foreground">{item.item_code}</span>
              )}
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground shrink-0 mt-1 p-1 rounded-lg hover:bg-secondary transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Description */}
          {item.description && (
            <p className="text-sm text-foreground leading-relaxed">{item.description}</p>
          )}

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-secondary/50 border border-border p-4">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Price</div>
              <div className="text-xl font-bold text-foreground">{hasDiscount ? inr(discountedPrice!) : inr(item.price_inr)}</div>
              {hasDiscount && (
                <div className="text-xs text-muted-foreground mt-0.5 line-through">{inr(item.price_inr)}</div>
              )}
            </div>
            {item._type === "product" ? (
              <div className="rounded-xl bg-secondary/50 border border-border p-4">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Stock</div>
                <div className="text-xl font-bold text-foreground">{(item as Product).stock_qty ?? 0}</div>
                <div className="mt-1">
                  <StockBadge qty={(item as Product).stock_qty} />
                </div>
              </div>
            ) : (item as Service).periodic_days != null && (item as Service).periodic_days! > 0 ? (
              <div className="rounded-xl bg-secondary/50 border border-border p-4">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Cadence</div>
                <div className="text-xl font-bold text-foreground">Every {(item as Service).periodic_days}d</div>
              </div>
            ) : null}
          </div>

          {/* Alternatives */}
          {alternatives.length > 0 && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Alternatives in {item.category}
              </div>
              <div className="space-y-2">
                {alternatives.slice(0, 4).map(alt => {
                  const altDiscount = (alt.discount_pct ?? 0) > 0;
                  const altPrice = altDiscount
                    ? Math.round(alt.price_inr * (1 - (alt.discount_pct ?? 0) / 100))
                    : alt.price_inr;
                  const altStock = alt._type === "product" ? (alt as Product).stock_qty : null;
                  return (
                    <div key={`${alt._type}-${alt.id}`} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-secondary/30 px-3 py-2.5">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground leading-tight truncate">{alt.name}</div>
                        {alt.description && (
                          <div className="text-xs text-muted-foreground mt-0.5 truncate">{alt.description}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <StockBadge qty={altStock} />
                        <span className="text-sm font-bold text-foreground whitespace-nowrap">{inr(altPrice)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
type StockFilter = "" | "discount" | "new_launch" | "low_stock" | "out_of_stock";

export function CatalogClient({ initialProducts, initialServices }: { initialProducts: Product[]; initialServices: Service[] }) {
  const [q, setQ] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "service" | "product">("all");
  const [stockFilter, setStockFilter] = useState<StockFilter>("");
  const [selected, setSelected] = useState<CatalogItem | null>(null);

  const allItems: CatalogItem[] = useMemo(() => [
    ...initialServices.map(s => ({ ...s, _type: "service" as const })),
    ...initialProducts.map(p => ({ ...p, _type: "product" as const })),
  ], [initialServices, initialProducts]);

  const categories = useMemo(() =>
    Array.from(new Set(allItems.map(i => i.category))).sort(),
    [allItems]
  );

  const filtered = useMemo(() => allItems.filter(item => {
    if (typeFilter !== "all" && item._type !== typeFilter) return false;
    if (categoryFilter && item.category !== categoryFilter) return false;
    if (stockFilter === "discount" && !((item.discount_pct ?? 0) > 0)) return false;
    if (stockFilter === "new_launch" && !item.is_new_launch) return false;
    if (stockFilter === "low_stock") {
      if (item._type !== "product") return false;
      const qty = (item as Product).stock_qty ?? 0;
      if (qty === 0 || qty > 5) return false;
    }
    if (stockFilter === "out_of_stock") {
      if (item._type !== "product") return false;
      if (((item as Product).stock_qty ?? 0) !== 0) return false;
    }
    if (q.trim()) {
      const qLower = q.toLowerCase();
      return (
        item.name.toLowerCase().includes(qLower) ||
        (item.item_code ?? "").toLowerCase().includes(qLower) ||
        item.category.toLowerCase().includes(qLower) ||
        (item.description ?? "").toLowerCase().includes(qLower) ||
        (item._type === "product" && (item as Product).sku.toLowerCase().includes(qLower))
      );
    }
    return true;
  }), [allItems, typeFilter, categoryFilter, stockFilter, q]);

  const discountCount   = allItems.filter(i => (i.discount_pct ?? 0) > 0).length;
  const newCount        = allItems.filter(i => i.is_new_launch).length;
  const lowStockCount   = allItems.filter(i => i._type === "product" && ((i as Product).stock_qty ?? 0) <= 5 && ((i as Product).stock_qty ?? 0) > 0).length;
  const outOfStockCount = allItems.filter(i => i._type === "product" && ((i as Product).stock_qty ?? 0) === 0).length;

  const toggleStock = (f: StockFilter) => setStockFilter(prev => prev === f ? "" : f);

  return (
    <div className="space-y-5">
      {/* ── Search + filter bar ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search by name, SKU, item code…"
            className="pl-10 h-10"
          />
          {q && (
            <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="h-10 min-w-[160px] rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">All categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <div className="flex gap-1.5">
          {(["all", "service", "product"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={[
                "inline-flex items-center gap-1.5 rounded-md px-3 h-10 text-sm font-medium transition-colors",
                typeFilter === t
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {t === "all" ? "All" : t === "service" ? <><Beaker className="h-3.5 w-3.5" />Services</> : <><ShoppingBag className="h-3.5 w-3.5" />Products</>}
            </button>
          ))}
        </div>
      </div>

      {/* ── Stats + clickable filter chips ── */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground">
          <span className="font-semibold text-foreground">{allItems.length}</span> items
          {" · "}<span className="font-semibold text-foreground">{initialServices.length}</span> services
          {" · "}<span className="font-semibold text-foreground">{initialProducts.length}</span> products
        </span>
        <span className="text-border">|</span>
        {[
          { key: "new_launch"   as StockFilter, label: `${newCount} new launches`,      icon: <Sparkles className="h-3 w-3" />, cls: "text-emerald-700 border-emerald-200 bg-emerald-50",   active: "bg-emerald-600 text-white border-emerald-600",  count: newCount },
          { key: "discount"     as StockFilter, label: `${discountCount} on discount`,  icon: <Tag className="h-3 w-3" />,      cls: "text-primary border-primary/20 bg-primary/5",       active: "bg-primary text-primary-foreground border-primary", count: discountCount },
          { key: "low_stock"    as StockFilter, label: `${lowStockCount} low stock`,    icon: null,                              cls: "text-amber-700 border-amber-200 bg-amber-50",       active: "bg-amber-500 text-white border-amber-500",       count: lowStockCount },
          { key: "out_of_stock" as StockFilter, label: `${outOfStockCount} out of stock`, icon: null,                           cls: "text-red-700 border-red-200 bg-red-50",             active: "bg-red-600 text-white border-red-600",           count: outOfStockCount },
        ].filter(f => f.count > 0).map(f => (
          <button
            key={f.key}
            onClick={() => toggleStock(f.key)}
            className={[
              "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-medium transition-colors",
              stockFilter === f.key ? f.active : f.cls,
            ].join(" ")}
          >
            {f.icon}{f.label}
          </button>
        ))}
        {(q || categoryFilter || typeFilter !== "all" || stockFilter) && (
          <span className="text-muted-foreground ml-1">— <span className="font-semibold text-foreground">{filtered.length}</span> shown</span>
        )}
      </div>

      {/* ── Results grid ── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
          <ShoppingBag className="h-10 w-10 mb-3 opacity-30" />
          <p className="text-sm font-medium">No items match your search.</p>
          <button onClick={() => { setQ(""); setCategoryFilter(""); setTypeFilter("all"); }} className="mt-2 text-xs text-primary underline">
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(item => (
            <CatalogCard
              key={`${item._type}-${item.id}`}
              item={item}
              onClick={() => setSelected(item)}
            />
          ))}
        </div>
      )}

      {/* ── Detail drawer ── */}
      {selected && (
        <DetailDrawer
          item={selected}
          allItems={allItems}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
