import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type CustomerUser = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
};

type CustomerAuthContextType = {
  customer: CustomerUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  requestOtp: (email: string) => Promise<{ success: boolean; message?: string }>;
  verifyOtp: (email: string, code: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
};

const CustomerAuthContext = createContext<CustomerAuthContextType | null>(null);

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';

export function CustomerAuthProvider({ children }: { children: React.ReactNode }) {
  const [customer, setCustomer] = useState<CustomerUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/customer-auth/me`, {
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        setCustomer(data);
      } else {
        setCustomer(null);
      }
    } catch {
      setCustomer(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const requestOtp = async (email: string) => {
    try {
      const res = await fetch(`${API_BASE}/customer-auth/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { success: false, message: data.detail ?? data.title ?? 'Failed to send verification code.' };
      }
      return { success: true, message: data.message ?? 'Verification code sent.' };
    } catch {
      return { success: false, message: 'Server unreachable. Please check your connection.' };
    }
  };

  const verifyOtp = async (email: string, code: string) => {
    try {
      const res = await fetch(`${API_BASE}/customer-auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { success: false, message: data.detail ?? data.title ?? 'Invalid code or code expired.' };
      }
      setCustomer(data);
      return { success: true };
    } catch {
      return { success: false, message: 'Server unreachable. Please try again.' };
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE}/customer-auth/logout`, { method: 'POST' });
    } finally {
      setCustomer(null);
    }
  };

  return (
    <CustomerAuthContext.Provider value={{ customer, loading, refresh, requestOtp, verifyOtp, logout }}>
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth() {
  const context = useContext(CustomerAuthContext);
  if (!context) throw new Error('useCustomerAuth must be used within CustomerAuthProvider');
  return context;
}
