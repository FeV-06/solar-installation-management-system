import { Navigate, useLocation } from 'react-router-dom';
import { useCustomerAuth } from '../lib/customerAuthContext';
import { QuotePage } from './QuotePage';

/** Keep quote requests attached to the verified customer session. */
export function CustomerQuotePage() {
  const { customer, loading, error, refresh } = useCustomerAuth();
  const { pathname, search } = useLocation();
  if (loading) return <section className="band" data-theme="night"><div className="wrap" role="status">Checking your session…</div></section>;
  if (error) return <section className="band" data-theme="night"><div className="wrap"><p role="alert">{error}</p><button className="btn btn-secondary" onClick={() => void refresh()}>Try again</button></div></section>;
  if (!customer) return <Navigate to={`/signin?returnTo=${encodeURIComponent(pathname + search)}`} replace />;
  return <QuotePage key={customer.id} customer={customer} />;
}
