'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [phase, setPhase] = useState<'phone' | 'otp' | 'done'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const phoneDigits = phone.replace(/\D/g, '');
  const phoneValid = phoneDigits.length === 10;

  const sendOtp = () => {
    if (!phoneValid) { setError('Enter a valid 10-digit mobile number'); return; }
    setError('');
    setLoading(true);
    // Simulate OTP send (any phone works in demo)
    setTimeout(() => { setLoading(false); setPhase('otp'); }, 900);
  };

  const verifyOtp = () => {
    if (otp.length < 4) { setError('Enter the OTP sent to your phone'); return; }
    setError('');
    setLoading(true);
    // Simulate OTP verify (any 4–6 digit code accepted in demo)
    setTimeout(() => {
      localStorage.setItem('user', JSON.stringify({ phone: phoneDigits, name: 'Guest' }));
      setPhase('done');
      setTimeout(() => router.push('/customer/dashboard'), 600);
    }, 900);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper-grad)', display: 'flex', flexDirection: 'column' }}>
      {/* Brand header */}
      <div style={{
        padding: 'clamp(32px,5vw,48px) clamp(24px,5vw,48px) clamp(20px,3vw,28px)',
        background: 'var(--paper-2)',
        borderBottom: '1px solid var(--rule)',
      }}>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(26px,4vw,32px)', fontWeight: 500, lineHeight: 1, letterSpacing: '-0.02em' }}>
          kaya<span style={{ color: 'var(--brand)' }}>.</span>
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.2em', color: 'var(--mute)', marginTop: 6, textTransform: 'uppercase' }}>
          Skin · Hair · Body
        </div>
      </div>

      {/* Form */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: 'clamp(32px,5vw,56px) clamp(24px,5vw,48px)' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>

          <div style={{ fontSize: 11, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--mono)' }}>
            Sign in
          </div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 36, marginTop: 10, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
            Continue your <span style={{ color: 'var(--brand)' }}>care</span>.
          </div>

          {/* Demo hint */}
          <div style={{
            marginTop: 20,
            padding: '8px 12px',
            background: 'var(--paper-2)',
            border: '1px dashed var(--rule)',
            borderRadius: 8,
            fontFamily: 'var(--mono)',
            fontSize: 11,
            color: 'var(--mute)',
            lineHeight: 1.5,
          }}>
            <span style={{ color: 'var(--brand)', fontWeight: 600 }}>Demo:</span> enter any 10-digit mobile number and any OTP code to sign in.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 16 }}>

            {/* Phone field — always shown */}
            <div className={`field ${error && phase === 'phone' ? 'error' : ''}`}>
              <label>Mobile number</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1px solid var(--rule)', borderRadius: 8,
                  padding: '0 12px', background: 'var(--paper-2)',
                  fontSize: 13, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap',
                }}>
                  +91
                </div>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="98765 43210"
                  value={phone}
                  onChange={e => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setError(''); }}
                  onKeyDown={e => { if (e.key === 'Enter') sendOtp(); }}
                  disabled={phase !== 'phone'}
                  style={{ flex: 1, opacity: phase !== 'phone' ? 0.6 : 1 }}
                />
              </div>
              {error && phase === 'phone' && <div className="hint err">· {error}</div>}
            </div>

            {/* OTP field — shown after send */}
            {phase !== 'phone' && (
              <div className={`field ${error && phase === 'otp' ? 'error' : ''}`}>
                <label>OTP</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Enter OTP"
                  value={otp}
                  onChange={e => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                  onKeyDown={e => { if (e.key === 'Enter') verifyOtp(); }}
                  autoFocus
                />
                {phase === 'otp' && (
                  <div className="hint" style={{ color: 'var(--mute)' }}>
                    · OTP sent to +91 {phoneDigits.slice(0, 5)}XXXXX
                    {' · '}
                    <button
                      onClick={() => { setPhase('phone'); setOtp(''); setError(''); }}
                      style={{ color: 'var(--brand)', fontWeight: 500, textDecoration: 'underline', cursor: 'pointer', border: 'none', background: 'none', padding: 0, fontSize: 'inherit' }}
                    >
                      Change number
                    </button>
                  </div>
                )}
                {error && phase === 'otp' && <div className="hint err">· {error}</div>}
              </div>
            )}

            {/* CTA */}
            {phase === 'phone' && (
              <button className="btn lg block" onClick={sendOtp} disabled={loading}>
                {loading ? 'Sending OTP…' : <>Send OTP <span className="arrow" /></>}
              </button>
            )}

            {phase === 'otp' && (
              <button className="btn lg block" onClick={verifyOtp} disabled={loading}>
                {loading ? 'Verifying…' : <>Verify &amp; Sign in <span className="arrow" /></>}
              </button>
            )}

            {phase === 'done' && (
              <button className="btn lg block" disabled style={{ opacity: 0.7 }}>
                ✓ Signed in — redirecting…
              </button>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
