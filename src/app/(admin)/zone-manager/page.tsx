import { listBranchStats, listAllDoctors, listClinicStatus, getMonthlyRevenue, getAppointments, listBranchFinancials } from "@/lib/db";
import { ZoneManagerClient } from "./zone-manager-client";

export const dynamic = "force-dynamic";

export default function ZoneManagerPage({
  searchParams,
}: {
  searchParams: { zone?: string; name?: string };
}) {
  const zone         = searchParams.zone ?? null;
  const managerName  = searchParams.name ?? null;

  const allBranches  = listBranchStats();
  const branchFin    = listBranchFinancials();
  const doctors      = listAllDoctors();
  const clinicStatus = listClinicStatus();
  const monthlyRev   = getMonthlyRevenue(3);
  const today        = new Date().toISOString().slice(0, 10);
  const todayAppts   = getAppointments(today);
  const todayLabel   = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  // Filter branches to this zone (or all if no zone)
  const branches = zone
    ? allBranches.filter(b => b.zone_name === zone)
    : allBranches;

  const branchIds = new Set(branches.map(b => b.id));
  const filteredAppts   = todayAppts.filter(a => branchIds.has(a.branch_id));
  const filteredStatus  = clinicStatus.filter(cs => branchIds.has(cs.branch_id));
  const filteredFin     = branchFin.filter(f => branchIds.has(f.branch_id));

  return (
    <ZoneManagerClient
      zone={zone}
      managerName={managerName}
      branches={branches}
      branchFin={filteredFin}
      doctors={doctors}
      clinicStatus={filteredStatus}
      monthlyRevenue={monthlyRev}
      todayAppts={filteredAppts}
      todayLabel={todayLabel}
    />
  );
}
