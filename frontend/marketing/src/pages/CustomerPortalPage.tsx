import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Calendar, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, CircleAlert, Clock, CreditCard, FileText, Info, LoaderCircle, PackageCheck, Plus, Search, ShieldCheck, Wrench, Zap } from 'lucide-react';
import { Icon } from '../components/Icon';
import { useCustomerAuth } from '../lib/customerAuthContext';
import { STATES } from '../content/states';

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

type QuoteItem = {
  id: number;
  category: string;
  itemName: string;
  specification: string;
  quantity: number;
  unit: string;
  unitCostRupees: number;
  totalCostRupees: number;
};

type Proposal = {
  id: number;
  installationId: number;
  systemCapacityKw: number;
  systemType: string;
  basePriceRupees: number;
  estimatedSubsidyRupees: number;
  totalAmountRupees: number;
  advancePercentage: number;
  advanceRequiredRupees: number;
  amountPaidRupees: number;
  status: string;
  paymentStatus: string;
  notes?: string;
  paymentReference?: string;
  createdAt: string;
  sentAt?: string;
  acceptedAt?: string;
  paidAt?: string;
  items: QuoteItem[];
};

type WarrantyItem = {
  id: number;
  itemName: string;
  category: string;
  serialNumber: string;
  warrantyYears: number;
  startDate: string;
  expiryDate: string;
  status: string;
  isCovered: boolean;
  remainingDays: number;
};

type HandoverProof = {
  installationId: number;
  systemCapacityKw: number;
  testedGenerationKw: number;
  gridConnected: boolean;
  panelArrayPhotoUrl: string;
  inverterPhotoUrl: string;
  meterPhotoUrl: string;
  customerSignatureData: string;
  signedByName: string;
  signedAt: string;
};

type ServiceTicketItem = {
  id: number;
  installationId: number;
  customerId: number;
  assignedTechnicianName?: string;
  scheduledVisitAt?: string;
  serialNumber: string;
  hardwareItem: string;
  category: string;
  faultCode: string;
  description: string;
  photoUrl?: string;
  damageType: string;
  isWarrantyCovered: boolean;
  partsCostRupees: number;
  laborCostRupees: number;
  totalBilledRupees: number;
  status: string;
  adminNotes?: string;
  reviewedAt?: string;
  customerApprovedAt?: string;
  replacementPackingOrderId?: number;
  replacementSerialNumber?: string;
  testedGenerationKw?: number;
  replacementPhotoUrl?: string;
  technicianResolutionNotes?: string;
  customerSignatureData?: string;
  signedByName?: string;
  technicianSignedAt?: string;
  resolvedAt?: string;
  customerConfirmedAt?: string;
  createdAt: string;
};

type PortalData = {
  activeQuote?: QuoteSummary;
  quotes: QuoteSummary[];
  installations: InstallationSummary[];
  proposal?: Proposal;
  warranties?: WarrantyItem[];
  handoverProof?: HandoverProof;
  tickets?: ServiceTicketItem[];
};

const STAGES = [
  { key: 'quote', title: 'Request received', desc: 'Property details received' },
  { key: 'review', title: 'Contacted', desc: 'The office has contacted you' },
  { key: 'survey', title: 'Site survey', desc: 'A technician visits the property' },
  { key: 'install', title: 'Design & Quote', desc: 'BOM and order confirmation' },
  { key: 'active', title: 'Active', desc: 'The installation is active' },
];

function getStageIndex(status?: string, installationStatus?: string): number {
  if (installationStatus === 'Active') return 4;
  if (installationStatus === 'Installation' || installationStatus === 'Inspection') return 3;
  if (installationStatus === 'Design') return 3;
  if (installationStatus === 'Survey') return 2;
  if (!status || ['Lost', 'Disqualified'].includes(status)) return -1;
  if (status.toLowerCase() === 'new') return 0;
  if (status.toLowerCase() === 'contacted') return 1;
  if (status.toLowerCase() === 'converted') return 2;
  return 0;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';

export function CustomerPortalPage() {
  const { customer, loading: authLoading, error: authError, refresh, logout } = useCustomerAuth();

  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [paySuccess, setPaySuccess] = useState<string | null>(null);

  // Quote search and pagination
  const [quoteSearch, setQuoteSearch] = useState('');
  const [quotePage, setQuotePage] = useState(1);
  const QUOTES_PER_PAGE = 5;

  // Workspace Tabs
  const [portalTab, setPortalTab] = useState<'project' | 'quotes' | 'warranties' | 'service'>('project');

  // New Quote Request Modal State
  const [showNewQuoteModal, setShowNewQuoteModal] = useState(false);
  const [newStreet, setNewStreet] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newState, setNewState] = useState('PB');
  const [newZip, setNewZip] = useState('');
  const [newPropertyType, setNewPropertyType] = useState('House');
  const [newBillRange, setNewBillRange] = useState('2000-5000');
  const [newPhone, setNewPhone] = useState('9876543210');
  const [newNotes, setNewNotes] = useState('');
  const [creatingQuote, setCreatingQuote] = useState(false);

  const handleCreateNewQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreatingQuote(true);
      setError(null);
      const res = await fetch(`${API_BASE}/customer-portal/quote-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: customer?.firstName || 'Valued',
          lastName: customer?.lastName || 'Customer',
          email: customer?.email || '',
          phone: newPhone,
          bestTimeToContact: 'Anytime',
          propertyStreet: newStreet,
          propertyCity: newCity,
          propertyState: newState,
          propertyZipCode: newZip,
          propertyCountry: 'IN',
          propertyType: newPropertyType,
          isPropertyOwner: true,
          monthlyBillRange: newBillRange,
          notes: newNotes || undefined,
        }),
      });
      if (res.ok) {
        setShowNewQuoteModal(false);
        setNewStreet('');
        setNewCity('');
        setNewZip('');
        setNewNotes('');
        setPaySuccess('New solar quote request submitted! Our engineering team will review your roof and update this portal.');
        setPortalTab('quotes');
        await fetchPortal();
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.title ?? err.detail ?? 'Failed to submit quote request.');
      }
    } catch {
      setError('Network error submitting quote request.');
    } finally {
      setCreatingQuote(false);
    }
  };

  // Service & Warranty Ticket state (Scene 5)
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ticketSerial, setTicketSerial] = useState('');
  const [ticketFault, setTicketFault] = useState('E04 - Inverter Fault / Zero Generation');
  const [ticketDesc, setTicketDesc] = useState('');
  const [ticketPhotoUrl, setTicketPhotoUrl] = useState('');
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [ticketActionMsg, setTicketActionMsg] = useState<string | null>(null);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data?.installations?.length) return;
    try {
      setTicketSubmitting(true);
      setTicketActionMsg(null);
      const res = await fetch(`${API_BASE}/customer-portal/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          installationId: data.installations[0].id,
          serialNumber: ticketSerial || (data.warranties?.[0]?.serialNumber ?? 'SERIAL-PENDING'),
          faultCode: ticketFault,
          description: ticketDesc,
          photoUrl: ticketPhotoUrl || null,
        }),
      });
      if (res.ok) {
        setShowTicketModal(false);
        setTicketDesc('');
        setTicketPhotoUrl('');
        setTicketActionMsg('Your breakdown ticket has been received by SunPower. Support is reviewing your warranty status.');
        fetchPortal();
      } else {
        const err = await res.json().catch(() => ({}));
        setTicketActionMsg(err.title ?? 'Failed to file service ticket.');
      }
    } catch {
      setTicketActionMsg('Network error submitting service ticket.');
    } finally {
      setTicketSubmitting(false);
    }
  };

  const handleApproveTicket = async (ticketId: number) => {
    try {
      setTicketActionMsg(null);
      const res = await fetch(`${API_BASE}/customer-portal/tickets/${ticketId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerNotes: 'Approved replacement.' }),
      });
      if (res.ok) {
        setTicketActionMsg('Replacement approved! Warehouse packing order generated; technician scheduled for on-site swap.');
        fetchPortal();
      }
    } catch {
      setTicketActionMsg('Error approving ticket.');
    }
  };

  const handleConfirmRestoration = async (ticketId: number) => {
    try {
      setTicketActionMsg(null);
      const res = await fetch(`${API_BASE}/customer-portal/tickets/${ticketId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ homeownerFeedback: 'Power is restored to my satisfaction.' }),
      });
      if (res.ok) {
        setTicketActionMsg('Thank you! Ticket closed. Your new hardware unit warranty has been activated.');
        fetchPortal();
      }
    } catch {
      setTicketActionMsg('Error confirming power restoration.');
    }
  };

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

  useEffect(() => {
    if (!customer) return;
    fetchPortal();
  }, [customer]);

  const handlePay = async (quoteId: number, paymentType: 'Advance' | 'Full') => {
    try {
      setPaying(true);
      setError(null);
      const res = await fetch(`${API_BASE}/customer-portal/quotes/${quoteId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentType }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail ?? err?.title ?? 'Payment failed. Please try again.');
      }
      setPaySuccess(paymentType === 'Advance' ? 'Advance payment received! Order confirmed.' : 'Full payment received! Order confirmed.');
      await fetchPortal();
    } catch (e: any) {
      setError(e.message || 'Payment error');
    } finally {
      setPaying(false);
    }
  };

  if (authLoading || (!!customer && loading)) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon icon={LoaderCircle} className="spin" />
      </div>
    );
  }

  if (authError) return <div className="band" data-theme="night"><div className="wrap"><p role="alert">{authError}</p><button className="btn btn-secondary" type="button" onClick={() => void refresh()}>Try again</button></div></div>;
  if (!customer) return <Navigate to="/signin" replace />;
  const activeQuote = data?.activeQuote ?? data?.quotes?.[0];
  const currentStageIndex = getStageIndex(activeQuote?.status, data?.installations?.[0]?.status);
  const proposal = data?.proposal;

  return (
    <div className="band" data-theme="night" style={{ padding: 'clamp(7rem,16vh,9rem) 0 6rem', minHeight: '88vh' }}>
      <div className="wrap" style={{ maxWidth: '72rem', margin: '0 auto' }}>
        {/* Welcome bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1.25rem' }}>
          <div>
            <p className="label eyebrow" style={{ marginBottom: '0.6rem' }}>Customer Workspace</p>
            <h1 className="display" style={{ fontSize: '2.5rem', margin: 0, color: 'var(--fg)' }}>
              Welcome, {customer?.firstName || customer?.email}<i className="dot" />
            </h1>
            <p className="body" style={{ marginTop: '0.4rem' }}>
              Track your solar systems, view BOM proposals, manage warranties, and submit service requests.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setShowNewQuoteModal(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Icon icon={Plus} size={16} />
              <span>Request New Solar System</span>
            </button>
            <button type="button" className="btn btn-quiet btn-sm" onClick={() => void logout().catch(() => setError('Could not sign out. Try again.'))}>
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

        {paySuccess && (
          <div className="notice tone-positive" style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            <Icon icon={CheckCircle2} />
            <span>{paySuccess}</span>
          </div>
        )}

        {/* Dashboard Navigation Tabs */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid var(--line)',
          marginBottom: '2rem',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}>
          <button
            type="button"
            className="btn btn-quiet"
            style={{
              padding: '0.65rem 1.25rem',
              borderBottom: portalTab === 'project' ? '2.5px solid var(--accent)' : '2.5px solid transparent',
              borderRadius: 0,
              fontWeight: portalTab === 'project' ? 700 : 500,
              color: portalTab === 'project' ? 'var(--fg)' : 'var(--muted)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
            onClick={() => setPortalTab('project')}
          >
            <Icon icon={Zap} size={16} />
            <span>Active Project</span>
            {data?.installations?.length ? (
              <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.45rem', borderRadius: '9999px', background: 'rgba(234,179,8,0.15)', color: 'var(--accent)' }}>
                {data.installations[0].status}
              </span>
            ) : null}
          </button>

          <button
            type="button"
            className="btn btn-quiet"
            style={{
              padding: '0.65rem 1.25rem',
              borderBottom: portalTab === 'quotes' ? '2.5px solid var(--accent)' : '2.5px solid transparent',
              borderRadius: 0,
              fontWeight: portalTab === 'quotes' ? 700 : 500,
              color: portalTab === 'quotes' ? 'var(--fg)' : 'var(--muted)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
            onClick={() => setPortalTab('quotes')}
          >
            <Icon icon={FileText} size={16} />
            <span>All Requests &amp; Orders</span>
            {data?.quotes?.length ? (
              <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.45rem', borderRadius: '9999px', background: 'var(--surface)', color: 'var(--muted)' }}>
                {data.quotes.length}
              </span>
            ) : null}
          </button>

          <button
            type="button"
            className="btn btn-quiet"
            style={{
              padding: '0.65rem 1.25rem',
              borderBottom: portalTab === 'warranties' ? '2.5px solid var(--accent)' : '2.5px solid transparent',
              borderRadius: 0,
              fontWeight: portalTab === 'warranties' ? 700 : 500,
              color: portalTab === 'warranties' ? 'var(--fg)' : 'var(--muted)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
            onClick={() => setPortalTab('warranties')}
          >
            <Icon icon={ShieldCheck} size={16} />
            <span>Equipment &amp; Warranties</span>
            {data?.warranties?.length ? (
              <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.45rem', borderRadius: '9999px', background: 'rgba(22,163,74,0.15)', color: '#16a34a' }}>
                {data.warranties.length}
              </span>
            ) : null}
          </button>

          <button
            type="button"
            className="btn btn-quiet"
            style={{
              padding: '0.65rem 1.25rem',
              borderBottom: portalTab === 'service' ? '2.5px solid var(--accent)' : '2.5px solid transparent',
              borderRadius: 0,
              fontWeight: portalTab === 'service' ? 700 : 500,
              color: portalTab === 'service' ? 'var(--fg)' : 'var(--muted)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
            onClick={() => setPortalTab('service')}
          >
            <Icon icon={Wrench} size={16} />
            <span>Service &amp; Repairs</span>
            {data?.tickets?.length ? (
              <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.45rem', borderRadius: '9999px', background: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}>
                {data.tickets.length}
              </span>
            ) : null}
          </button>
        </div>

        {/* Tab 1: Active Project */}
        {portalTab === 'project' && (
          <div>
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
                Request #{activeQuote.id} &bull; {data?.installations?.[0]?.status ?? activeQuote.status}
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

        {/* SCENE 2: QUOTE & BILL OF MATERIALS PROPOSAL */}
        {proposal && (
          <div style={{
            padding: '2rem',
            background: 'var(--bg-raised)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'inset 0 0 0 1px var(--line), 0 8px 24px rgba(0,0,0,0.2)',
            marginBottom: '2rem',
            border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <span className="label eyebrow" style={{ color: 'var(--accent)', marginBottom: '0.4rem', display: 'block' }}>
                  Ready Package Proposal &bull; Quote #{proposal.id}
                </span>
                <h2 className="display" style={{ fontSize: '1.75rem', margin: 0, color: 'var(--fg)' }}>
                  {proposal.systemCapacityKw} kW {proposal.systemType === 'OnGrid' ? 'On-Grid' : 'Off-Grid'} Solar System
                </h2>
                <p className="body" style={{ margin: '0.35rem 0 0', color: 'var(--muted)', fontSize: '0.95rem' }}>
                  Estimated generation: ~{Math.round(proposal.systemCapacityKw * 120)}–{Math.round(proposal.systemCapacityKw * 140)} units (kWh)/month. Complete turnkey installation.
                </p>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span className="label" style={{
                  padding: '0.35rem 0.8rem',
                  borderRadius: 'var(--radius-pill)',
                  background: proposal.paymentStatus === 'Pending' ? 'color-mix(in srgb, var(--accent) 15%, transparent)' : 'color-mix(in srgb, var(--positive, #5fd39a) 15%, transparent)',
                  color: proposal.paymentStatus === 'Pending' ? 'var(--accent)' : 'var(--positive, #5fd39a)',
                  fontWeight: 600,
                  fontSize: '0.85rem'
                }}>
                  {proposal.paymentStatus === 'Pending' ? 'Proposal Ready' : `Confirmed (${proposal.paymentStatus})`}
                </span>
                {proposal.paymentReference && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--faint)', marginTop: '0.35rem' }}>
                    Ref: {proposal.paymentReference}
                  </div>
                )}
              </div>
            </div>

            {/* Financial Overview Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(13rem, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
              <div style={{ padding: '1.25rem', background: 'var(--bg)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--line)' }}>
                <div className="label" style={{ color: 'var(--faint)', marginBottom: '0.25rem' }}>Base System Cost</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--fg)' }}>
                  ₹{proposal.basePriceRupees.toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.2rem' }}>Hardware + Installation</div>
              </div>

              <div style={{ padding: '1.25rem', background: 'var(--bg)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--line)' }}>
                <div className="label" style={{ color: 'var(--positive, #5fd39a)', marginBottom: '0.25rem' }}>PM Surya Ghar Subsidy</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--positive, #5fd39a)' }}>
                  - ₹{proposal.estimatedSubsidyRupees.toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.2rem' }}>Direct central grant</div>
              </div>

              <div style={{ padding: '1.25rem', background: 'var(--bg)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--line)' }}>
                <div className="label" style={{ color: 'var(--faint)', marginBottom: '0.25rem' }}>Net Amount Payable</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--fg)' }}>
                  ₹{proposal.totalAmountRupees.toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.2rem' }}>After central subsidy</div>
              </div>

              <div style={{ padding: '1.25rem', background: 'color-mix(in srgb, var(--accent) 8%, var(--bg))', borderRadius: 'var(--radius-lg)', border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)' }}>
                <div className="label" style={{ color: 'var(--accent)', marginBottom: '0.25rem' }}>Advance Required (20%)</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--accent)' }}>
                  ₹{proposal.advanceRequiredRupees.toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.2rem' }}>Confirms warehouse packing</div>
              </div>
            </div>

            {/* Bill of Materials (BOM) Table */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <Icon icon={PackageCheck} color="var(--accent)" />
                <h3 className="display" style={{ fontSize: '1.15rem', margin: 0, color: 'var(--fg)' }}>Exact Bill of Materials (BOM)</h3>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--line-strong)', color: 'var(--faint)' }}>
                      <th style={{ padding: '0.6rem 0.75rem' }}>Component</th>
                      <th style={{ padding: '0.6rem 0.75rem' }}>Specification</th>
                      <th style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>Qty</th>
                      <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>Unit Rate</th>
                      <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proposal.items.map(item => (
                      <tr key={item.id} style={{ borderBottom: '1px solid var(--line)' }}>
                        <td style={{ padding: '0.7rem 0.75rem', fontWeight: 600, color: 'var(--fg)' }}>{item.itemName}</td>
                        <td style={{ padding: '0.7rem 0.75rem', color: 'var(--muted)' }}>{item.specification}</td>
                        <td style={{ padding: '0.7rem 0.75rem', textAlign: 'center', color: 'var(--fg)' }}>{item.quantity} {item.unit}</td>
                        <td style={{ padding: '0.7rem 0.75rem', textAlign: 'right', color: 'var(--muted)' }}>₹{item.unitCostRupees.toLocaleString('en-IN')}</td>
                        <td style={{ padding: '0.7rem 0.75rem', textAlign: 'right', fontWeight: 600, color: 'var(--fg)' }}>₹{item.totalCostRupees.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Acceptance / Payment Gate */}
            {proposal.paymentStatus === 'Pending' ? (
              <div style={{
                padding: '1.5rem',
                background: 'var(--bg)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--line)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1.25rem'
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--fg)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Icon icon={CreditCard} color="var(--accent)" />
                    <span>Confirm Order & Dispatch Warehouse Kit</span>
                  </div>
                  <p className="body" style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--muted)' }}>
                    Paying the advance confirms your order, triggers warehouse packing and schedules the installation crew.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={paying}
                    onClick={() => handlePay(proposal.id, 'Advance')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    {paying ? <Icon icon={LoaderCircle} className="spin" /> : <Zap size={16} />}
                    <span>Pay 20% Advance (₹{proposal.advanceRequiredRupees.toLocaleString('en-IN')})</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={paying}
                    onClick={() => handlePay(proposal.id, 'Full')}
                  >
                    <span>Pay Full Amount (₹{proposal.totalAmountRupees.toLocaleString('en-IN')})</span>
                  </button>
                </div>
              </div>
            ) : (
              <div style={{
                padding: '1.25rem',
                background: 'color-mix(in srgb, var(--positive, #5fd39a) 8%, var(--bg))',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid color-mix(in srgb, var(--positive, #5fd39a) 30%, transparent)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <ShieldCheck color="var(--positive, #5fd39a)" size={24} />
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--fg)', fontSize: '0.95rem' }}>
                    Order Confirmed & Paid: ₹{proposal.amountPaidRupees.toLocaleString('en-IN')} ({proposal.paymentStatus})
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                    Payment Reference: {proposal.paymentReference} &bull; Warehouse packing list generated &bull; Field crew scheduled
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Grid of details: Quote & Property */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(20rem, 1fr))', gap: '1.5rem' }}>
          {/* Active / Recent Quote Card */}
          <div style={{
            padding: '1.75rem',
            background: 'var(--bg-raised)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'inset 0 0 0 1px var(--line)'
          }}>
            <h3 className="display" style={{ fontSize: '1.15rem', margin: '0 0 1.25rem', color: 'var(--fg)' }}>Property & Request Details</h3>
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
                <p className="body" style={{ marginBottom: '1.25rem' }}>No request found for your account.</p>
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
                    Your installation will appear here after the office converts your request.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Rooftop Handover & Commissioning Certificate Card (Scene 4) */}
        {data?.handoverProof && (
          <div style={{
            marginTop: '2rem',
            padding: '1.75rem',
            background: 'var(--bg-raised)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'inset 0 0 0 1px var(--line)',
            borderLeft: '4px solid #16a34a',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Icon icon={CheckCircle2} size={22} color="#16a34a" />
                <h3 className="display" style={{ fontSize: '1.25rem', margin: 0, color: 'var(--fg)' }}>
                  Commissioning &amp; Handover Certificate
                </h3>
              </div>
              <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '9999px', background: '#dcfce7', color: '#166534', fontWeight: 700 }}>
                ✓ Official Customer Sign-Off
              </span>
            </div>

            <p style={{ margin: '0 0 1.25rem', fontSize: '0.9rem', color: 'var(--muted)' }}>
              Your rooftop solar system has been installed, commissioned, and synchronized with the electricity grid. Tested live generation: <b style={{ color: '#16a34a' }}>{data.handoverProof.testedGenerationKw} kW</b> on your {data.handoverProof.systemCapacityKw} kW array.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <span className="a-label" style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Rooftop Solar Array</span>
                <div style={{ height: '110px', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginTop: '0.35rem', background: '#000' }}>
                  <img
                    src={data.handoverProof.panelArrayPhotoUrl}
                    alt="Panels"
                    onError={(e) => { e.currentTarget.src = '/images/panel_array.svg'; }}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              </div>
              <div>
                <span className="a-label" style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Inverter &amp; DCDB</span>
                <div style={{ height: '110px', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginTop: '0.35rem', background: '#000' }}>
                  <img
                    src={data.handoverProof.inverterPhotoUrl}
                    alt="Inverter"
                    onError={(e) => { e.currentTarget.src = '/images/inverter_wiring.svg'; }}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              </div>
              <div>
                <span className="a-label" style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Net Meter &amp; Earthing</span>
                <div style={{ height: '110px', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginTop: '0.35rem', background: '#000' }}>
                  <img
                    src={data.handoverProof.meterPhotoUrl}
                    alt="Meter"
                    onError={(e) => { e.currentTarget.src = '/images/net_meter.svg'; }}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              </div>
            </div>

            {data.handoverProof.customerSignatureData && (
              <div style={{
                padding: '0.85rem 1rem',
                background: 'var(--bg)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'inset 0 0 0 1px var(--line)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Digitally Accepted by Homeowner</span>
                  <div style={{ fontWeight: 600, color: 'var(--fg)', fontSize: '0.9rem' }}>{data.handoverProof.signedByName}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--faint)' }}>{new Date(data.handoverProof.signedAt).toLocaleString()}</div>
                </div>
                <div style={{ background: '#000', padding: '0.25rem 0.6rem', borderRadius: '6px' }}>
                  <img src={data.handoverProof.customerSignatureData} alt="Signature" style={{ maxHeight: '45px', maxWidth: '160px', objectFit: 'contain', filter: 'brightness(1.2)' }} />
                </div>
              </div>
            )}
          </div>
        )}
          </div>
        )}



        {/* Tab 2: All Requests & Orders */}
        {portalTab === 'quotes' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 className="display" style={{ fontSize: '1.35rem', margin: 0, color: 'var(--fg)' }}>Your Solar Quotes &amp; Orders</h2>
                <p className="body" style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: 'var(--muted)' }}>
                  All quote requests and projects submitted under your account.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setShowNewQuoteModal(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Icon icon={Plus} size={16} />
                <span>Request Another Solar System</span>
              </button>
            </div>
            {/* All quotes history table with Search & Pagination */}
        {data?.quotes && data.quotes.length > 0 && (() => {
          const filteredQuotes = (data.quotes ?? []).filter(q => {
            if (!quoteSearch.trim()) return true;
            const term = quoteSearch.toLowerCase();
            return (
              q.id.toString().includes(term) ||
              q.propertyAddress.toLowerCase().includes(term) ||
              q.status.toLowerCase().includes(term) ||
              q.monthlyBillRange.toLowerCase().includes(term)
            );
          });
          const totalQuotePages = Math.max(1, Math.ceil(filteredQuotes.length / QUOTES_PER_PAGE));
          const currentPageQuotes = filteredQuotes.slice((quotePage - 1) * QUOTES_PER_PAGE, quotePage * QUOTES_PER_PAGE);

          return (
            <div style={{
              marginTop: '2rem',
              padding: '1.75rem',
              background: 'var(--bg-raised)',
              borderRadius: 'var(--radius-xl)',
              boxShadow: 'inset 0 0 0 1px var(--line)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h3 className="display" style={{ fontSize: '1.15rem', margin: 0, color: 'var(--fg)' }}>All Your Requests</h3>
                  <span className="label" style={{ color: 'var(--faint)', fontSize: '0.75rem' }}>
                    Showing {filteredQuotes.length === 0 ? 0 : (quotePage - 1) * QUOTES_PER_PAGE + 1}–{Math.min(quotePage * QUOTES_PER_PAGE, filteredQuotes.length)} of {filteredQuotes.length} requests
                  </span>
                </div>

                {/* Search Box */}
                <div style={{ position: 'relative', minWidth: '16rem', maxWidth: '22rem', width: '100%' }}>
                  <input
                    type="search"
                    placeholder="Search by ID, address, status…"
                    value={quoteSearch}
                    onChange={e => { setQuoteSearch(e.target.value); setQuotePage(1); }}
                    style={{
                      width: '100%',
                      padding: '0.5rem 1rem 0.5rem 2.2rem',
                      background: 'var(--bg)',
                      border: '1px solid var(--line)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--fg)',
                      fontSize: '0.85rem'
                    }}
                  />
                  <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }}>
                    <Icon icon={Search} />
                  </span>
                </div>
              </div>

              {filteredQuotes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--muted)' }}>
                  No requests matching “{quoteSearch}”.
                </div>
              ) : (
                <>
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
                        {currentPageQuotes.map(q => (
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

                  {/* Pagination Controls */}
                  {totalQuotePages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--line)' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                        Page {quotePage} of {totalQuotePages}
                      </span>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          disabled={quotePage <= 1}
                          onClick={() => setQuotePage(p => Math.max(1, p - 1))}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Icon icon={ChevronLeft} />
                          <span>Previous</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          disabled={quotePage >= totalQuotePages}
                          onClick={() => setQuotePage(p => Math.min(totalQuotePages, p + 1))}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <span>Next</span>
                          <Icon icon={ChevronRight} />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })()}
          </div>
        )}

        {/* Tab 3: Equipment & Warranties */}
        {portalTab === 'warranties' && (
          <div>
            {/* Active Warranties Card (Scene 3 & 5) */}
        {data?.warranties && data.warranties.length > 0 && (
          <div style={{
            marginTop: '2rem',
            padding: '1.75rem',
            background: 'var(--bg-raised)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'inset 0 0 0 1px var(--line)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Icon icon={ShieldCheck} size={22} color="#16a34a" />
                <h3 className="display" style={{ fontSize: '1.25rem', margin: 0, color: 'var(--fg)' }}>
                  Equipment &amp; Warranty Protection
                </h3>
              </div>
              <span className="a-label" style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                Automated Digital Certificate
              </span>
            </div>

            <p style={{ margin: '0 0 1.25rem', fontSize: '0.9rem', color: 'var(--muted)' }}>
              Your serialized hardware is protected by SunPower Solutions. In the event of a breakdown or fault, our support desk tracks your unit directly by serial number.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {data.warranties.map((w) => (
                <div
                  key={w.id}
                  style={{
                    padding: '1.25rem',
                    background: 'var(--bg)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'inset 0 0 0 1px var(--line)',
                    borderLeft: w.isCovered ? '4px solid #16a34a' : '4px solid #dc2626',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--fg)' }}>{w.itemName}</span>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '9999px',
                        background: w.isCovered ? '#dcfce7' : '#fee2e2',
                        color: w.isCovered ? '#166534' : '#991b1b',
                        fontWeight: 700,
                      }}
                    >
                      {w.isCovered ? `${w.remainingDays} days left` : 'Expired'}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                    <span>Serial: </span>
                    <code style={{ fontWeight: 700, color: 'var(--fg)' }}>{w.serialNumber}</code>
                  </div>

                  <div style={{ fontSize: '0.8rem', color: 'var(--faint)', marginTop: '0.25rem' }}>
                    {w.warrantyYears}-Year Manufacturer Guarantee &bull; Valid through {new Date(w.expiryDate).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
          </div>
        )}

        {/* Tab 4: Service & Repairs */}
        {portalTab === 'service' && (
          <div>
            {/* Post-Sales Service & Breakdown Claims (Scene 5) */}
        {data?.installations && data.installations.length > 0 && (
          <div style={{
            marginTop: '2rem',
            padding: '1.75rem',
            background: 'var(--bg-raised)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'inset 0 0 0 1px var(--line)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Icon icon={Wrench} size={22} color="var(--accent)" />
                <h3 className="display" style={{ fontSize: '1.25rem', margin: 0, color: 'var(--fg)' }}>
                  Service &amp; Warranty Claims Desk
                </h3>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setShowTicketModal(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Icon icon={Wrench} size={15} />
                <span>Report Breakdown / File Claim</span>
              </button>
            </div>

            <p style={{ margin: '0 0 1.25rem', fontSize: '0.9rem', color: 'var(--muted)' }}>
              In the event of an inverter fault, zero power, or rain breakdown, file a claim directly with our support desk.
              Equipment covered by warranty is repaired or replaced at ₹0 cost.
            </p>

            {ticketActionMsg && (
              <div style={{ padding: '0.75rem 1rem', marginBottom: '1rem', background: '#eff6ff', color: '#1e40af', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                {ticketActionMsg}
              </div>
            )}

            {data?.tickets && data.tickets.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {data.tickets.map((t) => {
                  const isPendingConfirm = t.status === 'ResolvedPendingCustomerConfirmation';

                  return (
                    <div
                      key={t.id}
                      style={{
                        padding: '1.25rem',
                        background: 'var(--bg)',
                        borderRadius: 'var(--radius-lg)',
                        boxShadow: 'inset 0 0 0 1px var(--line)',
                        borderLeft: t.status === 'Closed' ? '4px solid #16a34a' : isPendingConfirm ? '4px solid #3b82f6' : '4px solid var(--accent)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--fg)' }}>Ticket #{t.id}: {t.faultCode}</span>
                            <span style={{
                              fontSize: '0.75rem',
                              padding: '0.15rem 0.5rem',
                              borderRadius: '9999px',
                              background: t.status === 'Closed' ? '#dcfce7' : isPendingConfirm ? '#dbeafe' : '#fef3c7',
                              color: t.status === 'Closed' ? '#166534' : isPendingConfirm ? '#1e40af' : '#92400e',
                              fontWeight: 600,
                            }}>
                              {isPendingConfirm ? 'Power Restored - Signoff Required' : t.status}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
                            Hardware: {t.hardwareItem} (S/N: <code>{t.serialNumber}</code>)
                          </div>
                        </div>

                        <span style={{
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.6rem',
                          borderRadius: '6px',
                          background: t.isWarrantyCovered ? '#dcfce7' : '#fee2e2',
                          color: t.isWarrantyCovered ? '#166534' : '#991b1b',
                        }}>
                          {t.isWarrantyCovered ? '100% Free Warranty Replacement (₹0)' : `Chargeable Repair: ₹${t.totalBilledRupees.toLocaleString()}`}
                        </span>
                      </div>

                      <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--muted)' }}>
                        {t.description}
                      </p>

                      {/* Terms Reviewed Banner */}
                      {t.status === 'Reviewed' && (
                        <div style={{
                          padding: '0.85rem 1rem',
                          background: '#f8fafc',
                          border: '1px solid var(--line)',
                          borderRadius: 'var(--radius-md)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '0.75rem',
                        }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--fg)' }}>
                              Office Terms Sent: {t.isWarrantyCovered ? 'Zero Cost Warranty Swap' : `Invoice for ₹${t.totalBilledRupees.toLocaleString()} (Parts + Service Labor)`}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                              {t.adminNotes ?? 'Verified against installation specs.'}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => handleApproveTicket(t.id)}
                          >
                            Approve Replacement &amp; Dispatch
                          </button>
                        </div>
                      )}

                      
                      {/* Scheduled Technician Visit Banner */}
                      {t.assignedTechnicianName && t.scheduledVisitAt && (
                        <div style={{
                          padding: '0.75rem 1rem',
                          background: 'rgba(59,130,246,0.1)',
                          border: '1px solid rgba(59,130,246,0.3)',
                          borderRadius: 'var(--radius-md)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.6rem',
                          fontSize: '0.85rem',
                          color: '#60a5fa'
                        }}>
                          <Icon icon={Calendar} size={16} />
                          <div>
                            Technician <b>{t.assignedTechnicianName}</b> is scheduled to visit your property on <b>{new Date(t.scheduledVisitAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</b> for on-site hardware swap.
                          </div>
                        </div>
                      )}

                      {/* Official Replacement & Repair Handover Certificate */}
                      {(isPendingConfirm || t.status === 'Closed') && (
                        <div style={{
                          padding: '1.25rem',
                          background: 'var(--bg-field)',
                          border: '1px solid var(--line)',
                          borderLeft: '4px solid #16a34a',
                          borderRadius: 'var(--radius-lg)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.75rem',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <Icon icon={CheckCircle2} size={18} color="#16a34a" />
                              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--fg)' }}>
                                Replacement &amp; Handover Certificate
                              </h4>
                            </div>
                            <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '9999px', background: '#dcfce7', color: '#166534', fontWeight: 600 }}>
                              {t.status === 'Closed' ? '✓ Power Restored & Verified' : 'Awaiting Your Signoff'}
                            </span>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', fontSize: '0.825rem' }}>
                            <div>
                              <span style={{ color: 'var(--muted)', display: 'block', fontSize: '0.75rem' }}>Faulty Decommissioned S/N</span>
                              <code>{t.serialNumber}</code>
                            </div>
                            <div>
                              <span style={{ color: 'var(--muted)', display: 'block', fontSize: '0.75rem' }}>New Replacement S/N</span>
                              <code style={{ color: '#16a34a', fontWeight: 700 }}>{t.replacementSerialNumber || 'ACTIVE'}</code>
                            </div>
                            <div>
                              <span style={{ color: 'var(--muted)', display: 'block', fontSize: '0.75rem' }}>Tested Generation Output</span>
                              <b style={{ color: '#16a34a' }}>{t.testedGenerationKw ?? 2.85} kW</b>
                            </div>
                          </div>

                          {t.replacementPhotoUrl && (
                            <div>
                              <span style={{ color: 'var(--muted)', display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem' }}>On-Site Replacement Proof Photo</span>
                              <img
                                src={t.replacementPhotoUrl}
                                alt="Replacement Photo"
                                onError={(e) => { e.currentTarget.src = '/images/inverter_wiring.svg'; }}
                                style={{ maxHeight: '90px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--line)', background: '#000' }}
                              />
                            </div>
                          )}

                          {t.customerSignatureData && (
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              background: 'var(--bg)',
                              padding: '0.6rem 0.85rem',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--line)',
                              flexWrap: 'wrap',
                              gap: '0.5rem'
                            }}>
                              <div style={{ fontSize: '0.8rem' }}>
                                <span style={{ color: 'var(--muted)' }}>On-Site Handover Accepted by: </span>
                                <b>{t.signedByName || customer?.fullName || 'Customer'}</b>
                                <div style={{ fontSize: '0.75rem', color: 'var(--faint)' }}>{t.technicianSignedAt ? new Date(t.technicianSignedAt).toLocaleString() : 'Recently'}</div>
                              </div>
                              <div style={{ background: '#000', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                                <img src={t.customerSignatureData} alt="Signature" style={{ maxHeight: '35px', maxWidth: '120px', objectFit: 'contain', filter: 'brightness(1.2)' }} />
                              </div>
                            </div>
                          )}

                          {isPendingConfirm && (
                            <div style={{
                              marginTop: '0.25rem',
                              padding: '0.85rem 1rem',
                              background: '#eff6ff',
                              border: '1px solid #bfdbfe',
                              borderRadius: 'var(--radius-md)',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              gap: '0.75rem'
                            }}>
                              <div style={{ fontSize: '0.85rem', color: '#1e3a8a' }}>
                                <b>Confirm Power Restoration:</b> The technician has installed and tested the unit. Click below to verify power is restored and formally close this claim.
                              </div>
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                style={{ background: '#16a34a', borderColor: '#16a34a' }}
                                onClick={() => handleConfirmRestoration(t.id)}
                              >
                                Confirm Power Restored &amp; Accept Certificate
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--muted)', background: 'var(--bg)', borderRadius: 'var(--radius-lg)' }}>
                No active breakdown or service tickets. Your system is operating normally.
              </div>
            )}
          </div>
        )}
          </div>
        )}
        {/* Modal: Report Breakdown / File Claim */}
        {showTicketModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
            <div className="rec-card" style={{ background: 'var(--bg)', width: '100%', maxWidth: '500px', borderRadius: 'var(--radius-xl)', padding: '1.75rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
              <h3 className="display" style={{ fontSize: '1.25rem', margin: '0 0 1rem', color: 'var(--fg)' }}>
                Report Equipment Fault / Breakdown
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--muted)', margin: '0 0 1.25rem' }}>
                Select your affected equipment. SunPower support will immediately check your warranty coverage.
              </p>

              <form onSubmit={handleCreateTicket}>
                <div style={{ marginBottom: '1rem' }}>
                  <label className="a-label" style={{ display: 'block', marginBottom: '0.35rem' }}>Select Hardware Unit</label>
                  <div className="control">
                    <select
                      value={ticketSerial}
                      onChange={(e) => setTicketSerial(e.target.value)}
                    >
                      {data?.warranties?.map((w) => (
                        <option key={w.id} value={w.serialNumber}>
                          {w.itemName} (S/N: {w.serialNumber}) - {w.isCovered ? 'Under Warranty' : 'Expired'}
                        </option>
                      ))}
                      {(!data?.warranties || data.warranties.length === 0) && (
                        <option value="INVERTER-MAIN">Solar String Inverter</option>
                      )}
                    </select>
                    <Icon icon={ChevronDown} className="chev" />
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label className="a-label" style={{ display: 'block', marginBottom: '0.35rem' }}>Fault Code / Problem Type</label>
                  <div className="control">
                    <select
                      value={ticketFault}
                      onChange={(e) => setTicketFault(e.target.value)}
                    >
                      <option value="E04 - Inverter Fault / Zero Generation">E04 - Inverter Overheat / Zero Generation</option>
                      <option value="E01 - Grid Synchronization Fault">E01 - Grid Synchronization Fault</option>
                      <option value="E08 - Earth Leakage / Ground Fault">E08 - Earth Leakage / Ground Fault</option>
                      <option value="E12 - Accidental Physical Damage">E12 - Accidental / Physical Damage</option>
                      <option value="OTHER - Generation Drop">OTHER - Severe Generation Drop</option>
                    </select>
                    <Icon icon={ChevronDown} className="chev" />
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label className="a-label" style={{ display: 'block', marginBottom: '0.35rem' }}>Detailed Symptom Description</label>
                  <textarea
                    rows={3}
                    required
                    value={ticketDesc}
                    placeholder="Describe what occurred (e.g. heavy rain yesterday, inverter screen blinking red)..."
                    onChange={(e) => setTicketDesc(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--fg)' }}
                  />
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label className="a-label" style={{ display: 'block', marginBottom: '0.35rem' }}>Photo Evidence / Screen URL (Optional)</label>
                  <input
                    type="url"
                    value={ticketPhotoUrl}
                    placeholder="https://... photo of error code screen or damage"
                    onChange={(e) => setTicketPhotoUrl(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--fg)' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn btn-quiet"
                    onClick={() => setShowTicketModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={ticketSubmitting || !ticketDesc.trim()}
                  >
                    {ticketSubmitting ? 'Submitting...' : 'Submit Claim'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}


        {/* Modal: Request New Solar Quote */}
        {showNewQuoteModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
            <div className="rec-card" style={{ background: 'var(--bg)', width: '100%', maxWidth: '520px', borderRadius: 'var(--radius-xl)', padding: '1.75rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
              <h3 className="display" style={{ fontSize: '1.25rem', margin: '0 0 0.5rem', color: 'var(--fg)' }}>
                Request Another Solar System Quote
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--muted)', margin: '0 0 1.25rem' }}>
                Add another property or factory to your account. Our sales team will automatically size your BOM and calculate PM Surya Ghar subsidies.
              </p>

              <form onSubmit={handleCreateNewQuote}>
                <div style={{ marginBottom: '1rem' }}>
                  <label className="a-label" style={{ display: 'block', marginBottom: '0.35rem' }}>Property Street Address</label>
                  <input
                    type="text"
                    required
                    value={newStreet}
                    placeholder="e.g. Plot 42, Green Avenue"
                    onChange={(e) => setNewStreet(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--fg)' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div>
                    <label className="a-label" style={{ display: 'block', marginBottom: '0.35rem' }}>City</label>
                    <input
                      type="text"
                      required
                      value={newCity}
                      placeholder="e.g. Amritsar"
                      onChange={(e) => setNewCity(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--fg)' }}
                    />
                  </div>
                  <div>
                    <label className="a-label" style={{ display: 'block', marginBottom: '0.35rem' }}>State</label>
                    <div className="control">
                      <select
                        value={newState}
                        onChange={(e) => setNewState(e.target.value)}
                      >
                        {STATES.map(([code, name]) => (
                          <option key={code} value={code}>{name}</option>
                        ))}
                      </select>
                      <Icon icon={ChevronDown} className="chev" />
                    </div>
                  </div>
                  <div>
                    <label className="a-label" style={{ display: 'block', marginBottom: '0.35rem' }}>PIN Code</label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={newZip}
                      placeholder="143001"
                      onChange={(e) => setNewZip(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--fg)' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div>
                    <label className="a-label" style={{ display: 'block', marginBottom: '0.35rem' }}>Property Type</label>
                    <div className="control">
                      <select
                        value={newPropertyType}
                        onChange={(e) => setNewPropertyType(e.target.value)}
                      >
                        <option value="House">Residential House</option>
                        <option value="Commercial">Commercial Shop / Office</option>
                        <option value="Industrial">Factory / Warehouse</option>
                      </select>
                      <Icon icon={ChevronDown} className="chev" />
                    </div>
                  </div>
                  <div>
                    <label className="a-label" style={{ display: 'block', marginBottom: '0.35rem' }}>Monthly Electricity Bill</label>
                    <div className="control">
                      <select
                        value={newBillRange}
                        onChange={(e) => setNewBillRange(e.target.value)}
                      >
                        <option value="under2000">Under ₹2,000 / month (1–2 kW)</option>
                        <option value="2000-5000">₹2,000–₹5,000 / month (3 kW)</option>
                        <option value="5000-10000">₹5,000–₹10,000 / month (4 kW)</option>
                        <option value="10000plus">Over ₹10,000 / month (5 kW+)</option>
                      </select>
                      <Icon icon={ChevronDown} className="chev" />
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label className="a-label" style={{ display: 'block', marginBottom: '0.35rem' }}>Contact Phone</label>
                  <input
                    type="tel"
                    required
                    value={newPhone}
                    placeholder="10-digit phone"
                    onChange={(e) => setNewPhone(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--fg)' }}
                  />
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label className="a-label" style={{ display: 'block', marginBottom: '0.35rem' }}>Notes / Requirements (Optional)</label>
                  <textarea
                    rows={2}
                    value={newNotes}
                    placeholder="e.g. Need battery backup for evening power cuts..."
                    onChange={(e) => setNewNotes(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--fg)' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn btn-quiet"
                    onClick={() => setShowNewQuoteModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={creatingQuote || !newStreet.trim() || !newCity.trim() || newZip.length < 6}
                  >
                    {creatingQuote ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
