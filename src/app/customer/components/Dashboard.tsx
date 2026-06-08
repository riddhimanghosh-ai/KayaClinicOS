'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SharedNavRail from './NavRail';
import MobileTabBar from './MobileTabBar';

/* Icon Components */
const Icon = ({ size = 18, children, stroke = 1.4, style }: any) => (
  <svg
    width={size} height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={stroke}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ flexShrink: 0, ...style }}
  >
    {children}
  </svg>
);

const GoldNode = ({ cx, cy, r = 1.6 }: any) => (
  <circle cx={cx} cy={cy} r={r} fill="var(--gold)" stroke="none" />
);

const IconHome = (p: any) => (
  <Icon {...p}>
    <path d="M3.5 11 L12 4 L20.5 11 V20 H3.5 Z" />
    <path d="M10 20 V14 H14 V20" />
    <GoldNode cx={12} cy={8} />
  </Icon>
);

const IconAppt = (p: any) => (
  <Icon {...p}>
    <rect x="3.5" y="5" width="17" height="15" rx="1.5" />
    <path d="M3.5 9.5 H20.5" />
    <path d="M8 3.5 V6.5 M16 3.5 V6.5" />
    <GoldNode cx={16} cy={14.5} />
  </Icon>
);

const IconMed = (p: any) => (
  <Icon {...p}>
    <rect x="3" y="9" width="18" height="6" rx="3" transform="rotate(-30 12 12)" />
    <path d="M8.5 7.5 L15.5 16.5" />
    <GoldNode cx={15} cy={9.5} />
  </Icon>
);

const IconProgress = (p: any) => (
  <Icon {...p}>
    <rect x="3.5" y="5.5" width="7.5" height="13" rx="1" />
    <rect x="13" y="5.5" width="7.5" height="13" rx="1" />
    <path d="M11 9 H13 M11 12 H13 M11 15 H13" strokeWidth="1" />
    <GoldNode cx={17} cy={9} />
  </Icon>
);

const IconChat = (p: any) => (
  <Icon {...p}>
    <path d="M4 5.5 H20 V16 H13 L9 19.5 V16 H4 Z" />
    <circle cx="9" cy="11" r="0.6" fill="currentColor" stroke="none" />
    <circle cx="12" cy="11" r="0.6" fill="currentColor" stroke="none" />
    <GoldNode cx={15} cy={11} />
  </Icon>
);

const IconRewards = (p: any) => (
  <Icon {...p}>
    <circle cx="12" cy="10" r="6" />
    <path d="M8.5 14.5 L7 21 L12 18.5 L17 21 L15.5 14.5" />
    <GoldNode cx={12} cy={10} r={2} />
  </Icon>
);

const IconRefer = (p: any) => (
  <Icon {...p}>
    <circle cx="8" cy="9" r="3" />
    <path d="M2.5 19 C2.5 15.5 5 13.5 8 13.5 C11 13.5 13.5 15.5 13.5 19" />
    <circle cx="17" cy="11" r="2.4" />
    <path d="M14 19 C14 16.5 15.5 15 17 15 C18.5 15 20.5 16.5 20.5 19" />
    <GoldNode cx={17} cy={11} />
  </Icon>
);

const IconBlog = (p: any) => (
  <Icon {...p}>
    <path d="M5 4 H17 L19.5 6.5 V20 H5 Z" />
    <path d="M8 9 H16 M8 12 H16 M8 15 H13" />
    <GoldNode cx={17.5} cy={6.5} />
  </Icon>
);

const IconVideo = (p: any) => (
  <Icon {...p}>
    <rect x="3" y="5.5" width="18" height="13" rx="1.5" />
    <path d="M10.5 9.5 L14.5 12 L10.5 14.5 Z" fill="currentColor" stroke="none" />
    <GoldNode cx={20} cy={8} r={1.2} />
  </Icon>
);

const IconBell = (p: any) => (
  <Icon {...p}>
    <path d="M6 16 V11 C6 7.5 8.5 5 12 5 C15.5 5 18 7.5 18 11 V16 L19.5 18 H4.5 Z" />
    <path d="M10 20 C10.5 21 11.2 21.5 12 21.5 C12.8 21.5 13.5 21 14 20" />
    <GoldNode cx={17} cy={7} />
  </Icon>
);

const IconSearch = (p: any) => (
  <Icon {...p}>
    <circle cx="10.5" cy="10.5" r="6" />
    <path d="M15 15 L20 20" />
  </Icon>
);

const IconCheck = (p: any) => (
  <Icon {...p}>
    <path d="M4 12 L9.5 17.5 L20 7" />
  </Icon>
);

const IconSummary = (p: any) => (
  <Icon {...p}>
    <path d="M5 4 H15 L19 8 V20 H5 Z" />
    <path d="M8 10 H16 M8 13 H16 M8 16 H12" />
    <GoldNode cx={15} cy={8} />
  </Icon>
);

const IconPackage = (p: any) => (
  <Icon {...p}>
    <path d="M3.5 7 L12 4 L20.5 7 V17 L12 20 L3.5 17 Z" />
    <path d="M3.5 7 L12 10 L20.5 7" />
    <path d="M12 10 V20" />
    <GoldNode cx={12} cy={10} />
  </Icon>
);

const IconChevron = (p: any) => (
  <Icon {...p}>
    <path d="M6 9 L12 15 L18 9" />
  </Icon>
);

/* Shared Components */
const Brand = ({ tag = "Skin · Hair · Body" }: any) => (
  <div>
    <div className="brand" style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
      <span>kaya</span><i>.</i>
    </div>
    <div className="brand-mark">{tag}</div>
  </div>
);

const NavItem = ({ icon: I, label, active, badge, onClick }: any) => (
  <div className={`nav-item${active ? ' active' : ''}`} onClick={onClick}>
    <span className="nav-icon"><I size={15} stroke={1.6} /></span>
    <span>{label}</span>
    {badge && <span className={`badge${active ? '' : ' mute'}`}>{badge}</span>}
  </div>
);

const AccordionSection = ({ label, open, onToggle, children }: any) => (
  <div style={{ marginTop: 8 }}>
    <div
      className="group-label"
      onClick={onToggle}
      style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', userSelect: 'none' }}
    >
      <span>{label}</span>
      <IconChevron size={11} style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', opacity: 0.5 }} />
    </div>
    {open && <div>{children}</div>}
  </div>
);

const NavRail = ({ active = 'dashboard' }: any) => <SharedNavRail active={active} />;

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

const Stat = ({ label, value, sub, suffix, big }: any) => (
  <div>
    <div className="eyebrow">{label}</div>
    <div className="num" style={{
      fontSize: big ? 44 : 32,
      lineHeight: 1.05,
      letterSpacing: '-0.04em',
      marginTop: 6,
      fontWeight: 400,
    }}>
      {value}
      {suffix && <span style={{ fontSize: '0.45em', color: 'var(--mute)', marginLeft: 4 }}>{suffix}</span>}
    </div>
    {sub && <div style={{ fontSize: 12, color: 'var(--mute)', marginTop: 4 }}>{sub}</div>}
  </div>
);

const AnimatedMeter = ({ pct, gold, brand, mint, sky, lavender }: any) => {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(pct), 100);
    return () => clearTimeout(t);
  }, [pct]);
  const cls = brand || gold ? ' brand' : mint ? ' mint' : sky ? ' sky' : lavender ? ' lavender' : '';
  return <div className={`meter${cls}`}><i style={{ width: `${w}%` }} /></div>;
};

const AnimatedNum = ({ value, duration = 1200, format = (n: number) => n.toLocaleString() }: any) => {
  const [n, setN] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let raf: number;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{format(n)}</>;
};

const Spark = ({ data, gold, brand, mint }: any) => {
  const cls = brand || gold ? ' brand' : mint ? ' mint' : '';
  return (
    <div className={`spark${cls}`}>
      {data.map((h: number, i: number) => (
        <i key={i} style={{ height: `${h}%`, opacity: h < 20 ? 0.4 : 1 }} className={h < 20 ? 'mute' : ''} />
      ))}
    </div>
  );
};

const MobileShell = ({ active = 'home', children, dark }: any) => {
  return (
    <div className={`frame${dark ? ' dark' : ''}`} style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
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

/* ── Booking modal ── */
const BOOKING_DOCTORS = ['Dr. Ananya Sharma', 'Dr. Rohan Mehta', 'Dr. Priya Nair', 'Dr. Karan Shah'];
const BOOKING_SERVICES = ['HydraFacial', 'Acne Clearance Session', 'Q-Switch Laser Toning', 'Microneedling', 'Consultation'];
const BOOKING_SLOTS = ['09:00', '10:30', '11:00', '12:30', '14:00', '15:30', '16:00', '17:30'];

const BookingModal = ({ onClose }: { onClose: () => void }) => {
  const [doctor, setDoctor] = useState(BOOKING_DOCTORS[0]);
  const [service, setService] = useState(BOOKING_SERVICES[0]);
  const [slot, setSlot] = useState(BOOKING_SLOTS[2]);
  const [confirmed, setConfirmed] = useState(false);

  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i + 1);
    return { label: d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }), iso: d.toISOString().slice(0, 10) };
  });
  const [selectedDay, setSelectedDay] = useState(days[0].iso);

  if (confirmed) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={onClose}>
        <div style={{ background: 'var(--paper)', width: '100%', maxWidth: 400, padding: 36, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
          <div style={{ width: 56, height: 56, background: '#DCFCE7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5"><path d="M20 6 9 17l-5-5"/></svg>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Appointment Confirmed</div>
          <div style={{ fontSize: 13, color: 'var(--mute)', lineHeight: 1.6 }}>
            {service}<br />
            {doctor}<br />
            {days.find(d => d.iso === selectedDay)?.label} · {slot}
          </div>
          <button className="btn" style={{ marginTop: 24, width: '100%', background: 'var(--brand)', color: '#fff', border: 'none' }} onClick={onClose}>Done</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={onClose}>
      <div style={{ background: 'var(--paper)', width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--hair)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Book a Visit</div>
            <div style={{ fontSize: 11, color: 'var(--mute)', marginTop: 2 }}>Kaya Skin Clinic · Bandra</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--mute)', fontSize: 20, lineHeight: 1 }}>✕</button>
        </div>
        {/* Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Service */}
          <div>
            <label style={{ fontSize: 10, fontFamily: 'var(--mono)', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--mute)', display: 'block', marginBottom: 8 }}>Service</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {BOOKING_SERVICES.map(s => (
                <button key={s} onClick={() => setService(s)} style={{ padding: '6px 12px', fontSize: 12, border: `1px solid ${service === s ? 'var(--brand)' : 'var(--hair)'}`, background: service === s ? 'var(--brand)' : 'transparent', color: service === s ? '#fff' : 'var(--ink)', cursor: 'pointer', borderRadius: 2, transition: 'all 0.15s' }}>{s}</button>
              ))}
            </div>
          </div>
          {/* Doctor */}
          <div>
            <label style={{ fontSize: 10, fontFamily: 'var(--mono)', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--mute)', display: 'block', marginBottom: 8 }}>Doctor</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {BOOKING_DOCTORS.map(doc => (
                <button key={doc} onClick={() => setDoctor(doc)} style={{ padding: '9px 14px', fontSize: 13, border: `1px solid ${doctor === doc ? 'var(--brand)' : 'var(--hair)'}`, background: doctor === doc ? '#FFF5F0' : 'transparent', color: 'var(--ink)', cursor: 'pointer', borderRadius: 2, textAlign: 'left', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 28, height: 28, background: doctor === doc ? 'var(--brand)' : 'var(--hair-2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: doctor === doc ? '#fff' : 'var(--mute)', flexShrink: 0, fontWeight: 700 }}>{doc.split(' ').slice(-1)[0][0]}</span>
                  {doc}
                </button>
              ))}
            </div>
          </div>
          {/* Date */}
          <div>
            <label style={{ fontSize: 10, fontFamily: 'var(--mono)', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--mute)', display: 'block', marginBottom: 8 }}>Date</label>
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
              {days.map(d => (
                <button key={d.iso} onClick={() => setSelectedDay(d.iso)} style={{ flexShrink: 0, padding: '8px 12px', fontSize: 11, border: `1px solid ${selectedDay === d.iso ? 'var(--brand)' : 'var(--hair)'}`, background: selectedDay === d.iso ? 'var(--brand)' : 'transparent', color: selectedDay === d.iso ? '#fff' : 'var(--ink)', cursor: 'pointer', borderRadius: 2, whiteSpace: 'nowrap' }}>{d.label}</button>
              ))}
            </div>
          </div>
          {/* Time slot */}
          <div>
            <label style={{ fontSize: 10, fontFamily: 'var(--mono)', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--mute)', display: 'block', marginBottom: 8 }}>Time</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {BOOKING_SLOTS.map(t => (
                <button key={t} onClick={() => setSlot(t)} style={{ padding: '7px 14px', fontSize: 12, fontFamily: 'var(--mono)', border: `1px solid ${slot === t ? 'var(--brand)' : 'var(--hair)'}`, background: slot === t ? 'var(--brand)' : 'transparent', color: slot === t ? '#fff' : 'var(--ink)', cursor: 'pointer', borderRadius: 2 }}>{t}</button>
              ))}
            </div>
          </div>
        </div>
        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--hair)', display: 'flex', gap: 10 }}>
          <button className="btn ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button className="btn" style={{ flex: 2, background: 'var(--brand)', color: '#fff', border: 'none' }} onClick={() => setConfirmed(true)}>
            Confirm booking →
          </button>
        </div>
      </div>
    </div>
  );
};

const DashboardDesktop = () => {
  const router = useRouter();

  const quickLinks = [
    { icon: <IconRewards size={20} />, title: 'Loyalty',         sub: 'Gold · 2,840 pts',href: '/customer/loyalty' },
  ];

  const treatmentProgress = { label: 'HydraFacial · Phase 3', used: 1, total: 4, pct: 25 };

  return (
    <div className="frame" style={{ display: 'flex' }}>
      <NavRail active="dashboard" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        <Topbar
          subtitle="Kaya · Patient Portal"
          title="Overview"
        />

        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px 48px' }}>

          {/* Greeting row */}
          <div>
            <div style={{ fontSize: 34, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1 }}>Hi Priya</div>
            <div style={{ fontSize: 13, color: 'var(--mute)', marginTop: 6, fontFamily: 'var(--mono)' }}>27 May · Wednesday</div>
          </div>

          {/* Content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 20 }}>

            {/* Left column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Appointment card */}
              <div style={{ background: 'var(--ink)', color: 'var(--paper)', padding: '20px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 10, fontFamily: 'var(--mono)', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.45)', marginBottom: 10 }}>Your next visit · 4 days away</div>
                    <div style={{ fontSize: 18, fontWeight: 600 }}>Dr. Ananya Sharma</div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>Hydrafacial · Phase 2 · Bandra West</div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 26, fontWeight: 400, letterSpacing: '-0.02em', marginTop: 16 }}>Sat 31 · 11:30</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button style={{ background: 'var(--paper)', color: 'var(--ink)', border: 'none', padding: '10px 18px', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--sans)' }}>Confirm</button>
                    <button style={{ background: 'transparent', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.18)', padding: '9px 18px', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--sans)' }}>Reschedule</button>
                  </div>
                </div>
              </div>

              {/* Treatment package progress */}
              <div className="panel" style={{ padding: '18px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 10, fontFamily: 'var(--mono)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--mute)' }}>Active package</div>
                    <div style={{ fontSize: 15, fontWeight: 600, marginTop: 3 }}>{treatmentProgress.label}</div>
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 28, fontWeight: 400, color: 'var(--gold)', letterSpacing: '-0.02em' }}>
                    {treatmentProgress.used}<span style={{ fontSize: 14, color: 'var(--mute)' }}>/{treatmentProgress.total}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {Array.from({ length: treatmentProgress.total }).map((_, i) => (
                    <div key={i} style={{
                      flex: 1, height: 8,
                      background: i < treatmentProgress.used ? 'var(--gold)' : 'var(--hair-2)',
                    }} />
                  ))}
                </div>
                <div style={{ fontSize: 11, color: 'var(--mute)', marginTop: 8 }}>
                  {treatmentProgress.total - treatmentProgress.used} sessions remaining · next Sat 31
                </div>
              </div>

              {/* Quick links grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: 10 }}>
                {quickLinks.map((card, i) => (
                  <div key={i} className="panel" onClick={() => router.push(card.href)} style={{ padding: '16px', cursor: 'pointer', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 36, height: 36, border: '1px solid var(--hair)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand)', flexShrink: 0 }}>{card.icon}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{card.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--mute)', marginTop: 2 }}>{card.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DashboardMobile = () => {
  const router = useRouter();

  return (
    <MobileShell active="home">
      <div style={{ height: '100%', overflow: 'auto' }}>
        <div style={{ padding: '16px 16px 100px' }}>

          {/* Greeting */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em' }}>Hi Priya</div>
              <div style={{ fontSize: 12, color: 'var(--mute)', marginTop: 2 }}>27 May · Wednesday</div>
            </div>
            <div style={{ textAlign: 'center', padding: '8px 10px', background: 'var(--paper-2)', border: '1px solid var(--hair)' }}>
              <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--mono)', letterSpacing: '-0.01em' }}>2.8k</div>
              <div style={{ fontSize: 9, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 1 }}>Points</div>
            </div>
          </div>

          {/* Next appointment */}
          <div className="panel" style={{ padding: 16, background: 'var(--ink)', color: 'white', borderColor: 'var(--ink)', marginBottom: 12 }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: '0.08em', fontFamily: 'var(--mono)' }}>NEXT VISIT · 4 DAYS AWAY</div>
            <div style={{ color: 'white', marginTop: 6, fontSize: 15, fontWeight: 600 }}>Dr. Ananya Sharma</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2 }}>Hydrafacial · Phase 2 · Bandra West</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
              <div className="num" style={{ fontSize: 20, letterSpacing: '-0.02em' }}>Sat 31 · 11:30</div>
              <button className="btn sm" style={{ background: 'var(--paper)', borderColor: 'var(--rule)', color: 'var(--ink)', boxShadow: 'none' }}>Confirm</button>
            </div>
          </div>

          {/* Active package progress */}
          <div className="panel" style={{ padding: '14px 16px', marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 9, fontFamily: 'var(--mono)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--mute)' }}>Active package</div>
                <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>HydraFacial · Phase 3</div>
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 400, color: 'var(--gold)' }}>
                1<span style={{ fontSize: 12, color: 'var(--mute)' }}>/4</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {[0,1,2,3].map(i => (
                <div key={i} style={{ flex: 1, height: 6, background: i < 1 ? 'var(--gold)' : 'var(--hair-2)' }} />
              ))}
            </div>
            <div style={{ fontSize: 10, color: 'var(--mute)', marginTop: 6 }}>3 sessions remaining</div>
          </div>

          {/* Quick action cards */}
          <div style={{ marginBottom: 12 }}>
            <div className="panel" onClick={() => router.push('/customer/loyalty')} style={{ padding: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 30, height: 30, border: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand)', flexShrink: 0 }}>
                <IconRewards size={15} stroke={1.4} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>Loyalty</div>
                <div style={{ fontSize: 10, color: 'var(--mute)', marginTop: 2 }}>Gold · 2,840</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </MobileShell>
  );
};

export default function Dashboard() {
  return (
    <>
      <div className="desktop-only"><DashboardDesktop /></div>
      <div className="mobile-only"><DashboardMobile /></div>
    </>
  );
}
