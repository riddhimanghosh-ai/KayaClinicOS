"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity, Stethoscope, Sparkles, LayoutDashboard, Menu, X,
  CalendarDays, Zap, Brain, FlaskConical, Smartphone, Users, ShoppingBag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const NAV = [
  { href: "/",                label: "Super Admin",    icon: LayoutDashboard },
  { href: "/manager/today",   label: "Clinic Manager", icon: Activity },
  { href: "/doctor",          label: "Doctor Console", icon: Stethoscope },
  { href: "/customer/dashboard", label: "Customer App", icon: Smartphone },
];

const MANAGER_SUBNAV = [
  { href: "/manager/today",        label: "Daily Ops",                icon: Zap },
  { href: "/manager/appointments", label: "Schedule Board",           icon: CalendarDays },
  { href: "/manager/ops",          label: "Treatment & FnO",          icon: FlaskConical },
  { href: "/manager/clinic-status", label: "Clinic Ops",              icon: Activity },
  { href: "/manager/catalog",      label: "Catalogue",                icon: ShoppingBag },
  { href: "/manager",              label: "Cohorts & Outreach *",            icon: Sparkles },
];

const PORTAL_LABEL: Record<string, string> = {
  "/manager": "Manager Portal",
  "/doctor":  "Doctor Portal",
  "/customer":"Customer App",
};

function NavLinks({ onClick }: { onClick?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="space-y-px">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/"
            ? pathname === "/"
            : href === "/customer/dashboard"
            ? pathname.startsWith("/customer")
            : href === "/manager/today"
            ? pathname.startsWith("/manager")
            : pathname.startsWith(href);
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onClick}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "border-l-2 border-primary bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const base = "/" + (pathname.split("/")[1] ?? "");
  const portalLabel = PORTAL_LABEL[base];

  return (
    <aside className="hidden md:flex md:w-60 md:flex-col md:shrink-0 md:border-r md:border-border md:bg-card">
      {/* Logo */}
      <div className="flex h-14 items-center gap-3 px-5 border-b border-border">
        <div className="flex h-8 w-8 items-center justify-center border border-foreground bg-foreground text-background font-bold text-sm font-mono">
          K
        </div>
        <div>
          <div className="text-sm font-semibold tracking-tight leading-tight" style={{ fontFamily: "Inter Tight, sans-serif", letterSpacing: "-0.02em" }}>Kaya OS</div>
          <div className="text-[9px] uppercase tracking-widest text-muted-foreground font-mono">Clinic Intelligence</div>
        </div>
      </div>

      {/* Portal eyebrow */}
      {portalLabel && (
        <div className="px-5 py-2.5 border-b border-border">
          <span className="text-[10px] font-mono uppercase tracking-widest text-primary">{portalLabel}</span>
        </div>
      )}

      {/* Manager subnav */}
      {base === "/manager" && (
        <nav className="px-3 pt-3 pb-1 border-b border-border">
          <div className="mb-1 px-3 text-[10px] font-mono font-medium uppercase tracking-widest text-muted-foreground">Manager</div>
          <ul className="space-y-px">
            {MANAGER_SUBNAV.map(({ href, label, icon: Icon }) => {
              const active = href === "/manager" ? pathname === "/manager" : pathname.startsWith(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "border-l-2 border-primary bg-secondary text-foreground"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "")} />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}

      {/* Portal nav */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto">
        <div className="mb-2 px-3 text-[10px] font-mono font-medium uppercase tracking-widest text-muted-foreground">Portals</div>
        <NavLinks />
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-border">
        <div className="text-xs font-semibold text-foreground tracking-tight">Kaya Skin Clinic</div>
        <div className="mt-1 text-[10px] text-muted-foreground font-mono">Bandra 1 · Bandra 2 · Mumbai Zone</div>
        <div className="mt-2 flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 bg-success inline-block" />
          <span className="text-[10px] text-muted-foreground font-mono">System online</span>
        </div>
      </div>
    </aside>
  );
}

export function MobileTopbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const base = "/" + (pathname.split("/")[1] ?? "");
  const portalLabel = PORTAL_LABEL[base];

  return (
    <>
      <div className="md:hidden sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-card px-4">
        <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <div className="flex h-8 w-8 items-center justify-center border border-foreground bg-foreground text-background text-xs font-bold font-mono">K</div>
          <div>
            <span className="text-sm font-semibold tracking-tight">Kaya OS</span>
            {portalLabel && (
              <span className="ml-2 text-[9px] font-mono uppercase tracking-widest text-primary">{portalLabel}</span>
            )}
          </div>
        </Link>
        <button
          onClick={() => setOpen((v) => !v)}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary"
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-30 flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative flex w-60 flex-col bg-card border-r border-border">
            <div className="flex h-14 items-center gap-3 px-5 border-b border-border">
              <div className="flex h-8 w-8 items-center justify-center border border-foreground bg-foreground text-background text-xs font-bold font-mono">K</div>
              <span className="text-sm font-semibold tracking-tight">Kaya OS</span>
            </div>
            <nav className="flex-1 px-3 py-4 overflow-y-auto">
              <div className="mb-2 px-3 text-[10px] font-mono font-medium uppercase tracking-widest text-muted-foreground">Portals</div>
              <NavLinks onClick={() => setOpen(false)} />
              {base === "/manager" && (
                <div className="mt-3 border-t border-border pt-3">
                  <div className="mb-1 px-3 text-[10px] font-mono font-medium uppercase tracking-widest text-muted-foreground">Manager</div>
                  <ul className="space-y-px">
                    {MANAGER_SUBNAV.map(({ href, label, icon: Icon }) => {
                      const active = href === "/manager" ? pathname === "/manager" : pathname.startsWith(href);
                      return (
                        <li key={href}>
                          <Link
                            href={href}
                            onClick={() => setOpen(false)}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors",
                              active
                                ? "border-l-2 border-primary bg-secondary text-foreground"
                                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                            )}
                          >
                            <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "")} />
                            {label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
