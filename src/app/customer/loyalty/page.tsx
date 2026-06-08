'use client';

import React from 'react';
import SharedNavRail from '../components/NavRail';
import MobileTabBar from '../components/MobileTabBar';

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
      <div style={{ fontSize: 12, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--mono)' }}>{subtitle}</div>
      <div style={{ fontSize: 24, fontWeight: 600, marginTop: 4, color: 'var(--ink)' }}>{title}</div>
    </div>
  </div>
);

const HOW_IT_WORKS = [
  { n: '1', title: 'Share your link', desc: 'Send your personal referral code or link to a friend.' },
  { n: '2', title: 'Friend books', desc: 'They complete their first Kaya session using your link.' },
  { n: '3', title: 'Both of you save', desc: 'They get ₹300 off. You keep your tier discount on all treatments.' },
  { n: '4', title: 'You level up', desc: 'Each referral moves you closer to Platinum and bigger savings.' },
];

const LoyaltyDesktop = () => {
  const myRefs = 3;
  const platinumRefs = 8;
  const refsToNext = platinumRefs - myRefs;
  const progress = Math.round((myRefs / platinumRefs) * 100);

  return (
    <div className="frame" style={{ display: 'flex' }}>
      <NavRail active="loyalty" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Topbar subtitle="Membership" title="Loyalty & Referrals" />

        <div style={{ padding: 'var(--pad-4)', maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Status card */}
          <div className="panel" style={{ padding: 28 }}>
            <div className="eyebrow gold dot">Gold Member · {myRefs} referrals made</div>
            <div style={{ fontSize: 22, fontWeight: 600, marginTop: 12, letterSpacing: '-0.01em' }}>
              You and your friends save with every referral.
            </div>

            {/* Progress bar */}
            <div style={{ marginTop: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--gold)', fontWeight: 600 }}>Gold · {myRefs} of {platinumRefs}</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--mute)' }}>{refsToNext} more to unlock Platinum</span>
              </div>
              <div style={{ height: 5, background: 'var(--hair-2)' }}>
                <div style={{ height: '100%', background: 'var(--gold)', width: `${progress}%`, transition: 'width 1s ease' }} />
              </div>
            </div>

            {/* Benefits */}
            <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ padding: '16px 20px', background: 'var(--paper-2)', border: '1px solid var(--hair)' }}>
                <div className="eyebrow" style={{ fontSize: 9 }}>You save</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--gold)', marginTop: 6, fontFamily: 'var(--mono)' }}>12%</div>
                <div style={{ fontSize: 12, color: 'var(--mute)', marginTop: 2 }}>off all treatments</div>
              </div>
              <div style={{ padding: '16px 20px', background: 'var(--paper-2)', border: '1px solid var(--hair)' }}>
                <div className="eyebrow" style={{ fontSize: 9 }}>Your friend saves</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--brand)', marginTop: 6, fontFamily: 'var(--mono)' }}>₹300</div>
                <div style={{ fontSize: 12, color: 'var(--mute)', marginTop: 2 }}>off their first visit</div>
              </div>
            </div>
          </div>

          {/* Share card */}
          <div className="panel" style={{ padding: 24 }}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Share your referral link</div>
            <div style={{ fontSize: 13, color: 'var(--mute)', marginBottom: 18 }}>
              Both of you save the moment they complete their first visit.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn">Share referral link <span className="arrow" /></button>
              <button className="btn ghost">Copy code · PRIYA300</button>
            </div>
          </div>

          {/* How it works */}
          <div>
            <div className="eyebrow" style={{ marginBottom: 18 }}>How it works</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 20 }}>
              {HOW_IT_WORKS.map((s, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{
                    width: 28, height: 28, background: 'var(--ink)', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, fontFamily: 'var(--mono)',
                  }}>{s.n}</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{s.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--mute)', lineHeight: 1.6 }}>{s.desc}</div>
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
  const platinumRefs = 8;
  const refsToNext = platinumRefs - myRefs;
  const progress = Math.round((myRefs / platinumRefs) * 100);

  return (
    <div className="frame" style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 20px 100px' }}>

        <div className="eyebrow gold dot" style={{ marginBottom: 4 }}>Gold Member</div>
        <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em', marginBottom: 16 }}>
          {myRefs} referrals · ₹900 saved together
        </div>

        {/* Progress */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'var(--mono)', marginBottom: 8 }}>
            <span style={{ color: 'var(--gold)' }}>Gold · {myRefs}</span>
            <span style={{ color: 'var(--mute)' }}>{refsToNext} more for Platinum</span>
          </div>
          <div style={{ height: 5, background: 'var(--hair-2)' }}>
            <div style={{ height: '100%', background: 'var(--gold)', width: `${progress}%` }} />
          </div>
        </div>

        {/* Benefits */}
        <div className="panel" style={{ padding: 16, marginBottom: 14 }}>
          <div className="eyebrow" style={{ fontSize: 9, marginBottom: 10 }}>Your Gold benefits</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ padding: '12px 14px', background: 'var(--paper-2)', border: '1px solid var(--hair)' }}>
              <div style={{ fontSize: 10, color: 'var(--mute)', fontFamily: 'var(--mono)' }}>YOU SAVE</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--gold)', marginTop: 4 }}>12%</div>
              <div style={{ fontSize: 11, color: 'var(--mute)' }}>all treatments</div>
            </div>
            <div style={{ padding: '12px 14px', background: 'var(--paper-2)', border: '1px solid var(--hair)' }}>
              <div style={{ fontSize: 10, color: 'var(--mute)', fontFamily: 'var(--mono)' }}>FRIEND SAVES</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--brand)', marginTop: 4 }}>₹300</div>
              <div style={{ fontSize: 11, color: 'var(--mute)' }}>first visit</div>
            </div>
          </div>
        </div>

        {/* Share */}
        <div className="panel" style={{ padding: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Share your link</div>
          <div style={{ fontSize: 12, color: 'var(--mute)', marginBottom: 14 }}>You both save after their first visit.</div>
          <button className="btn" style={{ width: '100%', justifyContent: 'center', marginBottom: 8 }}>
            Share referral link <span className="arrow" />
          </button>
          <button className="btn ghost" style={{ width: '100%', justifyContent: 'center' }}>
            Copy code · PRIYA300
          </button>
        </div>

        {/* How it works */}
        <div className="eyebrow" style={{ marginBottom: 14 }}>How it works</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {HOW_IT_WORKS.map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{
                width: 24, height: 24, flexShrink: 0, background: 'var(--ink)', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, fontFamily: 'var(--mono)',
              }}>{s.n}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{s.title}</div>
                <div style={{ fontSize: 12, color: 'var(--mute)', marginTop: 2, lineHeight: 1.5 }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>

      </div>
      <MobileTabBar active="loyalty" />
    </div>
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
