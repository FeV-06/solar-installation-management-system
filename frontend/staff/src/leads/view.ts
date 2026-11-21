import { ApiError } from '../api/errors';
import type { Address, Lead, LeadStatus } from '../api/leads';

/** The list's filters, in its address (`/leads?status=closed`): each one the statuses it asks the API for */
export const FILTERS = [
  { key: 'all', label: 'All', statuses: [] },
  { key: 'new', label: 'New', statuses: ['New'] },
  { key: 'contacted', label: 'Contacted', statuses: ['Contacted'] },
  { key: 'closed', label: 'Closed', statuses: ['Converted', 'Disqualified', 'Lost'] },
] as const satisfies readonly { key: string; label: string; statuses: readonly LeadStatus[] }[];
export type Filter = (typeof FILTERS)[number];

/** The filter an address asks for; the list opens on All, every lead newest first (Hocine, 2026-11-21). */
export const filterFrom = (value: string | null): Filter => FILTERS.find(f => f.key === value) ?? FILTERS[0];

/** The list's address for a filter and a page; the first page has no page number. */
export const leadsHref = (filter: Filter, page = 1) => `/leads?status=${filter.key}${page > 1 ? `&page=${page}` : ''}`;

/** What the empty list says, for each filter */
export const EMPTY: Record<Filter['key'], { title: string; text: string }> = {
  new: { title: 'No new leads', text: 'Every request has been answered. New ones from the website appear here.' },
  contacted: { title: 'No contacted leads', text: 'Leads you mark as contacted wait here until they are converted or closed.' },
  closed: { title: 'No closed leads', text: 'Converted, disqualified and lost leads appear here.' },
  all: { title: 'No leads yet', text: 'Quote requests from the website appear here.' },
};

/** The quote form's bill ranges, as the office reads them; a value from before the form had them shows as it is. */
const BILLS: Record<string, string> = {
  under2000: 'Under ₹2,000 a month',
  '2000-5000': '₹2,000–5,000 a month',
  '5000-10000': '₹5,000–10,000 a month',
  '10000plus': 'Over ₹10,000 a month',
  under20000: 'Under ₹20,000 a month',
  '20000-60000': '₹20,000–60,000 a month',
  '60000-150000': '₹60,000–1,50,000 a month',
  '150000plus': 'Over ₹1,50,000 a month',
  under1500: 'Under ₹1,500 a month',
  '1500-3500': '₹1,500–3,500 a month',
  '3500-7000': '₹3,500–7,000 a month',
  '7000plus': '₹7,000 or more a month',
  under100: 'Under ₹1,500 a month',
  '100-200': '₹1,500–3,500 a month',
  '200-300': '₹3,500–7,000 a month',
  '300plus': '₹7,000 or more a month',
};
export const billLabel = (value: string) => BILLS[value] ?? value;

/** "Round Rock, TX 78681": the address's second line */
export const cityLine = (a: Address) => `${a.city}, ${a.state} ${a.zipCode}`;

/** "House, they own it" */
export const propertyLabel = (lead: Pick<Lead, 'propertyType' | 'isPropertyOwner'>) =>
  `${lead.propertyType}, ${lead.isPropertyOwner ? 'they own it' : "they don't own it"}`;

/** The lead's first name, for sentences about them */
export const firstNameOf = (lead: Pick<Lead, 'firstName'>) => lead.firstName.trim().split(/\s+/)[0];

/** What the lead's page offers now, from the API's `next` (BR-L2): the app doesn't repeat the rules. */
export const actionsFor = (lead: Pick<Lead, 'next'>) => ({
  contact: lead.next.includes('Contacted'),
  convert: lead.next.includes('Converted'),
  disqualify: lead.next.includes('Disqualified'),
  lose: lead.next.includes('Lost'),
  edit: lead.next.length > 0,
});

/** The move was refused because the lead isn't where this page thought it was: another Admin moved it first. */
export const isMovedMeanwhile = (error: unknown): error is ApiError =>
  error instanceof ApiError && error.code === 'lead.transition_not_allowed';
