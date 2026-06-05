'use client';

import { useEffect, useState } from 'react';

export default function ViewToggle() {
  const [forced, setForced] = useState<'mobile' | 'desktop' | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('viewMode') as 'mobile' | 'desktop' | null;
    if (saved) {
      setForced(saved);
      applyViewMode(saved);
    }
  }, []);

  function applyViewMode(mode: 'mobile' | 'desktop' | null) {
    const html = document.documentElement;
    if (mode === 'desktop') {
      html.classList.add('force-desktop');
      html.classList.remove('force-mobile');
    } else if (mode === 'mobile') {
      html.classList.add('force-mobile');
      html.classList.remove('force-desktop');
    } else {
      html.classList.remove('force-desktop', 'force-mobile');
    }
  }

  function toggle() {
    const next = forced === 'desktop' ? null : 'desktop';
    setForced(next);
    applyViewMode(next);
    if (next) {
      localStorage.setItem('viewMode', next);
    } else {
      localStorage.removeItem('viewMode');
    }
  }

  return (
    <button
      onClick={toggle}
      title={forced === 'desktop' ? 'Switch to mobile view' : 'Switch to web view'}
      style={{
        position: 'fixed',
        bottom: 96,
        right: 16,
        zIndex: 9999,
        width: 36,
        height: 36,
        borderRadius: '50%',
        background: 'var(--ink)',
        color: 'var(--paper)',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        fontSize: 14,
      }}
      className="view-toggle-btn"
    >
      {forced === 'desktop' ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="2" width="14" height="20" rx="2" />
          <path d="M12 18h.01" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <path d="M8 21h8M12 17v4" />
        </svg>
      )}
    </button>
  );
}
