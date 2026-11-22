import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, LoaderCircle, PackageCheck, Send, Zap } from 'lucide-react';
import { fetchInstallationQuote, generateQuote, sendQuote, QUOTE_KEY } from '../api/quotes';
import { Icon } from '../components/Icon';
import { formatMoment } from '../lib/dates';
import type { Installation } from '../api/surveys';

export function InstallationQuote({ installation }: { installation: Installation }) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: QUOTE_KEY(installation.id),
    queryFn: ({ signal }) => fetchInstallationQuote(installation.id, signal),
  });

  const [capacity, setCapacity] = useState<number>(3.0);
  const [systemType, setSystemType] = useState<string>('OnGrid');

  const recalculate = useMutation({
    mutationFn: () => generateQuote(installation.id, { systemCapacityKw: capacity, systemType }),
    onSuccess: (data) => {
      qc.setQueryData(QUOTE_KEY(installation.id), data);
    },
  });

  const send = useMutation({
    mutationFn: (quoteId: number) => sendQuote(quoteId),
    onSuccess: (data) => {
      qc.setQueryData(QUOTE_KEY(installation.id), data);
    },
  });

  if (query.isLoading) {
    return (
      <div style={{ padding: '2rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--muted)' }}>
        <Icon icon={LoaderCircle} className="spin" />
        <span>Loading quote & bill of materials...</span>
      </div>
    );
  }

  const quote = query.data;

  if (!quote) {
    return (
      <section style={{ marginTop: '2.5rem' }}>
        <div className="section-title">
          <h2 className="a-heading">System Quotation & BOM</h2>
          <span className="a-label">Scene 2 &bull; Package Ready</span>
        </div>
        <div className="rec-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <p style={{ margin: '0 0 1rem', color: 'var(--muted)' }}>
            No quotation generated yet. Site survey must be approved to create a quote.
          </p>
          {installation.status === 'Design' && (
            <button
              type="button"
              className="btn btn-primary"
              disabled={recalculate.isPending}
              onClick={() => recalculate.mutate()}
            >
              {recalculate.isPending ? <Icon icon={LoaderCircle} className="spin" /> : <Icon icon={Zap} />}
              <span>Generate 3 kW Standard Package</span>
            </button>
          )}
        </div>
      </section>
    );
  }

  return (
    <section style={{ marginTop: '2.5rem' }}>
      <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="a-heading">System Quotation & Bill of Materials</h2>
          <span className="a-label">Quote #{quote.id} &bull; {quote.status}</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{
            padding: '0.25rem 0.65rem',
            borderRadius: '9999px',
            fontSize: '0.8rem',
            fontWeight: 600,
            background: quote.paymentStatus === 'Pending' ? '#fef3c7' : '#dcfce7',
            color: quote.paymentStatus === 'Pending' ? '#92400e' : '#166534',
          }}>
            {quote.paymentStatus === 'Pending' ? 'Payment Pending' : `Payment: ${quote.paymentStatus}`}
          </span>
        </div>
      </div>

      <div className="rec-card" style={{ padding: '1.5rem' }}>
        {quote.paymentStatus !== 'Pending' && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            padding: '1rem',
            marginBottom: '1.25rem',
            background: 'color-mix(in srgb, var(--positive, #16a34a) 8%, var(--bg))',
            borderRadius: 'var(--radius-md)',
            border: '1px solid color-mix(in srgb, var(--positive, #16a34a) 25%, transparent)'
          }}>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--fg)', fontSize: '0.9rem' }}>
                Order Confirmed &amp; Paid: ₹{quote.amountPaidRupees.toLocaleString('en-IN')} ({quote.paymentStatus})
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
                Ref: {quote.paymentReference} &bull; Paid on {quote.paidAt ? formatMoment(quote.paidAt) : 'N/A'}
              </div>
            </div>

            {quote.receiptPhotoUrl && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <a
                  href={quote.receiptPhotoUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ textDecoration: 'none' }}
                >
                  <img
                    src={quote.receiptPhotoUrl}
                    alt="Customer Attached Receipt"
                    style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--line)', cursor: 'pointer' }}
                  />
                </a>
                <div>
                  <a
                    href={quote.receiptPhotoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem' }}
                  >
                    View Receipt Image
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Top Control Bar for Admin to customize package */}
        {quote.status === 'Draft' && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            paddingBottom: '1.25rem',
            marginBottom: '1.25rem',
            borderBottom: '1px solid var(--line)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span className="a-label" style={{ fontWeight: 600 }}>Capacity:</span>
              {[1.0, 2.0, 3.0, 4.0, 5.0].map(kw => (
                <button
                  key={kw}
                  type="button"
                  className={capacity === kw ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
                  onClick={() => setCapacity(kw)}
                >
                  {kw} kW
                </button>
              ))}

              <span className="a-label" style={{ fontWeight: 600, marginLeft: '0.5rem' }}>Type:</span>
              <button
                type="button"
                className={systemType === 'OnGrid' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
                onClick={() => setSystemType('OnGrid')}
              >
                On-Grid
              </button>
              <button
                type="button"
                className={systemType === 'OffGrid' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
                onClick={() => setSystemType('OffGrid')}
              >
                Off-Grid (Battery)
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={recalculate.isPending}
                onClick={() => recalculate.mutate()}
              >
                {recalculate.isPending ? <Icon icon={LoaderCircle} className="spin" /> : <Icon icon={Zap} />}
                <span>Update Sizing</span>
              </button>

              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={send.isPending}
                onClick={() => send.mutate(quote.id)}
              >
                {send.isPending ? <Icon icon={LoaderCircle} className="spin" /> : <Icon icon={Send} />}
                <span>Send to Customer</span>
              </button>
            </div>
          </div>
        )}

        {/* Commercial Figures */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(11rem, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <span className="a-label">System Size</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 600, marginTop: '0.2rem' }}>
              {quote.systemCapacityKw} kW {quote.systemType}
            </div>
          </div>

          <div>
            <span className="a-label">Base Cost</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 600, marginTop: '0.2rem' }}>
              ₹{quote.basePriceRupees.toLocaleString('en-IN')}
            </div>
          </div>

          <div>
            <span className="a-label" style={{ color: '#16a34a' }}>PM Surya Ghar Subsidy</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 600, marginTop: '0.2rem', color: '#16a34a' }}>
              - ₹{quote.estimatedSubsidyRupees.toLocaleString('en-IN')}
            </div>
          </div>

          <div>
            <span className="a-label">Net Payable</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.2rem' }}>
              ₹{quote.totalAmountRupees.toLocaleString('en-IN')}
            </div>
          </div>

          <div>
            <span className="a-label" style={{ color: 'var(--accent)' }}>20% Advance Required</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.2rem', color: 'var(--accent)' }}>
              ₹{quote.advanceRequiredRupees.toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        {/* Bill of Materials Table */}
        <div style={{ marginTop: '1.5rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Icon icon={PackageCheck} />
            <span>Bill of Materials (BOM) & Equipment Specifications</span>
          </h3>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)', color: 'var(--faint)' }}>
                  <th style={{ padding: '0.6rem 0.5rem' }}>Item</th>
                  <th style={{ padding: '0.6rem 0.5rem' }}>Specification</th>
                  <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>Qty</th>
                  <th style={{ padding: '0.6rem 0.5rem', textAlign: 'right' }}>Rate (₹)</th>
                  <th style={{ padding: '0.6rem 0.5rem', textAlign: 'right' }}>Total (₹)</th>
                </tr>
              </thead>
              <tbody>
                {quote.items.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--line-subtle, rgba(0,0,0,0.05))' }}>
                    <td style={{ padding: '0.6rem 0.5rem', fontWeight: 600 }}>{item.itemName}</td>
                    <td style={{ padding: '0.6rem 0.5rem', color: 'var(--muted)' }}>{item.specification}</td>
                    <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>{item.quantity} {item.unit}</td>
                    <td style={{ padding: '0.6rem 0.5rem', textAlign: 'right', color: 'var(--muted)' }}>{item.unitCostRupees.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '0.6rem 0.5rem', textAlign: 'right', fontWeight: 600 }}>{item.totalCostRupees.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {quote.paymentStatus !== 'Pending' && (
          <div style={{
            marginTop: '1.25rem',
            padding: '1rem',
            background: 'color-mix(in srgb, #16a34a 10%, transparent)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: '0.9rem',
          }}>
            <CheckCircle2 color="#16a34a" size={20} />
            <div>
              <b>Payment Verified:</b> Received ₹{quote.amountPaidRupees.toLocaleString('en-IN')} ({quote.paymentStatus}) on {quote.paidAt ? formatMoment(quote.paidAt) : 'today'}.
              {quote.paymentReference && <span style={{ marginLeft: '0.5rem', color: 'var(--muted)' }}>(Ref: {quote.paymentReference})</span>}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
