import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  ShieldCheck,
  Clock,
  LoaderCircle,
  ChevronDown,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import {
  fetchServiceTickets,
  reviewServiceTicket,
  scheduleServiceTicket,
  resolveServiceTicket,
  TICKETS_KEY,
  type ServiceTicket,
} from '../api/serviceTickets';
import { lookupWarranty, type Warranty } from '../api/quotes';
import { fetchTechnicians } from '../api/surveys';
import { Icon } from '../components/Icon';
import { Dialog } from '../components/Dialog';
import { PageHead } from '../components/PageHead';
import { useCurrentUser } from '../session/session';

const localDateTimeValue = (date: Date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

export function TicketsPage() {
  const user = useCurrentUser();
  const isAdmin = user.role === 'Admin';
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTicket, setSelectedTicket] = useState<ServiceTicket | null>(null);
  const [showReviewModal, setShowReviewModal] = useState<boolean>(false);
  const [showScheduleModal, setShowScheduleModal] = useState<boolean>(false);
  const [showResolveModal, setShowResolveModal] = useState<boolean>(false);

  // Review form state
  const [damageType, setDamageType] = useState<string>('EquipmentFailure');
  const [isCovered, setIsCovered] = useState<boolean>(true);
  const [partsCost, setPartsCost] = useState<number>(0);
  const [laborCost, setLaborCost] = useState<number>(0);
  const [adminNotes, setAdminNotes] = useState<string>('');

  // Scheduled technician visit state
  const [scheduledTechId, setScheduledTechId] = useState<number>(0);
  const [scheduledAt, setScheduledAt] = useState<string>('');

  // Resolve form state
  const [replacementSerial, setReplacementSerial] = useState<string>('');
  const [testedGenerationKw, setTestedGenerationKw] = useState<number>(2.85);
  const [signedByName, setSignedByName] = useState<string>('');
  const [replacementPhotoUrl, setReplacementPhotoUrl] = useState<string>('/images/inverter_wiring.svg');
  const [resolutionNotes, setResolutionNotes] = useState<string>('');
  const [signatureData, setSignatureData] = useState<string>('');

  const ticketsQuery = useQuery({
    queryKey: TICKETS_KEY(activeTab === 'All' ? undefined : activeTab),
    queryFn: ({ signal }) => fetchServiceTickets(activeTab === 'All' ? undefined : activeTab, signal),
  });

  const techniciansQuery = useQuery({
    queryKey: ['technicians'],
    queryFn: ({ signal }) => fetchTechnicians(signal),
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

  const scheduleMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: { technicianId: number; scheduledAt: string } }) => scheduleServiceTicket(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service-tickets'] });
      setShowScheduleModal(false);
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

  const openSchedule = (ticket: ServiceTicket) => {
    setSelectedTicket(ticket);
    setScheduledTechId(ticket.assignedTechnicianId ?? techniciansQuery.data?.[0]?.id ?? 0);
    setScheduledAt(ticket.scheduledVisitAt
      ? localDateTimeValue(new Date(ticket.scheduledVisitAt))
      : localDateTimeValue(new Date(Date.now() + 86400000)));
    setShowScheduleModal(true);
  };

  const openResolve = (ticket: ServiceTicket) => {
    setSelectedTicket(ticket);
    setReplacementSerial('');
    setTestedGenerationKw(ticket.testedGenerationKw ?? 2.85);
    setSignedByName(ticket.customerName);
    setReplacementPhotoUrl(ticket.replacementPhotoUrl ?? '/images/inverter_wiring.svg');
    setResolutionNotes(ticket.technicianResolutionNotes ?? '');
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
    <>
      <PageHead title="Service tickets">
        <nav className="filters" aria-label="Filter service tickets">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              className="btn btn-quiet btn-sm"
              aria-current={activeTab === tab ? 'true' : undefined}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'ResolvedPendingCustomerConfirmation' ? 'Awaiting sign-off' : tab}
            </button>
          ))}
        </nav>
      </PageHead>

      {/* Sub-Second Search Bar */}
      <div className="warranty-lookup-panel">
        <div className="control list-search" style={{ width: '100%' }}>
          <Icon icon={Search} />
          <label className="sr" htmlFor="tickets-q">Search warranty and tickets</label>
          <input
            id="tickets-q"
            type="search"
            placeholder="Sub-second lookup by serial number, phone, email, or name…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="btn btn-quiet btn-sm"
              onClick={() => setSearchQuery('')}
            >
              Clear
            </button>
          )}
        </div>

        {warrantyLookupQuery.isLoading && (
          <div className="field-help" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Icon icon={LoaderCircle} className="spin" />
            <span>Searching warranty database…</span>
          </div>
        )}

        {warrantyLookupQuery.data?.found && (
          <div className="warranty-lookup-results">
            {warrantyLookupQuery.data.warranties.map((w: Warranty) => (
              <div key={w.id} className="warranty-match-item">
                <div className="warranty-match-head">
                  <span>{w.itemName}</span>
                  <span className={`chip ${w.isCovered ? 'tone-positive' : 'tone-negative'}`}>
                    {w.isCovered ? `Active (${w.remainingDays}d)` : 'Expired'}
                  </span>
                </div>
                <div className="warranty-match-sub">
                  Serial: <code>{w.serialNumber}</code> &middot; Customer: {w.customerName}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ticket List */}
      {ticketsQuery.isLoading ? (
        <div className="state-box">
          <div className="state">
            <span className="ring"><Icon icon={LoaderCircle} className="spin" /></span>
            <p className="a-heading">Loading tickets</p>
            <p>Fetching active customer claims and service requests…</p>
          </div>
        </div>
      ) : ticketsQuery.data?.length === 0 ? (
        <div className="state-box">
          <div className="state">
            <span className="ring"><Icon icon={ShieldCheck} /></span>
            <p className="a-heading">No tickets in this state</p>
            <p>All service requests are up to date.</p>
          </div>
        </div>
      ) : (
        <div className="ticket-list">
          {ticketsQuery.data?.map((ticket) => {
            const isPendingConfirm = ticket.status === 'ResolvedPendingCustomerConfirmation';

            return (
              <div key={ticket.id} className="ticket-card">
                <div className="ticket-head">
                  <div className="ticket-meta-title">
                    <h2 className="a-heading" style={{ margin: 0 }}>Ticket #{ticket.id}: {ticket.faultCode}</h2>
                    <div className="ticket-tags">
                      <span className={`chip ${ticket.status === 'Closed' ? 'tone-positive' : isPendingConfirm ? 'tone-info' : 'tone-warning'}`}>
                        {isPendingConfirm ? 'Awaiting customer sign-off' : ticket.status}
                      </span>
                      <span className={`chip ${ticket.isWarrantyCovered ? 'tone-positive' : 'tone-negative'}`}>
                        {ticket.isWarrantyCovered ? 'Warranty covered' : `Billable: ₹${ticket.totalBilledRupees.toLocaleString()}`}
                      </span>
                    </div>
                  </div>

                  <div className="ticket-actions">
                    {isAdmin && (ticket.status === 'Open' || ticket.status === 'Reviewed') && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => openReview(ticket)}
                      >
                        Review and set terms
                      </button>
                    )}

                    {isAdmin && (ticket.status === 'Reviewed' || ticket.status === 'Approved' || ticket.status === 'InProgress') && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => openSchedule(ticket)}
                      >
                        {ticket.assignedTechnicianId ? 'Reschedule visit' : 'Assign technician'}
                      </button>
                    )}

                    {(ticket.status === 'Approved' || ticket.status === 'InProgress') && (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => openResolve(ticket)}
                      >
                        Technician swap and sign
                      </button>
                    )}
                  </div>
                </div>

                <p className="ticket-desc">{ticket.description || 'No additional fault details reported.'}</p>

                <div className="ticket-details">
                  <div>Customer: <b>{ticket.customerName}</b> ({ticket.customerPhone})</div>
                  <div>Hardware: <b>{ticket.hardwareItem}</b></div>
                  <div>Serial: <code>{ticket.serialNumber}</code></div>
                  <div>Installation: <b>#{ticket.installationId}</b></div>
                  <div>Reported: {new Date(ticket.createdAt).toLocaleDateString()}</div>
                  {ticket.assignedTechnicianName && ticket.scheduledVisitAt && (
                    <div><Icon icon={Calendar} size={14} /> Scheduled: <b>{ticket.assignedTechnicianName}</b> · {new Date(ticket.scheduledVisitAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</div>
                  )}
                </div>

                {ticket.replacementSerialNumber && (
                  <div className="ticket-swapped">
                    <Icon icon={CheckCircle2} />
                    <span>Replacement unit swapped: <code>{ticket.replacementSerialNumber}</code></span>
                  </div>
                )}

                {ticket.adminNotes && (
                  <div className="ticket-notes">
                    Admin notes: {ticket.adminNotes}
                  </div>
                )}

                {isPendingConfirm && (
                  <div className="notice tone-info">
                    <Icon icon={Clock} />
                    <p>Power restored on-site. Customer must confirm in customer portal to close.</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Admin Review Modal */}
      {showReviewModal && selectedTicket && (
        <Dialog labelledBy="review-dialog-title" onClose={() => setShowReviewModal(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              reviewMutation.mutate({
                id: selectedTicket.id,
                body: {
                  damageType,
                  isWarrantyCovered: isCovered,
                  partsCostRupees: partsCost,
                  laborCostRupees: laborCost,
                  adminNotes,
                },
              });
            }}
          >
            <h2 className="a-heading" id="review-dialog-title">
              Review breakdown claim #{selectedTicket.id}
            </h2>

            <div className="field">
              <label className="field-label" htmlFor="review-damage-type">Cause classification</label>
              <div className="control">
                <select
                  id="review-damage-type"
                  className="review-cause-select"
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
                  <option value="EquipmentFailure">Equipment failure or rain damage (warranty covered)</option>
                  <option value="AccidentalDamage">Accidental damage or physical tampering (billable)</option>
                  <option value="WearAndTear">Out-of-warranty wear and tear (billable)</option>
                </select>
                <Icon icon={ChevronDown} className="chev" />
              </div>
            </div>

            <div className="survey-fields">
              <div className="field">
                <label className="field-label" htmlFor="review-parts-cost">Parts cost (₹)</label>
                <div className="control">
                  <input
                    id="review-parts-cost"
                    type="number"
                    value={partsCost}
                    disabled={isCovered}
                    onChange={(e) => setPartsCost(Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="field">
                <label className="field-label" htmlFor="review-labor-cost">Labor cost (₹)</label>
                <div className="control">
                  <input
                    id="review-labor-cost"
                    type="number"
                    value={laborCost}
                    disabled={isCovered}
                    onChange={(e) => setLaborCost(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

            <div className="field">
              <label className="field-label" htmlFor="review-admin-notes">Resolution notes</label>
              <div className="control control-area">
                <textarea
                  id="review-admin-notes"
                  rows={3}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Diagnostic telemetry and customer terms explanation…"
                />
              </div>
            </div>

            <div className="actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowReviewModal(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={reviewMutation.isPending}
              >
                {reviewMutation.isPending ? 'Sending…' : 'Confirm terms and send to customer'}
              </button>
            </div>
          </form>
        </Dialog>
      )}

      {showScheduleModal && selectedTicket && (
        <Dialog labelledBy="schedule-dialog-title" onClose={() => setShowScheduleModal(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!scheduledTechId || !scheduledAt) return;
              scheduleMutation.mutate({
                id: selectedTicket.id,
                body: { technicianId: scheduledTechId, scheduledAt: new Date(scheduledAt).toISOString() },
              });
            }}
          >
            <h2 className="a-heading" id="schedule-dialog-title">Schedule technician visit</h2>
            <p className="a-body">Assign an active technician to visit {selectedTicket.propertyAddress} for ticket #{selectedTicket.id}.</p>
            <div className="field">
              <label className="field-label" htmlFor="schedule-technician">Technician</label>
              <div className="control">
                <select id="schedule-technician" required value={scheduledTechId} onChange={(e) => setScheduledTechId(Number(e.target.value))}>
                  <option value={0}>Choose technician</option>
                  {techniciansQuery.data?.map(tech => <option key={tech.id} value={tech.id}>{tech.name} · {tech.email}</option>)}
                </select>
                <Icon icon={ChevronDown} className="chev" />
              </div>
            </div>
            <div className="field">
              <label className="field-label" htmlFor="schedule-at">Appointment date and time</label>
              <div className="control">
                <input id="schedule-at" type="datetime-local" required value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
              </div>
            </div>
            <div className="actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowScheduleModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={!scheduledTechId || !scheduledAt || scheduleMutation.isPending}>
                {scheduleMutation.isPending ? 'Scheduling…' : 'Save visit'}
              </button>
            </div>
          </form>
        </Dialog>
      )}

      {/* Technician On-Site Swap Modal */}
      {showResolveModal && selectedTicket && (
        <Dialog labelledBy="resolve-dialog-title" onClose={() => setShowResolveModal(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!replacementSerial.trim()) return;
              resolveMutation.mutate({
                id: selectedTicket.id,
                body: {
                  replacementSerialNumber: replacementSerial.trim(),
                  testedGenerationKw,
                  replacementPhotoUrl,
                  resolutionNotes: resolutionNotes.trim(),
                  customerSignatureData: signatureData,
                  signedByName: signedByName.trim(),
                },
              });
            }}
          >
            <h2 className="a-heading" id="resolve-dialog-title">
              On-site hardware swap and handover
            </h2>
            <p className="a-body">
              Physical unit replacement for ticket #{selectedTicket.id}. Enter scanned replacement serial number and verify testing on-site.
            </p>

            <div className="field">
              <label className="field-label" htmlFor="resolve-serial">New replacement serial number</label>
              <div className="control">
                <input
                  id="resolve-serial"
                  type="text"
                  required
                  value={replacementSerial}
                  placeholder="Scan or enter new unit S/N…"
                  onChange={(e) => setReplacementSerial(e.target.value)}
                />
              </div>
            </div>

            <div className="field">
              <label className="field-label" htmlFor="resolve-output">Tested generation (kW)</label>
              <div className="control">
                <input
                  id="resolve-output"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={testedGenerationKw}
                  onChange={(e) => setTestedGenerationKw(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="field">
              <label className="field-label" htmlFor="resolve-signed-by">Customer accepting the work</label>
              <div className="control">
                <input
                  id="resolve-signed-by"
                  type="text"
                  required
                  value={signedByName}
                  onChange={(e) => setSignedByName(e.target.value)}
                />
              </div>
            </div>

            <div className="field">
              <label className="field-label" htmlFor="resolve-photo">Replacement unit photo URL</label>
              <div className="control">
                <input
                  id="resolve-photo"
                  type="text"
                  value={replacementPhotoUrl}
                  onChange={(e) => setReplacementPhotoUrl(e.target.value)}
                />
              </div>
            </div>

            <div className="field">
              <label className="field-label" htmlFor="resolve-notes">On-site testing notes</label>
              <div className="control control-area">
                <textarea
                  id="resolve-notes"
                  rows={2}
                  value={resolutionNotes}
                  placeholder="e.g. Swapped inverter, tested generation at 2.8 kW, seals verified."
                  onChange={(e) => setResolutionNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowResolveModal(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!replacementSerial.trim() || !signedByName.trim() || resolveMutation.isPending}
              >
                {resolveMutation.isPending ? 'Saving…' : 'Complete swap and request customer signoff'}
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  );
}
