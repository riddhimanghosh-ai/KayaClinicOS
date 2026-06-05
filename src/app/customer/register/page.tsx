'use client';

import React, { useState } from 'react';
import Link from 'next/link';

const BrandLockup = ({ size = 26, sub = false }: { size?: number; sub?: boolean }) => (
  <div>
    <div style={{ fontFamily: 'var(--serif)', fontSize: size, lineHeight: 0.9, letterSpacing: '-0.02em', fontWeight: 500 }}>
      kaya<span style={{ color: 'var(--brand)' }}>.</span>
    </div>
    {sub && <div className="brand-mark" style={{ marginTop: 4 }}>Skin · Hair · Body</div>}
  </div>
);

const IconCheck = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12 L9.5 17.5 L20 7" />
  </svg>
);

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [touched, setTouched] = useState({ name: false, email: false, pw: false });
  const [success, setSuccess] = useState(false);

  const nameValid = name.trim().length > 0;
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const pwValid = pw.length >= 8;
  const showNameErr = touched.name && !nameValid;
  const showEmailErr = touched.email && !emailValid;
  const showPwErr = touched.pw && !pwValid;

  const submit = () => {
    setTouched({ name: true, email: true, pw: true });
    if (nameValid && emailValid && pwValid) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2200);
    }
  };

  return (
    <div className="frame row" style={{ height: '100vh' }}>
      {/* Left — editorial visual */}
      <div style={{
        flex: 1.1,
        padding: '48px 56px',
        background: `
          radial-gradient(800px 600px at 80% 20%, var(--brand-tint-2) 0%, transparent 50%),
          radial-gradient(700px 500px at 10% 90%, var(--lavender-tint) 0%, transparent 60%),
          var(--paper-grad)
        `,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <BrandLockup size={32} sub />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', marginTop: -40 }}>
          <div className="eyebrow brand">· Join Kaya</div>
          <div className="display" style={{ fontSize: 56, marginTop: 16 }}>
            Start your <span style={{ color: 'var(--brand)' }}>skin journey</span> today.
          </div>
          <div className="muted" style={{ fontSize: 15, marginTop: 22, maxWidth: 380 }}>
            Connect with expert dermatologists and get personalized treatments designed for your skin.
          </div>

          <div className="row" style={{ marginTop: 36, gap: 16 }}>
            <div className="panel" style={{ padding: 16, flex: 1 }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>22+</div>
              <div className="h4" style={{ fontSize: 16 }}>Years expertise</div>
              <div className="muted" style={{ fontSize: 11 }}>Proven results</div>
            </div>
            <div className="panel" style={{ padding: 16, flex: 1 }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>450k+</div>
              <div className="h4" style={{ fontSize: 16 }}>Happy patients</div>
              <div className="muted" style={{ fontSize: 11 }}>Trusted care</div>
            </div>
            <div className="panel" style={{ padding: 16, flex: 1 }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>14</div>
              <div className="h4" style={{ fontSize: 16 }}>Clinic network</div>
              <div className="muted" style={{ fontSize: 11 }}>Across India</div>
            </div>
          </div>
        </div>

        <div className="row between" style={{ alignItems: 'center' }}>
          <div className="eyebrow muted">· Est 2003 · Board-certified dermatologists</div>
          <div className="row" style={{ gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--brand)' }} />
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--brand-tint)' }} />
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--brand-tint)' }} />
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div style={{
        flex: 1,
        padding: '64px 80px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        background: 'var(--paper-2)',
      }}>
        <div className="eyebrow">Create account</div>
        <div className="display" style={{ fontSize: 40, marginTop: 12 }}>
          Get started with <span style={{ color: 'var(--brand)' }}>Kaya</span>.
        </div>

        <div className="col" style={{ marginTop: 32, gap: 20 }}>
          <div className={`field ${showNameErr ? 'error' : ''}`}>
            <label>Full name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, name: true }))}
              placeholder="Your full name"
            />
            {showNameErr && <div className="hint err">· Please enter your name</div>}
          </div>
          <div className={`field ${showEmailErr ? 'error' : ''}`}>
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              placeholder="your@email.com"
            />
            {showEmailErr
              ? <div className="hint err">· Enter a valid email address</div>
              : (emailValid && <div className="hint" style={{ color: 'var(--mint)' }}>✓ Email looks good</div>)
            }
          </div>
          <div className={`field ${showPwErr ? 'error' : ''}`}>
            <label>Password</label>
            <input
              type="password"
              value={pw}
              placeholder="••••••••"
              onChange={(e) => setPw(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, pw: true }))}
            />
            <div className={`hint ${showPwErr ? 'err' : ''}`}>· {showPwErr ? 'Must be at least 8 characters' : 'At least 8 characters'}</div>
          </div>

          <label className="row center" style={{ gap: 8, fontSize: 12 }}>
            <input type="checkbox" style={{ width: 14, height: 14, accentColor: 'var(--brand)' }} />
            <span className="muted">I agree to Terms &amp; Conditions</span>
          </label>

          <button className="btn lg block" style={{ marginTop: 8 }} onClick={submit}>
            {success ? <><IconCheck size={14} /> Account created</> : <>Create account <span className="arrow" /></>}
          </button>

          <div className="row center" style={{ gap: 16, marginTop: 8 }}>
            <div className="hr" style={{ flex: 1 }} />
            <div className="eyebrow">or</div>
            <div className="hr" style={{ flex: 1 }} />
          </div>

          <button className="btn ghost block">
            Continue with phone
          </button>
        </div>

        <div className="muted" style={{ fontSize: 12, marginTop: 32, textAlign: 'center' }}>
          Already have an account? <Link href="/customer/login" style={{ color: 'var(--brand)', fontWeight: 500, borderBottom: '1px solid var(--brand-rule)', textDecoration: 'none' }}>Sign in →</Link>
        </div>
      </div>
    </div>
  );
}
