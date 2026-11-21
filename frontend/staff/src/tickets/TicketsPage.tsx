import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Wrench,
  Search,
  ShieldCheck,
  Clock,
  LoaderCircle,
  ChevronDown,
} from 'lucide-react';
import {
  fetchServiceTickets,
  reviewServiceTicket,
  resolveServiceTicket,
  TICKETS_KEY,
  type ServiceTicket,
} from '../api/serviceTickets';
import { lookupWarranty, type Warranty } from '../api/quotes';
import { Icon } from '../components/Icon';
import { useCurrentUser } from '../session/session';

export function TicketsPage() {
  const user = useCurrentUser();
  const isAdmin = user.role === 'Admin';
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTicket, setSelectedTicket] = useState<ServiceTicket | null>(null);
  const [showReviewModal, setShowReviewModal] = useState<boolean>(false);
  const [showResolveModal, setShowResolveModal] = useState<boolean>(false);

  // Review form state
  const [damageType, setDamageType] = useState<string>('EquipmentFailure');
  const [isCovered, setIsCovered] = useState<boolean>(true);
  const [partsCost, setPartsCost] = useState<number>(0);
  const [laborCost, setLaborCost] = useState<number>(0);
  const [adminNotes, setAdminNotes] = useState<string>('');

  // Resolve form state
  const [replacementSerial, setReplacementSerial] = useState<string>('');
  const [resolutionNotes, setResolutionNotes] = useState<string>('');
  const [signatureData, setSignatureData] = useState<string>('');

  const ticketsQuery = useQuery({
    queryKey: TICKETS_KEY(activeTab === 'All' ? undefined : activeTab),
    queryFn: ({ signal }) => fetchServiceTickets(activeTab === 'All' ? undefined : activeTab, signal),
  });

  const warrantyLookupQuery = useQuery({
    queryKey: ['warranty-lookup', searchQuery],
    queryFn: ({ signal }) => lookupWarranty(searchQuery, signal),
    enabled: searchQuery.trim().length >= 3,
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: any }) => reviewServiceTicket(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service-tickets'] });
      setShowReviewModal(false);
      setSelectedTicket(null);
    },
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: any }) => resolveServiceTicket(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service-tickets'] });
      setShowResolveModal(false);
      setSelectedTicket(null);
    },
  });

  const openReview = (ticket: ServiceTicket) => {
    setSelectedTicket(ticket);
    setDamageType(ticket.damageType);
    setIsCovered(ticket.isWarrantyCovered);
    setPartsCost(ticket.partsCostRupees);
    setLaborCost(ticket.laborCostRupees);
    setAdminNotes(ticket.adminNotes ?? '');
    setShowReviewModal(true);
  };

  const openResolve = (ticket: ServiceTicket) => {
    setSelectedTicket(ticket);
    setReplacementSerial('');
    setResolutionNotes('');
    setSignatureData('data:image/svg+xml;base64,PHN2Zz5zaWduYXR1cmU8L3N2Zz4=');
    setShowResolveModal(true);
  };

  const tabs = [
    'All',
    'Open',
    'Reviewed',
    'Approved',
    'ResolvedPendingCustomerConfirmation',
    'Closed',
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="a-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Icon icon={Wrench} color="var(--accent)" />
            <span>Service &amp; Warranty Tickets</span>
          </h1>
          <p className="page-intro" style={{ margin: '0.25rem 0 0' }}>
            Post-sales breakdown desk, sub-second warranty verification, and repair workflows (Scene 5).
          </p>
        </div>
      </div>

      {/* Sub-Second Search Bar */}
      <div
        className="rec-card"
        style={{
          padding: '1.25rem',
          marginBottom: '2rem',
          background: 'var(--bg-raised, #ffffff)',
          border: '1px solid var(--line)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Icon icon={Search} size={20} color="var(--muted)" />
          <input
            type="text"
            placeholder="Sub-second lookup by Serial Number, Customer Phone, Email, or Name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              fontSize: '1rem',
              color: 'var(--fg)',
              outline: 'none',
            }}
          />
          {searchQuery && (
            <button
              className="btn btn-quiet btn-sm"
              onClick={() => setSearchQuery('')}
              style={{ fontSize: '0.8rem' }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Live Lookup Results */}
        {warrantyLookupQuery.isLoading && (
          <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--muted)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Icon icon={LoaderCircle} className="spin" size={14} />
            <span>Searching warranty database...</span>
          </div>
        )}

        {warrantyLookupQuery.data?.found && (
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--line)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
              Instant Hardware Warranty Match ({warrantyLookupQuery.data.warranties.length} units found)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
              {warrantyLookupQuery.data.warranties.map((w: Warranty) => (
                <div
                  key={w.id}
                  style={{
                    padding: '0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg, #f9fafb)',
                    borderLeft: w.isCovered ? '3px solid #16a34a' : '3px solid #dc2626',
                    fontSize: '0.85rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                    <span>{w.itemName}</span>
                    <span style={{ color: w.isCovered ? '#166534' : '#991b1b', fontSize: '0.75rem' }}>
                      {w.isCovered ? `Active (${w.remainingDays}d)` : 'Expired'}
                    </span>
                  </div>
                  <div style={{ color: 'var(--muted)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                    S/N: <code>{w.serialNumber}</code> &bull; Customer: {w.customerName}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--line)', marginBottom: '1.5rem', overflowX: 'auto' }}>
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            className="btn btn-quiet"
            style={{
              padding: '0.5rem 1rem',
              borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
              borderRadius: 0,
              fontWeight: activeTab === tab ? 700 : 500,
              color: activeTab === tab ? 'var(--fg)' : 'var(--muted)',
            }}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'ResolvedPendingCustomerConfirmation' ? 'Awaiting Customer Signoff' : tab}
          </button>
        ))}
      </div>

      {/* Ticket List */}
      {ticketsQuery.isLoading ? (
        <div style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--muted)' }}>
          <Icon icon={LoaderCircle} className="spin" size={24} />
          <p>Loading service tickets...</p>
        </div>
      ) : ticketsQuery.data?.length === 0 ? (
        <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--muted)' }}>
          <Icon icon={ShieldCheck} size={48} color="var(--line-strong)" />
          <p style={{ marginTop: '1rem', fontSize: '1.1rem' }}>No tickets in this state.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {ticketsQuery.data?.map((ticket) => {
            const isPendingConfirm = ticket.status === 'ResolvedPendingCustomerConfirmation';

            return (
              <div
                key={ticket.id}
                className="rec-card"
                style={{
                  padding: '1.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '1rem',
                  borderLeft:
                    ticket.status === 'Closed'
                      ? '4px solid #16a34a'
                      : isPendingConfirm
                      ? '4px solid #3b82f6'
                      : ticket.damageType === 'AccidentalDamage'
                      ? '4px solid #f59e0b'
                      : '4px solid #ef4444',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--fg)' }}>
                      Ticket #{ticket.id}
                    </span>
                    <span
                      style={{
                        padding: '0.15rem 0.5rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background:
                          ticket.status === 'Closed'
                            ? '#dcfce7'
                            : isPendingConfirm
                            ? '#dbeafe'
                            : '#fef3c7',
                        color:
                          ticket.status === 'Closed'
                            ? '#166534'
                            : isPendingConfirm
                            ? '#1e40af'
                            : '#92400e',
                      }}
                    >
                      {isPendingConfirm ? 'Awaiting Customer Signoff' : ticket.status}
                    </span>

                    <span
                      style={{
                        padding: '0.15rem 0.5rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: ticket.isWarrantyCovered ? '#dcfce7' : '#fee2e2',
                        color: ticket.isWarrantyCovered ? '#166534' : '#991b1b',
                      }}
                    >
                      {ticket.isWarrantyCovered ? '₹0 Covered Warranty' : `Billable: ₹${ticket.totalBilledRupees.toLocaleString()}`}
                    </span>
                  </div>

                  <h3 style={{ margin: '0.25rem 0 0.5rem', fontSize: '1.05rem', color: 'var(--fg)' }}>
                    {ticket.faultCode} &bull; {ticket.hardwareItem}
                  </h3>

                  <p style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', color: 'var(--muted)' }}>
                    {ticket.description}
                  </p>

                  <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.8rem', color: 'var(--muted)', flexWrap: 'wrap' }}>
                    <span>Customer: <b>{ticket.customerName}</b> ({ticket.customerPhone})</span>
                    <span>Serial: <code>{ticket.serialNumber}</code></span>
                    <span>Installation: <b>#{ticket.installationId}</b></span>
                    <span>Reported: {new Date(ticket.createdAt).toLocaleDateString()}</span>
                  </div>

                  {ticket.replacementSerialNumber && (
                    <div style={{ marginTop: '0.6rem', fontSize: '0.825rem', color: '#166534', background: '#dcfce7', padding: '0.4rem 0.6rem', borderRadius: '4px', display: 'inline-block' }}>
                      Replacement Unit Swapped: <code>{ticket.replacementSerialNumber}</code>
                    </div>
                  )}

                  {ticket.adminNotes && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--muted)', fontStyle: 'italic' }}>
                      Admin Notes: {ticket.adminNotes}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '150px' }}>
                  {isAdmin && (ticket.status === 'Open' || ticket.status === 'Reviewed') && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => openReview(ticket)}
                    >
                      Review &amp; Set Terms
                    </button>
                  )}

                  {(ticket.status === 'Approved' || ticket.status === 'InProgress') && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => openResolve(ticket)}
                    >
                      Technician Swap &amp; Sign
                    </button>
                  )}

                  {isPendingConfirm && (
                    <div style={{ fontSize: '0.75rem', color: '#1e40af', background: '#eff6ff', padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>
                      <Icon icon={Clock} size={14} />
                      <span style={{ marginLeft: '0.3rem' }}>Power restored on-site. Customer must confirm in portal to close.</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Admin Review Modal */}
      {showReviewModal && selectedTicket && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div className="rec-card" style={{ background: 'var(--bg)', width: '100%', maxWidth: '520px', padding: '1.75rem', borderRadius: 'var(--radius-lg)' }}>
            <h2 className="a-heading" style={{ margin: '0 0 1rem' }}>
              Review Breakdown Claim #{selectedTicket.id}
            </h2>

            <div style={{ marginBottom: '1rem' }}>
              <label className="a-label" style={{ display: 'block', marginBottom: '0.35rem' }}>Cause Classification</label>
              <div className="control">
                <select
                  value={damageType}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDamageType(val);
                    if (val === 'AccidentalDamage') {
                      setIsCovered(false);
                      setPartsCost(32000);
                      setLaborCost(1500);
                    } else {
                      setIsCovered(true);
                      setPartsCost(0);
                      setLaborCost(0);
                    }
                  }}
                >
                  <option value="EquipmentFailure">Equipment Failure / Rain Damage (Warranty Defect)</option>
                  <option value="AccidentalDamage">Accidental Damage / Physical Tampering (Billable)</option>
                  <option value="WearAndTear">Out-of-Warranty Wear &amp; Tear (Billable)</option>
                </select>
                <Icon icon={ChevronDown} className="chev" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <label className="a-label" style={{ display: 'block', marginBottom: '0.35rem' }}>Parts Cost (₹)</label>
                <input
                  type="number"
                  value={partsCost}
                  disabled={isCovered}
                  onChange={(e) => setPartsCost(Number(e.target.value))}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--line)' }}
                />
              </div>
              <div>
                <label className="a-label" style={{ display: 'block', marginBottom: '0.35rem' }}>Labor Cost (₹)</label>
                <input
                  type="number"
                  value={laborCost}
                  disabled={isCovered}
                  onChange={(e) => setLaborCost(Number(e.target.value))}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--line)' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label className="a-label" style={{ display: 'block', marginBottom: '0.35rem' }}>Admin Resolution Notes</label>
              <textarea
                rows={3}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Diagnostic telemetry and customer terms explanation..."
                style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--line)' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-quiet"
                onClick={() => setShowReviewModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={reviewMutation.isPending}
                onClick={() =>
                  reviewMutation.mutate({
                    id: selectedTicket.id,
                    body: {
                      damageType,
                      isWarrantyCovered: isCovered,
                      partsCostRupees: partsCost,
                      laborCostRupees: laborCost,
                      adminNotes,
                    },
                  })
                }
              >
                {reviewMutation.isPending ? 'Sending...' : 'Confirm Terms & Send to Customer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Technician On-Site Swap Modal */}
      {showResolveModal && selectedTicket && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div className="rec-card" style={{ background: 'var(--bg)', width: '100%', maxWidth: '520px', padding: '1.75rem', borderRadius: 'var(--radius-lg)' }}>
            <h2 className="a-heading" style={{ margin: '0 0 1rem' }}>
              On-Site Hardware Swap &amp; Customer Handover
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', margin: '0 0 1rem' }}>
              Physical unit replacement for ticket #{selectedTicket.id}. Enter scanned replacement serial number and capture customer handover signature.
            </p>

            <div style={{ marginBottom: '1rem' }}>
              <label className="a-label" style={{ display: 'block', marginBottom: '0.35rem' }}>New Replacement Serial Number</label>
              <input
                type="text"
                value={replacementSerial}
                placeholder="Scan or enter new unit S/N..."
                onChange={(e) => setReplacementSerial(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--line)' }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label className="a-label" style={{ display: 'block', marginBottom: '0.35rem' }}>On-Site Testing &amp; Resolution Notes</label>
              <textarea
                rows={2}
                value={resolutionNotes}
                placeholder="e.g. Swapped inverter, tested generation at 2.8 kW, seals verified."
                onChange={(e) => setResolutionNotes(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--line)' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-quiet"
                onClick={() => setShowResolveModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!replacementSerial.trim() || resolveMutation.isPending}
                onClick={() =>
                  resolveMutation.mutate({
                    id: selectedTicket.id,
                    body: {
                      replacementSerialNumber: replacementSerial,
                      resolutionNotes,
                      customerSignatureData: signatureData,
                    },
                  })
                }
              >
                {resolveMutation.isPending ? 'Saving...' : 'Complete Swap & Request Customer Signoff'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
