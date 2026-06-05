'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SharedNavRail from '../components/NavRail';
import MobileTabBar from '../components/MobileTabBar';

/* Icons */
const Icon = ({ size = 18, children, stroke = 1.4, style }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
    style={{ flexShrink: 0, ...style }}>
    {children}
  </svg>
);
const GoldNode = ({ cx, cy, r = 1.6 }: any) => (
  <circle cx={cx} cy={cy} r={r} fill="var(--gold)" stroke="none" />
);
const IconSearch = (p: any) => <Icon {...p}><circle cx="10.5" cy="10.5" r="6" /><path d="M15 15 L20 20" /></Icon>;
const IconBell = (p: any) => <Icon {...p}><path d="M6 16 V11 C6 7.5 8.5 5 12 5 C15.5 5 18 7.5 18 11 V16 L19.5 18 H4.5 Z" /><path d="M10 20 C10.5 21 11.2 21.5 12 21.5 C12.8 21.5 13.5 21 14 20" /><GoldNode cx={17} cy={7} /></Icon>;
const IconChevron = (p: any) => <Icon {...p}><path d="M6 9 L12 15 L18 9" /></Icon>;
const IconMic = (p: any) => <Icon {...p}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 12 C5 17 19 17 19 12" /><path d="M12 19 V22" /><path d="M8 22 H16" /></Icon>;

/* Nav */
const NavRail = ({ active = 'summary' }: any) => <SharedNavRail active={active} />;

const Topbar = ({ title, subtitle, right }: any) => (
  <div className="topbar">
    <div>
      <div className="eyebrow gold dot">{subtitle}</div>
      <div className="h3" style={{ marginTop: 6 }}>{title}</div>
    </div>
    <div className="row center" style={{ gap: 10 }}>
      {right}
      <button className="btn ghost sm" title="Search"><IconSearch size={14} /> Search</button>
      <button className="btn ghost sm" title="Notifications" style={{ position: 'relative' }}>
        <IconBell size={14} />
        <span style={{ position: 'absolute', top: 4, right: 6, width: 6, height: 6, borderRadius: '50%', background: 'var(--gold)' }} />
      </button>
    </div>
  </div>
);

const MobileShell = ({ active = 'summary', children }: any) => {
  return (
    <div className="frame" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
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
      <MobileTabBar active={active} />
    </div>
  );
};

/* ── Mock Data ── */
const SUMMARIES = [
  {
    id: 1,
    date: '27 May 2026',
    dayLabel: 'Today',
    type: 'Treatment',
    typeColor: 'var(--gold)',
    doctor: 'Dr. Ananya Sharma',
    spec: 'Dermatology · Cosmetic',
    title: 'Hydrafacial · Phase 3 · Session 2',
    duration: '45 min',
    tags: ['Phase 3', 'W09', 'Hydrafacial'],
    summary: 'Session proceeded without complications. Extracted comedones from T-zone and cheeks. Hydration serum applied with boosted penetration protocol. Skin responded well — TEWL reading improved 18% from last session. Doctor noted visible reduction in hyperpigmentation around upper cheeks. Next session scheduled for 10 June.',
    keyPoints: [
      'TEWL improved 18% vs last session',
      'Comedone extraction: T-zone + cheeks',
      'Pigmentation visibly reduced — upper cheeks',
    ],
    audioId: 'rec_20260527_hydra',
  },
  {
    id: 2,
    date: '13 May 2026',
    dayLabel: 'Tue, 13 May',
    type: 'Treatment',
    typeColor: 'var(--gold)',
    doctor: 'Dr. Ananya Sharma',
    spec: 'Dermatology · Cosmetic',
    title: 'Hydrafacial · Phase 3 · Session 1',
    duration: '40 min',
    tags: ['Phase 3', 'W07', 'Hydrafacial'],
    summary: 'First Hydrafacial session of Phase 3. Mild erythema observed post-procedure, resolved within 24 hours as expected. Skin texture uniformity score increased to 7.2/10 from 5.8 at start of protocol. Doctor recommended increasing tretinoin application frequency to nightly. Compliance discussed — patient confirmed 94% adherence.',
    keyPoints: [
      'Texture score: 7.2/10 (up from 5.8)',
      'Erythema resolved in 24h',
      'Tretinoin frequency increased to nightly',
    ],
    audioId: 'rec_20260513_hydra',
  },
  {
    id: 3,
    date: '30 Apr 2026',
    dayLabel: 'Wed, 30 Apr',
    type: 'Treatment',
    typeColor: 'var(--ink)',
    doctor: 'Dr. Ananya Sharma',
    spec: 'Dermatology · Cosmetic',
    title: 'Chemical Peel · TCA 15% · Session 3',
    duration: '30 min',
    tags: ['Phase 2', 'W07', 'Chemical Peel'],
    summary: 'Final TCA 15% session of Phase 2. Patient tolerated procedure well with minimal discomfort. Post-peel analysis shows −12% pigmentation from session 1 baseline. Frosting pattern consistent with desired depth. Doctor confirmed Phase 2 objectives met — transition to Hydrafacial phase approved. 7-day sun avoidance protocol issued.',
    keyPoints: [
      '−12% pigmentation from Phase 2 baseline',
      'Phase 2 objectives met — Phase 3 approved',
      '7-day sun avoidance issued',
    ],
    audioId: 'rec_20260430_peel',
  },
  {
    id: 4,
    date: '11 Apr 2026',
    dayLabel: 'Fri, 11 Apr',
    type: 'Treatment',
    typeColor: 'var(--ink)',
    doctor: 'Dr. Ananya Sharma',
    spec: 'Dermatology · Cosmetic',
    title: 'Chemical Peel · TCA 10% · Session 1',
    duration: '25 min',
    tags: ['Phase 2', 'W04', 'Chemical Peel'],
    summary: 'Baseline reading taken before first TCA peel. Melanin index recorded at 42 (VISIA score). Patient skin type III — protocol adjusted to lower concentration for first session. Good tolerance observed. Pre-peel prep completed correctly. Post-peel serum applied. Follow-up in 3 weeks for second session.',
    keyPoints: [
      'Baseline melanin index: 42 (VISIA)',
      'Skin type III — adjusted protocol',
      'Tolerance: good · pre-peel prep confirmed',
    ],
    audioId: 'rec_20260411_peel',
  },
  {
    id: 5,
    date: '2 Apr 2026',
    dayLabel: 'Thu, 2 Apr',
    type: 'Consultation',
    typeColor: 'var(--mint, #5b9e7c)',
    doctor: 'Dr. Ravi Krishnan',
    spec: 'Dermatology · Medical',
    title: 'Phase 2 Check-in · Medication Review',
    duration: '20 min',
    tags: ['Follow-up', 'Medications'],
    summary: 'Mid-protocol medication review. Tretinoin 0.025% showing good efficacy — no purging observed. Azelaic acid added to PM routine to target residual hyperpigmentation. Niacinamide 10% concentration confirmed appropriate. Patient reports skin barrier improvement. No adverse reactions. Next check-in at end of Phase 2.',
    keyPoints: [
      'Azelaic acid 15% added to PM routine',
      'No purging on tretinoin — efficacy confirmed',
      'Skin barrier improvement reported',
    ],
    audioId: 'rec_20260402_consult',
  },
  {
    id: 6,
    date: '14 Mar 2026',
    dayLabel: 'Thu, 14 Mar',
    type: 'Consultation',
    typeColor: 'var(--mint, #5b9e7c)',
    doctor: 'Dr. Ravi Krishnan',
    spec: 'Dermatology · Medical',
    title: 'Initial Consultation · Skin Mapping',
    duration: '55 min',
    tags: ['Initial', 'Skin Map', 'Protocol Start'],
    summary: 'Comprehensive skin analysis completed. VISIA imaging conducted — melanin index 42, erythema index 28, texture score 5.8/10. Diagnosed: post-inflammatory hyperpigmentation (Grade 2) with underlying acne scarring. 12-week protocol designed: Phase 1 skin mapping, Phase 2 chemical peels × 3, Phase 3 Hydrafacial × 4, Phase 4 maintenance. Prescription issued for home care regimen.',
    keyPoints: [
      'VISIA: melanin 42 · erythema 28 · texture 5.8',
      'Diagnosis: PIH Grade 2 + acne scarring',
      '12-week protocol approved and started',
    ],
    audioId: 'rec_20260314_initial',
  },
];

/* ── Entry Card (Desktop) ── */
const SummaryCard = ({ entry, expanded, onToggle }: any) => {
  const isConsultation = entry.type === 'Consultation';
  return (
    <div
      className="panel"
      style={{
        padding: 0,
        overflow: 'hidden',
        marginBottom: 12,
        transition: 'box-shadow 0.15s',
      }}
    >
      {/* Header row */}
      <div
        onClick={onToggle}
        style={{
          padding: '14px 18px',
          cursor: 'pointer',
          display: 'flex',
          gap: 16,
          alignItems: 'flex-start',
        }}
      >
        {/* Type indicator */}
        <div style={{
          width: 36, height: 36, flexShrink: 0,
          background: isConsultation ? 'rgba(91,158,124,0.12)' : 'rgba(var(--gold-rgb, 180,140,60),0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 2,
          color: isConsultation ? '#5b9e7c' : 'var(--gold)',
        }}>
          {isConsultation ? <IconSearch size={16} stroke={1.5} /> : <IconMic size={16} stroke={1.5} />}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="row between center" style={{ gap: 8 }}>
            <div className="row center" style={{ gap: 8 }}>
              <span style={{
                fontSize: 10, fontFamily: 'var(--mono)', letterSpacing: '0.1em',
                textTransform: 'uppercase', fontWeight: 600,
                color: isConsultation ? '#5b9e7c' : 'var(--gold)',
              }}>{entry.type}</span>
              <span className="muted" style={{ fontSize: 11 }}>·</span>
              <span className="muted num" style={{ fontSize: 11 }}>{entry.date}</span>
              <span style={{
                fontSize: 10, fontFamily: 'var(--mono)', letterSpacing: '0.08em',
                color: 'var(--mute)', background: 'var(--panel, var(--cream))',
                padding: '2px 6px', border: '1px solid var(--hair)',
              }}>{entry.duration}</span>
            </div>
            <IconChevron size={13}
              style={{ transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', opacity: 0.4, flexShrink: 0 }} />
          </div>
          <div style={{ fontSize: 14, fontWeight: 500, marginTop: 4 }}>{entry.title}</div>
          <div className="eyebrow" style={{ marginTop: 3 }}>{entry.doctor} · {entry.spec}</div>
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div style={{ padding: '0 18px 16px', borderTop: '1px solid var(--hair)' }}>
          {/* Key points */}
          <div style={{ marginTop: 14 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Key points</div>
            {entry.keyPoints.map((pt: string, i: number) => (
              <div key={i} className="row" style={{ gap: 10, marginBottom: 6, alignItems: 'flex-start' }}>
                <span style={{
                  width: 16, height: 16, flexShrink: 0, marginTop: 1,
                  background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 4 L3.2 6 L7 2" stroke="var(--paper)" strokeWidth="1.2" strokeLinecap="round" /></svg>
                </span>
                <span style={{ fontSize: 13, lineHeight: 1.45 }}>{pt}</span>
              </div>
            ))}
          </div>

          {/* Summary text */}
          <div style={{ marginTop: 14, padding: 14, background: 'var(--cream, #faf8f5)', borderLeft: '2px solid var(--hair-2)' }}>
            <div className="eyebrow" style={{ marginBottom: 6 }}>Session notes</div>
            <p style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--ink)', margin: 0 }}>{entry.summary}</p>
          </div>

          {/* Tags */}
          <div className="row" style={{ marginTop: 14, gap: 6, flexWrap: 'wrap' }}>
            {entry.tags.map((t: string) => (
              <span key={t} className="tag" style={{ fontSize: 10 }}>{t}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Mobile Summary Card ── */
const MobileSummaryCard = ({ entry, expanded, onToggle }: any) => {
  const isConsultation = entry.type === 'Consultation';
  return (
    <div style={{
      border: '1px solid var(--hair)',
      marginBottom: 10,
      overflow: 'hidden',
      background: 'var(--paper)',
    }}>
      <div onClick={onToggle} style={{ padding: '12px 14px', cursor: 'pointer' }}>
        <div className="row between center" style={{ gap: 6 }}>
          <div className="row center" style={{ gap: 7 }}>
            <span style={{
              fontSize: 9, fontFamily: 'var(--mono)', letterSpacing: '0.1em', textTransform: 'uppercase',
              fontWeight: 700, color: isConsultation ? '#5b9e7c' : 'var(--gold)',
              padding: '2px 6px',
              border: `1px solid ${isConsultation ? 'rgba(91,158,124,0.3)' : 'rgba(180,140,60,0.3)'}`,
            }}>{entry.type}</span>
            <span className="muted num" style={{ fontSize: 10 }}>{entry.date}</span>
          </div>
          <span className="muted num" style={{ fontSize: 10 }}>{entry.duration}</span>
        </div>
        <div style={{ fontSize: 13, fontWeight: 500, marginTop: 6 }}>{entry.title}</div>
        <div className="eyebrow" style={{ marginTop: 3, fontSize: 10 }}>{entry.doctor}</div>
      </div>

      {expanded && (
        <div style={{ padding: '0 14px 12px', borderTop: '1px solid var(--hair)' }}>
          <div style={{ marginTop: 10 }}>
            {entry.keyPoints.map((pt: string, i: number) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 5, alignItems: 'flex-start' }}>
                <span style={{
                  width: 14, height: 14, flexShrink: 0, marginTop: 1,
                  background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="7" height="7" viewBox="0 0 8 8" fill="none"><path d="M1 4 L3.2 6 L7 2" stroke="var(--paper)" strokeWidth="1.2" strokeLinecap="round" /></svg>
                </span>
                <span style={{ fontSize: 12, lineHeight: 1.45, color: 'var(--ink)' }}>{pt}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--cream, #faf8f5)', borderLeft: '2px solid var(--hair-2)' }}>
            <p style={{ fontSize: 11.5, lineHeight: 1.6, color: 'var(--ink)', margin: 0 }}>{entry.summary}</p>
          </div>
          <div className="row" style={{ marginTop: 10, gap: 5, flexWrap: 'wrap' }}>
            {entry.tags.map((t: string) => (
              <span key={t} style={{
                fontSize: 9, fontFamily: 'var(--mono)', letterSpacing: '0.08em',
                color: 'var(--mute)', background: 'var(--hair)', padding: '2px 5px',
              }}>{t}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Desktop View ── */
const SummaryDesktop = () => {
  const [filter, setFilter] = useState<'all' | 'consultation' | 'treatment'>('all');
  const [expanded, setExpanded] = useState<number | null>(1);
  const toggle = (id: number) => setExpanded(e => e === id ? null : id);

  const filtered = filter === 'all' ? SUMMARIES
    : SUMMARIES.filter(s => s.type.toLowerCase() === filter);

  return (
    <div className="frame" style={{ display: 'flex' }}>
      <NavRail active="summary" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Topbar
          subtitle="Summaries"
          title="Consultation & treatment notes"
        />

        {/* Filter bar */}
        <div className="row" style={{ padding: '14px var(--pad-4)', borderBottom: '1px solid var(--hair)', gap: 4, alignItems: 'center' }}>
          {[
            ['all', 'All sessions', SUMMARIES.length],
            ['consultation', 'Consultations', SUMMARIES.filter(s => s.type === 'Consultation').length],
            ['treatment', 'Treatments', SUMMARIES.filter(s => s.type === 'Treatment').length],
          ].map(([k, l, c]) => (
            <button key={k as string}
              onClick={() => setFilter(k as any)}
              style={{
                appearance: 'none',
                background: filter === k ? 'var(--ink)' : 'transparent',
                color: filter === k ? 'var(--paper)' : 'var(--ink)',
                border: '1px solid ' + (filter === k ? 'var(--ink)' : 'var(--hair-2)'),
                padding: '6px 12px',
                font: '500 12px var(--mono)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase' as const,
                cursor: 'pointer',
                marginRight: 6,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
              {l}
              <span style={{
                fontSize: 10, background: filter === k ? 'rgba(255,255,255,0.2)' : 'var(--hair)',
                padding: '1px 6px', borderRadius: 2,
              }}>{c}</span>
            </button>
          ))}

          <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--mute)', fontFamily: 'var(--mono)' }}>
            {filtered.length} record{filtered.length !== 1 ? 's' : ''} · AI-summarised
          </div>
        </div>

        {/* Two-column layout */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', gap: 0 }}>
          {/* Timeline column */}
          <div style={{ flex: 1, overflow: 'auto', padding: 'var(--pad-4)', paddingRight: 16 }}>
            {filtered.map(entry => (
              <SummaryCard
                key={entry.id}
                entry={entry}
                expanded={expanded === entry.id}
                onToggle={() => toggle(entry.id)}
              />
            ))}
          </div>

          {/* Stats sidebar */}
          <div style={{ width: 240, borderLeft: '1px solid var(--hair)', padding: 20, overflow: 'auto', flexShrink: 0 }}>
            <div className="eyebrow" style={{ marginBottom: 14 }}>Protocol overview</div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: 'var(--mute)', fontFamily: 'var(--mono)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Total sessions</div>
              <div className="num" style={{ fontSize: 32, fontWeight: 400, letterSpacing: '-0.03em', lineHeight: 1 }}>6</div>
              <div style={{ fontSize: 11, color: 'var(--mute)', marginTop: 4 }}>Mar – May 2026</div>
            </div>

            <div className="hr" style={{ margin: '0 0 16px' }} />

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--mute)', fontFamily: 'var(--mono)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Session types</div>
              <div className="row between" style={{ marginBottom: 6 }}>
                <span style={{ fontSize: 13 }}>Treatments</span>
                <span className="num" style={{ fontSize: 13 }}>4</span>
              </div>
              <div style={{ height: 4, background: 'var(--hair)', marginBottom: 10 }}>
                <div style={{ height: '100%', width: '66%', background: 'var(--gold)' }} />
              </div>
              <div className="row between" style={{ marginBottom: 6 }}>
                <span style={{ fontSize: 13 }}>Consultations</span>
                <span className="num" style={{ fontSize: 13 }}>2</span>
              </div>
              <div style={{ height: 4, background: 'var(--hair)' }}>
                <div style={{ height: '100%', width: '34%', background: '#5b9e7c' }} />
              </div>
            </div>

            <div className="hr" style={{ margin: '0 0 16px' }} />

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--mute)', fontFamily: 'var(--mono)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Key outcomes</div>
              {[
                { label: 'Sessions completed', value: '9', note: 'of 12' },
                { label: 'Compliance', value: '94%', note: 'this protocol' },
              ].map(item => (
                <div key={item.label} style={{ marginBottom: 12 }}>
                  <div className="row between center">
                    <span style={{ fontSize: 12, color: 'var(--mute)' }}>{item.label}</span>
                    <div className="row center" style={{ gap: 4 }}>
                      <span className="num" style={{ fontSize: 14, fontWeight: 500, letterSpacing: '-0.02em' }}>{item.value}</span>
                      <span style={{ fontSize: 10, color: 'var(--mute)' }}>{item.note}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Mobile View ── */
const SummaryMobile = () => {
  const [filter, setFilter] = useState<'all' | 'consultation' | 'treatment'>('all');
  const [expanded, setExpanded] = useState<number | null>(1);
  const toggle = (id: number) => setExpanded(e => e === id ? null : id);

  const filtered = filter === 'all' ? SUMMARIES
    : SUMMARIES.filter(s => s.type.toLowerCase() === filter);

  return (
    <MobileShell active="summary">
      <div style={{ height: '100%', overflow: 'auto' }}>
        {/* Header */}
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--hair)' }}>
          <div className="eyebrow gold dot" style={{ marginBottom: 4 }}>Summaries</div>
          <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em' }}>Session notes</div>
        </div>

        {/* Stats strip */}
        <div className="row" style={{ padding: '12px 16px', gap: 0, borderBottom: '1px solid var(--hair)' }}>
          {[
            { label: 'Sessions', value: '9' },
            { label: 'Compliance', value: '94%' },
            { label: 'Next visit', value: 'Jun 18' },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center', borderRight: i < 2 ? '1px solid var(--hair)' : 'none' }}>
              <div className="num" style={{ fontSize: 18, fontWeight: 400, letterSpacing: '-0.03em', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 10, color: 'var(--mute)', fontFamily: 'var(--mono)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter pills */}
        <div className="row" style={{ padding: '10px 16px', gap: 6, borderBottom: '1px solid var(--hair)' }}>
          {[
            ['all', 'All'],
            ['consultation', 'Consultations'],
            ['treatment', 'Treatments'],
          ].map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k as any)}
              style={{
                appearance: 'none', border: '1px solid ' + (filter === k ? 'var(--ink)' : 'var(--hair-2)'),
                background: filter === k ? 'var(--ink)' : 'transparent',
                color: filter === k ? 'var(--paper)' : 'var(--ink)',
                padding: '5px 11px', fontSize: 11, fontFamily: 'var(--mono)',
                letterSpacing: '0.08em', textTransform: 'uppercase' as const, cursor: 'pointer',
              }}>{l}</button>
          ))}
        </div>

        {/* Entries */}
        <div style={{ padding: '12px 16px 80px' }}>
          {filtered.map(entry => (
            <MobileSummaryCard
              key={entry.id}
              entry={entry}
              expanded={expanded === entry.id}
              onToggle={() => toggle(entry.id)}
            />
          ))}
        </div>
      </div>
    </MobileShell>
  );
};

/* ── Page ── */
export default function SummaryPage() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (isMobile) return <SummaryMobile />;
  return <SummaryDesktop />;
}
