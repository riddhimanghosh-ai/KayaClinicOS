'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import SharedNavRail from '../components/NavRail';
import MobileTabBar from '../components/MobileTabBar';

/* Icons */
const Icon = ({ size = 18, children, stroke = 1.4, style }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, ...style }}>
    {children}
  </svg>
);

const GoldNode = ({ cx, cy, r = 1.6 }: any) => (
  <circle cx={cx} cy={cy} r={r} fill="var(--gold)" stroke="none" />
);

const IconCamera = (p: any) => (
  <Icon {...p}>
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </Icon>
);

const IconSearch = (p: any) => (
  <Icon {...p}>
    <circle cx="10.5" cy="10.5" r="6" />
    <path d="M15 15 L20 20" />
  </Icon>
);

const IconBell = (p: any) => (
  <Icon {...p}>
    <path d="M6 16 V11 C6 7.5 8.5 5 12 5 C15.5 5 18 7.5 18 11 V16 L19.5 18 H4.5 Z" />
    <path d="M10 20 C10.5 21 11.2 21.5 12 21.5 C12.8 21.5 13.5 21 14 20" />
    <GoldNode cx={17} cy={7} />
  </Icon>
);

/* Shared Components */
const NavRail = ({ active = 'before-after' }: any) => <SharedNavRail active={active} />;

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
        <span style={{
          position: 'absolute', top: 4, right: 6,
          width: 6, height: 6, borderRadius: '50%', background: 'var(--gold)'
        }} />
      </button>
    </div>
  </div>
);

const AnimatedMeter = ({ pct, gold }: any) => {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(pct), 100);
    return () => clearTimeout(t);
  }, [pct]);
  return <div className={`meter${gold ? ' gold' : ''}`}><i style={{ width: `${w}%` }} /></div>;
};

const MobileShell = ({ active = 'progress', children }: any) => {
  return (
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
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {children}
      </div>
      <MobileTabBar active={active} />
    </div>
  );
};

/* Slider Component */
const Slider = ({ height = 460 }: any) => {
  const [pos, setPos] = useState(50);
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const handle = (e: any) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = (e.touches?.[0]?.clientX ?? e.clientX) - r.left;
    setPos(Math.max(0, Math.min(100, (x / r.width) * 100)));
  };

  const BABefore = () => (
    <div className="photo-ph" style={{
      width: '100%', height: '100%',
      background: `
        radial-gradient(35% 25% at 32% 38%, rgba(140,80,55,0.55) 0%, transparent 70%),
        radial-gradient(28% 22% at 58% 42%, rgba(130,75,50,0.5) 0%, transparent 70%),
        radial-gradient(18% 14% at 48% 56%, rgba(120,65,40,0.45) 0%, transparent 70%),
        radial-gradient(120% 80% at 30% 20%, #f3dcc6 0%, #d8b89a 35%, #b08866 70%, #6a4a32 100%)
      `,
    }} />
  );

  const BAAfter = () => (
    <div className="photo-ph" style={{
      width: '100%', height: '100%',
      background: `
        radial-gradient(120% 80% at 30% 20%, #f6e6d4 0%, #e6c8a8 40%, #c39a72 75%, #7a553a 100%)
      `,
    }} />
  );

  return (
    <div
      ref={ref}
      onPointerDown={(e) => { dragging.current = true; ref.current?.setPointerCapture(e.pointerId); handle(e); }}
      onPointerMove={(e) => dragging.current && handle(e)}
      onPointerUp={() => dragging.current = false}
      style={{
        position: 'relative',
        width: '100%',
        height,
        overflow: 'hidden',
        cursor: 'ew-resize',
        userSelect: 'none',
        touchAction: 'none',
        background: 'var(--paper-2)',
      }}
    >
      <BABefore />
      <div style={{
        position: 'absolute', inset: 0, width: `${pos}%`, overflow: 'hidden',
        borderRight: '1px solid var(--paper)',
      }}>
        <BAAfter />
      </div>

      <div style={{ position: 'absolute', top: 14, left: 14 }}>
        <div className="tag solid">After · May 13</div>
      </div>
      <div style={{ position: 'absolute', top: 14, right: 14 }}>
        <div className="tag" style={{ background: 'var(--paper)' }}>Before · Mar 14</div>
      </div>

      <div style={{
        position: 'absolute', top: 0, bottom: 0, left: `${pos}%`,
        width: 1, background: 'var(--paper)',
        boxShadow: '0 0 0 1px rgba(0,0,0,0.1)',
      }}>
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 40, height: 40, borderRadius: '50%',
          background: 'var(--paper)',
          border: '1px solid var(--ink)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--ink)',
          cursor: 'ew-resize',
        }}>
          <svg width="18" height="14" viewBox="0 0 18 14" fill="none" stroke="currentColor" strokeWidth="1.4">
            <path d="M5 3 L1 7 L5 11" />
            <path d="M13 3 L17 7 L13 11" />
            <path d="M1 7 H17" />
          </svg>
        </div>
      </div>
    </div>
  );
};

const SESSIONS = [
  { wk: 'W01', date: 'Mar 14', pigment: 100, texture: 100 },
  { wk: 'W04', date: 'Apr 04', pigment: 88, texture: 92 },
  { wk: 'W07', date: 'Apr 30', pigment: 78, texture: 84 },
  { wk: 'W09', date: 'May 13', pigment: 66, texture: 76 },
];

const BeforeAfterDesktop = () => {
  return (
    <div className="frame" style={{ display: 'flex' }}>
      <NavRail active="before-after" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Topbar
          subtitle="Progress · Phase 2"
          title="Pigmentation protocol"
          right={<button className="btn"><IconCamera size={14} /> New photo log</button>}
        />

        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.5fr 1fr', overflow: 'hidden' }}>
          <div style={{ padding: 'var(--pad-4)', borderRight: '1px solid var(--hair)', display: 'flex', flexDirection: 'column' }}>
            <div className="row between" style={{ alignItems: 'flex-end' }}>
              <div>
                <div className="eyebrow gold dot">Mar 14 → May 13 · 56 days</div>
                <div className="display" style={{ fontSize: 32, marginTop: 8 }}>
                  Skin progress · Phase 2
                </div>
              </div>
              <div className="row" style={{ gap: 6 }}>
                <button className="btn ghost sm">Front</button>
                <button className="btn ghost sm" style={{ background: 'var(--ink)', color: 'var(--paper)' }}>Left ¾</button>
                <button className="btn ghost sm">Right ¾</button>
              </div>
            </div>

            <div style={{ marginTop: 16, border: '1px solid var(--hair-2)' }}>
              <Slider height={420} />
            </div>

            <div className="muted" style={{ fontSize: 11, marginTop: 10, textAlign: 'center', fontFamily: 'var(--mono)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              ← Drag to compare · Captured under standardised clinic light
            </div>

            <div className="eyebrow" style={{ marginTop: 22 }}>Photo log · 4 sessions</div>
            <div className="row" style={{ marginTop: 12, gap: 10 }}>
              {SESSIONS.map((s, i) => (
                <div key={i} style={{ flex: 1 }}>
                  <div style={{
                    aspectRatio: '1 / 1.1',
                    background: `radial-gradient(70% 60% at 40% 30%, hsl(28 ${50 - i * 3}% ${60 + i * 4}%) 0%, hsl(24 ${40 - i * 3}% ${30 + i * 2}%) 100%)`,
                    border: i === 3 ? '1px solid var(--gold)' : '1px solid var(--hair-2)',
                    position: 'relative',
                  }}>
                    {i === 3 && (
                      <div style={{
                        position: 'absolute', top: 6, left: 6,
                        width: 8, height: 8, background: 'var(--gold)', borderRadius: '50%',
                      }} />
                    )}
                  </div>
                  <div className="num" style={{ fontSize: 11, marginTop: 6, fontWeight: 500 }}>{s.date}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
            <div style={{ background: 'var(--paper-2)', padding: 'var(--pad-4)', flex: 1 }}>
              <div className="eyebrow gold dot">Clinician note · Dr. A. Sharma</div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 19, lineHeight: 1.35, marginTop: 12, letterSpacing: '-0.005em' }}>
                &ldquo;Pigment regression is well within projected range. Recommend tapering retinoid frequency and introducing tranexamic acid topical from Week 10.&rdquo;
              </div>
              <div className="muted" style={{ fontSize: 11, marginTop: 14, fontFamily: 'var(--mono)', letterSpacing: '0.08em' }}>
                · Logged 13 May, 12:42 IST
              </div>

              <div className="hr" style={{ margin: '22px 0' }} />

              <div className="eyebrow">Next milestone</div>
              <div style={{ marginTop: 10 }}>
                <div className="row between center">
                  <div className="num" style={{ fontSize: 22 }}>Jun 18 review</div>
                  <div className="num muted" style={{ fontSize: 12 }}>3 weeks away</div>
                </div>
                <div style={{ marginTop: 8 }}><AnimatedMeter pct={75} gold /></div>
                <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>3 weeks remaining · 1 photo log due</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const BeforeAfterMobile = () => (
  <MobileShell active="progress">
    <div style={{ padding: '14px 20px 100px', height: '100%', overflow: 'auto' }}>
      <div className="eyebrow gold dot">Mar 14 → May 13 · 56 days</div>
      <div className="display" style={{ fontSize: 28, marginTop: 6 }}>
        Skin progress
      </div>

      <div style={{ marginTop: 16, border: '1px solid var(--hair-2)' }}>
        <Slider height={320} />
      </div>
      <div className="muted" style={{ fontSize: 10, marginTop: 8, textAlign: 'center', fontFamily: 'var(--mono)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        ← Drag to compare
      </div>

      <div className="row" style={{ marginTop: 18, gap: 6 }}>
        {SESSIONS.map((s, i) => (
          <div key={i} style={{ flex: 1 }}>
            <div style={{
              aspectRatio: '1 / 1.1',
              background: `radial-gradient(70% 60% at 40% 30%, hsl(28 ${50 - i * 3}% ${60 + i * 4}%) 0%, hsl(24 ${40 - i * 3}% ${30 + i * 2}%) 100%)`,
              border: i === 3 ? '1px solid var(--gold)' : '1px solid var(--hair-2)',
            }} />
            <div className="num" style={{ fontSize: 10, marginTop: 4 }}>{s.date}</div>
          </div>
        ))}
      </div>

      <div className="panel" style={{ marginTop: 14, padding: 14, background: 'var(--paper-2)' }}>
        <div className="eyebrow gold dot">Dr. A. Sharma · note</div>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 15, lineHeight: 1.4, marginTop: 8 }}>
          &ldquo;Pigment regression well within projected range. Tapering retinoids week 10.&rdquo;
        </div>
      </div>
    </div>
  </MobileShell>
);

export default function BeforeAfterPage() {
  return (
    <>
      <div className="desktop-only"><BeforeAfterDesktop /></div>
      <div className="mobile-only"><BeforeAfterMobile /></div>
    </>
  );
}
