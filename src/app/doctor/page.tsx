import { listAllPatients, listLiveCheckIns, getPatientPortfolio, purgeSessionConsultations, purgeSessionPrescriptions } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { DoctorClient } from "./doctor-client";

export const dynamic = "force-dynamic";

export default function DoctorPage({
  searchParams,
}: {
  searchParams: { patient?: string };
}) {
  // Clear session recordings/prescriptions on each page load; seeds are preserved.
  purgeSessionConsultations();
  purgeSessionPrescriptions();

  const patients = listAllPatients();
  const checkIns = listLiveCheckIns();
  const initialId =
    Number(searchParams.patient) ||
    checkIns[0]?.patient_id ||
    patients[0]?.id ||
    0;
  const initialPortfolio = initialId ? getPatientPortfolio(initialId) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Doctor Console"
        subtitle="Unified cross-branch patient portfolio. Async post-consult capture compresses your notes into the structured tag schema that drives the cohort engine."
      />
      <DoctorClient
        patients={patients}
        checkIns={checkIns}
        initialId={initialId}
        initialPortfolio={initialPortfolio}
      />
    </div>
  );
}
