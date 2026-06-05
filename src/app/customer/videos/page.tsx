'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SharedNavRail from '../components/NavRail';
import MobileTabBar from '../components/MobileTabBar';

const VIDEOS = [
  { dur: '8:24', title: 'Building your morning skincare routine', cat: 'Routines', host: 'Dr. Ananya Sharma', views: '124k', big: true },
  { dur: '12:50', title: 'Understanding melasma: causes and treatment', cat: 'Conditions', host: 'Dr. Ananya Sharma', views: '88k' },
  { dur: '6:15', title: 'How to use tretinoin without irritation', cat: 'Products', host: 'Dr. Karan Bhatia', views: '212k' },
  { dur: '9:48', title: 'Acne in adults: a clinical walkthrough', cat: 'Conditions', host: 'Dr. Ravi Krishnan', views: '74k' },
  { dur: '4:32', title: 'SPF: how much, how often, which one', cat: 'Products', host: 'Dr. Ananya Sharma', views: '156k' },
  { dur: '11:20', title: 'What happens during a chemical peel', cat: 'Procedures', host: 'Dr. Ravi Krishnan', views: '92k' },
  { dur: '7:08', title: 'Building barrier resilience in 14 days', cat: 'Routines', host: 'Dr. Karan Bhatia', views: '58k' },
];

const NavRail = ({ active }: any) => <SharedNavRail active={active} />;

const Topbar = ({ subtitle, title, right }: any) => (
  <div className="topbar">
    <div>
      <div className="eyebrow">{subtitle}</div>
      <div className="h3" style={{ marginTop: 4 }}>{title}</div>
    </div>
    {right}
  </div>
);

const VideosDesktop = () => {
  const big = VIDEOS[0];

  return (
    <div className="frame" style={{ display: 'flex' }}>
      <NavRail active="videos" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Topbar
          subtitle="Video library"
          title="Watch · learn · apply"
          right={<button className="btn ghost sm">My playlist · 3</button>}
        />

        <div style={{ flex: 1, overflow: 'auto', padding: 'var(--pad-4)' }}>
          {/* Hero video */}
          <div className="row" style={{ gap: 28 }}>
            <div style={{
              flex: 1.4,
              aspectRatio: '16 / 9',
              background: 'radial-gradient(70% 60% at 40% 40%, #c69e76 0%, #5a3c24 80%)',
              position: 'relative',
              cursor: 'pointer',
            }}>
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 70, height: 70,
                background: 'var(--paper)', color: 'var(--ink)',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5 V19 L19 12 Z" /></svg>
              </div>
              <div style={{ position: 'absolute', bottom: 16, left: 16, color: 'rgba(255,255,255,0.95)' }}>
                <div className="tag" style={{ color: 'inherit', borderColor: 'rgba(255,255,255,0.3)', background: 'rgba(0,0,0,0.3)' }}>FEATURED · {big.cat.toUpperCase()}</div>
              </div>
              <div style={{ position: 'absolute', bottom: 16, right: 16, color: 'rgba(255,255,255,0.95)' }}>
                <div className="num" style={{ fontSize: 13, letterSpacing: '0.04em' }}>{big.dur}</div>
              </div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div className="eyebrow gold dot">Featured</div>
              <div className="display" style={{ fontSize: 36, marginTop: 14 }}>{big.title}</div>
              <div className="muted" style={{ fontSize: 14, marginTop: 16, lineHeight: 1.5 }}>
                Dr. Sharma walks through her clinic&apos;s morning skincare framework: cleanse, treat, protect — with the rationale behind each product order and timing.
              </div>
              <div className="row" style={{ marginTop: 24, gap: 16 }}>
                <div className="row center" style={{ gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%, #e6c9a8, #6b4628)' }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{big.host}</div>
                    <div className="muted" style={{ fontSize: 10 }}>{big.views} views</div>
                  </div>
                </div>
                <button className="btn sm" style={{ marginLeft: 'auto' }}>Watch now <span className="arrow" /></button>
              </div>
            </div>
          </div>

          {/* Categories */}
          <div className="row" style={{ marginTop: 36, gap: 12, alignItems: 'flex-end' }}>
            <div className="eyebrow">Episodes · series 2</div>
            <div style={{ flex: 1, height: 1, background: 'var(--hair)' }} />
            <div className="muted" style={{ fontSize: 12 }}>32 videos · 4 hosts</div>
          </div>

          <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
            {VIDEOS.slice(1).map((v, i) => (
              <div key={i}>
                <div style={{
                  aspectRatio: '16 / 9',
                  background: `radial-gradient(70% 60% at ${30 + i * 10}% 40%, hsl(${28 + i*15} 40% ${60 - i*4}%), hsl(${24 + i*12} 30% ${30 - i*2}%))`,
                  position: 'relative',
                  cursor: 'pointer',
                }}>
                  <div style={{
                    position: 'absolute', top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 40, height: 40,
                    background: 'rgba(0,0,0,0.5)', color: 'var(--paper)',
                    borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5 V19 L19 12 Z" /></svg>
                  </div>
                  <div className="num" style={{
                    position: 'absolute', bottom: 8, right: 8,
                    fontSize: 10, color: 'rgba(255,255,255,0.9)',
                    background: 'rgba(0,0,0,0.5)', padding: '2px 6px',
                  }}>{v.dur}</div>
                </div>
                <div className="eyebrow" style={{ marginTop: 12, fontSize: 9 }}>{v.cat}</div>
                <div style={{ fontSize: 14, fontWeight: 500, marginTop: 6, lineHeight: 1.3 }}>{v.title}</div>
                <div className="row between" style={{ marginTop: 8 }}>
                  <div className="muted" style={{ fontSize: 11 }}>{v.host}</div>
                  <div className="num muted" style={{ fontSize: 11 }}>{v.views}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const MobileShell = ({ active = '', children }: any) => {
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
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>{children}</div>
      <MobileTabBar active={active} />
    </div>
  );
};

const VideosMobile = () => {
  const big = VIDEOS[0];

  return (
    <MobileShell active="home">
      <div style={{ padding: '16px 16px 100px', height: '100%', overflow: 'auto' }}>
        <div className="eyebrow">Video library</div>
        <div className="display" style={{ fontSize: 32, marginTop: 8 }}>Watch · learn · apply</div>

        {/* Featured */}
        <div style={{ marginTop: 20, aspectRatio: '16 / 9', background: 'radial-gradient(70% 60% at 40% 40%, #c69e76 0%, #5a3c24 80%)', position: 'relative', borderRadius: 8 }}>
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 50, height: 50,
            background: 'var(--paper)', color: 'var(--ink)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5 V19 L19 12 Z" /></svg>
          </div>
          <div style={{ position: 'absolute', bottom: 12, left: 12, color: 'rgba(255,255,255,0.95)' }}>
            <div className="num" style={{ fontSize: 11 }}>{big.dur}</div>
          </div>
        </div>

        <div className="eyebrow gold dot" style={{ marginTop: 16 }}>Featured</div>
        <div className="h3" style={{ marginTop: 8 }}>{big.title}</div>
        <div className="row center" style={{ marginTop: 14, gap: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%, #e6c9a8, #6b4628)' }} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 500 }}>{big.host}</div>
            <div className="muted" style={{ fontSize: 10 }}>{big.views} views</div>
          </div>
        </div>

        {/* Other videos */}
        <div className="eyebrow" style={{ marginTop: 28 }}>Episodes · series 2</div>
        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {VIDEOS.slice(1).map((v, i) => (
            <div key={i}>
              <div style={{
                aspectRatio: '16 / 9',
                background: `radial-gradient(70% 60% at ${30 + i * 10}% 40%, hsl(${28 + i*15} 40% ${60 - i*4}%), hsl(${24 + i*12} 30% ${30 - i*2}%))`,
                position: 'relative',
                borderRadius: 8,
              }}>
                <div style={{
                  position: 'absolute', top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 32, height: 32,
                  background: 'rgba(0,0,0,0.5)', color: 'var(--paper)',
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5 V19 L19 12 Z" /></svg>
                </div>
                <div className="num" style={{
                  position: 'absolute', bottom: 6, right: 6,
                  fontSize: 9, color: 'rgba(255,255,255,0.9)',
                  background: 'rgba(0,0,0,0.5)', padding: '2px 5px',
                }}>{v.dur}</div>
              </div>
              <div className="eyebrow" style={{ marginTop: 10, fontSize: 9 }}>{v.cat}</div>
              <div style={{ fontSize: 13, fontWeight: 500, marginTop: 4, lineHeight: 1.2 }}>{v.title}</div>
              <div className="muted" style={{ fontSize: 10, marginTop: 6 }}>{v.host}</div>
            </div>
          ))}
        </div>
      </div>
    </MobileShell>
  );
};

export default function VideosPage() {
  return (
    <>
      <div className="desktop-only"><VideosDesktop /></div>
      <div className="mobile-only"><VideosMobile /></div>
    </>
  );
}
