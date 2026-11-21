import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { ClipboardCheck } from 'lucide-react';
import { fetchSurveys, SURVEY_PAGE_SIZE, SURVEYS_KEY, SURVEY_STATUSES, type SurveyStatus } from '../api/surveys';
import { PageHead } from '../components/PageHead';
import { Pager } from '../components/Pager';
import { formatMoment } from '../lib/dates';
import { pageFrom } from '../lib/paging';
import { cityLine } from '../leads/view';
import { useCurrentUser } from '../session/session';
import { Empty } from '../states/States';
import { QueryView } from '../states/QueryView';
import { SurveyChip } from './SurveyChip';

const FILTERS: { label: string; status?: SurveyStatus }[] = [
  { label: 'All' }, { label: 'Scheduled', status: 'Scheduled' }, { label: 'Needs review', status: 'Submitted' },
  { label: 'Approved', status: 'Approved' }, { label: 'Rejected', status: 'Rejected' },
];

export function SurveysPage() {
  const { role } = useCurrentUser();
  const [params] = useSearchParams();
  const requested = params.get('status');
  const status = SURVEY_STATUSES.find(s => s === requested);
  const page = pageFrom(params.get('page'));
  const base = role === 'Admin' ? '/surveys' : '/my-work';
  const href = (filter?: SurveyStatus, nextPage = 1) => {
    const query = new URLSearchParams();
    if (filter) query.set('status', filter);
    if (nextPage > 1) query.set('page', String(nextPage));
    return `${base}${query.size ? `?${query}` : ''}`;
  };
  const query = useQuery({ queryKey: [...SURVEYS_KEY, 'list', role, status ?? '', page],
    queryFn: ({ signal }) => fetchSurveys({ status, page }, signal) });
  return (
    <>
      <PageHead title={role === 'Admin' ? 'Surveys' : 'My work'}>
        <nav className="filters" aria-label="Filter surveys">
          {FILTERS.map(filter => <Link key={filter.label} to={href(filter.status)} aria-current={filter.status === status ? 'true' : undefined}>{filter.label}</Link>)}
        </nav>
      </PageHead>
      <p className="page-intro">{role === 'Admin' ? 'Schedule visits from an installation, then review submitted reports here.' : 'Your assigned site surveys, with the next action for each visit.'}</p>
      <QueryView query={query} what="the surveys" isEmpty={data => data.totalCount === 0}
        empty={<Empty icon={ClipboardCheck} title="No surveys here">{role === 'Admin' ? 'Open a customer’s installation to schedule a site visit.' : 'Assigned visits will appear here.'}</Empty>}>
        {data => <>
          <div className="table-wrap list-table"><table className="table">
            <caption className="sr">Site surveys ordered by appointment</caption>
            <thead><tr><th scope="col">Customer &amp; site</th><th scope="col">Technician</th><th scope="col">Status</th><th scope="col" className="r">Appointment</th></tr></thead>
            <tbody>{data.items.map(s => <tr key={s.id}>
              <td><span className="who"><Link to={`${base}/${s.id}`}>{s.customerName}</Link><small>{s.address.street}, {cityLine(s.address)}</small></span></td>
              <td>{s.technicianName}</td><td><SurveyChip status={s.status} /></td><td className="num r">{formatMoment(s.scheduledAt)}</td>
            </tr>)}</tbody>
          </table></div>
          <ul className="record-cards" aria-label="Site surveys ordered by appointment">{data.items.map(s => <li key={s.id}>
            <Link className="record-card" to={`${base}/${s.id}`}><b>{s.customerName}</b><small>{s.address.street}, {cityLine(s.address)}<br />{formatMoment(s.scheduledAt)} · {s.technicianName}</small><span className="row"><SurveyChip status={s.status} /></span></Link>
          </li>)}</ul>
          <Pager label="Pages of surveys" page={page} pageSize={SURVEY_PAGE_SIZE} totalCount={data.totalCount} hrefFor={p => href(status, p)} />
        </>}
      </QueryView>
    </>
  );
}
