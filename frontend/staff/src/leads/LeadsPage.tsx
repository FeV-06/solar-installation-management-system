import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { Inbox, Search, SearchX, X } from 'lucide-react';
import { fetchLeads, LEADS_PAGE_SIZE, leadsPageKey } from '../api/leads';
import { Icon } from '../components/Icon';
import { PageHead } from '../components/PageHead';
import { Pager } from '../components/Pager';
import { formatMoment } from '../lib/dates';
import { pageFrom } from '../lib/paging';
import { useCurrentUser } from '../session/session';
import { opensFor } from '../shell/sections';
import { Empty, NotAllowed } from '../states/States';
import { QueryView } from '../states/QueryView';
import { LeadChip } from './LeadChip';
import { cityLine, EMPTY, filterFrom, FILTERS, leadsHref } from './view';

/** How long typing pauses before the list follows the search */
const SEARCH_DELAY_MS = 300;

/**
 * The lead list (FR-L3), from the approved design: newest first, opening on All, with New, Contacted and Closed beside it.
 * Filter, search query and page are in the address. Below 768 px the rows become cards.
 */
export function LeadsPage() {
  const me = useCurrentUser();
  const [params, setParams] = useSearchParams();
  const filter = filterFrom(params.get('status'));
  const q = (params.get('q') ?? '').trim();
  const page = pageFrom(params.get('page'));
  const [typed, setTyped] = useState(params.get('q') ?? '');

  const [shownQ, setShownQ] = useState(q);
  if (shownQ !== q) {
    setShownQ(q);
    if (typed.trim() !== q) setTyped(q);
  }

  const query = useQuery({
    queryKey: leadsPageKey(filter.statuses, page, q),
    queryFn: ({ signal }) => fetchLeads(filter.statuses, page, q, signal),
    enabled: me.role === 'Admin',
    placeholderData: keepPreviousData,
  });

  // The address follows what is typed, once typing pauses; a new search starts at the first page
  useEffect(() => {
    if (typed.trim() === q) return;
    const timer = setTimeout(() => {
      const nextParams: Record<string, string> = {};
      if (filter.key !== 'all') nextParams.status = filter.key;
      if (typed.trim()) nextParams.q = typed.trim();
      setParams(nextParams, { replace: true });
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [typed, q, filter.key, setParams]);

  if (!opensFor(me.role, '/leads')) return <NotAllowed />;

  const clear = () => {
    setTyped('');
    const nextParams: Record<string, string> = {};
    if (filter.key !== 'all') nextParams.status = filter.key;
    setParams(nextParams, { replace: true });
  };

  const empty = EMPTY[filter.key];
  const caption = `Leads, ${filter.label.toLowerCase()}, newest first`;
  return (
    <>
      <PageHead title="Leads">
        <nav className="filters" aria-label="Filter leads">
          {FILTERS.map(f => (
            <Link key={f.key} to={leadsHref(f, 1, q)} aria-current={f.key === filter.key ? 'true' : undefined}>{f.label}</Link>
          ))}
        </nav>
        <div className="control list-search">
          <Icon icon={Search} />
          <label className="sr" htmlFor="leads-q">Search leads</label>
          <input
            id="leads-q"
            type="search"
            placeholder="Name, email, phone, city…"
            autoComplete="off"
            spellCheck={false}
            maxLength={100}
            value={typed}
            onChange={e => setTyped(e.target.value)}
          />
        </div>
      </PageHead>
      <QueryView
        query={query} what="the leads" note={q ? 'Your search is kept.' : 'Your filter is kept.'} isEmpty={data => data.totalCount === 0}
        empty={q ? (
          <div className="state-box">
            <div className="state">
              <span className="ring"><Icon icon={SearchX} /></span>
              <p className="a-heading">No leads match “{q}”</p>
              <p>Search by name, email, phone number, or property address.</p>
              <button className="btn btn-secondary btn-sm" type="button" onClick={clear}><Icon icon={X} />Clear the search</button>
            </div>
          </div>
        ) : <Empty icon={Inbox} title={empty.title}>{empty.text}</Empty>}
      >
        {data => (
          <>
            <div className="table-wrap list-table">
              <table className="table">
                <caption className="sr">{caption}</caption>
                <thead>
                  <tr>
                    <th scope="col">Name</th><th scope="col">Property</th><th scope="col">Type</th>
                    <th scope="col">Status</th><th scope="col" className="r">Received</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map(l => (
                    <tr key={l.id}>
                      <td><span className="who"><Link to={`/leads/${l.id}`}>{l.name}</Link><small>{l.email}</small></span></td>
                      <td><span className="who">{l.address.street}<small>{cityLine(l.address)}</small></span></td>
                      <td className="dim">{l.propertyType}</td>
                      <td><LeadChip status={l.status} /></td>
                      <td className="num r">{formatMoment(l.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="record-cards" aria-label={caption}>
              {data.items.map(l => (
                <li key={l.id}>
                  <Link className="record-card" to={`/leads/${l.id}`}>
                    <b>{l.name}</b>
                    <small>{l.address.street}, {l.address.city}, {l.address.state}<br />Received {formatMoment(l.createdAt)}</small>
                    <span className="row"><LeadChip status={l.status} /></span>
                  </Link>
                </li>
              ))}
            </ul>
            <Pager label="Pages of leads" page={page} pageSize={LEADS_PAGE_SIZE} totalCount={data.totalCount} hrefFor={p => leadsHref(filter, p, q)} />
          </>
        )}
      </QueryView>
    </>
  );
}
