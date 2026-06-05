'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SharedNavRail from '../components/NavRail';
import MobileTabBar from '../components/MobileTabBar';

const ARTICLES = [
  { tag: 'Pigmentation', title: 'The science of melasma — and why retinoids alone won\'t solve it',  author: 'Dr. Ananya Sharma', read: '8 min', date: 'May 22', feat: true },
  { tag: 'Acne',         title: 'Hormonal acne in adults: a 12-week protocol that actually works',  author: 'Dr. Ravi Krishnan', read: '6 min', date: 'May 18' },
  { tag: 'Sun care',     title: 'SPF in monsoon — humidity, sweat, and the science of reapplication', author: 'Dr. Ananya Sharma', read: '4 min', date: 'May 11' },
  { tag: 'Anti-ageing',  title: 'Tretinoin tolerance: the buffering technique you\'ve never tried',  author: 'Dr. Karan Bhatia', read: '7 min', date: 'May 04' },
  { tag: 'Sensitive',    title: 'When your barrier breaks: a clinician\'s recovery playbook',         author: 'Dr. Ananya Sharma', read: '5 min', date: 'Apr 28' },
  { tag: 'Procedures',   title: 'Chemical peels demystified — TCA, glycolic, lactic, salicylic',     author: 'Dr. Ravi Krishnan', read: '9 min', date: 'Apr 22' },
];

const IconSearch = ({ size = 24, ...props }: any) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>;

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

const BlogsDesktop = () => {
  const [filter, setFilter] = React.useState('All');
  const tags = ['All', 'Pigmentation', 'Acne', 'Sun care', 'Anti-ageing', 'Sensitive', 'Procedures'];
  const filtered = filter === 'All' ? ARTICLES : ARTICLES.filter(a => a.tag === filter);

  return (
    <div className="frame" style={{ display: 'flex' }}>
      <NavRail active="blog" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Topbar
          subtitle="The journal"
          title="Dermatology, in detail."
          right={<button className="btn ghost sm"><IconSearch size={14} /> Search articles</button>}
        />

        <div style={{ padding: '14px var(--pad-4)', borderBottom: '1px solid var(--hair)' }} className="row center" >
          {tags.map((t) => (
            <button key={t} onClick={() => setFilter(t)}
              style={{
                appearance: 'none',
                padding: '6px 12px',
                marginRight: 8,
                background: filter === t ? 'var(--ink)' : 'transparent',
                color: filter === t ? 'var(--paper)' : 'var(--ink)',
                border: '1px solid ' + (filter === t ? 'var(--ink)' : 'var(--hair-2)'),
                font: '500 11px var(--mono)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >{t}</button>
          ))}
        </div>

        <div style={{ flex: 1, overflow: 'auto' }}>
          {filtered.filter((a) => a.feat).map((a, i) => (
            <div key={i} className="row" style={{ borderBottom: '1px solid var(--hair)' }}>
              <div style={{ flex: 1, background: `radial-gradient(120% 100% at 30% 30%, #f6e6d4 0%, #c69e76 60%, #4a2f1f 100%)`, minHeight: 360, position: 'relative' }}>
                <div style={{ position: 'absolute', top: 20, left: 20, color: 'rgba(255,255,255,0.85)' }}>
                  <div className="eyebrow" style={{ color: 'inherit' }}>FEATURED · {a.date.toUpperCase()}</div>
                </div>
              </div>
              <div style={{ flex: 1, padding: 'var(--pad-5)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div className="tag gold" style={{ alignSelf: 'flex-start' }}>{a.tag}</div>
                <div className="display" style={{ fontSize: 40, marginTop: 18 }}>
                  {a.title}
                </div>
                <div className="muted" style={{ fontSize: 14, marginTop: 18 }}>
                  Melasma is a story of UV, hormones, and inflammation working in concert. Topical retinoids address one of those — here&apos;s how to address the others, and why a 12-week protocol matters.
                </div>
                <div className="row center" style={{ marginTop: 28, gap: 12 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'radial-gradient(circle at 35% 30%, #e6c9a8, #6b4628)',
                  }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{a.author}</div>
                    <div className="muted" style={{ fontSize: 11 }}>{a.read} read</div>
                  </div>
                  <button className="btn sm" style={{ marginLeft: 'auto' }}>Read article <span className="arrow" /></button>
                </div>
              </div>
            </div>
          ))}

          <div style={{ padding: 'var(--pad-4)', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0 }}>
            {filtered.filter((a) => !a.feat).map((a, i) => (
              <div key={i} style={{
                padding: 'var(--pad-3) var(--pad-3) var(--pad-3) 0',
                borderRight: (i + 1) % 3 !== 0 ? '1px solid var(--hair)' : 0,
                paddingLeft: i % 3 !== 0 ? 'var(--pad-3)' : 0,
              }}>
                <div style={{
                  aspectRatio: '4 / 3',
                  background: `linear-gradient(${135 + i*30}deg, hsl(${28 + i*8} 45% ${60 - i*3}%), hsl(${24 + i*5} 30% ${30 - i*2}%))`,
                  position: 'relative',
                }}>
                  <div className="num" style={{
                    position: 'absolute', top: 12, left: 12,
                    fontSize: 10, color: 'rgba(255,255,255,0.7)',
                    fontFamily: 'var(--mono)', letterSpacing: '0.14em',
                  }}>0{i + 2}</div>
                </div>
                <div className="tag" style={{ marginTop: 14 }}>{a.tag}</div>
                <div className="h4" style={{ marginTop: 12, fontSize: 17, lineHeight: 1.25 }}>{a.title}</div>
                <div className="row between center" style={{ marginTop: 14 }}>
                  <div className="muted" style={{ fontSize: 11 }}>{a.author}</div>
                  <div className="num muted" style={{ fontSize: 11 }}>{a.read} · {a.date}</div>
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

const BlogsMobile = () => {
  const [filter, setFilter] = React.useState('All');
  const tags = ['All', 'Pigmentation', 'Acne', 'Sun care', 'Anti-ageing'];
  const filtered = filter === 'All' ? ARTICLES : ARTICLES.filter(a => a.tag === filter);

  return (
    <MobileShell active="home">
      <div style={{ padding: '16px 16px 100px', height: '100%', overflow: 'auto' }}>
        <div className="eyebrow">The journal</div>
        <div className="display" style={{ fontSize: 32, marginTop: 8 }}>Dermatology, in detail.</div>

        <div style={{ marginTop: 16, display: 'flex', gap: 8, overflow: 'auto', paddingBottom: 8 }}>
          {tags.map((t) => (
            <button key={t} onClick={() => setFilter(t)}
              style={{
                appearance: 'none',
                padding: '6px 12px',
                background: filter === t ? 'var(--ink)' : 'var(--paper-2)',
                color: filter === t ? 'var(--paper)' : 'var(--ink)',
                border: 0,
                font: '500 10px var(--mono)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                borderRadius: '999px',
                whiteSpace: 'nowrap',
              }}
            >{t}</button>
          ))}
        </div>

        {filtered.filter((a) => a.feat).map((a, i) => (
          <div key={i} style={{ marginTop: 20 }}>
            <div style={{
              aspectRatio: '16 / 9',
              background: `radial-gradient(120% 100% at 30% 30%, #f6e6d4 0%, #c69e76 60%, #4a2f1f 100%)`,
              position: 'relative',
              borderRadius: 8,
            }}>
              <div style={{ position: 'absolute', top: 12, left: 12, color: 'rgba(255,255,255,0.85)' }}>
                <div className="eyebrow" style={{ color: 'inherit', fontSize: 9 }}>FEATURED</div>
              </div>
            </div>
            <div className="tag gold" style={{ marginTop: 12 }}>{a.tag}</div>
            <div className="h4" style={{ marginTop: 12, fontSize: 18, lineHeight: 1.2 }}>{a.title}</div>
            <div className="row between center" style={{ marginTop: 12 }}>
              <div className="muted" style={{ fontSize: 11 }}>{a.author}</div>
              <div className="num muted" style={{ fontSize: 11 }}>{a.read}</div>
            </div>
          </div>
        ))}

        {filtered.filter((a) => !a.feat).map((a, i) => (
          <div key={i} style={{ marginTop: 20, paddingBottom: 20, borderBottom: i < filtered.length - 2 ? '1px solid var(--hair)' : 0 }}>
            <div className="tag" style={{ fontSize: 10 }}>{a.tag}</div>
            <div className="h4" style={{ marginTop: 10, fontSize: 16, lineHeight: 1.25 }}>{a.title}</div>
            <div className="row between center" style={{ marginTop: 12 }}>
              <div className="muted" style={{ fontSize: 11 }}>{a.author}</div>
              <div className="num muted" style={{ fontSize: 11 }}>{a.read}</div>
            </div>
          </div>
        ))}
      </div>
    </MobileShell>
  );
};

export default function BlogPage() {
  return (
    <>
      <div className="desktop-only"><BlogsDesktop /></div>
      <div className="mobile-only"><BlogsMobile /></div>
    </>
  );
}
