import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { fetchInstallation, fetchSurveys, installationKey, SURVEYS_KEY, type Installation, type SurveyPage } from '../api/surveys';
import { Icon } from '../components/Icon';

import { StageChip } from '../customers/Chips';
import { formatMoment } from '../lib/dates';
import { idFrom } from '../lib/ids';
import { cityLine } from '../leads/view';
import { useCurrentUser } from '../session/session';
import { NotAllowed, NotFound } from '../states/States';
import { QueryView } from '../states/QueryView';
import { ScheduleForm } from './ScheduleForm';
import { SurveyChip } from './SurveyChip';
import { InstallationQuote } from './InstallationQuote';
import { WarehousePackingSection } from './WarehousePackingSection';
import { RooftopFieldProofSection } from './RooftopFieldProofSection';

export function InstallationPage() {
  const { role } = useCurrentUser();
  const id = idFrom(useParams().id);
  const query = useQuery({ queryKey: installationKey(id ?? 0), queryFn: ({ signal }) => fetchInstallation(id!, signal), enabled: role === 'Admin' && id !== null });
  if (role !== 'Admin') return <NotAllowed />;
  if (id === null) return <NotFound noun="installation" back={{ to: '/customers', label: 'Back to customers' }} />;
  return <QueryView query={query} what="this installation" notFound={<NotFound noun="installation" back={{ to: '/customers', label: 'Back to customers' }} />}>
    {installation => <InstallationView installation={installation} />}
  </QueryView>;
}

function InstallationView({ installation }: { installation: Installation }) {
  const [page, setPage] = useState(1);
  const query = useQuery({ queryKey: [...SURVEYS_KEY, 'installation', installation.id, page],
    queryFn: ({ signal }) => fetchSurveys({ installationId: installation.id, page, pageSize: 20 }, signal) });
  return <>
    <div className="page-head"><Link className="btn btn-quiet btn-sm back" to={`/customers/${installation.customerId}`}><Icon icon={ArrowLeft} />{installation.customerName}</Link>
      <div className="row"><h1 className="a-title" id="page-title" tabIndex={-1}>Installation <StageChip status={installation.status} /></h1></div>
    </div>
    <p className="page-intro">{installation.address.street}, {cityLine(installation.address)}</p>
    <div className="rec-card"><dl className="kv"><dt>Customer</dt><dd><Link to={`/customers/${installation.customerId}`}>{installation.customerName}</Link></dd>
      <dt>Phone</dt><dd><a href={`tel:${installation.customerPhone.replace(/[^\d+]/g, '')}`}>{installation.customerPhone}</a></dd>
      <dt>Lead</dt><dd><Link to={`/leads/${installation.leadId}`}>Open original request</Link></dd>
      <dt>Started</dt><dd>{formatMoment(installation.createdAt)}</dd></dl></div>
    <QueryView query={query} what="this installation’s surveys">
      {surveys => <InstallationSurveys installation={installation} surveys={surveys} page={page} setPage={setPage} />}
    </QueryView>
    <InstallationQuote installation={installation} />
    {installation.status !== 'Survey' && installation.status !== 'Design' && (
      <WarehousePackingSection installation={installation} />
    )}
    {installation.status !== 'Survey' && installation.status !== 'Design' && (
      <RooftopFieldProofSection
        installationId={installation.id}
        customerName={installation.customerName}
        isTechnician={false}
      />
    )}
  </>;
}

function InstallationSurveys({ installation, surveys, page, setPage }: { installation: Installation; surveys: SurveyPage; page: number; setPage: (page: number) => void }) {
  const hasActive = surveys.items.some(survey => survey.status !== 'Rejected');
  // An active survey may be on any page; a filtered server query prevents an old history page from hiding it.
  const active = useQuery({ queryKey: [...SURVEYS_KEY, 'installation-active', installation.id],
    queryFn: async ({ signal }) => {
      const checks = await Promise.all((['Scheduled', 'Submitted', 'Approved'] as const).map(status => fetchSurveys({ installationId: installation.id, status, pageSize: 1 }, signal)));
      return checks.some(result => result.totalCount > 0);
    } });
  return <>
    <section aria-labelledby="installation-surveys"><div className="section-title"><h2 className="a-heading" id="installation-surveys">Site surveys</h2><span className="a-label">Appointment history</span></div>
      {surveys.items.length === 0 ? <p className="survey-empty">No site visits have been scheduled yet.</p> : <ul className="survey-history">{surveys.items.map(survey => <li key={survey.id}>
        <Link to={`/surveys/${survey.id}`}><span><b>{formatMoment(survey.scheduledAt)}</b><small>{survey.technicianName}</small></span><SurveyChip status={survey.status} /></Link>
      </li>)}</ul>}
      {surveys.totalCount > surveys.pageSize && <div className="pager"><span className="a-data">Page {page} · {surveys.totalCount} visits</span><div>
        {page > 1 && <button className="btn btn-secondary btn-sm" type="button" onClick={() => setPage(page - 1)}>Previous</button>}
        {page * surveys.pageSize < surveys.totalCount && <button className="btn btn-secondary btn-sm" type="button" onClick={() => setPage(page + 1)}>Next</button>}
      </div></div>}
    </section>
    {installation.status === 'Survey' && <QueryView query={active} what="the current survey">
      {exists => !exists && !hasActive ? <ScheduleForm installationId={installation.id} /> : null}
    </QueryView>}
  </>;
}
