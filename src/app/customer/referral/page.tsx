'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SharedNavRail from '../components/NavRail';
import MobileTabBar from '../components/MobileTabBar';

const Icon = ({ children, size = 24, className = '' , style }: { children: React.ReactNode; size?: number; className?: string; style?: React.CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
    {children}
  </svg>
);

const IconCheck = ({ size = 24 }: { size?: number }) => (
  <Icon size={size}>
    <polyline points="20 6 9 17 4 12"></polyline>
  </Icon>
);

const IconCopy = ({ size = 24 }: { size?: number }) => (
  <Icon size={size}>
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
  </Icon>
);

const IconShare = ({ size = 24 }: { size?: number }) => (
  <Icon size={size}>
    <circle cx="18" cy="5" r="3"></circle>
    <circle cx="6" cy="12" r="3"></circle>
    <circle cx="18" cy="19" r="3"></circle>
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
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

const AnimatedMeter = ({ pct, gold = false }: { pct: number; gold?: boolean }) => (
  <div style={{ height: 4, background: 'var(--hair-2)', borderRadius: 2, overflow: 'hidden' }}>
    <div style={{
      height: '100%',
      width: `${pct}%`,
      background: gold ? 'var(--gold)' : 'var(--ink)',
      transition: 'width 1s ease',
    }} />
  </div>
);

const ReferralDesktop = () => {
  const code = "KAYA-PRIYA-8842";
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="frame" style={{ display: 'flex' }}>
      <NavRail active="referral" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Topbar subtitle="Membership · Referrals" title="Share what works." />

        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.3fr 1fr', overflow: 'hidden' }}>
          {/* Hero card */}
          <div style={{ padding: 'var(--pad-4)', overflow: 'auto' }}>
            <div className="eyebrow gold dot">Refer & earn</div>
            <div className="display" style={{ fontSize: 56, marginTop: 12 }}>
              You give <em>₹1,500</em>.<br />
              They give back <em>250 pts</em>.
            </div>
            <div className="muted" style={{ fontSize: 14, marginTop: 18, maxWidth: 480 }}>
              Every friend who joins your protocol receives ₹1,500 off their first consultation. You earn 250 loyalty points the moment they book.
            </div>

            <div className="panel ink" style={{ marginTop: 32, padding: 24 }}>
              <div className="row between center">
                <div>
                  <div className="eyebrow" style={{ color: 'var(--mute-2)' }}>Your referral code</div>
                  <div className="num" style={{ fontSize: 28, marginTop: 6, letterSpacing: '0.04em' }}>{code}</div>
                </div>
                <button className="btn gold" onClick={copy}>
                  {copied ? <><IconCheck size={14} /> Copied</> : <><IconCopy size={14} /> Copy code</>}
                </button>
              </div>
              <div className="row" style={{ marginTop: 18, gap: 10 }}>
                <button className="btn ghost sm" style={{ color: 'var(--paper)', borderColor: 'rgba(255,255,255,0.18)' }}><IconShare size={14} /> Share link</button>
                <button className="btn ghost sm" style={{ color: 'var(--paper)', borderColor: 'rgba(255,255,255,0.18)' }}>WhatsApp</button>
                <button className="btn ghost sm" style={{ color: 'var(--paper)', borderColor: 'rgba(255,255,255,0.18)' }}>Email</button>
                <button className="btn ghost sm" style={{ color: 'var(--paper)', borderColor: 'rgba(255,255,255,0.18)' }}>SMS</button>
              </div>
            </div>

            {/* How it works */}
            <div className="row" style={{ marginTop: 32, gap: 16 }}>
              {[
                ['01', 'Share', 'Send your code or referral link via any channel.'],
                ['02', 'They book', 'Friend redeems ₹1,500 off their first consultation.'],
                ['03', 'You earn', '250 points credited the day after their first visit.'],
              ].map(([n, t, d], i) => (
                <div key={i} style={{ flex: 1, borderTop: '1px solid var(--hair)', paddingTop: 14 }}>
                  <div className="num gold" style={{ fontSize: 11 }}>{n}</div>
                  <div className="h4" style={{ marginTop: 12, fontSize: 16 }}>{t}</div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>{d}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — your referrals */}
          <div style={{ borderLeft: '1px solid var(--hair)', padding: 'var(--pad-4)', overflow: 'auto', background: 'var(--paper-2)' }}>
            <div className="row between center">
              <div className="eyebrow">Your referrals</div>
              <div className="num" style={{ fontSize: 12, color: 'var(--gold)' }}>+750 pts earned</div>
            </div>
            <div className="row" style={{ marginTop: 14, gap: 16 }}>
              <div>
                <div className="num" style={{ fontSize: 28 }}>3</div>
                <div className="eyebrow" style={{ fontSize: 9 }}>Booked</div>
              </div>
              <div>
                <div className="num" style={{ fontSize: 28 }}>2</div>
                <div className="eyebrow" style={{ fontSize: 9 }}>Pending</div>
              </div>
              <div>
                <div className="num" style={{ fontSize: 28 }}>1</div>
                <div className="eyebrow" style={{ fontSize: 9 }}>This month</div>
              </div>
            </div>

            <div className="col" style={{ marginTop: 22 }}>
              {[
                ['Aisha Kapoor', 'A first consultation booked', '+250', 'Mar 28', 'booked'],
                ['Rohan Verma', 'Initial consultation done', '+250', 'Feb 14', 'booked'],
                ['Maya Sharma', 'Consultation booked', '+250', 'Jan 09', 'booked'],
                ['Tanvi Mukherjee', 'Code claimed · awaiting visit', '—', 'May 14', 'pending'],
                ['Kabir Singh', 'Link opened · 2x', '—', 'May 22', 'pending'],
              ].map(([n, s, p, d, k], i) => (
                <div key={i} className="row between center" style={{
                  padding: '14px 0',
                  borderBottom: '1px solid var(--hair)',
                }}>
                  <div className="row center" style={{ gap: 10 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: `radial-gradient(circle at 35% 30%, hsl(${30 + i * 20} 40% 75%), hsl(${20 + i * 15} 30% 35%))`,
                    }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{n}</div>
                      <div className="muted" style={{ fontSize: 11 }}>{s}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="num" style={{ fontSize: 13, color: k === 'booked' ? 'var(--gold)' : 'var(--mute)' }}>{p}</div>
                    <div className="num" style={{ fontSize: 10, color: 'var(--mute-2)' }}>{d}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="panel" style={{ marginTop: 28, padding: 16, background: 'var(--paper)' }}>
              <div className="eyebrow gold dot">Bonus opportunity</div>
              <div className="h4" style={{ marginTop: 8 }}>Refer 2 more → Elite</div>
              <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                Two more booked referrals (500 pts) get you to Elite tier with dedicated dermatologist access.
              </div>
              <div style={{ marginTop: 12 }}><AnimatedMeter pct={60} gold /></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ReferralMobile = () => {
  const code = "KAYA-PRIYA-8842";
  const [copied, setCopied] = useState(false);
  return (
    <MobileShell active="home" dark>
      <div style={{ padding: '14px 16px 100px', height: '100%', overflow: 'auto' }}>
        <div className="display" style={{ fontSize: 28 }}>Share what <span style={{ color: 'var(--brand)' }}>works</span>.</div>

        {/* Hero card */}
        <div className="panel" style={{
          marginTop: 16, padding: 20, position: 'relative',
          background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-deep) 100%)',
          color: 'white', borderColor: 'transparent',
        }}>
          <div className="eyebrow" style={{ color: 'rgba(255,255,255,0.7)' }}>You give · they give back</div>
          <div className="display" style={{ fontSize: 32, marginTop: 8, color: 'white' }}>
            ₹1,500 <span style={{ opacity: 0.5 }}>·</span> 250 pts
          </div>
          <div style={{ fontSize: 12, marginTop: 8, color: 'rgba(255,255,255,0.85)' }}>
            ₹1,500 off for them on first consult. 250 loyalty points for you when they book.
          </div>

          {/* Code */}
          <div style={{ marginTop: 16, padding: 14, background: 'rgba(255,255,255,0.12)', borderRadius: 12 }}>
            <div className="eyebrow" style={{ color: 'rgba(255,255,255,0.7)' }}>Your code</div>
            <div className="row between center" style={{ marginTop: 6 }}>
              <div className="num" style={{ fontSize: 18, letterSpacing: '0.05em' }}>{code}</div>
              <button onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                style={{
                  width: 36, height: 36, border: 0, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.18)', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                }}>{copied ? <IconCheck size={14} /> : <IconCopy size={14} />}</button>
            </div>
          </div>

          <div className="row" style={{ marginTop: 12, gap: 6 }}>
            {['WhatsApp', 'SMS', 'Email', 'Copy link'].map((t, i) => (
              <button key={i} style={{
                flex: 1,
                background: 'rgba(255,255,255,0.16)',
                color: 'white', border: 0,
                borderRadius: 999, padding: '8px 0',
                fontSize: 11, fontWeight: 500,
              }}>{t}</button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="row" style={{ marginTop: 16, gap: 10 }}>
          <div className="panel" style={{ flex: 1, padding: 14, textAlign: 'center' }}>
            <div className="num" style={{ fontSize: 22 }}>3</div>
            <div className="eyebrow" style={{ fontSize: 9 }}>Booked</div>
          </div>
          <div className="panel" style={{ flex: 1, padding: 14, textAlign: 'center' }}>
            <div className="num brand" style={{ fontSize: 22 }}>+750</div>
            <div className="eyebrow" style={{ fontSize: 9 }}>Earned</div>
          </div>
          <div className="panel" style={{ flex: 1, padding: 14, textAlign: 'center' }}>
            <div className="num" style={{ fontSize: 22 }}>2</div>
            <div className="eyebrow" style={{ fontSize: 9 }}>Pending</div>
          </div>
        </div>

        <div className="eyebrow" style={{ marginTop: 22 }}>Your referrals</div>
        <div className="col" style={{ marginTop: 10 }}>
          {[
            ['Aisha Kapoor', '+250', 'Mar 28', 'mint'],
            ['Rohan Verma', '+250', 'Feb 14', 'mint'],
            ['Tanvi Mukherjee', '—', 'pending', 'mute'],
          ].map(([n, p, d, c], i) => (
            <div key={i} className="row between center" style={{ padding: '12px 0', borderBottom: '1px solid var(--hair)' }}>
              <div className="row center" style={{ gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: `radial-gradient(circle at 35% 30%, hsl(${30 + i * 25} 40% 75%), hsl(${20 + i * 15} 30% 35%))` }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{n}</div>
                  <div className="num muted" style={{ fontSize: 10 }}>{d}</div>
                </div>
              </div>
              <div className="num" style={{ fontSize: 13, color: c === 'mint' ? 'var(--mint)' : 'var(--mute-2)' }}>{p}</div>
            </div>
          ))}
        </div>
      </div>
    </MobileShell>
  );
};

export default function ReferralPage() {
  return (
    <>
      <div className="desktop-only"><ReferralDesktop /></div>
      <div className="mobile-only"><ReferralMobile /></div>
    </>
  );
}
