import { createContext, useContext } from 'react';

export type CustomerUser = { id: number; email: string; firstName: string; lastName: string; fullName: string };
export type AuthResult = { success: boolean; message?: string };
export type CustomerAuthContextType = {
  customer: CustomerUser | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  requestOtp: (email: string) => Promise<AuthResult>;
  verifyOtp: (email: string, code: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
};

export const CustomerAuthContext = createContext<CustomerAuthContextType | null>(null);
export function useCustomerAuth() {
  const context = useContext(CustomerAuthContext);
  if (!context) throw new Error('useCustomerAuth must be used within CustomerAuthProvider');
  return context;
}
