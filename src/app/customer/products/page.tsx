'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import SharedNavRail from '../components/NavRail';
import MobileTabBar from '../components/MobileTabBar';

const Icon = ({ size = 18, children, stroke = 1.4, style }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
    style={{ flexShrink: 0, ...style }}>
    {children}
  </svg>
);

const G = ({ cx, cy, r = 1.6 }: any) => <circle cx={cx} cy={cy} r={r} fill="var(--gold)" stroke="none" />;
const IconSearch = (p: any) => <Icon {...p}><circle cx="10.5" cy="10.5" r="6" /><path d="M15 15 L20 20" /></Icon>;
const IconBell = (p: any) => <Icon {...p}><path d="M6 16 V11 C6 7.5 8.5 5 12 5 C15.5 5 18 7.5 18 11 V16 L19.5 18 H4.5 Z" /><path d="M10 20 C10.5 21 11.2 21.5 12 21.5 C12.8 21.5 13.5 21 14 20" /><G cx={17} cy={7} /></Icon>;
const IconCart = (p: any) => <Icon {...p}><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></Icon>;
const IconCheck = (p: any) => <Icon {...p}><path d="M4 12 L9.5 17.5 L20 7" /></Icon>;

const PRODUCTS = [
  {
    id: 1, name: 'Kaya Antox Vit-C Serum', category: 'Serum', price: 895, mrp: 1095,
    desc: 'Brightening vitamin C + ferulic acid. Fades dark spots, boosts radiance.',
    size: '30ml', tag: 'Bestseller', color: '#fff8ee', prescribed: true,
  },
  {
    id: 2, name: 'Kaya Niacinamide 10% Serum', category: 'Serum', price: 645, mrp: 795,
    desc: 'Pore-minimising, sebum-control. 10% niacinamide + zinc PCA.',
    size: '30ml', tag: 'Prescribed', color: '#eef4ff', prescribed: true,
  },
  {
    id: 3, name: 'Kaya Daily Shield SPF 50', category: 'Sunscreen', price: 750, mrp: 895,
    desc: 'Broad-spectrum PA++++ for Indian skin. Invisible finish, no white cast.',
    size: '50ml', tag: 'Prescribed', color: '#f0faf2', prescribed: true,
  },
  {
    id: 4, name: 'Kaya Replenishing Night Cream', category: 'Moisturiser', price: 985, mrp: 1195,
    desc: 'Ceramide barrier repair + peptide complex. Overnight skin restoration.',
    size: '50g', tag: null, color: '#f5f0ff', prescribed: false,
  },
  {
    id: 5, name: 'Kaya Pore Refine Toner', category: 'Toner', price: 545, mrp: 695,
    desc: 'BHA-based toner. Unclogs pores, smooths texture, controls shine.',
    size: '150ml', tag: 'New', color: '#fff0f5', prescribed: false,
  },
  {
    id: 6, name: 'Kaya Hydra Boost Eye Gel', category: 'Eye Care', price: 1195, mrp: 1495,
    desc: 'Caffeine + hyaluronic acid for dark circles and puffiness.',
    size: '15ml', tag: null, color: '#f0faff', prescribed: false,
  },
  {
    id: 7, name: 'Kaya Clarifying Face Wash', category: 'Cleanser', price: 395, mrp: 495,
    desc: 'Salicylic acid + tea tree. Deep pore cleanse without stripping moisture.',
    size: '100ml', tag: 'Bestseller', color: '#f0fff5', prescribed: false,
  },
  {
    id: 8, name: 'Kaya Barrier Repair Cream', category: 'Moisturiser', price: 850, mrp: 1050,
    desc: 'Triple ceramide formula for dry, sensitised or post-treatment skin.',
    size: '50g', tag: null, color: '#fffaf0', prescribed: false,
  },
];

const CATEGORIES = ['All', 'Serum', 'Sunscreen', 'Moisturiser', 'Toner', 'Cleanser', 'Eye Care'];

const MobileShell = ({ active = 'home', children }: any) => {
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

const ProductCard = ({ p, onAdd, added }: { p: any; onAdd: () => void; added: boolean }) => (
  <div className="panel" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
    <div style={{ height: 90, background: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      <div style={{ width: 56, height: 56, borderRadius: 'var(--r-3)', background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <IconCart size={22} style={{ opacity: 0.5 }} />
      </div>
      {p.tag && (
        <span style={{ position: 'absolute', top: 10, left: 10, fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', background: p.tag === 'Prescribed' ? 'var(--brand)' : p.tag === 'Bestseller' ? 'var(--gold)' : 'var(--ink)', color: 'white', padding: '2px 8px', borderRadius: 10 }}>
          {p.tag}
        </span>
      )}
    </div>
    <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontSize: 11, color: 'var(--mute)', fontFamily: 'var(--mono)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{p.category}</div>
      <div style={{ fontSize: 13, fontWeight: 600, marginTop: 3, lineHeight: 1.3 }}>{p.name}</div>
      <div style={{ fontSize: 11, color: 'var(--mute)', marginTop: 5, lineHeight: 1.4, flex: 1 }}>{p.desc}</div>
      <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span className="num" style={{ fontSize: 14, fontWeight: 600 }}>₹{p.price}</span>
          <span style={{ fontSize: 11, color: 'var(--mute)', textDecoration: 'line-through', marginLeft: 5 }}>₹{p.mrp}</span>
        </div>
        <span style={{ fontSize: 9, color: 'var(--mute)', fontFamily: 'var(--mono)' }}>{p.size}</span>
      </div>
      <button
        className={added ? 'btn sm' : 'btn ghost sm'}
        style={{ marginTop: 10, width: '100%', fontSize: 11 }}
        onClick={onAdd}
      >
        {added ? <><IconCheck size={11} /> Added</> : 'Add to cart'}
      </button>
    </div>
  </div>
);

const ProductsDesktop = () => {
  const [cat, setCat] = useState('All');
  const [cart, setCart] = useState<Set<number>>(new Set());
  const toggle = (id: number) => setCart(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const filtered = cat === 'All' ? PRODUCTS : PRODUCTS.filter(p => p.category === cat);

  return (
    <div className="frame" style={{ display: 'flex' }}>
      <SharedNavRail active="products" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Topbar */}
        <div className="topbar">
          <div>
            <div className="eyebrow gold dot">Kaya store</div>
            <div className="h3" style={{ marginTop: 6 }}>Products</div>
          </div>
          <div className="row center" style={{ gap: 10 }}>
            {cart.size > 0 && (
              <button className="btn sm" style={{ position: 'relative' }}>
                <IconCart size={14} /> Cart
                <span style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: 'var(--brand)', color: 'white', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{cart.size}</span>
              </button>
            )}
            <button className="btn ghost sm"><IconSearch size={14} /> Search</button>
            <button className="btn ghost sm" style={{ position: 'relative' }}>
              <IconBell size={14} />
              <span style={{ position: 'absolute', top: 4, right: 6, width: 6, height: 6, borderRadius: '50%', background: 'var(--gold)' }} />
            </button>
          </div>
        </div>

        {/* Category filters */}
        <div style={{ display: 'flex', gap: 6, padding: '14px var(--pad-4)', borderBottom: '1px solid var(--hair)', flexWrap: 'wrap' }}>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCat(c)} style={{
              appearance: 'none', padding: '6px 14px',
              background: cat === c ? 'var(--ink)' : 'transparent',
              color: cat === c ? 'var(--paper)' : 'var(--ink)',
              border: '1px solid ' + (cat === c ? 'var(--ink)' : 'var(--hair-2)'),
              font: '500 11px var(--mono)', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
            }}>{c}</button>
          ))}
        </div>

        {/* Grid */}
        <div style={{ flex: 1, overflow: 'auto', padding: 'var(--pad-4)' }}>
          {/* Prescribed band */}
          <div className="eyebrow" style={{ marginBottom: 12 }}>
            Prescribed for you · {PRODUCTS.filter(p => p.prescribed).length} items
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 32 }}>
            {filtered.filter(p => p.prescribed).map(p => (
              <ProductCard key={p.id} p={p} onAdd={() => toggle(p.id)} added={cart.has(p.id)} />
            ))}
          </div>

          {filtered.filter(p => !p.prescribed).length > 0 && (
            <>
              <div className="eyebrow" style={{ marginBottom: 12 }}>More from Kaya</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
                {filtered.filter(p => !p.prescribed).map(p => (
                  <ProductCard key={p.id} p={p} onAdd={() => toggle(p.id)} added={cart.has(p.id)} />
                ))}
              </div>
            </>
          )}

          <div style={{ textAlign: 'center', padding: '16px 0', borderTop: '1px solid var(--hair)' }}>
            <a href="https://www.kaya.in/products" target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: 'var(--brand)', fontWeight: 500, textDecoration: 'none' }}>
              Browse full Kaya catalogue →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProductsMobile = () => {
  const [cat, setCat] = useState('All');
  const [cart, setCart] = useState<Set<number>>(new Set());
  const toggle = (id: number) => setCart(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const filtered = cat === 'All' ? PRODUCTS : PRODUCTS.filter(p => p.category === cat);

  return (
    <MobileShell active="home">
      <div style={{ height: '100%', overflow: 'auto' }}>
        <div style={{ padding: '14px 16px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em' }}>Products</div>
            {cart.size > 0 && (
              <button className="btn sm" style={{ position: 'relative', fontSize: 11 }}>
                <IconCart size={13} /> Cart · {cart.size}
              </button>
            )}
          </div>
          <div style={{ fontSize: 12, color: 'var(--mute)', marginTop: 2 }}>Kaya dermatology store</div>
        </div>

        {/* Category strip */}
        <div style={{ display: 'flex', overflowX: 'auto', gap: 6, padding: '12px 16px', scrollbarWidth: 'none', borderBottom: '1px solid var(--hair)' }}>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCat(c)} style={{
              flexShrink: 0, appearance: 'none', padding: '5px 12px',
              background: cat === c ? 'var(--ink)' : 'transparent',
              color: cat === c ? 'var(--paper)' : 'var(--ink)',
              border: '1px solid ' + (cat === c ? 'var(--ink)' : 'var(--hair-2)'),
              font: '500 11px var(--mono)', letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer',
            }}>{c}</button>
          ))}
        </div>

        <div style={{ padding: '14px 16px 100px' }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Prescribed for you</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
            {filtered.filter(p => p.prescribed).map(p => (
              <ProductCard key={p.id} p={p} onAdd={() => toggle(p.id)} added={cart.has(p.id)} />
            ))}
          </div>

          {filtered.filter(p => !p.prescribed).length > 0 && (
            <>
              <div className="eyebrow" style={{ marginBottom: 10 }}>More from Kaya</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                {filtered.filter(p => !p.prescribed).map(p => (
                  <ProductCard key={p.id} p={p} onAdd={() => toggle(p.id)} added={cart.has(p.id)} />
                ))}
              </div>
            </>
          )}

          <div style={{ textAlign: 'center', paddingTop: 12, borderTop: '1px solid var(--hair)' }}>
            <a href="https://www.kaya.in/products" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--brand)', fontWeight: 500, textDecoration: 'none' }}>
              Browse full Kaya catalogue →
            </a>
          </div>
        </div>
      </div>
    </MobileShell>
  );
};

export default function ProductsPage() {
  return (
    <>
      <div className="desktop-only"><ProductsDesktop /></div>
      <div className="mobile-only"><ProductsMobile /></div>
    </>
  );
}
