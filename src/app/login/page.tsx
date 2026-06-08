import { listAllDoctors, listBranchStats, listZoneManagers } from "@/lib/db";
import { LoginClient } from "./login-client";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const doctors       = listAllDoctors();
  const branches      = listBranchStats();
  const zoneManagers  = listZoneManagers();

  const managers = branches
    .filter(b => b.manager_name)
    .map(b => ({ id: b.id, name: b.manager_name as string, branch: b.name }));

  return <LoginClient doctors={doctors} managers={managers} zoneManagers={zoneManagers} />;
}
