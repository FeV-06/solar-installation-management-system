import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Download,
  Printer,
  TrendingUp,
  CheckCircle2,
  Clock,
  IndianRupee,
  Users,
  Wrench,
  SolarPanel,
  ClipboardCheck,
  Package,
  ArrowRight,
  X,
} from 'lucide-react';
import {
  fetchDirectorOverview,
  updateSubsidyStatus,
  DIRECTOR_OVERVIEW_KEY,
  type SubsidyClaim,
} from '../api/director';
import { PageHead } from '../components/PageHead';
import { QueryView } from '../states/QueryView';
import { formatMoment } from '../lib/dates';

const TIMEFRAMES = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'all', label: 'All Time' },
] as const;

type Timeframe = (typeof TIMEFRAMES)[number]['id'];
type MarginFilter = 'all' | 'profitable' | 'loss';

function formatInr(val: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val);
}

export function DirectorDashboardPage() {
  const [timeframe, setTimeframe] = useState<Timeframe>('all');
  const [marginFilter, setMarginFilter] = useState<MarginFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'economics' | 'subsidies' | 'payroll' | 'backlog'>('economics');
  const [editingClaim, setEditingClaim] = useState<SubsidyClaim | null>(null);
  const [newStatus, setNewStatus] = useState<string>('InspectionCleared');
  const [disbursementRef, setDisbursementRef] = useState<string>('');
  const [statusNotes, setStatusNotes] = useState<string>('');

  const queryClient = useQueryClient();

  const overviewQuery = useQuery({
    queryKey: DIRECTOR_OVERVIEW_KEY(timeframe),
    queryFn: ({ signal }) => fetchDirectorOverview(timeframe, signal),
  });

  const updateSubsidyMutation = useMutation({
    mutationFn: ({ id, status, ref, notes }: { id: number; status: string; ref?: string; notes?: string }) =>
      updateSubsidyStatus(id, {
        status,
        disbursementReference: ref || undefined,
        notes: notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['director-overview'] });
      setEditingClaim(null);
      setDisbursementRef('');
      setStatusNotes('');
    },
  });

  const handleExportCsv = async () => {
    try {
      const response = await fetch(`/api/director/export/csv?period=${timeframe}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('sol_token') || ''}`,
        },
      });
      if (!response.ok) throw new Error('Failed to export CSV');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `director-financials-${timeframe}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Could not download CSV export.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="director-container">
      <PageHead title="Director's Operations & Financials">
        <div className="director-actions no-print">
          {/* Timeframe pill selector */}
          <div className="timeframe-bar">
            {TIMEFRAMES.map(t => (
              <button
                key={t.id}
                type="button"
                className={`timeframe-btn ${timeframe === t.id ? 'active' : ''}`}
                onClick={() => setTimeframe(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleExportCsv}
            title="Download CSV statement"
          >
            <Download size={14} style={{ marginRight: '0.35rem' }} /> Export CSV
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handlePrint}
            title="Print clean financial report"
          >
            <Printer size={14} style={{ marginRight: '0.35rem' }} /> Print
          </button>
        </div>
      </PageHead>

      <p style={{ margin: '-0.75rem 0 0.25rem', color: 'var(--muted)', fontSize: '0.875rem' }} className="no-print">
        Real job-level unit economics, cash vs. receivables, PM Surya Ghar subsidy pipeline, and crew payroll.
      </p>

      <QueryView
        query={overviewQuery}
        what="financial metrics"
        isEmpty={data => !data}
      >
        {overview => {
          const { summary, jobEconomics, subsidyPipeline, operationsBacklog, crewPayroll } = overview;

          // Filter jobs
          const filteredJobs = jobEconomics.filter(j => {
            if (marginFilter === 'profitable' && !j.isProfitable) return false;
            if (marginFilter === 'loss' && j.isProfitable) return false;
            if (searchQuery.trim()) {
              const q = searchQuery.toLowerCase();
              return (
                j.customerName.toLowerCase().includes(q) ||
                j.propertyCity.toLowerCase().includes(q) ||
                j.installationId.toString().includes(q)
              );
            }
            return true;
          });

          return (
            <>
              {/* Executive Financial KPI Cards */}
              <div className="kpi-grid">
                {/* 1. Cash Collected */}
                <div className="kpi-card highlight">
                  <div className="kpi-label">Cash Collected (Real)</div>
                  <div className="kpi-value" style={{ color: 'var(--positive, #16a34a)' }}>
                    {formatInr(summary.cashCollectedRupees)}
                  </div>
                  <div className="kpi-sub">
                    <CheckCircle2 size={13} color="#16a34a" /> Verified customer payments in DB
                  </div>
                </div>

                {/* 2. Accounts Receivable */}
                <div className="kpi-card">
                  <div className="kpi-label">Accounts Receivable</div>
                  <div className="kpi-value" style={{ color: summary.accountsReceivableRupees > 0 ? '#b45309' : 'var(--fg)' }}>
                    {formatInr(summary.accountsReceivableRupees)}
                  </div>
                  <div className="kpi-sub">
                    <Clock size={13} /> Unpaid balance on accepted quotes
                  </div>
                </div>

                {/* 3. Direct BOM Equipment Costs */}
                <div className="kpi-card">
                  <div className="kpi-label">Direct BOM Hardware Cost</div>
                  <div className="kpi-value">{formatInr(summary.totalBOMEquipmentCostRupees)}</div>
                  <div className="kpi-sub">
                    <Package size={13} /> Sized panels, inverters & mounts
                  </div>
                </div>

                {/* 4. Technician Labor Pay */}
                <div className="kpi-card">
                  <div className="kpi-label">Crew Payroll (Hours × ₹500)</div>
                  <div className="kpi-value">{formatInr(summary.totalTechnicianLaborCostRupees)}</div>
                  <div className="kpi-sub">
                    <Users size={13} /> {crewPayroll.totalLoggedHours.toFixed(1)} hrs field labor logged
                  </div>
                </div>

                {/* 5. Net Operating Profit */}
                <div className={`kpi-card ${summary.netProfitRupees >= 0 ? 'positive' : 'negative'}`}>
                  <div className="kpi-label">Net Job Margin / Profit</div>
                  <div
                    className="kpi-value"
                    style={{ color: summary.netProfitRupees >= 0 ? '#15803d' : '#b91c1c' }}
                  >
                    {formatInr(summary.netProfitRupees)}
                  </div>
                  <div className="kpi-sub">
                    <span
                      className={`margin-badge ${summary.netMarginPercentage >= 0 ? 'profitable' : 'loss'}`}
                    >
                      {summary.netMarginPercentage >= 0 ? '+' : ''}
                      {summary.netMarginPercentage.toFixed(1)}% Margin
                    </span>
                    <span style={{ fontSize: '0.75rem' }}>
                      ({summary.profitableJobsCount} profitable / {summary.lossMakingJobsCount} loss)
                    </span>
                  </div>
                </div>

                {/* 6. PM Surya Ghar Subsidies */}
                <div className="kpi-card">
                  <div className="kpi-label">Govt Subsidies Disbursed</div>
                  <div className="kpi-value" style={{ color: '#0369a1' }}>
                    {formatInr(summary.totalSubsidyDisbursedRupees)}
                  </div>
                  <div className="kpi-sub">
                    <span>{formatInr(summary.totalSubsidyPendingRupees)} pending clearance</span>
                  </div>
                </div>
              </div>

              {/* Navigation Tabs for Executive Sections */}
              <div
                className="no-print"
                style={{
                  display: 'flex',
                  gap: '0.5rem',
                  borderBottom: '1px solid var(--line)',
                  paddingBottom: '0.5rem',
                  marginTop: '0.5rem',
                }}
              >
                <button
                  type="button"
                  className={activeTab === 'economics' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
                  onClick={() => setActiveTab('economics')}
                >
                  <TrendingUp size={14} style={{ marginRight: '0.35rem' }} />
                  Job Unit Economics ({jobEconomics.length})
                </button>
                <button
                  type="button"
                  className={activeTab === 'subsidies' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
                  onClick={() => setActiveTab('subsidies')}
                >
                  <IndianRupee size={14} style={{ marginRight: '0.35rem' }} />
                  PM Surya Ghar Pipeline ({subsidyPipeline.totalClaims})
                </button>
                <button
                  type="button"
                  className={activeTab === 'backlog' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
                  onClick={() => setActiveTab('backlog')}
                >
                  <Clock size={14} style={{ marginRight: '0.35rem' }} />
                  Operations Backlog ({operationsBacklog.totalBacklogCount})
                </button>
                <button
                  type="button"
                  className={activeTab === 'payroll' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
                  onClick={() => setActiveTab('payroll')}
                >
                  <Users size={14} style={{ marginRight: '0.35rem' }} />
                  Crew Payroll ({crewPayroll.technicians.length})
                </button>
              </div>

              {/* TAB 1: Job-Level Unit Economics Table */}
              {(activeTab === 'economics' || true) && (
                <div
                  className="rec-card"
                  style={{
                    padding: '1.25rem',
                    display: activeTab === 'economics' ? 'block' : 'none',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '0.75rem',
                      marginBottom: '1rem',
                    }}
                    className="no-print"
                  >
                    <div>
                      <h2 style={{ fontSize: '1.15rem', fontWeight: 600, margin: 0, color: 'var(--fg)' }}>
                        Installation Profit & Loss Ledger
                      </h2>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>
                        Revenue Collected − Direct BOM Equipment Cost − Technician Labor Pay − Warranty Absorption
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <input
                        type="text"
                        placeholder="Search customer, city..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{
                          padding: '0.35rem 0.65rem',
                          fontSize: '0.8125rem',
                          borderRadius: '6px',
                          border: '1px solid var(--line)',
                          background: 'var(--bg-raised)',
                          color: 'var(--fg)',
                        }}
                      />

                      <div style={{ display: 'inline-flex', gap: '0.25rem' }}>
                        {(['all', 'profitable', 'loss'] as const).map(mf => (
                          <button
                            key={mf}
                            type="button"
                            className={`btn btn-sm ${marginFilter === mf ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setMarginFilter(mf)}
                          >
                            {mf === 'all' ? 'All' : mf === 'profitable' ? 'Profitable' : 'Loss / Overruns'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--line)', color: 'var(--muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>
                          <th style={{ padding: '0.75rem 0.75rem' }}>Job #</th>
                          <th style={{ padding: '0.75rem 0.75rem' }}>Customer</th>
                          <th style={{ padding: '0.75rem 0.75rem' }}>System</th>
                          <th style={{ padding: '0.75rem 0.75rem', textAlign: 'right' }}>Collected (Rev)</th>
                          <th style={{ padding: '0.75rem 0.75rem', textAlign: 'right' }}>Receivable</th>
                          <th style={{ padding: '0.75rem 0.75rem', textAlign: 'right' }}>BOM Cost</th>
                          <th style={{ padding: '0.75rem 0.75rem', textAlign: 'right' }}>Tech Pay</th>
                          <th style={{ padding: '0.75rem 0.75rem', textAlign: 'right' }}>Net Margin</th>
                          <th style={{ padding: '0.75rem 0.75rem' }}>Cost Overrun & Status Breakdown</th>
                          <th style={{ padding: '0.75rem 0.75rem', textAlign: 'right' }} className="no-print">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredJobs.length === 0 ? (
                          <tr>
                            <td colSpan={10} style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
                              No installations found matching the filter.
                            </td>
                          </tr>
                        ) : (
                          filteredJobs.map(job => (
                            <tr
                              key={job.installationId}
                              style={{
                                borderBottom: '1px solid var(--line-subtle, rgba(0,0,0,0.05))',
                                background: !job.isProfitable ? 'rgba(239, 68, 68, 0.02)' : 'transparent',
                              }}
                            >
                              <td style={{ padding: '0.65rem 0.65rem', fontWeight: 600 }}>
                                #{job.installationId}
                              </td>
                              <td style={{ padding: '0.65rem 0.65rem' }}>
                                <div style={{ fontWeight: 600, color: 'var(--fg)' }}>{job.customerName}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                                  {job.propertyCity}, {job.propertyState}
                                </div>
                              </td>
                              <td style={{ padding: '0.65rem 0.65rem' }}>
                                <div style={{ fontWeight: 500 }}>{job.systemCapacityKw} kW</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{job.systemType}</div>
                              </td>
                              <td style={{ padding: '0.65rem 0.65rem', textAlign: 'right', fontWeight: 600, color: 'var(--positive, #16a34a)' }}>
                                {formatInr(job.revenueCollectedRupees)}
                              </td>
                              <td style={{ padding: '0.65rem 0.65rem', textAlign: 'right', color: job.accountsReceivableRupees > 0 ? '#b45309' : 'var(--muted)' }}>
                                {job.accountsReceivableRupees > 0 ? formatInr(job.accountsReceivableRupees) : '—'}
                              </td>
                              <td style={{ padding: '0.65rem 0.65rem', textAlign: 'right', color: 'var(--muted)' }}>
                                {formatInr(job.bomEquipmentCostRupees)}
                              </td>
                              <td style={{ padding: '0.65rem 0.65rem', textAlign: 'right', color: 'var(--muted)' }}>
                                {formatInr(job.technicianLaborCostRupees)}
                                <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>({job.technicianHours}h)</div>
                              </td>
                              <td style={{ padding: '0.65rem 0.65rem', textAlign: 'right' }}>
                                <div
                                  style={{
                                    fontWeight: 700,
                                    color: job.isProfitable ? '#15803d' : '#b91c1c',
                                  }}
                                >
                                  {formatInr(job.netProfitRupees)}
                                </div>
                                <span
                                  className={`margin-badge ${job.isProfitable ? 'profitable' : 'loss'}`}
                                >
                                  {job.netMarginPercentage >= 0 ? '+' : ''}
                                  {job.netMarginPercentage.toFixed(1)}%
                                </span>
                              </td>
                              <td style={{ padding: '0.65rem 0.65rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                  {job.costOverrunReasons.length > 0 ? (
                                    job.costOverrunReasons.map((r, idx) => (
                                      <span key={idx} className="overrun-chip">
                                        ⚠️ {r}
                                      </span>
                                    ))
                                  ) : (
                                    <span style={{ fontSize: '0.75rem', color: '#16a34a' }}>
                                      ✓ Margin healthy, on budget
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td style={{ padding: '0.65rem 0.65rem', textAlign: 'right' }} className="no-print">
                                <Link
                                  to={`/installations/${job.installationId}`}
                                  className="btn btn-secondary btn-sm"
                                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                                >
                                  View <ArrowRight size={11} style={{ marginLeft: '0.2rem' }} />
                                </Link>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 2: PM Surya Ghar Central Subsidy Pipeline */}
              {activeTab === 'subsidies' && (
                <div className="rec-card" style={{ padding: '1.25rem' }}>
                  <div style={{ marginBottom: '1rem' }}>
                    <h2 style={{ fontSize: '1.15rem', fontWeight: 600, margin: 0, color: 'var(--fg)' }}>
                      PM Surya Ghar: Muft Bijli Yojana Central Subsidy Tracker
                    </h2>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', margin: '0.25rem 0 0' }}>
                      Status tracking across National Portal application submission, DISCOM utility inspection, and direct bank disbursement.
                    </p>
                  </div>

                  {/* Funnel overview cards */}
                  <div className="subsidy-funnel">
                    <div className="subsidy-step-card active">
                      <div className="subsidy-step-title">1. Documents Submitted</div>
                      <div className="subsidy-step-amount">{formatInr(subsidyPipeline.documentsSubmittedAmountRupees)}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                        {subsidyPipeline.documentsSubmittedCount} claims pending utility review
                      </div>
                    </div>

                    <div className="subsidy-step-card active">
                      <div className="subsidy-step-title">2. DISCOM Inspection Cleared</div>
                      <div className="subsidy-step-amount">{formatInr(subsidyPipeline.inspectionClearedAmountRupees)}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                        {subsidyPipeline.inspectionClearedCount} net-meters verified, awaiting DBT
                      </div>
                    </div>

                    <div className="subsidy-step-card" style={{ borderLeft: '4px solid #16a34a' }}>
                      <div className="subsidy-step-title">3. Subsidy Disbursed (Credited)</div>
                      <div className="subsidy-step-amount" style={{ color: '#16a34a' }}>
                        {formatInr(subsidyPipeline.disbursedAmountRupees)}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                        {subsidyPipeline.disbursedCount} claims successfully credited
                      </div>
                    </div>
                  </div>

                  {/* Claims table */}
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--line)', color: 'var(--muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>
                          <th style={{ padding: '0.75rem 0.75rem' }}>Claim #</th>
                          <th style={{ padding: '0.75rem 0.75rem' }}>Customer & Property</th>
                          <th style={{ padding: '0.75rem 0.75rem' }}>System</th>
                          <th style={{ padding: '0.75rem 0.75rem', textAlign: 'right' }}>Subsidy Amount</th>
                          <th style={{ padding: '0.75rem 0.75rem' }}>Portal Reference</th>
                          <th style={{ padding: '0.75rem 0.75rem' }}>Status</th>
                          <th style={{ padding: '0.75rem 0.75rem' }}>Timeline</th>
                          <th style={{ padding: '0.75rem 0.75rem', textAlign: 'right' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subsidyPipeline.recentClaims.length === 0 ? (
                          <tr>
                            <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
                              No subsidy claims recorded yet.
                            </td>
                          </tr>
                        ) : (
                          subsidyPipeline.recentClaims.map(claim => (
                            <tr key={claim.id} style={{ borderBottom: '1px solid var(--line-subtle, rgba(0,0,0,0.05))' }}>
                              <td style={{ padding: '0.65rem 0.65rem', fontWeight: 600 }}>#{claim.id}</td>
                              <td style={{ padding: '0.65rem 0.65rem' }}>
                                <div style={{ fontWeight: 600, color: 'var(--fg)' }}>{claim.customerName}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                                  {claim.propertyCity}, {claim.propertyState}
                                </div>
                              </td>
                              <td style={{ padding: '0.65rem 0.65rem' }}>
                                {claim.systemCapacityKw} kW ({claim.systemType})
                              </td>
                              <td style={{ padding: '0.65rem 0.65rem', textAlign: 'right', fontWeight: 700, color: '#0369a1' }}>
                                {formatInr(claim.subsidyAmountRupees)}
                              </td>
                              <td style={{ padding: '0.65rem 0.65rem', fontFamily: 'var(--font-mono, monospace)', fontSize: '0.8rem' }}>
                                {claim.applicationReference}
                                {claim.disbursementReference && (
                                  <div style={{ fontSize: '0.72rem', color: '#16a34a' }}>
                                    DBT: {claim.disbursementReference}
                                  </div>
                                )}
                              </td>
                              <td style={{ padding: '0.65rem 0.65rem' }}>
                                <span
                                  style={{
                                    padding: '0.2rem 0.5rem',
                                    borderRadius: '4px',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    background:
                                      claim.status === 'Disbursed'
                                        ? '#dcfce7'
                                        : claim.status === 'InspectionCleared'
                                        ? '#fef08a'
                                        : '#e0f2fe',
                                    color:
                                      claim.status === 'Disbursed'
                                        ? '#15803d'
                                        : claim.status === 'InspectionCleared'
                                        ? '#854d0e'
                                        : '#0369a1',
                                  }}
                                >
                                  {claim.status === 'DocumentsSubmitted'
                                    ? 'Docs Submitted'
                                    : claim.status === 'InspectionCleared'
                                    ? 'DISCOM Cleared'
                                    : claim.status}
                                </span>
                              </td>
                              <td style={{ padding: '0.65rem 0.65rem', fontSize: '0.75rem', color: 'var(--muted)' }}>
                                <div>Submitted: {formatMoment(claim.submittedAt)}</div>
                                {claim.disbursedAt && <div style={{ color: '#16a34a' }}>Disbursed: {formatMoment(claim.disbursedAt)}</div>}
                              </td>
                              <td style={{ padding: '0.65rem 0.65rem', textAlign: 'right' }}>
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                                  onClick={() => {
                                    setEditingClaim(claim);
                                    setNewStatus(claim.status === 'DocumentsSubmitted' ? 'InspectionCleared' : 'Disbursed');
                                    setDisbursementRef(claim.disbursementReference || '');
                                    setStatusNotes(claim.notes || '');
                                  }}
                                >
                                  Update Status
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: Operations Backlog Health */}
              {activeTab === 'backlog' && (
                <div className="rec-card" style={{ padding: '1.25rem' }}>
                  <div style={{ marginBottom: '1.25rem' }}>
                    <h2 style={{ fontSize: '1.15rem', fontWeight: 600, margin: 0, color: 'var(--fg)' }}>
                      Active Operations Backlog & Queues
                    </h2>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', margin: '0.25rem 0 0' }}>
                      Unfinished operational steps requiring office or field technician action.
                    </p>
                  </div>

                  <div className="backlog-grid">
                    <Link to="/surveys" className="backlog-box">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--muted)' }}>
                          Pending Surveys
                        </span>
                        <ClipboardCheck size={16} color="var(--accent)" />
                      </div>
                      <div className="backlog-count">{operationsBacklog.pendingSurveysCount}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                        Site appointments awaiting review
                      </div>
                    </Link>

                    <Link to="/installations" className="backlog-box">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--muted)' }}>
                          Packing Queue
                        </span>
                        <Package size={16} color="#3b82f6" />
                      </div>
                      <div className="backlog-count">{operationsBacklog.packingQueueCount}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                        Orders waiting to be packed & scanned
                      </div>
                    </Link>

                    <Link to="/installations" className="backlog-box">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--muted)' }}>
                          Scheduled Roof Installs
                        </span>
                        <SolarPanel size={16} color="#eab308" />
                      </div>
                      <div className="backlog-count">{operationsBacklog.scheduledRoofInstallsCount}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                        Crews in field actively building
                      </div>
                    </Link>

                    <Link to="/tickets" className="backlog-box">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--muted)' }}>
                          Open Warranty Tickets
                        </span>
                        <Wrench size={16} color="#ef4444" />
                      </div>
                      <div className="backlog-count" style={{ color: operationsBacklog.openWarrantyTicketsCount > 0 ? '#ef4444' : 'inherit' }}>
                        {operationsBacklog.openWarrantyTicketsCount}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                        Post-sales breakdown claims open
                      </div>
                    </Link>
                  </div>
                </div>
              )}

              {/* TAB 4: Crew Payroll Ledger */}
              {activeTab === 'payroll' && (
                <div className="rec-card" style={{ padding: '1.25rem' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '0.75rem',
                      marginBottom: '1rem',
                    }}
                  >
                    <div>
                      <h2 style={{ fontSize: '1.15rem', fontWeight: 600, margin: 0, color: 'var(--fg)' }}>
                        Technician Crew Payroll & Hours Log
                      </h2>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', margin: '0.25rem 0 0' }}>
                        Logged hours across rooftop installations, surveys, and warranty service calls (Standard: {formatInr(crewPayroll.hourlyRateRupees)}/hr).
                      </p>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Total Crew Payroll Due</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--fg)', fontFamily: 'var(--font-mono)' }}>
                        {formatInr(crewPayroll.totalPayrollRupees)}
                      </div>
                    </div>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--line)', color: 'var(--muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>
                          <th style={{ padding: '0.75rem 0.75rem' }}>Technician</th>
                          <th style={{ padding: '0.75rem 0.75rem', textAlign: 'center' }}>Surveys Completed</th>
                          <th style={{ padding: '0.75rem 0.75rem', textAlign: 'center' }}>Installs Done</th>
                          <th style={{ padding: '0.75rem 0.75rem', textAlign: 'center' }}>Repairs Done</th>
                          <th style={{ padding: '0.75rem 0.75rem', textAlign: 'right' }}>Total Hours Logged</th>
                          <th style={{ padding: '0.75rem 0.75rem', textAlign: 'right' }}>Hourly Rate</th>
                          <th style={{ padding: '0.75rem 0.75rem', textAlign: 'right' }}>Total Compensation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {crewPayroll.technicians.length === 0 ? (
                          <tr>
                            <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
                              No active technicians found.
                            </td>
                          </tr>
                        ) : (
                          crewPayroll.technicians.map(tech => (
                            <tr key={tech.technicianId} style={{ borderBottom: '1px solid var(--line-subtle, rgba(0,0,0,0.05))' }}>
                              <td style={{ padding: '0.65rem 0.65rem' }}>
                                <div style={{ fontWeight: 600, color: 'var(--fg)' }}>{tech.technicianName}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{tech.email}</div>
                              </td>
                              <td style={{ padding: '0.65rem 0.65rem', textAlign: 'center' }}>
                                {tech.surveysCompleted}
                              </td>
                              <td style={{ padding: '0.65rem 0.65rem', textAlign: 'center' }}>
                                {tech.installationsCompleted}
                              </td>
                              <td style={{ padding: '0.65rem 0.65rem', textAlign: 'center' }}>
                                {tech.serviceTicketsResolved}
                              </td>
                              <td style={{ padding: '0.65rem 0.65rem', textAlign: 'right', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                                {tech.totalLoggedHours.toFixed(1)} hrs
                              </td>
                              <td style={{ padding: '0.65rem 0.65rem', textAlign: 'right', color: 'var(--muted)' }}>
                                {formatInr(crewPayroll.hourlyRateRupees)}/hr
                              </td>
                              <td style={{ padding: '0.65rem 0.65rem', textAlign: 'right', fontWeight: 700, color: 'var(--fg)', fontFamily: 'var(--font-mono)' }}>
                                {formatInr(tech.totalPayRupees)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Status Update Modal for Subsidy Claims */}
              {editingClaim && (
                <div
                  style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 100,
                    padding: '1rem',
                  }}
                >
                  <div
                    style={{
                      background: 'var(--bg-raised, #ffffff)',
                      borderRadius: '12px',
                      padding: '1.5rem',
                      maxWidth: '480px',
                      width: '100%',
                      boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>
                        Update PM Surya Ghar Status (Claim #{editingClaim.id})
                      </h3>
                      <button
                        type="button"
                        onClick={() => setEditingClaim(null)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                        Customer & Reference
                      </label>
                      <div style={{ fontSize: '0.875rem', color: 'var(--fg)', fontWeight: 500 }}>
                        {editingClaim.customerName} ({formatInr(editingClaim.subsidyAmountRupees)})
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                        App Ref: {editingClaim.applicationReference}
                      </div>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                        New Status
                      </label>
                      <select
                        value={newStatus}
                        onChange={e => setNewStatus(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          borderRadius: '6px',
                          border: '1px solid var(--line)',
                          background: 'var(--bg-raised)',
                          color: 'var(--fg)',
                        }}
                      >
                        <option value="DocumentsSubmitted">1. Documents Submitted (In Review)</option>
                        <option value="InspectionCleared">2. DISCOM Inspection Cleared (Net-Meter Verified)</option>
                        <option value="Disbursed">3. Subsidy Disbursed (Credited to Bank)</option>
                        <option value="Rejected">Rejected / Returned</option>
                      </select>
                    </div>

                    {newStatus === 'Disbursed' && (
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                          Disbursement DBT / NEFT Reference Number
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. DBT-NEFT-20261122-881"
                          value={disbursementRef}
                          onChange={e => setDisbursementRef(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            borderRadius: '6px',
                            border: '1px solid var(--line)',
                            background: 'var(--bg-raised)',
                            color: 'var(--fg)',
                          }}
                        />
                      </div>
                    )}

                    <div style={{ marginBottom: '1.25rem' }}>
                      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                        Administrative Notes (Optional)
                      </label>
                      <textarea
                        rows={2}
                        placeholder="e.g. Cleared by state DISCOM inspector with bi-directional net meter"
                        value={statusNotes}
                        onChange={e => setStatusNotes(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          borderRadius: '6px',
                          border: '1px solid var(--line)',
                          background: 'var(--bg-raised)',
                          color: 'var(--fg)',
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setEditingClaim(null)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={updateSubsidyMutation.isPending}
                        onClick={() =>
                          updateSubsidyMutation.mutate({
                            id: editingClaim.id,
                            status: newStatus,
                            ref: disbursementRef,
                            notes: statusNotes,
                          })
                        }
                      >
                        {updateSubsidyMutation.isPending ? 'Saving...' : 'Confirm Status Update'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          );
        }}
      </QueryView>
    </div>
  );
}
