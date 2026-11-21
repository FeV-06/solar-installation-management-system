import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, SolarPanel } from 'lucide-react';
import { fetchInstallations, INSTALLATIONS_KEY } from '../api/surveys';
import { Icon } from '../components/Icon';
import { PageHead } from '../components/PageHead';
import { StageChip } from '../customers/Chips';
import { formatMoment } from '../lib/dates';
import { QueryView } from '../states/QueryView';

const FILTERS = ['All', 'Survey', 'Design', 'Installation', 'Active'] as const;
type Filter = (typeof FILTERS)[number];

export function InstallationsPage() {
  const [filter, setFilter] = useState<Filter>('All');
  const query = useQuery({
    queryKey: INSTALLATIONS_KEY,
    queryFn: ({ signal }) => fetchInstallations(signal),
  });

  return (
    <>
      <PageHead title="Installations" />
      <p className="page-intro">
        Every rooftop solar project, from site survey and design to warehouse dispatch and installation.
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <button
            key={f}
            type="button"
            className={filter === f ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      <QueryView
        query={query}
        what="installations"
        isEmpty={data => data.length === 0}
        empty={
          <div className="state-box">
            <div className="state">
              <span className="ring"><Icon icon={SolarPanel} /></span>
              <p className="a-heading">No installations found</p>
              <p>There are no solar installation projects yet.</p>
            </div>
          </div>
        }
      >
        {installations => {
          const filtered = filter === 'All'
            ? installations
            : installations.filter(i => i.status === filter);

          if (filtered.length === 0) {
            return (
              <div className="state-box">
                <div className="state">
                  <span className="ring"><Icon icon={SolarPanel} /></span>
                  <p className="a-heading">No installations found</p>
                  <p>There are no solar installation projects matching stage "{filter}".</p>
                </div>
              </div>
            );
          }

          return (
            <div className="rec-card" style={{ padding: '1.25rem' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--line)', color: 'var(--faint)' }}>
                      <th style={{ padding: '0.6rem 0.75rem' }}>Project ID</th>
                      <th style={{ padding: '0.6rem 0.75rem' }}>Customer</th>
                      <th style={{ padding: '0.6rem 0.75rem' }}>Property Address</th>
                      <th style={{ padding: '0.6rem 0.75rem' }}>Stage</th>
                      <th style={{ padding: '0.6rem 0.75rem' }}>Created</th>
                      <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(inst => (
                      <tr key={inst.id} style={{ borderBottom: '1px solid var(--line-subtle, rgba(0,0,0,0.05))' }}>
                        <td style={{ padding: '0.75rem 0.75rem', fontWeight: 600 }}>#{inst.id}</td>
                        <td style={{ padding: '0.75rem 0.75rem' }}>
                          <Link to={`/customers/${inst.customerId}`} style={{ fontWeight: 600, color: 'var(--fg)', textDecoration: 'none' }}>
                            {inst.customerName}
                          </Link>
                          <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{inst.customerPhone}</div>
                        </td>
                        <td style={{ padding: '0.75rem 0.75rem' }}>
                          {inst.address.street}, {inst.address.city}, {inst.address.state} {inst.address.zipCode}
                        </td>
                        <td style={{ padding: '0.75rem 0.75rem' }}>
                          <StageChip status={inst.status} />
                        </td>
                        <td style={{ padding: '0.75rem 0.75rem', color: 'var(--muted)' }}>
                          {formatMoment(inst.createdAt)}
                        </td>
                        <td style={{ padding: '0.75rem 0.75rem', textAlign: 'right' }}>
                          <Link to={`/installations/${inst.id}`} className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span>Open</span>
                            <Icon icon={ArrowRight} size={14} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        }}
      </QueryView>
    </>
  );
}
