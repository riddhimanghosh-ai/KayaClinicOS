'use client';

import SharedNavRail from '../components/NavRail';
import MobileTabBar from '../components/MobileTabBar';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

/* ── Icons ── */
const Icon = ({ size = 18, children, stroke = 1.4, style }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, ...style }}>
    {children}
  </svg>
);
const GoldNode    = ({ cx, cy, r = 1.6 }: any) => <circle cx={cx} cy={cy} r={r} fill="var(--gold)" stroke="none" />;
const IconPlus    = (p: any) => <Icon {...p}><path d="M12 5 V19"/><path d="M5 12 H19"/></Icon>;
const IconCheck   = (p: any) => <Icon {...p}><path d="M4 12 L9.5 17.5 L20 7"/></Icon>;
const IconChevron = (p: any) => <Icon {...p}><path d="M6 9 L12 15 L18 9"/></Icon>;
const IconSearch  = (p: any) => <Icon {...p}><circle cx="10.5" cy="10.5" r="6"/><path d="M15 15 L20 20"/></Icon>;
const IconBell    = (p: any) => <Icon {...p}><path d="M6 16 V11 C6 7.5 8.5 5 12 5 C15.5 5 18 7.5 18 11 V16 L19.5 18 H4.5 Z"/><path d="M10 20 C10.5 21 11.2 21.5 12 21.5 C12.8 21.5 13.5 21 14 20"/><GoldNode cx={17} cy={7}/></Icon>;

/* ── DATA ── */
const UPCOMING = [
  { d: 'Sat', dt: '14', mon: 'Jun', time: '11:30', doc: 'Dr. Ananya Sharma', treat: 'Hydrafacial · Phase 3', loc: 'Bandra West · Suite 04', in: 'in 6 days', confirm: true },
  { d: 'Fri', dt: '27', mon: 'Jun', time: '15:00', doc: 'Dr. Ravi Krishnan',  treat: 'Acne consultation',    loc: 'Bandra West · Suite 02', in: 'in 19 days', confirm: false },
  { d: 'Mon', dt: '14', mon: 'Jul', time: '10:00', doc: 'Dr. Ananya Sharma', treat: 'Phase 4 review',        loc: 'Bandra West · Suite 04', in: 'in 36 days', confirm: false },
];

const PAST = [
  {
    dt: '13', mon: 'May', year: '2025',
    doc: 'Dr. Ananya Sharma', treat: 'Hydrafacial · Phase 2', type: 'Treatment',
    summary: 'Skin tone is visibly improving following Phase 2 chemical peels. Mild erythema post-HydraFacial resolved within 24 hours — Priya responded well. Phase 3 HydraFacial sessions now initiated. Follow-up scheduled for June 18 to assess baseline before moving to Phase 4.',
  },
  {
    dt: '30', mon: 'Apr', year: '2025',
    doc: 'Dr. Ananya Sharma', treat: 'Chemical peel · TCA 15%', type: 'Treatment',
    summary: 'Final peel of Phase 2. Tolerated well with no significant adverse effects. Quantitative pigmentation score down ~12% from baseline. Skin barrier intact. Minor flaking expected over the next 5 days — advised to skip exfoliants.',
  },
  {
    dt: '11', mon: 'Apr', year: '2025',
    doc: 'Dr. Ananya Sharma', treat: 'Chemical peel · TCA 10%', type: 'Treatment',
    summary: 'Second peel of Phase 2, stepped up from TCA 10% baseline. Priya\'s skin showed good tolerance. Slight pinkness during application — normalised within the session. Baseline pigmentation reading captured for phase comparison.',
  },
  {
    dt: '14', mon: 'Mar', year: '2025',
    doc: 'Dr. Ravi Krishnan', treat: 'Initial consultation', type: 'Consultation',
    summary: 'Priya presented with mild post-inflammatory hyperpigmentation (PIH) and hormonal acne. Her skin type is Fitzpatrick III–IV. A structured 12‑week protocol was established, divided into four phases — beginning with chemical peels to target PIH, followed by HydraFacial treatments to restore and strengthen the skin barrier.',
  },
];

const PRESCRIPTIONS = [
  {
    id: 1,
    date: 'May 13, 2025',
    doctor: 'Dr. Ananya Sharma',
    label: 'Phase 3 regimen',
    recommendation: 'Continuing with maintenance regimen post Phase 2 peels. Emphasis on daily sun protection and nightly retinoid to sustain PIH improvement. Add niacinamide as a barrier-support step.',
    items: [
      { problem: 'Post-inflammatory hyperpigmentation', type: 'Chronic', product: 'Tretinoin 0.025% Cream', detail: '15g tube', dosage: 'Apply pea-sized amount', dosageDetail: 'PM · nightly · avoid eye area' },
      { problem: 'Active acne (hormonal)', type: 'Acute', product: 'Azelaic Acid 15% Gel', detail: '20g tube', dosage: 'Spot treatment', dosageDetail: 'PM · on active lesions only' },
      { problem: 'Brightening + antioxidant', type: null, product: 'Kaya Antox Vit-C Serum', detail: '30ml', dosage: '3–4 drops', dosageDetail: 'AM · before moisturiser' },
      { problem: 'Sun protection (mandatory)', type: null, product: 'Kaya Daily Shield SPF 50 PA++++', detail: '50ml', dosage: 'Generous application', dosageDetail: 'AM · reapply every 2h outdoors' },
    ],
  },
  {
    id: 2,
    date: 'Mar 14, 2025',
    doctor: 'Dr. Ananya Sharma',
    label: 'Initial prescription',
    recommendation: 'Starting regimen for mild PIH and hormonal acne. Keep routine minimal — focus on actives that target pigment and barrier. Introduce retinoid slowly (every other night for 2 weeks).',
    items: [
      { problem: 'Post-inflammatory hyperpigmentation', type: 'Chronic', product: 'Kaya Niacinamide 10% Serum', detail: '30ml', dosage: '2–3 drops', dosageDetail: 'AM + PM · mix with moisturiser', cost: 750 },
      { problem: 'Active acne', type: 'Acute', product: 'Kaya Clarifying Face Wash', detail: '100ml', dosage: 'Twice daily', dosageDetail: 'AM + PM · gentle lather, rinse cool', cost: 450 },
      { problem: 'Sun protection (mandatory)', type: null, product: 'Kaya Daily Shield SPF 50 PA++++', detail: '50ml', dosage: 'Generous application', dosageDetail: 'AM · every morning without fail', cost: 950 },
    ],
  },
];

const MEDICATIONS = [
  { name: 'Tretinoin 0.025% Cream',      date: 'May 2, 2025',  qty: '15g',   note: 'Running low — ~12 days left' },
  { name: 'Kaya Antox Vit-C Serum',      date: 'May 2, 2025',  qty: '30ml',  note: '~18 days left' },
  { name: 'Azelaic Acid 15% Gel',        date: 'Apr 16, 2025', qty: '30g',   note: null },
  { name: 'Kaya Daily Shield SPF 50',    date: 'Mar 14, 2025', qty: '50ml',  note: 'Runs out ~Jun 20' },
  { name: 'Kaya Niacinamide 10% Serum',  date: 'Mar 14, 2025', qty: '30ml',  note: null },
];

/* ── BOOKING MODAL ── */
const TREATMENTS = [
  { id: 'consultation', name: 'Initial Consultation', duration: '30 min', price: '₹600',   desc: 'Full skin analysis + treatment plan' },
  { id: 'hydrafacial',  name: 'HydraFacial',          duration: '60 min', price: '₹3,200', desc: 'Deep cleanse, exfoliation & hydration infusion' },
  { id: 'peel',         name: 'Chemical Peel',         duration: '45 min', price: '₹2,800', desc: 'TCA peel for hyperpigmentation & acne scarring' },
];
const DOCTORS = [
  { id: 'ananya', name: 'Dr. Ananya Sharma', spec: 'Cosmetic dermatology', rating: 4.9 },
  { id: 'ravi',   name: 'Dr. Ravi Krishnan', spec: 'Medical dermatology',  rating: 4.8 },
];
const BOOKING_DATES = [
  { day: 'Thu', dt: 29, mon: 'May', full: '2026-05-29' },
  { day: 'Fri', dt: 30, mon: 'May', full: '2026-05-30' },
  { day: 'Mon', dt: 2,  mon: 'Jun', full: '2026-06-02' },
  { day: 'Tue', dt: 3,  mon: 'Jun', full: '2026-06-03' },
  { day: 'Wed', dt: 4,  mon: 'Jun', full: '2026-06-04' },
];
const TIMES = ['09:00', '10:00', '11:00', '11:30', '14:00', '15:00', '16:00', '17:00'];

const BookingModal = ({ onClose }: { onClose: () => void }) => {
  const [step, setStep] = useState(1);
  const [treatment, setTreatment] = useState<any>(null);
  const [doctor, setDoctor] = useState<any>(null);
  const [date, setDate] = useState<any>(null);
  const [time, setTime] = useState('');
  const [done, setDone] = useState(false);
  const canNext = () => step === 1 ? !!treatment : !!(doctor && date && time);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: 'var(--paper)', width: '100%', maxWidth: 460, maxHeight: '88vh', overflow: 'auto', borderRadius: 'var(--r-4)', boxShadow: '0 24px 60px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="eyebrow brand dot">Book a visit</div>
            {!done && <div style={{ fontSize: 11, color: 'var(--mute)', marginTop: 2 }}>Step {step} of 2</div>}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mute)', fontSize: 22, lineHeight: 1 }}>×</button>
        </div>
        {!done && <div style={{ display: 'flex', gap: 4, padding: '10px 24px 0' }}>{[1,2].map(s => <div key={s} style={{ height: 3, flex: 1, background: s <= step ? 'var(--brand)' : 'var(--hair-2)', borderRadius: 2 }} />)}</div>}
        <div style={{ padding: '20px 24px', flex: 1 }}>
          {done ? (
            <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
              <div style={{ width: 52, height: 52, background: 'var(--brand)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <IconCheck size={22} style={{ color: 'white' }} />
              </div>
              <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>You're booked!</div>
              <div style={{ fontSize: 12, color: 'var(--mute)', lineHeight: 1.7 }}>{treatment?.name}<br />{doctor?.name} · {date?.day} {date?.dt} {date?.mon} · {time}</div>
              <button className="btn ghost sm" style={{ marginTop: 18 }} onClick={onClose}>Done</button>
            </div>
          ) : step === 1 ? (
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>What would you like to book?</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {TREATMENTS.map(t => (
                  <div key={t.id} onClick={() => setTreatment(t)} style={{ padding: '13px 15px', border: `1.5px solid ${treatment?.id === t.id ? 'var(--brand)' : 'var(--hair)'}`, borderRadius: 'var(--r-3)', cursor: 'pointer', background: treatment?.id === t.id ? 'var(--brand-tint-2)' : 'var(--paper)', transition: 'all 0.15s' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{t.name}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--brand)' }}>{t.price}</div>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--mute)', marginTop: 3 }}>{t.desc} · {t.duration}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Pick a doctor & time</div>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Doctor</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {DOCTORS.map(d => (
                  <div key={d.id} onClick={() => setDoctor(d)} style={{ flex: 1, padding: '11px 13px', border: `1.5px solid ${doctor?.id === d.id ? 'var(--brand)' : 'var(--hair)'}`, borderRadius: 'var(--r-3)', cursor: 'pointer', background: doctor?.id === d.id ? 'var(--brand-tint-2)' : 'var(--paper)', transition: 'all 0.15s' }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{d.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--gold)', marginTop: 2 }}>★ {d.rating}</div>
                  </div>
                ))}
              </div>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Date</div>
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 16 }}>
                {BOOKING_DATES.map((d, i) => (
                  <div key={i} onClick={() => setDate(d)} style={{ flexShrink: 0, width: 52, padding: '9px 5px', textAlign: 'center', border: `1.5px solid ${date?.full === d.full ? 'var(--brand)' : 'var(--hair)'}`, borderRadius: 'var(--r-3)', cursor: 'pointer', background: date?.full === d.full ? 'var(--brand)' : 'var(--paper)', color: date?.full === d.full ? 'white' : 'var(--ink)', transition: 'all 0.15s' }}>
                    <div style={{ fontSize: 10, opacity: 0.7 }}>{d.day}</div>
                    <div style={{ fontSize: 18, fontWeight: 600, fontFamily: 'var(--mono)', lineHeight: 1.2 }}>{d.dt}</div>
                    <div style={{ fontSize: 10, opacity: 0.7 }}>{d.mon}</div>
                  </div>
                ))}
              </div>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Time</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {TIMES.map(t => (
                  <div key={t} onClick={() => setTime(t)} style={{ padding: '6px 13px', border: `1.5px solid ${time === t ? 'var(--brand)' : 'var(--hair)'}`, borderRadius: 'var(--r-2)', cursor: 'pointer', background: time === t ? 'var(--brand)' : 'var(--paper)', color: time === t ? 'white' : 'var(--ink)', fontSize: 12, fontFamily: 'var(--mono)', transition: 'all 0.15s' }}>{t}</div>
                ))}
              </div>
            </div>
          )}
        </div>
        {!done && (
          <div style={{ padding: '14px 24px', borderTop: '1px solid var(--hair)', display: 'flex', justifyContent: 'space-between' }}>
            {step > 1 ? <button className="btn ghost sm" onClick={() => setStep(1)}>← Back</button> : <div />}
            {step < 2
              ? <button className="btn sm" disabled={!canNext()} style={{ opacity: canNext() ? 1 : 0.4 }} onClick={() => setStep(2)}>Continue →</button>
              : <button className="btn sm" disabled={!canNext()} style={{ opacity: canNext() ? 1 : 0.4 }} onClick={() => setDone(true)}>Confirm →</button>
            }
          </div>
        )}
      </div>
    </div>
  );
};

/* ── TAB CONTENT ── */
const UpcomingContent = ({ onBook }: { onBook: () => void }) => (
  <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
      <div style={{ fontSize: 13, color: 'var(--mute)' }}>3 visits ahead</div>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {UPCOMING.map((a, i) => (
        <div key={i} className="panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex' }}>
            <div style={{ width: 82, padding: 14, borderRight: '1px solid var(--hair)', background: i === 0 ? 'var(--ink)' : 'var(--paper-2)', color: i === 0 ? 'var(--paper)' : 'var(--ink)', flexShrink: 0, textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: i === 0 ? 'rgba(255,255,255,0.45)' : 'var(--mute)', fontFamily: 'var(--mono)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{a.mon}</div>
              <div className="num" style={{ fontSize: 30, lineHeight: 1.1, marginTop: 2 }}>{a.dt}</div>
              <div className="num" style={{ fontSize: 11, marginTop: 6, opacity: 0.6 }}>{a.time}</div>
            </div>
            <div style={{ flex: 1, padding: 14 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{a.treat}</div>
              <div style={{ fontSize: 12, color: 'var(--mute)', marginTop: 2 }}>{a.doc}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                <span className={`tag ${i === 0 ? 'gold' : ''}`}><span className="led" /> {a.in}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {a.confirm && <button className="btn sm" style={{ fontSize: 11, padding: '4px 12px' }}>Confirm</button>}
                  <button className="btn ghost sm" style={{ fontSize: 11, padding: '4px 10px' }}>Reschedule</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const CONSULTATION_IDX = PAST.length - 1; // Initial consultation is always the last entry

function downloadPrescription() {
  const rx = PRESCRIPTIONS[1];
  const subtotal   = rx.items.reduce((s, it) => s + ((it as any).cost || 0), 0);
  const dispensing = 60;
  const total      = subtotal + dispensing;
  const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

  const rows = rx.items.map(item => {
    const cost = (item as any).cost;
    const typeColor = item.type?.toLowerCase() === 'chronic' ? '#9d174d' : '#b91c1c';
    return `
      <tr>
        <td>
          <div class="bold">${item.problem}</div>
          ${item.type ? `<span class="badge" style="color:${typeColor};border-color:${typeColor}20;background:${typeColor}10">${item.type.charAt(0).toUpperCase() + item.type.slice(1)}</span>` : ''}
        </td>
        <td>
          <div class="bold">${item.product}</div>
          <div class="sub">${item.detail}</div>
        </td>
        <td>
          <div class="bold">${item.dosage}</div>
          <div class="sub">${item.dosageDetail}</div>
        </td>
        <td class="cost">${cost ? inr(cost) : '<span style="color:#9ca3af">—</span>'}</td>
      </tr>`;
  }).join('');

  const html = `<!DOCTYPE html><html lang="en"><head>
  <meta charset="utf-8"/>
  <title>Kaya Prescription — ${rx.date}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;color:#1f2937;background:#fff;padding:48px;max-width:900px;margin:0 auto}
    .top-bar{height:5px;background:#1f7a5a;margin:-48px -48px 40px;width:calc(100% + 96px)}
    .logo{font-size:32px;font-weight:700;letter-spacing:-.02em;color:#1f2937}
    .logo-sub{font-size:10px;font-weight:600;letter-spacing:.2em;color:#6b7280;margin-top:4px}
    .logo-addr{font-size:12px;color:#6b7280;margin-top:6px}
    .divider{border:none;border-top:1px solid #e5e7eb;margin:20px 0}
    .band{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;padding:16px 0}
    .band-label{font-size:10px;font-weight:600;letter-spacing:.12em;color:#6b7280;text-transform:uppercase;margin-bottom:6px}
    .band-val{font-size:14px;font-weight:600;color:#1f2937}
    .band-sub{font-size:12px;color:#6b7280;margin-top:3px}
    .section-label{font-size:10px;font-weight:700;letter-spacing:.12em;color:#1f7a5a;text-transform:uppercase;margin-bottom:10px}
    .rec{font-size:14px;line-height:1.7;color:#374151;margin-bottom:28px}
    table{width:100%;border-collapse:collapse;font-size:13px}
    thead th{font-size:10px;font-weight:600;letter-spacing:.1em;color:#9ca3af;text-transform:uppercase;padding:8px 12px;text-align:left;border-bottom:1px solid #e5e7eb}
    thead th.cost{text-align:right}
    tbody tr{border-bottom:1px solid #f3f4f6}
    tbody td{padding:14px 12px;vertical-align:top}
    .bold{font-weight:600;color:#1f2937;line-height:1.4}
    .sub{font-size:12px;color:#6b7280;margin-top:3px;line-height:1.4}
    .badge{display:inline-block;font-size:10px;font-weight:500;padding:2px 7px;border-radius:4px;border:1px solid;margin-top:5px}
    td.cost{text-align:right;font-weight:500;white-space:nowrap}
    .footer{display:flex;justify-content:space-between;align-items:flex-end;margin-top:32px;padding-top:20px;border-top:1px solid #e5e7eb}
    .totals{font-size:13px;color:#6b7280;display:flex;flex-direction:column;gap:6px}
    .totals .row{display:flex;gap:40px}
    .totals .row span:last-child{min-width:80px}
    .total-row{font-size:15px;font-weight:700;color:#1f2937;padding-top:8px;border-top:1px solid #e5e7eb;margin-top:4px}
    .sig{text-align:right}
    .sig-name{font-size:26px;font-style:italic;font-weight:700;color:#1f2937;font-family:Georgia,serif}
    .sig-label{font-size:9px;letter-spacing:.14em;color:#9ca3af;text-transform:uppercase;margin-top:4px}
    .print-btn{position:fixed;top:16px;right:16px;background:#1f7a5a;color:#fff;border:none;padding:10px 20px;font-size:13px;font-weight:600;cursor:pointer;border-radius:6px;font-family:inherit}
    .print-btn:hover{background:#165f44}
    @media print{.print-btn{display:none}.top-bar{margin:-48px -48px 40px}}
  </style>
</head><body>
  <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
  <div class="top-bar"></div>
  <div class="logo">kaya</div>
  <div class="logo-sub">SKIN · HAIR · BODY</div>
  <div class="logo-addr">14 Turner Road, 400050 · +91 22 6789 1234 · Reg. MH-KY-00412</div>
  <hr class="divider"/>
  <div class="band">
    <div><div class="band-label">Patient</div><div class="band-val">Priya R.</div><div class="band-sub">DOB 1997-03-14 · GDRC88421</div></div>
    <div><div class="band-label">Prescribing Physician</div><div class="band-val">${rx.doctor}</div><div class="band-sub">Dermatology</div></div>
    <div><div class="band-label">Age</div><div class="band-val">28 yrs · F</div></div>
    <div><div class="band-label">Date Issued</div><div class="band-val">${rx.date}</div><div class="band-sub">Valid 30 days</div></div>
  </div>
  <hr class="divider"/>
  <div class="section-label">Clinical Recommendation</div>
  <div class="rec">${rx.recommendation}</div>
  <div class="section-label">Treatment Plan</div>
  <table>
    <thead><tr><th>Problem</th><th>Product / Medicine</th><th>Dosage</th><th class="cost">Cost</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">
    <div class="totals">
      <div class="row"><span>Subtotal</span><span>${subtotal > 0 ? inr(subtotal) : '—'}</span></div>
      <div class="row"><span>Dispensing fee</span><span>${inr(dispensing)}</span></div>
      <div class="row total-row"><span>Estimated total</span><span>${inr(total)}</span></div>
    </div>
    <div class="sig">
      <div class="sig-name">${rx.doctor.replace(/^Dr\.?\s*/i, '')}</div>
      <div class="sig-label">Physician Signature</div>
    </div>
  </div>
</body></html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url  = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

const PastContent = () => {
  // Initial consultation (last item) is always open and cannot be collapsed
  const [expanded, setExpanded] = useState<number | null>(CONSULTATION_IDX);

  const handleToggle = (i: number, open: boolean) => {
    if (i === CONSULTATION_IDX) return; // never collapse the consultation
    setExpanded(open ? null : i);
  };

  return (
    <div>
      <div style={{ fontSize: 13, color: 'var(--mute)', marginBottom: 16 }}>Tap any visit to read the session note.</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: '1px solid var(--hair)' }}>
        {PAST.map((p, i) => {
          const open    = expanded === i;
          const locked  = i === CONSULTATION_IDX;
          return (
            <div key={i} style={{ borderBottom: i < PAST.length - 1 ? '1px solid var(--hair)' : 'none' }}>
              <div
                onClick={() => handleToggle(i, open)}
                style={{ display: 'flex', gap: 14, padding: '14px 18px', cursor: locked ? 'default' : 'pointer', alignItems: 'flex-start', background: open ? 'var(--paper-2)' : 'var(--paper)', transition: 'background 0.15s' }}
              >
                <div className="num" style={{ fontSize: 12, color: 'var(--mute)', minWidth: 56, flexShrink: 0, paddingTop: 1 }}>{p.mon} {p.dt}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{p.treat}</div>
                  <div style={{ fontSize: 11, color: 'var(--mute)', marginTop: 2 }}>{p.doc}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, paddingTop: 1 }}>
                  <span className="tag" style={{ fontSize: 10 }}>{p.type}</span>
                  {!locked && <IconChevron size={14} style={{ color: 'var(--mute)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />}
                </div>
              </div>
              {open && (
                <div style={{ padding: '0 18px 16px 88px', background: 'var(--paper-2)' }}>
                  <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.7, fontStyle: 'italic', borderLeft: '2px solid var(--gold)', paddingLeft: 12 }}>
                    {p.summary}
                  </div>
                  {p.type === 'Consultation' && (
                    <div style={{ marginTop: 12 }}>
                      <button className="btn ghost sm" style={{ fontSize: 11 }} onClick={downloadPrescription}>
                        ↓ Download prescription
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const PrescriptionsContent = () => {
  const [expanded, setExpanded] = useState<number>(0); // first open by default
  return (
    <div>
      <div style={{ fontSize: 13, color: 'var(--mute)', marginBottom: 16 }}>Prescribed by Dr. Ananya Sharma</div>
      {/* Timeline line */}
      <div style={{ position: 'relative', paddingLeft: 22 }}>
        <div style={{ position: 'absolute', left: 6, top: 8, bottom: 8, width: 1, background: 'var(--hair-2)' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {PRESCRIPTIONS.map((rx, i) => {
            const open = expanded === i;
            return (
              <div key={rx.id} style={{ position: 'relative' }}>
                {/* Timeline dot */}
                <div style={{ position: 'absolute', left: -18, top: 16, width: 10, height: 10, borderRadius: '50%', background: i === 0 ? 'var(--gold)' : 'var(--hair-strong)', border: `2px solid ${i === 0 ? 'var(--gold)' : 'var(--hair-2)'}` }} />

                {/* Accordion card */}
                <div style={{ border: '1px solid var(--hair)', overflow: 'hidden' }}>
                  {/* Header — clickable */}
                  <div
                    onClick={() => setExpanded(open ? -1 : i)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', cursor: 'pointer', background: open ? 'var(--ink)' : 'var(--paper)', color: open ? 'var(--paper)' : 'var(--ink)', transition: 'all 0.18s' }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{rx.label}</div>
                      <div style={{ fontSize: 11, marginTop: 2, opacity: 0.65 }}>{rx.doctor} · {rx.date} · {rx.items.length} items</div>
                    </div>
                    <IconChevron size={15} style={{ flexShrink: 0, marginLeft: 10, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', opacity: 0.6 }} />
                  </div>

                  {/* Body */}
                  {open && (
                    <div>
                      {/* Clinical recommendation */}
                      <div style={{ padding: '12px 16px', background: 'var(--paper-2)', borderBottom: '1px solid var(--hair)' }}>
                        <div style={{ fontSize: 10, fontFamily: 'var(--mono)', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--mute)', marginBottom: 6 }}>Clinical note</div>
                        <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.65, fontStyle: 'italic' }}>{rx.recommendation}</div>
                      </div>

                      {/* Items table */}
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                          <thead>
                            <tr style={{ background: 'var(--paper-3)' }}>
                              {['Problem', 'Product', 'Dosage'].map(h => (
                                <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 10, fontFamily: 'var(--mono)', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--mute)', fontWeight: 600, borderBottom: '1px solid var(--hair)', whiteSpace: 'nowrap' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {rx.items.map((item, j) => (
                              <tr key={j} style={{ borderBottom: j < rx.items.length - 1 ? '1px solid var(--hair)' : 'none' }}>
                                <td style={{ padding: '10px 14px', verticalAlign: 'top' }}>
                                  <div style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.3 }}>{item.problem}</div>
                                  {item.type && <div style={{ fontSize: 10, marginTop: 3, color: item.type === 'Chronic' ? 'var(--warn)' : 'var(--brand)', fontFamily: 'var(--mono)', letterSpacing: '0.06em' }}>{item.type.toUpperCase()}</div>}
                                </td>
                                <td style={{ padding: '10px 14px', verticalAlign: 'top' }}>
                                  <div style={{ fontSize: 12, fontWeight: 500 }}>{item.product}</div>
                                  <div style={{ fontSize: 10, color: 'var(--mute)', marginTop: 2 }}>{item.detail}</div>
                                </td>
                                <td style={{ padding: '10px 14px', verticalAlign: 'top' }}>
                                  <div style={{ fontSize: 12 }}>{item.dosage}</div>
                                  <div style={{ fontSize: 10, color: 'var(--mute)', marginTop: 2, lineHeight: 1.4 }}>{item.dosageDetail}</div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* ── PAST PURCHASES DATA ── */
const PACKAGES = [
  {
    name: 'HydraFacial · Phase 3 package',
    date: 'May 7, 2025',
    totalSessions: 4,
    used: 1,
    balance: 3,
    status: 'Active',
  },
  {
    name: 'Chemical Peel · Phase 2 package',
    date: 'Mar 26, 2025',
    totalSessions: 3,
    used: 3,
    balance: 0,
    status: 'Complete',
  },
];

const PRODUCT_PURCHASES = [
  { name: 'Tretinoin 0.025% Cream',    date: 'May 02, 2025', price: '₹580' },
  { name: 'Azelaic Acid 15% Gel',      date: 'Apr 16, 2025', price: '₹490' },
  { name: 'Kaya Antox Vit-C Serum',    date: 'Mar 14, 2025', price: '₹420' },
  { name: 'Kaya Daily Shield SPF 50',  date: 'Mar 14, 2025', price: '₹650' },
];

const PastPurchasesContent = () => (
  <div>
    {/* Treatment packages */}
    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Treatment packages</div>
    <div style={{ border: '1px solid var(--hair)', marginBottom: 28 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px', background: 'var(--paper-3)', padding: '8px 18px', gap: 12 }}>
        {['Package', 'Used', 'Balance'].map(h => (
          <div key={h} style={{ fontSize: 10, fontFamily: 'var(--mono)', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--mute)', textAlign: h === 'Package' ? 'left' : 'center' }}>{h}</div>
        ))}
      </div>
      {PACKAGES.map((pkg, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px', padding: '14px 18px', gap: 12, borderTop: '1px solid var(--hair)', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{pkg.name}</div>
            <div style={{ fontSize: 11, color: 'var(--mute)', marginTop: 2 }}>{pkg.date}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 600, fontFamily: 'var(--mono)' }}>
              {pkg.used} <span style={{ fontSize: 10, color: 'var(--mute)', fontWeight: 400 }}>/ {pkg.totalSessions}</span>
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 600, fontFamily: 'var(--mono)', color: pkg.balance > 0 ? 'var(--ok)' : 'var(--mute)' }}>{pkg.balance}</div>
            <div style={{ fontSize: 10, fontFamily: 'var(--mono)', letterSpacing: '0.06em', marginTop: 2, color: pkg.status === 'Active' ? 'var(--brand)' : 'var(--mute)' }}>{pkg.status.toUpperCase()}</div>
          </div>
        </div>
      ))}
    </div>

    {/* Products */}
    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Products purchased</div>
    <div style={{ border: '1px solid var(--hair)' }}>
      {PRODUCT_PURCHASES.map((p, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', borderBottom: i < PRODUCT_PURCHASES.length - 1 ? '1px solid var(--hair)' : 'none' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div>
            <div style={{ fontSize: 11, color: 'var(--mute)', marginTop: 2 }}>{p.date}</div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--mono)' }}>{p.price}</div>
        </div>
      ))}
    </div>
  </div>
);

const MedicationsContent = () => (
  <div>
    <div style={{ fontSize: 13, color: 'var(--mute)', marginBottom: 16 }}>Products you've picked up at the clinic.</div>
    <div style={{ border: '1px solid var(--hair)' }}>
      {MEDICATIONS.map((m, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', borderBottom: i < MEDICATIONS.length - 1 ? '1px solid var(--hair)' : 'none' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{m.name}</div>
            <div style={{ fontSize: 11, color: 'var(--mute)', marginTop: 2 }}>{m.qty} · {m.date}</div>
          </div>
          <IconCheck size={14} style={{ color: 'var(--ok)', opacity: 0.7, flexShrink: 0 }} />
        </div>
      ))}
    </div>
  </div>
);

/* ── TAB STRIP ── */
type Tab = 'upcoming' | 'past' | 'prescriptions';
const TABS: { id: Tab; label: string }[] = [
  { id: 'upcoming',      label: 'Upcoming' },
  { id: 'past',          label: 'Past visits' },
  { id: 'prescriptions', label: 'Past purchases' },
];

const TabStrip = ({ active, onChange, desktop }: { active: Tab; onChange: (t: Tab) => void; desktop?: boolean }) => (
  <div style={{ display: 'flex', gap: desktop ? 4 : 6, padding: desktop ? '12px var(--pad-4)' : '12px 20px', borderBottom: '1px solid var(--hair)', overflowX: 'auto', scrollbarWidth: 'none', flexShrink: 0 }}>
    {TABS.map(t => (
      <button key={t.id} onClick={() => onChange(t.id)} style={{
        flexShrink: 0, appearance: 'none',
        padding: desktop ? '6px 14px' : '5px 12px',
        background: active === t.id ? 'var(--ink)' : 'transparent',
        color: active === t.id ? 'var(--paper)' : 'var(--ink)',
        border: '1px solid ' + (active === t.id ? 'var(--ink)' : 'var(--hair-2)'),
        font: `500 ${desktop ? 12 : 11}px var(--mono)`,
        letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer',
      }}>{t.label}</button>
    ))}
  </div>
);

const TabContent = ({ tab, onBook }: { tab: Tab; onBook: () => void }) => (
  <>
    {tab === 'upcoming'      && <UpcomingContent onBook={onBook} />}
    {tab === 'past'          && <PastContent />}
    {tab === 'prescriptions' && <PastPurchasesContent />}
  </>
);

/* ── MOBILE SHELL ── */
const MobileShell = ({ children }: any) => (
  <div className="frame" style={{ display: 'flex', flexDirection: 'column' }}>
    <div className="statusbar">
      <span>9:41</span>
      <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <span style={{ display: 'inline-block', width: 4, height: 4, background: 'currentColor', borderRadius: '50%' }} />
        <span style={{ display: 'inline-block', width: 4, height: 4, background: 'currentColor', borderRadius: '50%' }} />
        <span style={{ display: 'inline-block', width: 4, height: 4, background: 'currentColor', borderRadius: '50%' }} />
        <svg width="16" height="11" viewBox="0 0 16 11" fill="none"><rect x="0.5" y="0.5" width="13" height="10" rx="2" stroke="currentColor" /><rect x="2" y="2" width="9" height="7" fill="currentColor" /><rect x="14" y="3.5" width="1.5" height="4" rx="0.5" fill="currentColor" /></svg>
      </span>
    </div>
    <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>{children}</div>
    <MobileTabBar active="appt" />
  </div>
);

/* ── DESKTOP ── */
const HistoryDesktop = () => {
  const [tab, setTab] = useState<Tab>('upcoming');
  const [showBooking, setShowBooking] = useState(false);
  const next = UPCOMING[0];

  return (
    <div className="frame" style={{ display: 'flex' }}>
      <SharedNavRail active="appointments" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div className="topbar">
          <div>
            <div className="eyebrow gold dot">Kaya · Patient Portal</div>
            <div className="h3" style={{ marginTop: 6 }}>Appointments</div>
          </div>
          <div />
        </div>

        {/* Summary bar — next appointment + package progress */}
        {next && (
          <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--hair)', flexShrink: 0 }}>
            {/* Next appointment */}
            <div style={{ flex: 1.4, background: 'var(--ink)', color: 'var(--paper)', padding: '18px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 10, fontFamily: 'var(--mono)', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.70)', marginBottom: 8 }}>
                  Next visit · {next.in}
                </div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{next.doc}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 3 }}>{next.treat} · {next.loc}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 400, letterSpacing: '-0.02em', marginTop: 12 }}>
                  {next.d} {next.dt} {next.mon} · {next.time}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {next.confirm && (
                  <button style={{ background: 'var(--paper)', color: 'var(--ink)', border: 'none', padding: '9px 18px', fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: 'var(--sans)' }}>Confirm</button>
                )}
                <button style={{ background: 'transparent', color: 'rgba(255,255,255,0.80)', border: '1px solid rgba(255,255,255,0.40)', padding: '8px 18px', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--sans)' }}>Reschedule</button>
              </div>
            </div>
            {/* Active package */}
            <div style={{ flex: 1, padding: '18px 24px', borderLeft: '1px solid var(--hair)' }}>
              <div style={{ fontSize: 10, fontFamily: 'var(--mono)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--mute)', marginBottom: 8 }}>Active package</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>HydraFacial · Phase 3</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                {[1,2,3,4].map(i => (
                  <div key={i} style={{ flex: 1, height: 6, background: i <= 1 ? 'var(--gold)' : 'var(--hair-2)' }} />
                ))}
              </div>
              <div style={{ fontSize: 11, color: 'var(--mute)', marginTop: 8 }}>1 of 4 used · 3 sessions remaining</div>
            </div>
          </div>
        )}

        <TabStrip active={tab} onChange={setTab} desktop />
        <div style={{ flex: 1, overflow: 'auto', padding: 'var(--pad-4)' }}>
          <TabContent tab={tab} onBook={() => setShowBooking(true)} />
        </div>
      </div>

      {showBooking && <BookingModal onClose={() => setShowBooking(false)} />}
    </div>
  );
};

/* ── MOBILE ── */
const HistoryMobile = () => {
  const [tab, setTab] = useState<Tab>('upcoming');
  const [showBooking, setShowBooking] = useState(false);
  const next = UPCOMING[0];

  return (
    <MobileShell>
      {showBooking && <BookingModal onClose={() => setShowBooking(false)} />}
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '14px 20px 0', flexShrink: 0 }}>
          <div className="eyebrow gold dot" style={{ marginBottom: 4 }}>Kaya · Patient Portal</div>
          <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.01em' }}>Appointments</div>
        </div>

        {/* Next appointment mini-card */}
        {next && (
          <div style={{ margin: '12px 20px 0', background: 'var(--ink)', color: 'var(--paper)', padding: '14px 16px', flexShrink: 0 }}>
            <div style={{ fontSize: 9, fontFamily: 'var(--mono)', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.45)', marginBottom: 6 }}>
              Next · {next.in}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{next.doc}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 4 }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>{next.treat}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 400 }}>{next.d} {next.dt} · {next.time}</div>
            </div>
          </div>
        )}

        <div style={{ marginTop: 12, flexShrink: 0 }}>
          <TabStrip active={tab} onChange={setTab} />
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px 100px' }}>
          <TabContent tab={tab} onBook={() => setShowBooking(true)} />
        </div>
      </div>
    </MobileShell>
  );
};

export default function HistoryPage() {
  return (
    <>
      <div className="desktop-only"><HistoryDesktop /></div>
      <div className="mobile-only"><HistoryMobile /></div>
    </>
  );
}
