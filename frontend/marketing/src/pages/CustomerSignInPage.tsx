import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { CircleAlert, KeyRound, LoaderCircle, Mail } from 'lucide-react';
import { Icon } from '../components/Icon';
import { useCustomerAuth } from '../lib/customerAuthContext';

export function CustomerSignInPage() {
  const { customer, loading: checkingSession, error: sessionError, refresh, requestOtp, verifyOtp } = useCustomerAuth();
  const navigate = useNavigate();
  const returnTo = new URLSearchParams(useLocation().search).get('returnTo') === '/quote' ? '/quote' : '/portal';

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  if (customer) return <Navigate to={returnTo} replace />;
  if (checkingSession) return <section className="band" data-theme="night"><div className="wrap" role="status">Checking your session…</div></section>;
  if (sessionError) return <section className="band" data-theme="night"><div className="wrap"><p role="alert">{sessionError}</p><button className="btn btn-secondary" type="button" onClick={() => void refresh()}>Try again</button></div></section>;

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    setError(null);
    setLoading(true);
    const result = await requestOtp(email);
    setLoading(false);
    if (result.success) {
      setStep('otp');
      setInfo(`We've sent a 6-digit verification code to ${email}. Check your inbox!`);
    } else {
      setError(result.message ?? 'Failed to send code.');
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.trim().length < 6) {
      setError('Please enter the 6-digit code from your email.');
      return;
    }
    setError(null);
    setLoading(true);
    const result = await verifyOtp(email, code);
    setLoading(false);
    if (result.success) {
      navigate(returnTo, { replace: true });
    } else {
      setError(result.message ?? 'Invalid code.');
    }
  };

  return (
    <section className="band" data-theme="night" style={{ minHeight: '88vh', display: 'flex', alignItems: 'center', paddingTop: 'clamp(7rem,16vh,10rem)' }}>
      <div className="wrap" style={{ maxWidth: '32rem', width: '100%', margin: '0 auto' }}>
        <div style={{
          padding: '2.5rem 2rem',
          background: 'var(--bg-raised)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'inset 0 0 0 1px var(--line), var(--shadow-overlay)',
          color: 'var(--fg)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <p className="label eyebrow" style={{ justifyContent: 'center', marginBottom: '0.8rem' }}>Customer Portal</p>
            <h1 className="display" style={{ fontSize: '2.2rem', marginBottom: '0.6rem', color: 'var(--fg)' }}>
              Sign In<i className="dot" />
            </h1>
            <p className="body" style={{ margin: '0 auto', fontSize: '0.95rem' }}>
              {step === 'email' ? 'Enter your email to receive a secure one-time passcode.' : `Enter the 6-digit code sent to ${email}`}
            </p>
          </div>

          {error && (
            <div className="notice tone-negative" style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
              <Icon icon={CircleAlert} />
              <span>{error}</span>
            </div>
          )}

          {info && !error && (
            <div style={{
              marginBottom: '1.5rem',
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'color-mix(in srgb, var(--accent) 15%, transparent)',
              border: '1px solid var(--accent)',
              color: 'var(--fg)',
              fontSize: '0.9rem'
            }}>
              <span>{info}</span>
            </div>
          )}

          {step === 'email' ? (
            <form onSubmit={handleSendCode} noValidate>
              <div className="field" style={{ marginBottom: '1.6rem' }}>
                <label className="field-label" htmlFor="cust-email">Your Email Address</label>
                <div className="control control-lg">
                  <input
                    id="cust-email"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    style={{ color: 'var(--fg)' }}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg"
                style={{ width: '100%', justifyContent: 'center' }}
                disabled={loading}
              >
                {loading ? <Icon icon={LoaderCircle} className="spin" /> : <Icon icon={Mail} />}
                <span>Send Verification Code</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} noValidate>
              <div className="field" style={{ marginBottom: '1.6rem' }}>
                <label className="field-label" htmlFor="cust-otp">6-Digit Passcode</label>
                <div className="control control-lg">
                  <input
                    id="cust-otp"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="123456"
                    value={code}
                    onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                    autoComplete="one-time-code"
                    autoFocus
                    required
                    disabled={loading}
                    style={{
                      letterSpacing: '8px',
                      fontSize: '1.6rem',
                      textAlign: 'center',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 'bold',
                      color: 'var(--fg)'
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg"
                style={{ width: '100%', justifyContent: 'center', marginBottom: '1rem' }}
                disabled={loading}
              >
                {loading ? <Icon icon={LoaderCircle} className="spin" /> : <Icon icon={KeyRound} />}
                <span>Verify & Sign In</span>
              </button>

              <button
                type="button"
                className="btn btn-quiet btn-sm"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => { setStep('email'); setCode(''); setError(null); }}
                disabled={loading}
              >
                <span>Use a different email</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
