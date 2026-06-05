import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, TrendingUp, AlertCircle, Users, Calendar, ArrowRight, Clock, Target } from "lucide-react";
import { listAllPatients, getAppointments, listBranchStats, clinicFinancialSummary, getPendingSessionPatients } from "@/lib/db";
import Link from "next/link";

const TODAY = new Date().toISOString().slice(0, 10);

export default function ManagerAIPage() {
  const patients = listAllPatients();
  const todayAppts = getAppointments(TODAY);
  const branchStats = listBranchStats();
  const fin = clinicFinancialSummary();
  const pendingPatients = getPendingSessionPatients();

  const totalPatients = patients.length;
  const patientsWithEmail = patients.filter((p: any) => p.email).length;
  const emailCoverage = totalPatients > 0 ? Math.round((patientsWithEmail / totalPatients) * 100) : 0;

  const todayTotal = todayAppts.length;
  const todayActive = todayAppts.filter((a: any) =>
    ['confirmed', 'arrived', 'in_session', 'converted'].includes(a.status)
  ).length;
  const confirmRate = todayTotal > 0 ? Math.round((todayActive / todayTotal) * 100) : 0;

  const overduePatients = pendingPatients.filter((p: any) => (p.days_since_visit ?? 0) > 90);
  const highValue = pendingPatients.filter((p: any) => p.pending_sessions >= 3);
  const totalUnearned = fin.package_unearned_balance_inr;

  const insights = [
    {
      icon: AlertCircle,
      priority: 'high',
      color: 'rose',
      title: `${overduePatients.length} patients overdue for sessions (90+ days)`,
      body: 'These patients paid for sessions but have not returned in over 3 months. Churn risk increases significantly beyond 90 days of inactivity. Priority outreach recommended.',
      metric: String(overduePatients.length),
      metricLabel: 'overdue',
      href: '/manager/today',
      cta: 'View re-engagement list',
    },
    {
      icon: TrendingUp,
      priority: 'high',
      color: 'amber',
      title: `₹${(totalUnearned / 100000).toFixed(1)}L unearned package balance`,
      body: 'Customers have pre-paid for sessions not yet consumed. Revenue is only recognized when sessions are delivered. Scheduling these patients improves P&L and satisfaction.',
      metric: `₹${Math.round(totalUnearned / 1000)}K`,
      metricLabel: 'unearned',
      href: '/manager/today',
      cta: 'Schedule pending sessions',
    },
    {
      icon: Calendar,
      priority: confirmRate >= 70 ? 'low' : 'medium',
      color: confirmRate >= 70 ? 'emerald' : 'amber',
      title: `Today's confirmation rate: ${confirmRate}%`,
      body: `${todayActive} of ${todayTotal} appointments confirmed, arrived, or in-session. ${todayTotal - todayActive} still at Booked — call before they become no-shows.`,
      metric: `${confirmRate}%`,
      metricLabel: 'confirmed',
      href: '/manager/today',
      cta: 'Open confirmation queue',
    },
    {
      icon: Users,
      priority: 'medium',
      color: 'violet',
      title: `${highValue.length} high-value patients with 3+ pending sessions`,
      body: 'These patients have significant unused session packages. They represent both a retention opportunity and a scheduling gap affecting utilization.',
      metric: String(highValue.length),
      metricLabel: 'patients',
      href: '/manager/today',
      cta: 'View patients',
    },
    {
      icon: Target,
      priority: 'low',
      color: 'blue',
      title: `Email coverage: ${emailCoverage}% (${patientsWithEmail}/${totalPatients})`,
      body: `${totalPatients - patientsWithEmail} patients missing email addresses. Enables reminders, campaign targeting, and digital receipts.`,
      metric: `${emailCoverage}%`,
      metricLabel: 'coverage',
      href: '/manager/patients',
      cta: 'View patient records',
    },
  ];

  const priorityCls: Record<string, string> = {
    high:   'bg-rose-100 text-rose-700 border-rose-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    low:    'bg-blue-100 text-blue-700 border-blue-200',
  };
  const colorCls: Record<string, { icon: string; bg: string; link: string }> = {
    rose:    { icon: 'text-rose-600',    bg: 'bg-rose-100',    link: 'text-rose-600' },
    amber:   { icon: 'text-amber-600',   bg: 'bg-amber-100',   link: 'text-amber-600' },
    emerald: { icon: 'text-emerald-600', bg: 'bg-emerald-100', link: 'text-emerald-600' },
    violet:  { icon: 'text-violet-600',  bg: 'bg-violet-100',  link: 'text-violet-600' },
    blue:    { icon: 'text-blue-600',    bg: 'bg-blue-100',    link: 'text-blue-600' },
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="AI Insights"
        subtitle="Operational intelligence — live data from all branches"
        actions={
          <Badge variant="outline" className="text-[10px] flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
            Live
          </Badge>
        }
      />

      {/* Summary */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">At a glance</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total patients',     value: totalPatients,                            Icon: Users },
            { label: 'Need re-engagement', value: pendingPatients.length,                   Icon: Clock },
            { label: 'Unearned balance',   value: `₹${(totalUnearned/100000).toFixed(1)}L`, Icon: TrendingUp },
            { label: "Today's appts",      value: todayTotal,                               Icon: Calendar },
          ].map(m => (
            <Card key={m.label}>
              <CardContent className="p-4">
                <m.Icon className="h-4 w-4 text-muted-foreground mb-2" />
                <div className="text-2xl font-bold tabular-nums">{m.value}</div>
                <div className="text-[11px] text-muted-foreground mt-1">{m.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Insights */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Brain className="h-4 w-4 text-accent" />
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Prioritised insights</h2>
        </div>
        <div className="space-y-3">
          {insights.map((ins, i) => {
            const c = colorCls[ins.color];
            return (
              <Card key={i} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${c.bg}`}>
                      <ins.icon className={`h-5 w-5 ${c.icon}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">{ins.title}</span>
                        <Badge variant="outline" className={`text-[9px] ${priorityCls[ins.priority]}`}>
                          {ins.priority} priority
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{ins.body}</p>
                      <Link href={ins.href} className={`mt-2 inline-flex items-center gap-1 text-xs font-medium hover:underline ${c.link}`}>
                        {ins.cta} <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-2xl font-bold tabular-nums ${c.icon}`}>{ins.metric}</div>
                      <div className="text-[10px] text-muted-foreground">{ins.metricLabel}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Branch performance */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Branch performance</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {branchStats.map(b => {
            const total = b.sessions_used + b.sessions_pending;
            const util = total > 0 ? Math.round((b.sessions_used / total) * 100) : 0;
            return (
              <Card key={b.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-sm">{b.name}</div>
                    <Badge variant="outline" className="text-[10px]">{b.city}</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div><div className="text-lg font-bold">{b.total_patients}</div><div className="text-[10px] text-muted-foreground">Patients</div></div>
                    <div><div className="text-lg font-bold text-accent">{b.sessions_pending}</div><div className="text-[10px] text-muted-foreground">Pending</div></div>
                    <div><div className="text-lg font-bold">{util}%</div><div className="text-[10px] text-muted-foreground">Utilised</div></div>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                    <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${util}%` }} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
