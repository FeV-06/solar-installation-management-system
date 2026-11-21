import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, HardHat, SolarPanel } from 'lucide-react';
import { fetchInstallation, installationKey } from '../api/surveys';
import { Icon } from '../components/Icon';
import { idFrom } from '../lib/ids';
import { cityLine } from '../leads/view';
import { useCurrentUser } from '../session/session';
import { NotFound } from '../states/States';
import { QueryView } from '../states/QueryView';
import { StageChip } from '../customers/Chips';
import { RooftopFieldProofSection } from './RooftopFieldProofSection';

export function CommissioningPage() {
  const user = useCurrentUser();
  const id = idFrom(useParams().id);
  const isTechnician = user.role === 'Technician';
  const back = {
    to: isTechnician ? '/my-work' : `/installations/${id ?? ''}`,
    label: isTechnician ? 'Back to my work' : 'Back to installation',
  };

  const query = useQuery({
    queryKey: installationKey(id ?? 0),
    queryFn: ({ signal }) => fetchInstallation(id!, signal),
    enabled: id !== null,
  });

  if (id === null || user.role === 'Admin') return <NotFound noun="installation" back={back} />;

  return (
    <QueryView query={query} what="this installation" notFound={<NotFound noun="installation" back={back} />}>
      {installation => (
        <>
          <div className="page-head">
            <Link className="btn btn-quiet btn-sm back" to={back.to}>
              <Icon icon={ArrowLeft} />
              <span>{back.label}</span>
            </Link>
            <div className="row">
              <h1 className="a-title" id="page-title" tabIndex={-1}>
                Field commissioning and handover
              </h1>
              <StageChip status={installation.status} />
            </div>
          </div>

          <p className="page-intro">
            Installation #{installation.id}, {installation.customerName}, {installation.address.street}, {cityLine(installation.address)}
          </p>

          <div className="rec-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="rec-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Icon icon={HardHat} color="var(--accent)" />
                <h2 className="a-heading" style={{ margin: 0 }}>On-site technician crew</h2>
              </div>
              <dl className="kv">
                <dt>Assigned tech</dt>
                <dd><b>{user.name}</b> ({user.email})</dd>
                <dt>Role access</dt>
                <dd>{user.role}, field verification authorized</dd>
                <dt>Timezone</dt>
                <dd>{installation.timeZone}</dd>
              </dl>
            </div>

            <div className="rec-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Icon icon={SolarPanel} color="var(--positive)" />
                <h2 className="a-heading" style={{ margin: 0 }}>Site and property details</h2>
              </div>
              <dl className="kv">
                <dt>Customer</dt>
                <dd>{installation.customerName}</dd>
                <dt>Phone</dt>
                <dd>
                  <a href={`tel:${installation.customerPhone.replace(/[^\d+]/g, '')}`}>
                    {installation.customerPhone}
                  </a>
                </dd>
                <dt>Address</dt>
                <dd>{installation.address.street}, {cityLine(installation.address)}</dd>
              </dl>
            </div>
          </div>

          <RooftopFieldProofSection
            installationId={installation.id}
            customerName={installation.customerName}
            isTechnician={isTechnician}
          />
        </>
      )}
    </QueryView>
  );
}
