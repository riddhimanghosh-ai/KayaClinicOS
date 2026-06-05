import { getAppointments } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { AppointmentsClient } from "./appointments-client";

export const dynamic = "force-dynamic";

export default function AppointmentsPage({
  searchParams,
}: {
  searchParams: { date?: string };
}) {
  const date = searchParams.date ?? new Date().toISOString().slice(0, 10);
  const appointments = getAppointments(date);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Schedule Board"
        subtitle="Daily calendar view — click any booking to confirm, treat, and record inventory in one panel."
      />
      <AppointmentsClient initialAppointments={appointments} initialDate={date} />
    </div>
  );
}
