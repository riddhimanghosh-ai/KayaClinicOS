import { getAppointments, resetDemoSchedule } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { AppointmentsClient } from "./appointments-client";

export const dynamic = "force-dynamic";

export default function AppointmentsPage({
  searchParams,
}: {
  searchParams: { date?: string; open?: string };
}) {
  const date = searchParams.date ?? new Date().toISOString().slice(0, 10);
  // Reset today's demo appointments to their seed state on every page load.
  if (!searchParams.date) resetDemoSchedule();
  const appointments = getAppointments(date);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Schedule Board"
        subtitle="Daily calendar view — click any booking to confirm, treat, checkout, and record inventory in one panel."
      />
      <AppointmentsClient
        initialAppointments={appointments}
        initialDate={date}
        initialOpenId={searchParams.open ? Number(searchParams.open) : undefined}
      />
    </div>
  );
}
