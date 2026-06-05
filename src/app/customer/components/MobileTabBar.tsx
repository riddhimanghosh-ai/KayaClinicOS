'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const Ico = ({ size = 20, sw = 1.4, children }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    {children}
  </svg>
);
const G = ({ cx, cy, r = 1.6 }: any) => <circle cx={cx} cy={cy} r={r} fill="var(--gold)" stroke="none"/>;

const IconHome  = () => <Ico><path d="M3.5 11 L12 4 L20.5 11 V20 H3.5 Z"/><path d="M10 20 V14 H14 V20"/><G cx={12} cy={8}/></Ico>;
const IconAppt  = () => <Ico><rect x="3.5" y="5" width="17" height="15" rx="1.5"/><path d="M3.5 9.5 H20.5"/><path d="M8 3.5 V6.5 M16 3.5 V6.5"/><G cx={16} cy={14.5}/></Ico>;
const IconProg  = () => <Ico><rect x="3.5" y="5.5" width="7.5" height="13" rx="1"/><rect x="13" y="5.5" width="7.5" height="13" rx="1"/><path d="M11 9 H13 M11 12 H13 M11 15 H13" strokeWidth="1"/><G cx={17} cy={9}/></Ico>;
const IconAI    = () => <Ico><path d="M4 5.5 H20 V16 H13 L9 19.5 V16 H4 Z"/><circle cx="9" cy="11" r="0.6" fill="currentColor" stroke="none"/><circle cx="12" cy="11" r="0.6" fill="currentColor" stroke="none"/><G cx={15} cy={11}/></Ico>;
const IconMore  = () => <Ico><circle cx="12" cy="5" r="1.2" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1.2" fill="currentColor" stroke="none"/></Ico>;
const IconRewards = () => <Ico><circle cx="12" cy="10" r="6"/><path d="M8.5 14.5 L7 21 L12 18.5 L17 21 L15.5 14.5"/><G cx={12} cy={10} r={2}/></Ico>;
const IconRefer = () => <Ico><circle cx="8" cy="9" r="3"/><path d="M2.5 19 C2.5 15.5 5 13.5 8 13.5 C11 13.5 13.5 15.5 13.5 19"/><circle cx="17" cy="11" r="2.4"/><path d="M14 19 C14 16.5 15.5 15 17 15 C18.5 15 20.5 16.5 20.5 19"/><G cx={17} cy={11}/></Ico>;
const IconPkg   = () => <Ico><path d="M3.5 7 L12 4 L20.5 7 V17 L12 20 L3.5 17 Z"/><path d="M3.5 7 L12 10 L20.5 7"/><path d="M12 10 V20"/><G cx={12} cy={10}/></Ico>;
const IconBlog  = () => <Ico><path d="M5 4 H17 L19.5 6.5 V20 H5 Z"/><path d="M8 9 H16 M8 12 H16 M8 15 H13"/><G cx={17.5} cy={6.5}/></Ico>;
const IconVideo = () => <Ico><rect x="3" y="5.5" width="18" height="13" rx="1.5"/><path d="M10.5 9.5 L14.5 12 L10.5 14.5 Z" fill="currentColor" stroke="none"/><G cx={20} cy={8} r={1.2}/></Ico>;
const IconSum   = () => <Ico><path d="M5 4 H15 L19 8 V20 H5 Z"/><path d="M8 10 H16 M8 13 H16 M8 16 H12"/><G cx={15} cy={8}/></Ico>;
const IconX       = () => <Ico><path d="M18 6 L6 18 M6 6 L18 18"/></Ico>;
const IconLogout  = () => <Ico><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></Ico>;

const MORE_ITEMS = [
  { icon: <IconSum/>,     label: 'Summaries',  path: '/customer/summary' },
  { icon: <IconRewards/>, label: 'Loyalty',    path: '/customer/loyalty' },
  { icon: <IconRefer/>,   label: 'Referrals',  path: '/customer/referral' },
  { icon: <IconPkg/>,     label: 'Products',   path: '/customer/products' },
  { icon: <IconBlog/>,    label: 'Articles',   path: '/customer/blog' },
  { icon: <IconVideo/>,   label: 'Videos',     path: '/customer/videos' },
];

export default function MobileTabBar({ active = 'home' }: { active?: string }) {
  const router = useRouter();
  const [showMore, setShowMore] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('user');
    setShowMore(false);
    router.push('/customer/login');
  };

  return (
    <>
      {/* Bottom sheet overlay */}
      {showMore && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
          onClick={() => setShowMore(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--paper)',
              borderRadius: 0,
              padding: '0 0 32px',
              borderTop: '1px solid var(--rule)',
            }}
          >
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
              <div style={{ width: 36, height: 4, borderRadius: 0, background: 'var(--rule)' }}/>
            </div>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 20px 16px' }}>
              <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em' }}>More</div>
              <button onClick={() => setShowMore(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mute)', padding: 4 }}>
                <IconX/>
              </button>
            </div>

            {/* Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, padding: '0 16px' }}>
              {MORE_ITEMS.map(item => (
                <button key={item.path} onClick={() => { setShowMore(false); router.push(item.path); }} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                  padding: '16px 8px', background: 'var(--paper-3)',
                  border: '1px solid var(--rule)', borderRadius: 0,
                  cursor: 'pointer', color: 'var(--ink)',
                }}>
                  <div style={{ width: 40, height: 40, borderRadius: 0, background: 'var(--paper-2)', border: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {item.icon}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{item.label}</span>
                </button>
              ))}
            </div>

            {/* Sign out */}
            <div style={{ padding: '16px 16px 0' }}>
              <button onClick={handleLogout} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px', background: 'var(--accent-soft)',
                border: '1px solid var(--rule)', borderRadius: 0,
                cursor: 'pointer', color: 'var(--warn)',
              }}>
                <div style={{ width: 40, height: 40, borderRadius: 0, background: 'var(--paper-2)', border: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconLogout/>
                </div>
                <span style={{ fontSize: 14, fontWeight: 600 }}>Sign out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div className="tabbar">
        <div className={`tab${active === 'home' ? ' active' : ''}`} onClick={() => router.push('/customer/dashboard')} style={{ cursor: 'pointer' }}>
          <IconHome/><span>Home</span><span className="dot"/>
        </div>
        <div className={`tab${active === 'appt' ? ' active' : ''}`} onClick={() => router.push('/customer/sessions')} style={{ cursor: 'pointer' }}>
          <IconAppt/><span>Visits</span><span className="dot"/>
        </div>
        <div className={`tab${active === 'progress' ? ' active' : ''}`} onClick={() => router.push('/customer/before-after')} style={{ cursor: 'pointer' }}>
          <IconProg/><span>Progress</span><span className="dot"/>
        </div>
        <div className={`tab${active === 'ai' ? ' active' : ''}`} onClick={() => router.push('/customer/chatbot')} style={{ cursor: 'pointer' }}>
          <IconAI/><span>Dr. AI</span><span className="dot"/>
        </div>
        <div className={`tab${showMore ? ' active' : ''}`} onClick={() => setShowMore(true)} style={{ cursor: 'pointer' }}>
          <IconMore/><span>More</span><span className="dot"/>
        </div>
      </div>
    </>
  );
}
