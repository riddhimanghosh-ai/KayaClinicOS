import { listClinicStatus, listAllDoctors } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { ClinicStatusClient } from "./clinic-status-client";

export const dynamic = "force-dynamic";

export default function ClinicStatusPage() {
  const statuses = listClinicStatus();
  const doctors = listAllDoctors();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Clinic Status"
        subtitle="Publish live operational readiness — clinic open/closed, on-duty doctor & leave, working appliances, and active offers. This is what the call center sees before booking."
      />
      <ClinicStatusClient statuses={statuses} doctors={doctors} />
    </div>
  );
}
