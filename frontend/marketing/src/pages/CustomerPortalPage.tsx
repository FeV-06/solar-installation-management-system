import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, CircleAlert, Clock, Info, LoaderCircle } from 'lucide-react';
import { Icon } from '../components/Icon';
import { useCustomerAuth } from '../lib/customerAuth';

type QuoteSummary = {
  id: number;
  status: string;
  propertyAddress: string;
  propertyType: string;
  monthlyBillRange: string;
  createdAt: string;
  contactedAt?: string;
  closedAt?: string;
  notes?: string;
};

type InstallationSummary = {
  id: number;
  status: string;
  timeZone: string;
  createdAt: string;
};

type PortalData = {
  activeQuote?: QuoteSummary;
  quotes: QuoteSummary[];
  installations: InstallationSummary[];
};

const STAGES = [
  { key: 'quote', title: 'Quote Requested', desc: 'Property details received' },
  { key: 'review', title: 'Sales Consultation', desc: 'Contacted by solar specialist' },
  { key: 'survey', title: 'Site Survey & Design', desc: 'Engineering & custom CAD plan' },
  { key: 'install', title: 'Permits & Installation', desc: 'City approval and panel mount' },
  { key: 'active', title: 'Switch-On & Active', desc: 'Grid inspection and power generation' },
];

function getStageIndex(status?: string, hasInstallation?: boolean): number {
  if (hasInstallation) return 3;
  if (!status) return 0;
  if (status.toLowerCase() === 'new') return 0;
  if (status.toLowerCase() === 'contacted') return 1;
  if (status.toLowerCase() === 'converted') return 2;
  return 0;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';

export function CustomerPortalPage() {
  const { customer, loading: authLoading, logout } = useCustomerAuth();
  const navigate = useNavigate();

  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !customer) {
      navigate('/signin', { replace: true });
    }
  }, [authLoading, customer, navigate]);

  useEffect(() => {
    if (!customer) return;
    const fetchPortal = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/customer-portal`, {
          headers: { Accept: 'application/json' },
        });
        if (res.ok) {
          const body = await res.json();
          setData(body);
        } else {
          setError('Could not load your portal data.');
        }
      } catch {
        setError('Network error loading portal.');
      } finally {
        setLoading(false);
      }
    };
    fetchPortal();
  }, [customer]);

  if (authLoading || (!customer && loading)) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon icon={LoaderCircle} className="spin" />
      </div>
    );
  }

  const activeQuote = data?.activeQuote ?? data?.quotes?.[0];
  const currentStageIndex = getStageIndex(activeQuote?.status, (data?.installations?.length ?? 0) > 0);

  return (
    <div className="band" data-theme="night" style={{ padding: 'clamp(7rem,16vh,9rem) 0 6rem', minHeight: '88vh' }}>
      <div className="wrap" style={{ maxWidth: '72rem', margin: '0 auto' }}>
        {/* Welcome bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1.25rem' }}>
          <div>
            <p className="label eyebrow" style={{ marginBottom: '0.6rem' }}>Customer Workspace</p>
            <h1 className="display" style={{ fontSize: '2.5rem', margin: 0, color: 'var(--fg)' }}>
              Welcome, {customer?.firstName || customer?.email}<i className="dot" />
            </h1>
            <p className="body" style={{ marginTop: '0.4rem' }}>
              Track your solar installation steps, engineering design, and electricity system status.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
            <button type="button" className="btn btn-quiet btn-sm" onClick={() => logout()}>
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="notice tone-negative" style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            <Icon icon={CircleAlert} />
            <span>{error}</span>
          </div>
        )}

        {/* Progress Tracker Card */}
        <div style={{
          padding: '2rem',
          background: 'var(--bg-raised)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'inset 0 0 0 1px var(--line), var(--shadow-overlay)',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h2 className="display" style={{ fontSize: '1.35rem', margin: 0, color: 'var(--fg)' }}>Project Progress</h2>
            {activeQuote && (
              <span className="label" style={{ color: 'var(--accent)' }}>
                Quote #{activeQuote.id} &bull; {activeQuote.status}
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(11rem, 1fr))', gap: '1rem', marginTop: '1rem' }}>
            {STAGES.map((s, idx) => {
              const isPast = idx < currentStageIndex;
              const isCurrent = idx === currentStageIndex;
              return (
                <div
                  key={s.key}
                  style={{
                    padding: '1.25rem',
                    borderRadius: 'var(--radius-md)',
                    border: isCurrent ? '2px solid var(--accent)' : '1px solid var(--line)',
                    background: isCurrent ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'var(--bg)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    {isPast ? (
                      <CheckCircle2 size={16} color="var(--positive, #5fd39a)" />
                    ) : isCurrent ? (
                      <Icon icon={Clock} color="var(--accent)" />
                    ) : (
                      <div style={{ width: 14, height: 14, borderRadius: '50%', border: '1px solid var(--faint)' }} />
                    )}
                    <span className="label" style={{ fontSize: '0.65rem', color: isCurrent ? 'var(--accent)' : 'var(--faint)' }}>
                      Step 0{idx + 1}
                    </span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.25rem', color: 'var(--fg)' }}>{s.title}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--muted)', lineHeight: '1.3' }}>{s.desc}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Grid of details: Quote & Property */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(20rem, 1fr))', gap: '1.5rem' }}>
          {/* Active / Recent Quote Card */}
          <div style={{
            padding: '1.75rem',
            background: 'var(--bg-raised)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'inset 0 0 0 1px var(--line)'
          }}>
            <h3 className="display" style={{ fontSize: '1.15rem', margin: '0 0 1.25rem', color: 'var(--fg)' }}>Property & Quote Details</h3>
            {activeQuote ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <div className="label" style={{ color: 'var(--faint)', marginBottom: '0.25rem' }}>Address</div>
                  <div style={{ fontWeight: 600, color: 'var(--fg)' }}>{activeQuote.propertyAddress}</div>
                </div>
                <div>
                  <div className="label" style={{ color: 'var(--faint)', marginBottom: '0.25rem' }}>Property Type</div>
                  <div style={{ color: 'var(--fg)' }}>{activeQuote.propertyType}</div>
                </div>
                <div>
                  <div className="label" style={{ color: 'var(--faint)', marginBottom: '0.25rem' }}>Estimated Monthly Electric Bill</div>
                  <div style={{ color: 'var(--fg)' }}>{activeQuote.monthlyBillRange}</div>
                </div>
                <div>
                  <div className="label" style={{ color: 'var(--faint)', marginBottom: '0.25rem' }}>Submission Date</div>
                  <div style={{ color: 'var(--fg)' }}>{new Date(activeQuote.createdAt).toLocaleDateString()}</div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                <p className="body" style={{ marginBottom: '1.25rem' }}>No active quote found for your account.</p>
                <Link to="/quote" className="btn btn-primary btn-sm">Get a quote now</Link>
              </div>
            )}
          </div>

          {/* Solar System & Hardware Overview */}
          <div style={{
            padding: '1.75rem',
            background: 'var(--bg-raised)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'inset 0 0 0 1px var(--line)'
          }}>
            <h3 className="display" style={{ fontSize: '1.15rem', margin: '0 0 1.25rem', color: 'var(--fg)' }}>System & Energy Information</h3>
            {data?.installations && data.installations.length > 0 ? (
              <div>
                {data.installations.map(inst => (
                  <div key={inst.id} style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--line)' }}>
                    <div style={{ fontWeight: 600, color: 'var(--fg)' }}>Installation #{inst.id}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Status: {inst.status}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Timezone: {inst.timeZone}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '0.75rem 0' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <Icon icon={Info} style={{ marginTop: '0.2rem', color: 'var(--accent)' }} />
                  <p className="body" style={{ fontSize: '0.875rem', lineHeight: '1.45', margin: 0 }}>
                    Your system hardware, panel layouts, and daily energy generation dashboards will appear here as soon as our survey team completes your site design.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* All quotes history table */}
        {data?.quotes && data.quotes.length > 1 && (
          <div style={{
            marginTop: '2rem',
            padding: '1.75rem',
            background: 'var(--bg-raised)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'inset 0 0 0 1px var(--line)'
          }}>
            <h3 className="display" style={{ fontSize: '1.15rem', margin: '0 0 1.25rem', color: 'var(--fg)' }}>All Your Quotes</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--line-strong)' }}>
                    <th style={{ padding: '0.6rem 0.8rem', color: 'var(--faint)' }}>ID</th>
                    <th style={{ padding: '0.6rem 0.8rem', color: 'var(--faint)' }}>Status</th>
                    <th style={{ padding: '0.6rem 0.8rem', color: 'var(--faint)' }}>Property</th>
                    <th style={{ padding: '0.6rem 0.8rem', color: 'var(--faint)' }}>Monthly Bill</th>
                    <th style={{ padding: '0.6rem 0.8rem', color: 'var(--faint)' }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.quotes.map(q => (
                    <tr key={q.id} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td style={{ padding: '0.75rem 0.8rem', fontWeight: 600, color: 'var(--fg)' }}>#{q.id}</td>
                      <td style={{ padding: '0.75rem 0.8rem', color: 'var(--fg)' }}>{q.status}</td>
                      <td style={{ padding: '0.75rem 0.8rem', color: 'var(--fg)' }}>{q.propertyAddress}</td>
                      <td style={{ padding: '0.75rem 0.8rem', color: 'var(--fg)' }}>{q.monthlyBillRange}</td>
                      <td style={{ padding: '0.75rem 0.8rem', color: 'var(--muted)' }}>{new Date(q.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
