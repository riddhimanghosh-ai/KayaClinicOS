'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const IconCheck = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12 L9.5 17.5 L20 7" />
  </svg>
);

/* Defined OUTSIDE LoginPage so it never remounts on keystroke */
const LoginForm = ({
  email, pw, touched, success, showEmailErr, showPwErr, emailValid, pwValid,
  setEmail, setPw, setTouched, submit,
}: {
  email: string; pw: string; touched: { email: boolean; pw: boolean };
  success: boolean; showEmailErr: boolean; showPwErr: boolean;
  emailValid: boolean; pwValid: boolean;
  setEmail: (v: string) => void; setPw: (v: string) => void;
  setTouched: (fn: (t: any) => any) => void; submit: () => void;
}) => (
  <div style={{ width: '100%', maxWidth: 400 }}>
    <div style={{ fontSize: 11, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--mono)' }}>Sign in</div>
    <div style={{ fontFamily: 'var(--serif)', fontSize: 36, marginTop: 10, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
      Continue your <span style={{ color: 'var(--brand)' }}>care</span>.
    </div>

    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 28 }}>
      <div className={`field ${showEmailErr ? 'error' : ''}`}>
        <label>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, email: true }))}
        />
        {showEmailErr
          ? <div className="hint err">· Enter a valid email address</div>
          : (emailValid && <div className="hint" style={{ color: 'var(--ok)' }}>Registered account found</div>)
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
        <div className={`hint ${showPwErr ? 'err' : ''}`}>
          · {showPwErr ? 'Must be at least 8 characters' : 'At least 8 characters'}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer' }}>
          <input type="checkbox" defaultChecked style={{ width: 14, height: 14, accentColor: 'var(--brand)' }} />
          Stay signed in
        </label>
        <a style={{ fontSize: 12, color: 'var(--brand)', fontWeight: 500, cursor: 'pointer' }}>Forgot password →</a>
      </div>

      <button className="btn lg block" style={{ marginTop: 4 }} onClick={submit}>
        {success ? <><IconCheck size={14} /> Signed in</> : <>Sign in <span className="arrow" /></>}
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
        <div style={{ flex: 1, height: 1, background: 'var(--hair)' }} />
        <span style={{ fontSize: 11, color: 'var(--mute)', fontFamily: 'var(--mono)', letterSpacing: '0.08em' }}>OR</span>
        <div style={{ flex: 1, height: 1, background: 'var(--hair)' }} />
      </div>

      <button className="btn ghost block">Continue with OTP · +91 9X XXXX 4421</button>
    </div>

    <div style={{ fontSize: 12, color: 'var(--mute)', marginTop: 28, textAlign: 'center' }}>
      New here?{' '}
      <Link href="/customer/register" style={{ color: 'var(--brand)', fontWeight: 500, borderBottom: '1px solid var(--brand-rule)', textDecoration: 'none' }}>
        Create an account →
      </Link>
    </div>
  </div>
);

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('priya.r@gmail.com');
  const [pw, setPw] = useState('');
  const [touched, setTouched] = useState({ email: false, pw: false });
  const [success, setSuccess] = useState(false);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const pwValid = pw.length >= 8;
  const showEmailErr = touched.email && !emailValid;
  const showPwErr = touched.pw && !pwValid;

  const submit = () => {
    setTouched({ email: true, pw: true });
    if (emailValid && pwValid) {
      setSuccess(true);
      localStorage.setItem('user', JSON.stringify({ email, name: 'Priya R.' }));
      setTimeout(() => router.push('/customer/dashboard'), 800);
    }
  };

  const formProps = { email, pw, touched, success, showEmailErr, showPwErr, emailValid, pwValid, setEmail, setPw, setTouched, submit };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper-grad)', display: 'flex', flexDirection: 'column' }}>
      {/* Brand header */}
      <div style={{
        padding: 'clamp(32px, 5vw, 48px) clamp(24px, 5vw, 48px) clamp(20px, 3vw, 28px)',
        background: 'var(--paper-2)',
        borderBottom: '1px solid var(--rule)',
      }}>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(26px, 4vw, 32px)', fontWeight: 500, lineHeight: 1, letterSpacing: '-0.02em' }}>
          kaya<span style={{ color: 'var(--brand)' }}>.</span>
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.2em', color: 'var(--mute)', marginTop: 6, textTransform: 'uppercase' }}>
          Skin · Hair · Body
        </div>
      </div>
      {/* Form */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: 'clamp(32px, 5vw, 56px) clamp(24px, 5vw, 48px) clamp(40px, 6vw, 64px)' }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <LoginForm {...formProps} />
        </div>
      </div>
    </div>
  );
}
