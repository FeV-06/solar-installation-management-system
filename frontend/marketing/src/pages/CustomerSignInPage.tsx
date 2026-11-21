import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CircleAlert, Eye, EyeOff, KeyRound, LoaderCircle, Lock, Mail, UserCheck } from 'lucide-react';
import { Icon } from '../components/Icon';
import { useCustomerAuth } from '../lib/customerAuth';

export function CustomerSignInPage() {
  const { customer, login, requestOtp, verifySignUpOtp, completeSignUp } = useCustomerAuth();
  const navigate = useNavigate();

  // Mode: 'signin' for existing users, 'signup' for new users
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  // Sign-in state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Sign-up multi-step state
  const [signupStep, setSignupStep] = useState<'email' | 'otp' | 'password'>('email');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupCode, setSignupCode] = useState('');
  const [signupTicket, setSignupTicket] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  if (customer) {
    navigate('/portal', { replace: true });
    return null;
  }

  // Handle returning user login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!loginPassword) {
      setError('Please enter your password.');
      return;
    }

    setError(null);
    setLoading(true);
    const result = await login(loginEmail, loginPassword);
    setLoading(false);

    if (result.success) {
      navigate('/portal');
    } else {
      setError(result.message ?? 'Invalid email or password.');
    }
  };

  // Sign-up: Step 1 Send OTP
  const handleSendSignupCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupEmail || !signupEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    setError(null);
    setLoading(true);
    const result = await requestOtp(signupEmail);
    setLoading(false);

    if (result.success) {
      setSignupStep('otp');
      setInfo(`We've sent a 6-digit verification code to ${signupEmail}. Check your inbox!`);
    } else {
      setError(result.message ?? 'Failed to send verification code.');
    }
  };

  // Sign-up: Step 2 Verify OTP
  const handleVerifySignupCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupCode || signupCode.trim().length < 6) {
      setError('Please enter the 6-digit code from your email.');
      return;
    }
    setError(null);
    setLoading(true);
    const result = await verifySignUpOtp(signupEmail, signupCode);
    setLoading(false);

    if (result.success && result.ticket) {
      setSignupTicket(result.ticket);
      setSignupStep('password');
      setInfo('Email verified! Now create a password for your account.');
    } else {
      setError(result.message ?? 'Invalid code or code expired.');
    }
  };

  // Sign-up: Step 3 Set Password & Finish
  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setError(null);
    setLoading(true);
    const result = await completeSignUp(signupEmail, signupTicket, newPassword, firstName, lastName);
    setLoading(false);

    if (result.success) {
      navigate('/portal');
    } else {
      setError(result.message ?? 'Failed to register account.');
    }
  };

  const switchMode = (newMode: 'signin' | 'signup') => {
    setMode(newMode);
    setError(null);
    setInfo(null);
    setSignupStep('email');
    setSignupCode('');
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
          {/* Header Switcher */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', marginBottom: '2rem' }}>
            <button
              type="button"
              onClick={() => switchMode('signin')}
              style={{
                flex: 1,
                padding: '0.8rem 0',
                background: 'transparent',
                border: 0,
                borderBottom: mode === 'signin' ? '2px solid var(--accent)' : '2px solid transparent',
                color: mode === 'signin' ? 'var(--fg)' : 'var(--muted)',
                fontWeight: 600,
                fontSize: '1rem',
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em'
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => switchMode('signup')}
              style={{
                flex: 1,
                padding: '0.8rem 0',
                background: 'transparent',
                border: 0,
                borderBottom: mode === 'signup' ? '2px solid var(--accent)' : '2px solid transparent',
                color: mode === 'signup' ? 'var(--fg)' : 'var(--muted)',
                fontWeight: 600,
                fontSize: '1rem',
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em'
              }}
            >
              New User (Sign Up)
            </button>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '1.8rem' }}>
            <h1 className="display" style={{ fontSize: '2rem', marginBottom: '0.4rem', color: 'var(--fg)' }}>
              {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
              <i className="dot" />
            </h1>
            <p className="body" style={{ margin: '0 auto', fontSize: '0.92rem' }}>
              {mode === 'signin'
                ? 'Sign in with your email and password.'
                : signupStep === 'email'
                  ? 'Verify your email with a one-time code to get started.'
                  : signupStep === 'otp'
                    ? `Enter the 6-digit code sent to ${signupEmail}`
                    : 'Set up your password to complete registration.'}
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

          {/* MODE 1: RETURNING USER (SIGN IN) */}
          {mode === 'signin' && (
            <form onSubmit={handleLoginSubmit} noValidate>
              <div className="field" style={{ marginBottom: '1.4rem' }}>
                <label className="field-label" htmlFor="login-email">Email Address</label>
                <div className="control control-lg">
                  <input
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    required
                    disabled={loading}
                    style={{ color: 'var(--fg)' }}
                  />
                </div>
              </div>

              <div className="field" style={{ marginBottom: '1.8rem' }}>
                <label className="field-label" htmlFor="login-password">Password</label>
                <div className="control control-lg">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    required
                    disabled={loading}
                    style={{ color: 'var(--fg)' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ background: 'transparent', border: 0, color: 'var(--muted)', cursor: 'pointer', padding: '4px' }}
                    aria-label="Toggle password visibility"
                  >
                    <Icon icon={showPassword ? EyeOff : Eye} />
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg"
                style={{ width: '100%', justifyContent: 'center', marginBottom: '1.2rem' }}
                disabled={loading}
              >
                {loading ? <Icon icon={LoaderCircle} className="spin" /> : <Icon icon={Lock} />}
                <span>Sign In</span>
              </button>

              <div style={{ textAlign: 'center' }}>
                <button
                  type="button"
                  className="btn btn-quiet btn-sm"
                  onClick={() => switchMode('signup')}
                >
                  <span>New user? Sign up with Email OTP</span>
                </button>
              </div>
            </form>
          )}

          {/* MODE 2: NEW USER SIGN UP (OTP + PASSWORD) */}
          {mode === 'signup' && (
            <>
              {signupStep === 'email' && (
                <form onSubmit={handleSendSignupCode} noValidate>
                  <div className="field" style={{ marginBottom: '1.6rem' }}>
                    <label className="field-label" htmlFor="signup-email">Your Email Address</label>
                    <div className="control control-lg">
                      <input
                        id="signup-email"
                        type="email"
                        placeholder="you@example.com"
                        autoComplete="email"
                        value={signupEmail}
                        onChange={e => setSignupEmail(e.target.value)}
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
              )}

              {signupStep === 'otp' && (
                <form onSubmit={handleVerifySignupCode} noValidate>
                  <div className="field" style={{ marginBottom: '1.6rem' }}>
                    <label className="field-label" htmlFor="signup-otp">6-Digit Passcode</label>
                    <div className="control control-lg">
                      <input
                        id="signup-otp"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        placeholder="123456"
                        value={signupCode}
                        onChange={e => setSignupCode(e.target.value.replace(/\D/g, ''))}
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
                    <span>Verify Code</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-quiet btn-sm"
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={() => { setSignupStep('email'); setSignupCode(''); setError(null); }}
                    disabled={loading}
                  >
                    <span>Use a different email</span>
                  </button>
                </form>
              )}

              {signupStep === 'password' && (
                <form onSubmit={handleCompleteRegistration} noValidate>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginBottom: '1.2rem' }}>
                    <div className="field">
                      <label className="field-label" htmlFor="reg-first-name">First Name</label>
                      <div className="control control-lg">
                        <input
                          id="reg-first-name"
                          type="text"
                          placeholder="Your name"
                          value={firstName}
                          onChange={e => setFirstName(e.target.value)}
                          disabled={loading}
                          style={{ color: 'var(--fg)' }}
                        />
                      </div>
                    </div>
                    <div className="field">
                      <label className="field-label" htmlFor="reg-last-name">Last Name</label>
                      <div className="control control-lg">
                        <input
                          id="reg-last-name"
                          type="text"
                          placeholder="Last name"
                          value={lastName}
                          onChange={e => setLastName(e.target.value)}
                          disabled={loading}
                          style={{ color: 'var(--fg)' }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="field" style={{ marginBottom: '1.2rem' }}>
                    <label className="field-label" htmlFor="new-password">Create Password</label>
                    <div className="control control-lg">
                      <input
                        id="new-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="At least 8 characters"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        required
                        disabled={loading}
                        style={{ color: 'var(--fg)' }}
                      />
                    </div>
                  </div>

                  <div className="field" style={{ marginBottom: '1.8rem' }}>
                    <label className="field-label" htmlFor="confirm-password">Confirm Password</label>
                    <div className="control control-lg">
                      <input
                        id="confirm-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Re-enter password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
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
                    {loading ? <Icon icon={LoaderCircle} className="spin" /> : <Icon icon={UserCheck} />}
                    <span>Complete Sign Up</span>
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
