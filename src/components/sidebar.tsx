"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Stethoscope, Sparkles, LayoutDashboard, Menu, X, UserRound, MessageSquare, Search as SearchIcon, BarChart2, CalendarDays, Smartphone, Zap, Brain, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const NAV = [
  { href: "/", label: "Zone Overview", icon: LayoutDashboard, role: null },
  { href: "/manager", label: "Clinic Manager", icon: Activity, role: "Manager", color: "text-blue-600" },
  { href: "/doctor", label: "Doctor Console", icon: Stethoscope, role: "Doctor", color: "text-emerald-600" },
  { href: "/customer", label: "Customer App", icon: Smartphone, role: "Customer", color: "text-violet-600" },
];

const MANAGER_SUBNAV = [
  { href: "/manager/today",         label: "Daily Ops",          icon: Zap },
  { href: "/manager/appointments",  label: "Schedule Board",     icon: CalendarDays },
  { href: "/manager/ops",           label: "Treatment & FnO",    icon: FlaskConical },
  { href: "/manager",               label: "Cohorts & Outreach", icon: Sparkles },
  { href: "/manager/patients",      label: "Patients",           icon: UserRound },
  { href: "/manager/catalog",       label: "Catalog",            icon: SearchIcon },
  { href: "/manager/clinic-status", label: "Clinic Status",      icon: Activity },
  { href: "/manager/ai",            label: "Insights",           icon: Brain },
];

const ROLE_COLORS: Record<string, string> = {
  "/manager": "bg-blue-50 border-blue-100",
  "/doctor":  "bg-emerald-50 border-emerald-100",
  "/customer": "bg-violet-50 border-violet-100",
};

const ROLE_BADGE: Record<string, { label: string; cls: string }> = {
  "/manager": { label: "Manager Portal", cls: "bg-blue-100 text-blue-700" },
  "/doctor":  { label: "Doctor Portal",  cls: "bg-emerald-100 text-emerald-700" },
  "/customer": { label: "Customer App",  cls: "bg-violet-100 text-violet-700" },
};

function NavLinks({ onClick }: { onClick?: () => void }) {
  const pathname = usePathname();
  const base = "/" + (pathname.split("/")[1] ?? "");
  return (
    <ul className="space-y-0.5">
      {NAV.map(({ href, label, icon: Icon, color }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onClick}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary-foreground" : color)} />
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
  const roleBadge = ROLE_BADGE[base];

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:shrink-0 md:border-r md:border-border md:bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-5 border-b border-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-sm">
          K
        </div>
        <div>
          <div className="text-sm font-bold tracking-tight leading-tight">Kaya OS</div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Clinic Intelligence</div>
        </div>
      </div>

      {/* Role badge */}
      {roleBadge && (
        <div className={cn("mx-3 mt-3 rounded-lg border px-3 py-2 text-xs font-semibold", roleBadge.cls, ROLE_COLORS[base] ?? "")}>
          {roleBadge.label}
        </div>
      )}

      {base === "/manager" && (
        <nav className="px-3 pt-2 pb-1">
          <div className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Manager</div>
          <ul className="space-y-0.5">
            {MANAGER_SUBNAV.map(({ href, label, icon: Icon }) => {
              const active = href === "/manager" ? pathname === "/manager" : pathname.startsWith(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                      active
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-muted-foreground hover:bg-blue-50 hover:text-blue-700"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}

      <nav className="flex-1 px-3 py-3 overflow-y-auto">
        <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Portals</div>
        <NavLinks />
      </nav>

      <div className="px-5 py-4 border-t border-border">
        <div className="text-xs font-semibold text-foreground">Kaya Skin Clinic</div>
        <div className="mt-1 text-[10px] text-muted-foreground">Bandra 1 · Bandra 2 · Mumbai Zone</div>
        <div className="mt-2 flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
          <span className="text-[10px] text-muted-foreground">System online</span>
        </div>
      </div>
    </aside>
  );
}

export function MobileTopbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const base = "/" + (pathname.split("/")[1] ?? "");
  const roleBadge = ROLE_BADGE[base];

  return (
    <>
      <div className="md:hidden sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-card/95 backdrop-blur px-4 shadow-sm">
        <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold">K</div>
          <div>
            <span className="text-sm font-bold">Kaya OS</span>
            {roleBadge && (
              <span className={cn("ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold", roleBadge.cls)}>{roleBadge.label}</span>
            )}
          </div>
        </Link>
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-secondary"
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-30 flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative flex w-64 flex-col bg-card border-r border-border shadow-xl">
            <div className="flex h-14 items-center gap-3 px-5 border-b border-border">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold">K</div>
              <span className="text-sm font-bold">Kaya OS</span>
            </div>
            <nav className="flex-1 px-3 py-4">
              <NavLinks onClick={() => setOpen(false)} />
              {base === "/manager" && (
                <div className="mt-3">
                  <div className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Manager</div>
                  <ul className="space-y-0.5">
                    {MANAGER_SUBNAV.map(({ href, label, icon: Icon }) => {
                      const active = href === "/manager" ? pathname === "/manager" : pathname.startsWith(href);
                      return (
                        <li key={href}>
                          <Link
                            href={href}
                            onClick={() => setOpen(false)}
                            className={cn(
                              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                              active ? "bg-blue-600 text-white" : "text-muted-foreground hover:bg-blue-50"
                            )}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
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
