import { getTreatmentOps } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { OpsClient } from "./ops-client";

export const dynamic = "force-dynamic";

export default function OpsPage() {
  const rows = getTreatmentOps(30);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Treatment & FnO Operations"
        subtitle="Pending data entry for treatment sessions and inventory records — last 30 days"
      />
      <OpsClient rows={rows} />
    </div>
  );
}
