"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Stethoscope, LayoutDashboard, Globe, ChevronDown } from "lucide-react";

type Doctor      = { id: number; name: string; specialty: string; branch_id: number; branch_name: string };
type Manager     = { id: number; name: string; branch: string };
type ZoneManager = { zone_name: string; zone_manager_name: string };
type Role        = "doctor" | "manager" | "zone_manager";

export function LoginClient({
  doctors,
  managers,
  zoneManagers,
}: {
  doctors: Doctor[];
  managers: Manager[];
  zoneManagers: ZoneManager[];
}) {
  const router = useRouter();
  const [role, setRole]         = useState<Role | null>(null);
  const [selected, setSelected] = useState("");
  const [loading, setLoading]   = useState(false);

  const options =
    role === "doctor"
      ? doctors.map(d => ({ value: d.name, label: d.name, sub: `${d.specialty} · ${d.branch_name}` }))
      : role === "manager"
      ? managers.map(m => ({ value: m.name, label: m.name, sub: m.branch }))
      : zoneManagers.map(z => ({ value: `${z.zone_manager_name}|||${z.zone_name}`, label: z.zone_manager_name, sub: z.zone_name }));

  const handleSignIn = () => {
    if (!role || !selected || loading) return;
    setLoading(true);
    if (role === "doctor") {
      router.push("/doctor");
    } else if (role === "manager") {
      router.push("/manager/today");
    } else {
      const [name, zone] = selected.split("|||");
      router.push(`/zone-manager?zone=${encodeURIComponent(zone)}&name=${encodeURIComponent(name)}`);
    }
  };

  const roles: { key: Role; label: string; sub: string; Icon: React.ElementType }[] = [
    { key: "doctor",       label: "Doctor",         sub: "Clinical portal",     Icon: Stethoscope    },
    { key: "manager",      label: "Clinic Manager", sub: "Branch operations",   Icon: LayoutDashboard },
    { key: "zone_manager", label: "Zone Manager",   sub: "Multi-clinic view",   Icon: Globe           },
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 flex items-center justify-center bg-foreground text-background font-bold text-lg font-mono border border-foreground">
            K
          </div>
          <div>
            <div className="text-base font-semibold tracking-tight leading-tight" style={{ fontFamily: "Inter Tight, sans-serif", letterSpacing: "-0.02em" }}>
              Kaya OS
            </div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              Clinic Intelligence
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="border border-border bg-card p-6 space-y-5">
          <div>
            <div className="text-sm font-semibold text-foreground">Sign in</div>
            <div className="text-xs text-muted-foreground mt-0.5">Select your role to continue</div>
          </div>

          {/* Role selector — 3 cards */}
          <div className="grid grid-cols-3 gap-2">
            {roles.map(({ key, label, sub, Icon }) => (
              <button
                key={key}
                onClick={() => { setRole(key); setSelected(""); }}
                className={[
                  "flex flex-col items-center gap-2 px-2 py-4 border text-sm font-medium transition-colors",
                  role === key
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-card text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                ].join(" ")}
              >
                <Icon className="h-4 w-4" />
                <span className="text-xs leading-tight text-center">{label}</span>
                {role !== key && <span className="text-[10px] font-normal opacity-60 text-center">{sub}</span>}
              </button>
            ))}
          </div>

          {/* Name / zone selector */}
          {role && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                {role === "doctor" ? "Select doctor" : role === "manager" ? "Select manager" : "Select zone manager"}
              </label>
              <div className="relative">
                <select
                  value={selected}
                  onChange={e => setSelected(e.target.value)}
                  className="w-full appearance-none border border-border bg-card px-3 py-2.5 text-sm pr-8 focus:outline-none focus:border-foreground transition-colors"
                >
                  <option value="">— choose —</option>
                  {options.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              </div>
              {selected && (
                <div className="text-[10px] text-muted-foreground font-mono">
                  {options.find(o => o.value === selected)?.sub}
                </div>
              )}
            </div>
          )}

          {/* Sign in */}
          <button
            onClick={handleSignIn}
            disabled={!role || !selected || loading}
            className="w-full py-2.5 text-sm font-semibold border transition-colors disabled:opacity-30 disabled:cursor-not-allowed bg-foreground text-background border-foreground hover:opacity-90"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </div>

        <div className="mt-4 text-center text-[10px] text-muted-foreground font-mono">
          Kaya Skin Clinic · Internal use only
        </div>
      </div>
    </div>
  );
}
