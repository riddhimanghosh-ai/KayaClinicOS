'use client';

import Link from 'next/link';

const Icon = ({ size = 18, children, stroke = 1.4, style }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
    style={{ flexShrink: 0, ...style }}>
    {children}
  </svg>
);

const G = ({ cx, cy, r = 1.6 }: any) => <circle cx={cx} cy={cy} r={r} fill="var(--gold)" stroke="none" />;

const IconHome = (p: any) => <Icon {...p}><path d="M3.5 11 L12 4 L20.5 11 V20 H3.5 Z" /><path d="M10 20 V14 H14 V20" /><G cx={12} cy={8} /></Icon>;
const IconAppt = (p: any) => <Icon {...p}><rect x="3.5" y="5" width="17" height="15" rx="1.5" /><path d="M3.5 9.5 H20.5" /><path d="M8 3.5 V6.5 M16 3.5 V6.5" /><G cx={16} cy={14.5} /></Icon>;
const IconMed = (p: any) => <Icon {...p}><rect x="3" y="9" width="18" height="6" rx="3" transform="rotate(-30 12 12)" /><path d="M8.5 7.5 L15.5 16.5" /><G cx={15} cy={9.5} /></Icon>;
const IconProgress = (p: any) => <Icon {...p}><rect x="3.5" y="5.5" width="7.5" height="13" rx="1" /><rect x="13" y="5.5" width="7.5" height="13" rx="1" /><path d="M11 9 H13 M11 12 H13 M11 15 H13" strokeWidth="1" /><G cx={17} cy={9} /></Icon>;
const IconRewards = (p: any) => <Icon {...p}><circle cx="12" cy="10" r="6" /><path d="M8.5 14.5 L7 21 L12 18.5 L17 21 L15.5 14.5" /><G cx={12} cy={10} r={2} /></Icon>;
const IconPackage = (p: any) => <Icon {...p}><path d="M3.5 7 L12 4 L20.5 7 V17 L12 20 L3.5 17 Z" /><path d="M3.5 7 L12 10 L20.5 7" /><path d="M12 10 V20" /><G cx={12} cy={10} /></Icon>;
const IconRx = (p: any) => <Icon {...p}><path d="M9 2 H15 L17 4 V7 H7 V4 Z" /><rect x="5" y="7" width="14" height="15" rx="1" /><path d="M9 11 H15 M9 14 H13" /></Icon>;
const IconBlog = (p: any) => <Icon {...p}><path d="M5 4 H17 L19.5 6.5 V20 H5 Z" /><path d="M8 9 H16 M8 12 H16 M8 15 H13" /><G cx={17.5} cy={6.5} /></Icon>;
const IconVideo = (p: any) => <Icon {...p}><rect x="3" y="5.5" width="18" height="13" rx="1.5" /><path d="M10.5 9.5 L14.5 12 L10.5 14.5 Z" fill="currentColor" stroke="none" /><G cx={20} cy={8} r={1.2} /></Icon>;

const NAV_ITEMS = [
  {
    group: 'Care',
    items: [
      { id: 'dashboard',    href: '/customer/dashboard',                        label: 'Overview',          icon: IconHome,     badge: null },
      { id: 'appointments', href: '/customer/sessions',                         label: 'History',           icon: IconAppt,     badge: '2' },
    ],
  },
  {
    group: 'Rewards & Perks',
    items: [
      { id: 'loyalty',  href: '/customer/loyalty',   label: 'Loyalty & Referrals', icon: IconRewards, badge: null },
      { id: 'products', href: '/customer/products',  label: 'Exclusive Offers',    icon: IconPackage, badge: null },
    ],
  },
  {
    group: 'Learn',
    items: [
      { id: 'blogs',  href: '/customer/blog',    label: 'Articles', icon: IconBlog,  badge: null },
      { id: 'videos', href: '/customer/videos',  label: 'Videos',   icon: IconVideo, badge: null },
    ],
  },
];

export default function NavRail({ active = 'dashboard' }: { active?: string }) {
  return (
    <div className="nav-rail">
      <div>
        <div className="brand" style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
          <span>kaya</span><i>.</i>
        </div>
        <div className="brand-mark">Skin · Hair · Body</div>
      </div>

      {NAV_ITEMS.map(({ group, items }) => (
        <div key={group} style={{ marginTop: 8 }}>
          <div className="group-label" style={{ display: 'flex', alignItems: 'center' }}>
            <span>{group}</span>
          </div>
          <div>
            {items.map(({ id, href, label, icon: I, badge }) => {
              const isActive = active === id;
              return (
                <Link
                  key={id}
                  href={href}
                  style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
                >
                  <div className={`nav-item${isActive ? ' active' : ''}`} style={{ cursor: 'pointer' }}>
                    <span className="nav-icon"><I size={15} stroke={1.6} /></span>
                    <span>{label}</span>
                    {badge && <span className={`badge${isActive ? '' : ' mute'}`}>{badge}</span>}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ))}

      <div style={{ marginTop: 'auto', borderTop: '1px solid var(--hair)', paddingTop: 14 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{
            width: 32, height: 32,
            background: 'var(--paper-3)',
            border: '1px solid var(--rule)',
            color: 'var(--muted)',
            borderRadius: '0',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--mono)', fontSize: 9,
          }}>PR</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>Priya R.</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--mute)' }}>ID · 8842·G</div>
          </div>
        </div>
      </div>
    </div>
  );
}
