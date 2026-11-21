import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { CustomerAuthContext, type CustomerUser } from './customerAuthContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';

/** Customer auth lives in a separate HttpOnly cookie; never persist an OTP or session in browser storage. */
export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<CustomerUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/customer-auth/me`, { headers: { Accept: 'application/json' } });
      if (response.ok) { setCustomer(await response.json()); setError(null); }
      else if (response.status === 401 || response.status === 403) { setCustomer(null); setError(null); }
      else setError("We couldn't check your session. Try again.");
    } catch { setError("The server didn't answer. Check your connection and try again."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void Promise.resolve().then(refresh); }, [refresh]);

  const send = async (path: string, body: object) => {
    try {
      const response = await fetch(`${API_BASE}/customer-auth/${path}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const fields = data.errors ? Object.values(data.errors).flat().join(' ') : '';
        return { success: false as const, message: fields || data.detail || data.title || 'Please try again.' };
      }
      return { success: true as const, data };
    } catch { return { success: false as const, message: "The server didn't answer. Check your connection and try again." }; }
  };
  const requestOtp = async (email: string) => {
    const result = await send('request-otp', { email });
    return result.success ? { success: true, message: result.data.message as string | undefined } : result;
  };
  const verifyOtp = async (email: string, code: string) => {
    const result = await send('verify-otp', { email, code });
    if (!result.success) return result;
    setCustomer(result.data as CustomerUser); setError(null);
    return { success: true };
  };
  const logout = async () => {
    const response = await fetch(`${API_BASE}/customer-auth/logout`, { method: 'POST' });
    if (!response.ok) throw new Error('Could not sign out. Try again.');
    setCustomer(null);
  };
  return <CustomerAuthContext.Provider value={{ customer, loading, error, refresh, requestOtp, verifyOtp, logout }}>{children}</CustomerAuthContext.Provider>;
}
