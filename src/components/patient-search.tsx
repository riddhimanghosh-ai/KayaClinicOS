"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, User, Phone, ArrowUpRight, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

type PatientResult = {
  id: number;
  name: string;
  phone: string;
  email: string | null;
};

type Portfolio = {
  patient: {
    id: number;
    name: string;
    phone: string;
    email: string | null;
  };
  sessions: Array<{
    session_date: string;
    service_name_snapshot: string | null;
    doctor_name: string | null;
  }>;
  packages: Array<{
    service_name: string;
    sessions_total: number;
    sessions_used: number;
    purchase_date: string;
  }>;
};

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ---- Patient slide-over / modal --------------------------------------------

function PatientModal({
  patientId,
  onClose,
}: {
  patientId: number;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ portfolio: Portfolio; balances: unknown[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/patients/${patientId}/portfolio`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError("Failed to load patient"))
      .finally(() => setLoading(false));
  }, [patientId]);

  const p = data?.portfolio;
  const lastVisit = p?.sessions?.[0];
  const currentTreatment = p?.packages?.find(
    (pk) => pk.sessions_used < pk.sessions_total
  );

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* backdrop */}
      <div
        className="fixed inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden
      />
      {/* panel */}
      <div className="relative ml-auto flex h-full w-full max-w-md flex-col bg-card border-l border-border shadow-xl overflow-y-auto">
        {/* header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card z-10">
          <span className="text-sm font-semibold tracking-tight">Patient Detail</span>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground hover:bg-secondary rounded"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 p-5 space-y-5">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          )}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          {p && (
            <>
              {/* Patient identity */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-base font-semibold">{p.patient.name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" />
                  {p.patient.phone}
                </div>
                {p.patient.email && (
                  <div className="text-sm text-muted-foreground">{p.patient.email}</div>
                )}
              </div>

              {/* Last visit */}
              <div className="rounded border border-border p-3 space-y-1">
                <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  Last Visit
                </div>
                {lastVisit ? (
                  <div className="text-sm">
                    <span className="font-medium">{lastVisit.session_date}</span>
                    {lastVisit.service_name_snapshot && (
                      <span className="text-muted-foreground"> · {lastVisit.service_name_snapshot}</span>
                    )}
                    {lastVisit.doctor_name && (
                      <span className="text-muted-foreground"> — {lastVisit.doctor_name}</span>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">No visits recorded</span>
                )}
              </div>

              {/* Current treatment */}
              <div className="rounded border border-border p-3 space-y-1">
                <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  Current Treatment
                </div>
                {currentTreatment ? (
                  <div className="text-sm">
                    <span className="font-medium">{currentTreatment.service_name}</span>
                    <Badge variant="secondary" className="ml-2 text-[10px]">
                      {currentTreatment.sessions_used}/{currentTreatment.sessions_total} sessions
                    </Badge>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">No active package</span>
                )}
              </div>

              {/* Link to full view */}
              <Link
                href={`/manager/patients?id=${p.patient.id}`}
                className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                <ArrowUpRight className="h-4 w-4" />
                Open full patient view
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Main component --------------------------------------------------------

export function PatientSearch() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const [results, setResults] = useState<PatientResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch search results
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    setLoading(true);
    fetch(`/api/patients/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then((r) => r.json())
      .then((d) => {
        setResults(d.patients ?? []);
        setShowDropdown(true);
      })
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [debouncedQuery]);

  // Close dropdown when clicking outside
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setShowDropdown(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [handleClickOutside]);

  function selectPatient(id: number) {
    setSelectedPatientId(id);
    setShowDropdown(false);
    setQuery("");
  }

  return (
    <>
      <div ref={containerRef} className="relative w-full max-w-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setShowDropdown(true)}
            placeholder="Search patient by name or phone…"
            className="pl-8 pr-8 text-sm h-9"
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground animate-spin" />
          )}
          {!loading && query && (
            <button
              type="button"
              onClick={() => { setQuery(""); setResults([]); setShowDropdown(false); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Dropdown results */}
        {showDropdown && results.length > 0 && (
          <Card className="absolute top-full mt-1 left-0 w-full z-40 shadow-lg border border-border">
            <CardContent className="p-0">
              <ul>
                {results.map((pt, i) => (
                  <li key={pt.id}>
                    <button
                      type="button"
                      onClick={() => selectPatient(pt.id)}
                      className={`w-full text-left px-3 py-2 hover:bg-secondary flex items-center justify-between gap-3 ${
                        i !== 0 ? "border-t border-border" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium truncate">{pt.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground font-mono shrink-0">
                        {pt.phone}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {showDropdown && debouncedQuery.length >= 2 && results.length === 0 && !loading && (
          <Card className="absolute top-full mt-1 left-0 w-full z-40 shadow-lg border border-border">
            <CardContent className="px-3 py-2">
              <p className="text-sm text-muted-foreground">No patients found.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal */}
      {selectedPatientId !== null && (
        <PatientModal
          patientId={selectedPatientId}
          onClose={() => setSelectedPatientId(null)}
        />
      )}
    </>
  );
}
