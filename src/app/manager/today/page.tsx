import { getTodayConfirmationQueue, getPendingSessionPatients, getAppointments } from "@/lib/db";
import { recipeFollowUp, recipeMissedSession, recipeGapCloser, recipeAlpha, recipeBeta } from "@/lib/cohorts";
import { PageHeader } from "@/components/page-header";
import { TodayClient } from "./today-client";

export const dynamic = "force-dynamic";

const PIPELINE_STATUSES = ["booked", "confirmed", "arrived", "in_session", "converted"];

export default function TodayPage() {
  const today = new Date().toISOString().slice(0, 10);
  const allAppts = getAppointments(today);
  const confirmQueue = getTodayConfirmationQueue(today);
  const pendingPatients = getPendingSessionPatients();
  const followUp = recipeFollowUp();
  const missedSession = recipeMissedSession();
  const gapCloser = recipeGapCloser();
  const alpha = recipeAlpha();
  const beta = recipeBeta();

  const pipelineCounts = PIPELINE_STATUSES.reduce((acc, status) => {
    acc[status] = allAppts.filter(a => a.status === status).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daily Ops"
        subtitle={`${new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })} · Live floor view`}
      />
      <TodayClient
        pipelineCounts={pipelineCounts}
        totalToday={allAppts.length}
        noShows={allAppts.filter(a => a.status === "no_show").length}
        confirmQueue={confirmQueue}
        pendingPatients={pendingPatients}
        followUp={followUp}
        missedSession={missedSession}
        gapCloser={gapCloser}
        alpha={alpha}
        beta={beta}
      />
    </div>
  );
}
