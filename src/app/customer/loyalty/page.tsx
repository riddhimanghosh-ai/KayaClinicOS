'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SharedNavRail from '../components/NavRail';
import MobileTabBar from '../components/MobileTabBar';

const Icon = ({ children, size = 24, className = '', style }: { children: React.ReactNode; size?: number; className?: string; style?: React.CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
    {children}
  </svg>
);

const IconCheck = ({ size = 24, style }: { size?: number; style?: React.CSSProperties }) => (
  <Icon size={size} style={style}>
    <polyline points="20 6 9 17 4 12"></polyline>
  </Icon>
);

const IconBell = ({ size = 24, style }: { size?: number; style?: React.CSSProperties }) => (
  <Icon size={size} style={style}>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
  </Icon>
);

const IconSearch = ({ size = 24, style }: { size?: number; style?: React.CSSProperties }) => (
  <Icon size={size} style={style}>
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </Icon>
);

const NavRail = ({ active }: { active: string }) => <SharedNavRail active={active} />;

const Topbar = ({ subtitle = '', title = '' }: { subtitle?: string; title?: string }) => (
  <div style={{
    padding: 'var(--pad-3) var(--pad-4)',
    borderBottom: '1px solid var(--hair)',
    background: 'var(--paper)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  }}>
    <div>
      <div style={{ fontSize: 12, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{subtitle}</div>
      <div style={{ fontSize: 24, fontWeight: 600, marginTop: 4, color: 'var(--ink)' }}>{title}</div>
    </div>
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}>
        <IconSearch size={20} style={{ color: 'var(--mute-2)' }} />
      </button>
      <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}>
        <IconBell size={20} style={{ color: 'var(--mute-2)' }} />
      </button>
    </div>
  </div>
);

const MobileShell = ({ active = '', children, dark }: { children: React.ReactNode; active?: string; dark?: boolean }) => {
  return (
    <div className={`frame${dark ? ' dark' : ''}`} style={{ display: 'flex', flexDirection: 'column' }}>
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

const TIERS = [
  { k: 'silver', name: 'Silver', refs: 0, youSave: '5% off treatments', friendSaves: '₹100 off their first visit', perks: ['5% off all treatments', 'Referred friend gets ₹100 off first visit', 'Standard booking'] },
  { k: 'gold', name: 'Gold', refs: 3, youSave: '12% off treatments', friendSaves: '₹300 off their first visit', perks: ['12% off all treatments', 'Referred friend gets ₹300 off first visit', 'Priority booking', 'Quarterly skin review'] },
  { k: 'platinum', name: 'Platinum', refs: 8, youSave: '20% off treatments', friendSaves: '₹500 off their first visit', perks: ['20% off all treatments', 'Referred friend gets ₹500 off first visit', 'Same-day appointments', 'Complimentary Kaya HydraFacial annually', 'Dedicated dermatologist line'] },
];

const MY_REFERRALS = [
  { name: 'Aisha Kapoor', date: '28 Mar', status: 'Booked', saved: '₹300', youSaved: '₹300' },
  { name: 'Neha Sharma', date: '15 Apr', status: 'Booked', saved: '₹300', youSaved: '₹300' },
  { name: 'Priya Singh', date: '02 May', status: 'Signed up', saved: 'Pending', youSaved: 'Pending' },
];

const LoyaltyDesktop = () => {
  const [hover, setHover] = useState('gold');
  const myRefs = 3;
  const currentTier = TIERS.find(t => t.refs <= myRefs && (!TIERS[TIERS.indexOf(t) + 1] || TIERS[TIERS.indexOf(t) + 1].refs > myRefs))!;
  const nextTier = TIERS[TIERS.indexOf(currentTier) + 1];
  const refsToNext = nextTier ? nextTier.refs - myRefs : 0;

  return (
    <div className="frame" style={{ display: 'flex' }}>
      <NavRail active="loyalty" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Topbar subtitle="Membership" title="Refer & save together" />

        {/* Hero */}
        <div className="row" style={{ padding: 'var(--pad-4)', gap: 0, borderBottom: '1px solid var(--hair)' }}>
          <div style={{ flex: 1.4, paddingRight: 32 }}>
            <div className="eyebrow gold dot">You are · Gold member</div>
            <div className="display h1" style={{ marginTop: 12 }}>
              <em>{myRefs}</em> referrals.<br />
              Both of you save.
            </div>
            <div className="muted" style={{ fontSize: 14, marginTop: 16, maxWidth: 440 }}>
              Every friend you refer gets {currentTier.friendSaves} on their first Kaya visit. You get {currentTier.youSave} on all treatments. Refer more, unlock Platinum.
            </div>
            <div className="row" style={{ marginTop: 22, gap: 10 }}>
              <button className="btn">Share referral link <span className="arrow" /></button>
              <button className="btn ghost">Copy code · PRIYA300</button>
            </div>
          </div>

          {/* Tier progression */}
          <div style={{ flex: 1.4, paddingLeft: 32, borderLeft: '1px solid var(--hair)' }}>
            <div className="row between center">
              <div className="eyebrow">Progress to Platinum</div>
              {nextTier && <div className="num" style={{ fontSize: 12, color: 'var(--mute)' }}>{refsToNext} more referrals</div>}
            </div>

            <div style={{ position: 'relative', marginTop: 24, paddingBottom: 60 }}>
              <div style={{ height: 2, background: 'var(--hair-2)', position: 'relative' }}>
                <div style={{ height: 2, background: 'var(--gold)', width: `${(myRefs / TIERS[TIERS.length - 1].refs) * 100}%`, transition: 'width 1s ease' }} />
              </div>
              {TIERS.map((t, i) => {
                const left = (t.refs / TIERS[TIERS.length - 1].refs) * 100;
                const reached = t.refs <= myRefs;
                return (
                  <div key={t.k} onMouseEnter={() => setHover(t.k)}
                    style={{ position: 'absolute', top: -8, left: `${left}%`, transform: 'translateX(-50%)', cursor: 'pointer' }}>
                    <div style={{
                      width: 18, height: 18, transform: 'rotate(45deg)',
                      background: reached ? 'var(--gold)' : 'var(--paper)',
                      border: '1px solid ' + (reached ? 'var(--gold)' : 'var(--hair-strong)'),
                      transition: 'all .3s ease',
                      boxShadow: hover === t.k ? '0 0 0 4px var(--gold-tint)' : 'none',
                    }} />
                    <div style={{ position: 'absolute', top: 28, left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', textAlign: 'center' }}>
                      <div className="tier-chip" style={{ justifyContent: 'center' }}><span className={`swatch ${t.k}`} /> {t.name}</div>
                      <div className="num" style={{ fontSize: 11, color: 'var(--mute)', marginTop: 2 }}>{t.refs} referrals</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="panel" style={{ marginTop: 18, padding: 18 }}>
              <div className="row between center">
                <div className="tier-chip"><span className={`swatch ${hover}`} /> {TIERS.find(t => t.k === hover)?.name} benefits</div>
                {hover === currentTier.k && <span className="tag gold"><span className="led" /> Current</span>}
              </div>
              <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '10px', background: 'var(--paper-2)', borderRadius: 'var(--r-3)', marginBottom: 12 }}>
                <div>
                  <div className="eyebrow" style={{ fontSize: 9 }}>You save</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--gold)', marginTop: 2 }}>{TIERS.find(t => t.k === hover)?.youSave}</div>
                </div>
                <div>
                  <div className="eyebrow" style={{ fontSize: 9 }}>Your friend saves</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--brand)', marginTop: 2 }}>{TIERS.find(t => t.k === hover)?.friendSaves}</div>
                </div>
              </div>
              <div className="col" style={{ gap: 6 }}>
                {TIERS.find(t => t.k === hover)?.perks.map((p, i) => (
                  <div key={i} className="row center" style={{ gap: 8, fontSize: 13 }}>
                    <IconCheck size={12} style={{ color: 'var(--gold)' }} /> {p}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Lower: referrals + how it works */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', overflow: 'hidden' }}>
          {/* Referral history */}
          <div style={{ padding: 'var(--pad-4)', borderRight: '1px solid var(--hair)', overflow: 'auto' }}>
            <div className="eyebrow">Your referrals · {myRefs} friends joined</div>
            <div className="col" style={{ marginTop: 14 }}>
              {MY_REFERRALS.map((r, i) => (
                <div key={i} className="row between center" style={{ padding: '12px 0', borderBottom: '1px solid var(--hair)' }}>
                  <div className="row center" style={{ gap: 14 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--paper-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: 'var(--mute)' }}>
                      {r.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{r.name}</div>
                      <div className="eyebrow" style={{ fontSize: 9 }}>{r.date} · {r.status}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="num" style={{ fontSize: 12, color: 'var(--gold)' }}>You saved {r.youSaved}</div>
                    <div className="num" style={{ fontSize: 11, color: 'var(--mute)' }}>Friend saved {r.saved}</div>
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 20, padding: '14px', background: 'var(--paper-2)', borderRadius: 'var(--r-3)', border: '1px dashed var(--hair-strong)', textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: 'var(--mute)' }}>Refer {refsToNext} more to unlock Platinum</div>
                <div style={{ fontSize: 12, color: 'var(--brand)', marginTop: 4, fontWeight: 500 }}>Both get ₹500 off · 20% off your treatments</div>
                <button className="btn sm" style={{ marginTop: 12 }}>Invite a friend</button>
              </div>
            </div>
          </div>

          {/* How it works */}
          <div style={{ padding: 'var(--pad-4)', borderRight: '1px solid var(--hair)', overflow: 'auto' }}>
            <div className="eyebrow">How referrals work</div>
            <div className="col" style={{ marginTop: 14, gap: 16 }}>
              {[
                { step: '1', title: 'Share your code', desc: 'Send your personal referral link or code to a friend.' },
                { step: '2', title: 'Friend books first visit', desc: 'When they book and complete their first Kaya session, the discount applies.' },
                { step: '3', title: 'Both of you save', desc: 'They get ₹300 off (Gold) or ₹500 off (Platinum). You get your tier discount on all future treatments.' },
                { step: '4', title: 'You level up', desc: 'Each verified referral moves you closer to Platinum, unlocking more savings for both of you.' },
              ].map((s, i) => (
                <div key={i} className="row center" style={{ gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--gold)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{s.step}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{s.title}</div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tier comparison */}
          <div style={{ padding: 'var(--pad-4)', background: 'var(--ink)', color: 'var(--paper)', overflow: 'auto' }}>
            <div className="eyebrow" style={{ color: 'var(--mute-2)' }}>All tiers at a glance</div>
            <div className="col" style={{ marginTop: 14, gap: 12 }}>
              {TIERS.map((t, i) => (
                <div key={t.k} style={{ padding: 14, borderRadius: 'var(--r-3)', background: t.k === 'gold' ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.04)', border: t.k === 'gold' ? '1px solid rgba(201,168,76,0.4)' : '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="row between center">
                    <div className="tier-chip" style={{ color: 'var(--paper)' }}><span className={`swatch ${t.k}`} /> {t.name}</div>
                    <div className="num" style={{ fontSize: 11, color: 'var(--mute-2)' }}>{t.refs}+ refs</div>
                  </div>
                  <div className="row" style={{ marginTop: 8, gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--mute-2)' }}>YOU</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold)' }}>{t.youSave}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--mute-2)' }}>FRIEND</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--brand)' }}>{t.friendSaves}</div>
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

const LoyaltyMobile = () => {
  const myRefs = 3;
  const nextTier = TIERS[1]; // Platinum
  const refsToNext = nextTier.refs - myRefs;
  return (
    <MobileShell active="home">
      <div style={{ padding: '16px 20px 100px', height: '100%', overflow: 'auto' }}>
        <div className="eyebrow gold dot">Membership · Gold</div>
        <div className="display" style={{ fontSize: 44, marginTop: 10 }}><em>{myRefs}</em></div>
        <div style={{ fontSize: 13, color: 'var(--mute)', marginTop: 2 }}>referrals made · ₹900 saved together</div>

        {/* Tier progress */}
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--mute)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            <span style={{ color: 'var(--gold)' }}>Gold · {myRefs} refs</span>
            <span>Platinum · {refsToNext} more to go</span>
          </div>
          <div style={{ marginTop: 8, height: 5, background: 'var(--hair-2)', borderRadius: 3 }}>
            <div style={{ height: '100%', background: 'var(--gold)', width: `${(myRefs / TIERS[TIERS.length - 1].refs) * 100}%`, borderRadius: 3, transition: 'width 1s ease' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            {TIERS.map((t, i) => (
              <div key={t.k} style={{ textAlign: 'center' }}>
                <div style={{ width: 12, height: 12, transform: 'rotate(45deg)', background: t.refs <= myRefs ? 'var(--gold)' : 'var(--hair-2)', margin: '0 auto' }} />
                <div style={{ fontSize: 9, color: t.refs <= myRefs ? 'var(--gold)' : 'var(--mute-2)', marginTop: 6, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t.name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Current benefits */}
        <div className="panel" style={{ marginTop: 18, padding: 16 }}>
          <div className="eyebrow gold dot">Your Gold benefits</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12, padding: 12, background: 'var(--paper-2)', borderRadius: 'var(--r-3)' }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--mute)', fontFamily: 'var(--mono)' }}>YOU SAVE</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--gold)', marginTop: 2 }}>12% off</div>
              <div style={{ fontSize: 10, color: 'var(--mute)', marginTop: 1 }}>all treatments</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--mute)', fontFamily: 'var(--mono)' }}>FRIEND SAVES</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--brand)', marginTop: 2 }}>₹300 off</div>
              <div style={{ fontSize: 10, color: 'var(--mute)', marginTop: 1 }}>their first visit</div>
            </div>
          </div>
        </div>

        {/* Unlock Platinum */}
        <div className="panel" style={{ marginTop: 12, padding: 14, background: 'var(--paper-2)' }}>
          <div className="eyebrow">Unlock Platinum · {refsToNext} more referrals</div>
          <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{ padding: '10px 12px', background: 'var(--paper)', borderRadius: 'var(--r-3)', border: '1px solid var(--hair)' }}>
              <div style={{ fontSize: 10, color: 'var(--mute)' }}>YOU GET</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gold)', marginTop: 2 }}>20% off</div>
            </div>
            <div style={{ padding: '10px 12px', background: 'var(--paper)', borderRadius: 'var(--r-3)', border: '1px solid var(--hair)' }}>
              <div style={{ fontSize: 10, color: 'var(--mute)' }}>FRIEND GETS</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--brand)', marginTop: 2 }}>₹500 off</div>
            </div>
          </div>
          <button className="btn sm" style={{ marginTop: 12, width: '100%', justifyContent: 'center' }}>Share referral link</button>
        </div>

        {/* Referral history */}
        <div style={{ marginTop: 18 }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Referrals · {myRefs} friends joined</div>
          {MY_REFERRALS.map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--hair)' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{r.name}</div>
                <div style={{ fontSize: 11, color: 'var(--mute)', marginTop: 1 }}>{r.date} · {r.status}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gold)' }}>{r.youSaved}</div>
                <div style={{ fontSize: 10, color: 'var(--mute)', marginTop: 1 }}>you saved</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </MobileShell>
  );
};

export default function LoyaltyPage() {
  return (
    <>
      <div className="desktop-only"><LoyaltyDesktop /></div>
      <div className="mobile-only"><LoyaltyMobile /></div>
    </>
  );
}
