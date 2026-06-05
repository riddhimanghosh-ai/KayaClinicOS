'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/page-header';
import {
  Camera, FileText, ClipboardList, CheckCircle2, ChevronRight,
  Loader2, UserRound, ArrowLeft, Clock,
} from 'lucide-react';

type Step = 'review' | 'photos' | 'history' | 'start' | 'notes' | 'complete';

const STEPS: { key: Step; label: string }[] = [
  { key: 'review',   label: 'Patient Review' },
  { key: 'photos',   label: 'Before Photos' },
  { key: 'history',  label: 'Medical History' },
  { key: 'start',    label: 'Start Session' },
  { key: 'notes',    label: 'Treatment Notes' },
  { key: 'complete', label: 'Complete' },
];

const BODY_TYPES = [
  'Type I — Very Fair', 'Type II — Fair', 'Type III — Medium',
  'Type IV — Olive', 'Type V — Brown', 'Type VI — Dark',
];

export default function PractitionerPage() {
  const params = useParams();
  const router = useRouter();
  const appointmentId = Number(params.id);

  const [step, setStep] = useState<Step>('review');
  const [appt, setAppt] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photos, setPhotos] = useState<{ angle: string; name: string }[]>([]);
  const [consentSigned, setConsentSigned] = useState(false);
  const [medHistory, setMedHistory] = useState('');
  const [bodyType, setBodyType] = useState('');
  const [treatmentNotes, setTreatmentNotes] = useState('');
  const [startedAt, setStartedAt] = useState<string | null>(null);

  useEffect(() => {
    const todayStr = new Intl.DateTimeFormat('sv-SE').format(new Date());
    fetch('/api/appointments?date=' + todayStr)
      .then(r => r.json())
      .then(d => {
        const found = (d.rows ?? []).find((a: any) => a.id === appointmentId);
        setAppt(found ?? null);
        setLoading(false);
      });
  }, [appointmentId]);

  const saveToApi = async (extra: Record<string, any> = {}) => {
    if (!appt) return;
    setSaving(true);
    await fetch('/api/manager/practitioner/' + appointmentId, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patient_id: appt.patient_id,
        photos,
        consent_signed: consentSigned,
        medical_history: medHistory,
        body_type: bodyType,
        treatment_notes: treatmentNotes,
        started_at: startedAt,
        ...extra,
      }),
    });
    setSaving(false);
  };

  const handleStartSession = async () => {
    const now = new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit' }).format(new Date());
    setStartedAt(now);
    await saveToApi({ started_at: now, status: 'started' });
    await fetch('/api/appointments/' + appointmentId, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'in_session' }),
    });
    setStep('notes');
  };

  const handleComplete = async () => {
    const now = new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit' }).format(new Date());
    await saveToApi({ completed_at: now, status: 'completed' });
    await fetch('/api/appointments/' + appointmentId, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'converted' }),
    });
    router.push('/manager/fno/' + appointmentId);
  };

  const stepIdx = STEPS.findIndex(s => s.key === step);

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <PageHeader
        title="Practitioner App"
        subtitle={appt ? appt.patient_name + ' · ' + appt.service_type : 'Appointment #' + appointmentId}
        actions={
          <a href="/manager/appointments" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Schedule
          </a>
        }
      />

      {/* Step progress */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {STEPS.map((s, i) => {
          const done = i < stepIdx;
          const active = s.key === step;
          return (
            <div key={s.key} className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => { if (done) setStep(s.key); }}
                className={
                  'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ' +
                  (active ? 'bg-primary text-primary-foreground' :
                   done ? 'bg-emerald-100 text-emerald-700 cursor-pointer' :
                   'bg-secondary text-muted-foreground cursor-default')
                }
              >
                {done && <CheckCircle2 className="h-3.5 w-3.5" />}
                {s.label}
              </button>
              {i < STEPS.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />}
            </div>
          );
        })}
      </div>

      {/* Step: Patient Review */}
      {step === 'review' && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><UserRound className="h-4 w-4" /> Patient Review</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {appt ? (
              <div className="grid grid-cols-2 gap-4 text-sm">
                {([
                  ['Patient', appt.patient_name],
                  ['Phone', appt.phone],
                  ['Treatment', appt.service_type],
                  ['Doctor', appt.doctor_name ?? '—'],
                  ['Time', appt.appointment_ts?.slice(11, 16)],
                  ['Lead Source', appt.lead_type ?? '—'],
                  ['Disposition', appt.disposition ?? '—'],
                  ['Status', appt.status],
                ] as [string, string][]).map(([label, value]) => (
                  <div key={label}>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{label}</div>
                    <div className="font-semibold mt-0.5">{value}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Appointment not found for today.</p>
            )}
            <Button className="w-full" onClick={() => setStep('photos')} disabled={!appt}>
              Continue to Photo Capture <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step: Before Photos */}
      {step === 'photos' && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Camera className="h-4 w-4" /> Before Photos</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Capture before-treatment photos for progress tracking and future session comparison.</p>
            <div className="grid grid-cols-2 gap-3">
              {['Front', 'Left Profile', 'Right Profile', 'Close-up'].map(angle => {
                const captured = photos.find(p => p.angle === angle);
                return (
                  <label key={angle} className={
                    'flex flex-col items-center justify-center gap-2 rounded-lg border-2 cursor-pointer transition-colors p-4 ' +
                    (captured ? 'border-emerald-400 bg-emerald-50' : 'border-dashed border-border bg-secondary/30 hover:bg-secondary/60')
                  }>
                    {captured ? <CheckCircle2 className="h-6 w-6 text-emerald-500" /> : <Camera className="h-6 w-6 text-muted-foreground" />}
                    <span className="text-xs text-center font-medium">{captured ? '✓ ' : ''}{angle}</span>
                    <input type="file" accept="image/*" className="sr-only"
                      onChange={e => {
                        if (e.target.files?.[0]) {
                          const file = e.target.files[0];
                          setPhotos(prev => [...prev.filter(p => p.angle !== angle), { angle, name: file.name }]);
                        }
                      }}
                    />
                  </label>
                );
              })}
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={consentSigned} onChange={e => setConsentSigned(e.target.checked)} className="h-4 w-4 accent-primary" />
              <span>Consent form signed and uploaded</span>
            </label>
            <Button className="w-full" onClick={() => { saveToApi(); setStep('history'); }}>
              Continue <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step: Medical History */}
      {step === 'history' && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><ClipboardList className="h-4 w-4" /> Medical History &amp; Body Type</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Medical History / Contraindications</label>
              <textarea rows={4} value={medHistory} onChange={e => setMedHistory(e.target.value)}
                placeholder="Allergies, medications, skin conditions, previous treatments, contraindications..."
                className="w-full rounded-md border border-border bg-secondary/30 p-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Fitzpatrick Skin Type (for laser treatments)</label>
              <div className="grid grid-cols-2 gap-2">
                {BODY_TYPES.map(bt => (
                  <button key={bt} onClick={() => setBodyType(bt)}
                    className={
                      'rounded-lg border px-3 py-2 text-xs text-left transition-colors ' +
                      (bodyType === bt ? 'border-primary bg-primary/10 text-primary font-semibold' : 'border-border hover:bg-secondary')
                    }>
                    {bt}
                  </button>
                ))}
              </div>
            </div>
            <Button className="w-full" onClick={() => { saveToApi(); setStep('start'); }}>
              Continue <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step: Start Session */}
      {step === 'start' && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" /> Start Treatment Session</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              Clicking Start Session timestamps the session start and moves the appointment to &quot;In Session&quot; on the schedule board.
            </p>
            {startedAt ? (
              <>
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4">
                  <div className="text-emerald-700 font-semibold">Session started at {startedAt}</div>
                </div>
                <Button className="w-full" onClick={() => setStep('notes')}>
                  Continue to Treatment Notes <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </>
            ) : (
              <Button size="lg" className="w-full bg-violet-600 hover:bg-violet-700" onClick={handleStartSession} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Clock className="h-4 w-4 mr-2" />}
                Start Session Now
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step: Treatment Notes */}
      {step === 'notes' && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> Treatment Notes</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <textarea rows={5} value={treatmentNotes} onChange={e => setTreatmentNotes(e.target.value)}
              placeholder="Treatment parameters used, patient response, observations, next session recommendations..."
              className="w-full rounded-md border border-border bg-secondary/30 p-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
            <Button className="w-full" onClick={() => { saveToApi(); setStep('complete'); }}>
              Continue <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step: Complete */}
      {step === 'complete' && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Complete Session</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 rounded-lg bg-secondary/40 p-4 text-sm">
              {([
                ['Photos captured', photos.length + ' photo(s)'],
                ['Consent signed', consentSigned ? '✓ Yes' : '✗ No'],
                ['Body type', bodyType || '—'],
                ['Session started', startedAt ?? '—'],
                ['Notes', treatmentNotes ? treatmentNotes.slice(0, 60) + (treatmentNotes.length > 60 ? '…' : '') : '—'],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-medium">{v}</span>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">Completing will mark the session done and open the FnO form to record material usage.</p>
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={handleComplete} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Complete Session &amp; Open FnO
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
